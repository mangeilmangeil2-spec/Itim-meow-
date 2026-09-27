'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CustomerOrderPage() {
  const [tableNumber, setTableNumber] = useState('1');
  const [sessionId, setSessionId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [buffetOptions, setBuffetOptions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('flavor');
  const [quantities, setQuantities] = useState({}); // { optionId: count }
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table') || '1';
    setTableNumber(table);
    loadData(table);
  }, []);

  const loadData = async (tableNum) => {
    setLoading(true);
    try {
      // 1. ดึง ID โต๊ะ
      const { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNum)
        .single();

      if (tableData) {
        // 2. ดึง Session ที่เปิดอยู่
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_id', tableData.id)
          .eq('status', 'open')
          .maybeSingle();

        if (sessionData) setSessionId(sessionData.id);
      }

      // 3. ดึงตัวเลือกบุฟเฟ่ต์
      const { data: options } = await supabase
        .from('buffet_options')
        .select('*')
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      setBuffetOptions(options || []);

      const { data: menus } = await supabase.from('menu_items').select('*');
      setMenuItems(menus || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // เพิ่ม / ลด จำนวนรายการ
  const updateQuantity = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const next = current + delta;
      const newQty = { ...prev };
      if (next <= 0) {
        delete newQty[id];
      } else {
        newQty[id] = next;
      }
      return newQty;
    });
  };

  // คำนวณจำนวนรายการทั้งหมดในตะกร้า
  const totalCount = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  // ส่งรายการสั่งไอติม / ท็อปปิ้ง / ซอส
  const handleSendOrder = async () => {
    if (!sessionId) {
      alert('โต๊ะนี้ยังไม่ได้ทำการเปิดระบบ กรุณาติดต่อพนักงานครับ');
      return;
    }
    if (totalCount === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 รายการครับ');
      return;
    }

    setLoading(true);
    try {
      const buffetMenu = menuItems.find(m => m.is_buffet) || menuItems[0];

      const { data: order } = await supabase
        .from('orders')
        .insert([{ session_id: sessionId }])
        .select()
        .single();

      const { data: orderItem } = await supabase
        .from('order_items')
        .insert([{
          order_id: order.id,
          menu_item_id: buffetMenu?.id,
          quantity: 1,
          is_free_refill: true
        }])
        .select()
        .single();

      const optionRows = [];
      Object.entries(quantities).forEach(([optId, qty]) => {
        for (let i = 0; i < qty; i++) {
          optionRows.push({
            order_item_id: orderItem.id,
            buffet_option_id: optId
          });
        }
      });

      if (optionRows.length > 0) {
        await supabase.from('order_item_options').insert(optionRows);
      }

      setMessage('✅ ส่งรายการไอติมไปที่ครัวเรียบร้อยแล้ว!');
      setQuantities({});
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // เรียกเก็บเงิน
  const handleCallBill = async () => {
    if (confirm('คุณต้องการเรียกเก็บเงินใช่หรือไม่?')) {
      alert('แจ้งพนักงานเรียกเก็บเงินเรียบร้อยแล้วครับ!');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลดเมนู...</div>;

  const categories = [
    { key: 'flavor', label: 'ไอติม (รส)' },
    { key: 'topping', label: 'ท็อปปิ้ง' },
    { key: 'sauce', label: 'ซอส' },
    { key: 'drink', label: 'เครื่องดื่ม' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px', fontFamily: 'sans-serif', paddingBottom: 100 }}>
      
      {/* Header เลขโต๊ะ + ปุ่มเรียกเก็บเงิน */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <span style={{ fontSize: 14, color: '#666' }}>โต๊ะ</span>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 'bold' }}>{tableNumber}</h1>
        </div>
        <button 
          onClick={handleCallBill}
          style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #ddd', backgroundColor: '#fff', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          💰 เรียกเก็บเงิน
        </button>
      </div>

      {message && (
        <div style={{ padding: 12, backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: 8, marginBottom: 16, textAlign: 'center', fontWeight: 'bold' }}>
          {message}
        </div>
      )}

      {/* แถบปุ่มเลือกหมวดหมู่ */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16 }}>
        {categories.map(cat => (
          <button 
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{ 
              padding: '8px 16px', 
              borderRadius: 20, 
              border: 'none', 
              whiteSpace: 'nowrap',
              backgroundColor: activeCategory === cat.key ? '#111' : '#f0f0f0', 
              color: activeCategory === cat.key ? '#fff' : '#333', 
              fontWeight: 'bold',
              cursor: 'pointer' 
            }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* รายการเมนูตามหมวดหมู่ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {buffetOptions.filter(o => o.category === activeCategory).map(item => {
          const qty = quantities[item.id] || 0;
          return (
            <div 
              key={item.id}
              style={{ 
                display: 'flex', 
                justify: 'space-between', 
                alignItems: 'center', 
                padding: '14px 16px', 
                borderRadius: 12, 
                backgroundColor: '#fff', 
                border: qty > 0 ? '1px solid #111' : '1px solid #eee',
              }}>
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</span>
              
              {/* ถ้ามีจำนวนมากกว่า 0 ให้แสดงปุ่ม - จำนวน + */}
              {qty > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1px solid #111',
                      backgroundColor: '#fff',
                      fontSize: 18,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                    -
                  </button>
                  <span style={{ fontSize: 16, fontWeight: 'bold', minWidth: 16, textAlign: 'center' }}>
                    {qty}
                  </span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1px solid #111',
                      backgroundColor: '#111',
                      color: '#fff',
                      fontSize: 18,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                    +
                  </button>
                </div>
              ) : (
                /* ถ้ายังไม่ได้เลือก ให้แสดงปุ่ม + เพิ่ม */
                <button 
                  onClick={() => updateQuantity(item.id, 1)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 8, 
                    border: 'none', 
                    backgroundColor: '#111', 
                    color: '#fff', 
                    fontWeight: 'bold',
                    cursor: 'pointer' 
                  }}>
                  + เพิ่ม
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ปุ่มแถบตะกร้าลอยอยู่ด้านล่าง */}
      {totalCount > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: 0, right: 0, padding: '0 20px', maxWidth: 600, margin: '0 auto', zIndex: 100 }}>
          <button 
            onClick={handleSendOrder}
            style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', backgroundColor: '#111', color: '#fff', fontSize: 16, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
            🧺 ตะกร้า ({totalCount} รายการ) — แตะเพื่อส่งออเดอร์
          </button>
        </div>
      )}

    </div>
  );
}
