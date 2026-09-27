'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [tableNumber, setTableNumber] = useState('');
  const [tableId, setTableId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [buffetOptions, setBuffetOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Modal / Selection State
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [headcount, setHeadcount] = useState(1);
  const [selectedDrinkId, setSelectedDrinkId] = useState('');
  
  // Refill State
  const [isRefilling, setIsRefilling] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);

  useEffect(() => {
    // อ่านเลขโต๊ะจาก URL (?table=1)
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table') || '1';
    setTableNumber(table);

    initData(table);
  }, []);

  const initData = async (tableNum) => {
    setLoading(true);
    try {
      // 1. ดึงข้อมูลโต๊ะ
      let { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNum)
        .single();

      if (tableData) {
        setTableId(tableData.id);

        // 2. หา Session ที่เปิดอยู่ หรือสร้างใหม่
        let { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_id', tableData.id)
          .eq('status', 'open')
          .maybeSingle();

        if (!sessionData) {
          const { data: newSession } = await supabase
            .from('sessions')
            .insert([{ table_id: tableData.id, status: 'open' }])
            .select()
            .single();
          sessionData = newSession;
        }
        if (sessionData) setSessionId(sessionData.id);
      }

      // 3. ดึงเมนูอาหาร
      const { data: menus } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true);
      setMenuItems(menus || []);

      // 4. ดึงตัวเลือกบุฟเฟ่ต์ (รส, ท็อปปิ้ง, ซอส, น้ำ)
      const { data: options } = await supabase
        .from('buffet_options')
        .select('*')
        .eq('is_available', true)
        .order('sort_order', { ascending: true });
      setBuffetOptions(options || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // สั่งซื้อบุฟเฟ่ต์ / น้ำปกติ
  const handleOrderMenu = async () => {
    if (!sessionId || !selectedMenu) return;

    if (selectedMenu.is_combo && !selectedDrinkId) {
      alert('กรุณาเลือกน้ำดื่ม 1 แก้วสำหรับเซ็ตนี้ครับ');
      return;
    }

    setLoading(true);
    try {
      // 1. สร้าง Order
      const { data: order } = await supabase
        .from('orders')
        .insert([{ session_id: sessionId }])
        .select()
        .single();

      // 2. สร้าง Order Item
      const { data: orderItem } = await supabase
        .from('order_items')
        .insert([{
          order_id: order.id,
          menu_item_id: selectedMenu.id,
          quantity: selectedMenu.is_buffet ? 1 : headcount,
          headcount: selectedMenu.is_buffet ? headcount : null,
          is_free_refill: false
        }])
        .select()
        .single();

      // 3. ถ้าเป็นเซ็ตคอมโบ บันทึกน้ำที่เลือก
      if (selectedMenu.is_combo && selectedDrinkId) {
        await supabase
          .from('order_item_options')
          .insert([{
            order_item_id: orderItem.id,
            buffet_option_id: selectedDrinkId
          }]);
      }

      setMessage('✅ ส่งออเดอร์เรียบร้อยแล้วครับ!');
      setSelectedMenu(null);
      setHeadcount(1);
      setSelectedDrinkId('');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสั่งซื้อ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // สั่งตักเพิ่ม (Free Refill)
  const handleRefill = async () => {
    if (!sessionId || selectedOptions.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 รายการครับ');
      return;
    }

    setLoading(true);
    try {
      // หาเมนูบุฟเฟ่ต์ไอติมเพื่อผูกไอดี
      const buffetMenu = menuItems.find(m => m.is_buffet);

      const { data: order } = await supabase
        .from('orders')
        .insert([{ session_id: sessionId }])
        .select()
        .single();

      const { data: orderItem } = await supabase
        .from('order_items')
        .insert([{
          order_id: order.id,
          menu_item_id: buffetMenu ? buffetMenu.id : menuItems[0]?.id,
          quantity: 1,
          is_free_refill: true
        }])
        .select()
        .single();

      // บันทึกตัวเลือกที่ติ๊กเลือกทั้งหมด
      const optionRows = selectedOptions.map(optId => ({
        order_item_id: orderItem.id,
        buffet_option_id: optId
      }));

      await supabase.from('order_item_options').insert(optionRows);

      setMessage('🍨 ส่งรายการตักเพิ่มไปที่ครัวเรียบร้อย!');
      setIsRefilling(false);
      setSelectedOptions([]);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (id) => {
    if (selectedOptions.includes(id)) {
      setSelectedOptions(selectedOptions.filter(o => o !== id));
    } else {
      setSelectedOptions([...selectedOptions, id]);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#fff0f5', padding: 20, borderRadius: 12, textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: '#d32f2f' }}>🍨 ร้าน Itim</h1>
        <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>โต๊ะหมายเลข: {tableNumber}</p>
      </div>

      {message && (
        <div style={{ padding: 12, backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: 8, marginBottom: 20, textAlign: 'center' }}>
          {message}
        </div>
      )}

      {/* ปุ่มสลับโหมดสั่งเมนูหลัก / ตักเพิ่ม */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button 
          onClick={() => setIsRefilling(false)}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: !isRefilling ? '#d32f2f' : '#eee', color: !isRefilling ? '#fff' : '#333', fontWeight: 'bold', cursor: 'pointer' }}>
          🛒 เลือกเมนู
        </button>
        <button 
          onClick={() => setIsRefilling(true)}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: isRefilling ? '#d32f2f' : '#eee', color: isRefilling ? '#fff' : '#333', fontWeight: 'bold', cursor: 'pointer' }}>
          🍨 ตักเพิ่ม (Refill)
        </button>
      </div>

      {/* หน้าเลือกเมนูหลัก */}
      {!isRefilling ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {menuItems.map(item => (
            <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{item.name}</h3>
                <p style={{ margin: 0, color: '#666' }}>{item.price} บาท {item.is_buffet ? '/ ท่าน' : '/ แก้ว'}</p>
              </div>
              <button 
                onClick={() => { setSelectedMenu(item); setMessage(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: '#1976d2', color: '#fff', cursor: 'pointer' }}>
                เลือก
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* หน้าเลือกตักเพิ่ม */
        <div>
          <h3>เลือกรายการไอติม & ท็อปปิ้ง (ฟรี):</h3>
          {['flavor', 'topping', 'sauce'].map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <h4 style={{ textTransform: 'capitalize', color: '#d32f2f', borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                {cat === 'flavor' ? 'ไอติม (รส)' : cat === 'topping' ? 'ท็อปปิ้ง' : 'ซอส'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {buffetOptions.filter(o => o.category === cat).map(opt => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#f9f9f9', borderRadius: 6, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedOptions.includes(opt.id)}
                      onChange={() => toggleOption(opt.id)}
                    />
                    <span>{opt.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button 
            onClick={handleRefill}
            style={{ width: '100%', padding: 15, borderRadius: 8, border: 'none', backgroundColor: '#388e3c', color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 10 }}>
            ส่งรายการตักเพิ่มไปที่ครัว
          </button>
        </div>
      )}

      {/* Modal ป๊อปอัพยืนยันเมนู */}
      {selectedMenu && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 16, maxWidth: 400, width: '100%' }}>
            <h3>{selectedMenu.name}</h3>
            <p>ราคา: {selectedMenu.price} บาท</p>

            {/* ถ้าเป็นบุฟเฟ่ต์ ให้กรอกจำนวนคน */}
            {selectedMenu.is_buffet && (
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>จำนวนผู้ใช้บริการ (คน):</label>
                <input 
                  type="number" 
                  min="1" 
                  value={headcount} 
                  onChange={e => setHeadcount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}
                />
              </div>
            )}

            {/* ถ้าเป็นเซ็ตคอมโบ ให้เลือกน้ำ 1 อย่าง */}
            {selectedMenu.is_combo && (
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>เลือกน้ำดื่มฟรี 1 แก้ว:</label>
                <select 
                  value={selectedDrinkId} 
                  onChange={e => setSelectedDrinkId(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }}>
                  <option value="">-- เลือกน้ำดื่ม --</option>
                  {buffetOptions.filter(o => o.category === 'drink').map(drink => (
                    <option key={drink.id} value={drink.id}>{drink.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button 
                onClick={() => setSelectedMenu(null)}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#ccc', cursor: 'pointer' }}>
                ยกเลิก
              </button>
              <button 
                onClick={handleOrderMenu}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#d32f2f', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                ยืนยันสั่งซื้อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
