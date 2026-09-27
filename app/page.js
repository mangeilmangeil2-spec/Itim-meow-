'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function OpenTablePage() {
  const [tableNumber, setTableNumber] = useState('1');
  const [buffetOnlyCount, setBuffetOnlyCount] = useState(1);
  const [buffetComboCount, setBuffetComboCount] = useState(0);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderUrl, setOrderUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpenTable = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. หาข้อมูลโต๊ะ
      const { data: tableData, error: tErr } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNumber)
        .single();

      if (tErr || !tableData) {
        alert('ไม่พบข้อมูลโต๊ะนี้ในระบบ');
        setLoading(false);
        return;
      }

      // 2. ปิด Session เก่าของโต๊ะนี้ (ถ้ามี) แล้วเปิด Session ใหม่
      await supabase
        .from('sessions')
        .update({ status: 'closed', closed_at: new Date() })
        .eq('table_id', tableData.id)
        .eq('status', 'open');

      const { data: sessionData, error: sErr } = await supabase
        .from('sessions')
        .insert([{ table_id: tableData.id, status: 'open' }])
        .select()
        .single();

      if (sErr) throw sErr;

      // 3. สร้าง Order แรกสำหรับบันทึกจำนวนหัวบุฟเฟ่ต์
      const { data: orderData } = await supabase
        .from('orders')
        .insert([{ session_id: sessionData.id }])
        .select()
        .single();

      // ดึงรายการเมนูบุฟเฟ่ต์
      const { data: menuItems } = await supabase.from('menu_items').select('*');
      const buffet139 = menuItems?.find(m => m.is_buffet && !m.is_combo);
      const buffet168 = menuItems?.find(m => m.is_buffet && m.is_combo);

      // บันทึกจำนวนคนลง order_items
      if (buffetOnlyCount > 0 && buffet139) {
        await supabase.from('order_items').insert([{
          order_id: orderData.id,
          menu_item_id: buffet139.id,
          quantity: 1,
          headcount: parseInt(buffetOnlyCount),
          is_free_refill: false
        }]);
      }

      if (buffetComboCount > 0 && buffet168) {
        await supabase.from('order_items').insert([{
          order_id: orderData.id,
          menu_item_id: buffet168.id,
          quantity: 1,
          headcount: parseInt(buffetComboCount),
          is_free_refill: false
        }]);
      }

      // 4. สร้าง URL สั่งอาหารสำหรับ QR Code
      const generatedUrl = `${window.location.origin}/order?table=${tableNumber}`;
      setOrderUrl(generatedUrl);
      setIsSuccess(true);

    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(orderUrl);
    alert('คัดลอกลิงก์เรียบร้อยแล้ว!');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        
        {!isSuccess ? (
          <form onSubmit={handleOpenTable}>
            <h2 style={{ textAlign: 'center', margin: '0 0 24px 0', fontSize: 22, fontWeight: 'bold' }}>
              🍨 เปิดโต๊ะบุฟเฟต์ไอติม
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', textAlign: 'center', marginBottom: 8, color: '#333', fontWeight: 'bold' }}>เลขโต๊ะ</label>
              <select 
                value={tableNumber} 
                onChange={e => setTableNumber(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16, textAlign: 'center' }}>
                {['1', '2', '3', '4', '5'].map(num => (
                  <option key={num} value={num}>โต๊ะ {num}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', textAlign: 'center', marginBottom: 8, color: '#333' }}>
                จำนวนบุฟเฟ่ต์ไอติม (คน) — 139 บาท/คน
              </label>
              <input 
                type="number" 
                min="0" 
                value={buffetOnlyCount} 
                onChange={e => setBuffetOnlyCount(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16, textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', textAlign: 'center', marginBottom: 8, color: '#333' }}>
                จำนวนเซ็ตบุฟเฟ่ต์ + น้ำ 1 แก้ว (คน) — 168 บาท/คน
              </label>
              <input 
                type="number" 
                min="0" 
                value={buffetComboCount} 
                onChange={e => setBuffetComboCount(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16, textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', backgroundColor: '#111', color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>
              {loading ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะ'}
            </button>
          </form>
        ) : (
          /* หน้าแสดง QR Code เมื่อเปิดโต๊ะสำเร็จ */
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#2e7d32', margin: '0 0 12px 0', fontSize: 20 }}>
              ✅ เปิดโต๊ะสำเร็จ
            </h2>
            <p style={{ margin: '0 0 20px 0', fontWeight: 'bold', color: '#333' }}>
              โต๊ะ {tableNumber} | ไอติม {buffetOnlyCount} ท่าน | เซ็ต+น้ำ {buffetComboCount} ท่าน
            </p>

            {/* ภาพ QR Code สแกนตรงไปหน้าสั่งอาหาร */}
            <div style={{ padding: 16, background: '#fff', display: 'inline-block', borderRadius: 12, border: '1px solid #eee', marginBottom: 20 }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(orderUrl)}`} 
                alt="QR Code สั่งอาหาร" 
                style={{ width: 200, height: 200 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <input 
                type="text" 
                readOnly 
                value={orderUrl}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #eee', backgroundColor: '#f9f9f9', fontSize: 13, textAlign: 'center', color: '#666', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              onClick={copyToClipboard}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #111', backgroundColor: '#fff', color: '#111', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', marginBottom: 10 }}>
              คัดลอกลิงก์
            </button>

            <button 
              onClick={() => setIsSuccess(false)}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', backgroundColor: '#111', color: '#fff', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>
              เปิดโต๊ะใหม่
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
