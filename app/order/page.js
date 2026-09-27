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

      setMessage('✅ ส่งรายการเรียบร้อยแล้ว!');
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#666' }}>
      กำลังโหลดเมนู...
    </div>
  );

  const categories = [
    { key: 'flavor', label: 'ไอติม (รส)' },
    { key: 'topping', label: 'ท็อปปิ้ง' },
    { key: 'sauce', label: 'ซอส' },
    { key: 'drink', label: 'เครื่องดื่ม' },
  ];

  const filteredOptions = buffetOptions.filter(o => o.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#111111' }}>
      
      {/* Container ใหญ่ตรงกลาง */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 120px 20px', boxSizing: 'border-box' }}>
        
        {/* Header เลขโต๊ะ + ปุ่มเรียกเก็บเงิน */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <div style={{ fontSize: 13, color: '#888888', fontWeight: '500' }}>โต๊ะ</div>
            <div style={{ fontSize: 32, fontWeight: '800', lineHeight: '1.1', color: '#111111' }}>{tableNumber}</div>
          </div>
          <button 
            onClick={handleCallBill}
            style={{ 
              padding: '10px 18px', 
              borderRadius: 30, 
              border: '1px solid #e0e0e0', 
              backgroundColor: '#ffffff', 
              fontSize: 14, 
              fontWeight: '600', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}>
            💰 เรียกเก็บเงิน
          </button>
        </div>

        {/* ข้อความแจ้งเตือนเมื่อส่งออเดอร์สำเร็จ */}
        {message && (
          <div style={{ padding: '14px 18px', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: 12, marginBottom: 20, textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
            {message}
          </div>
        )}

        {/* แถบปุ่มเลือกหมวดหมู่ */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 20, scrollbarWidth: 'none' }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat.key;
            return (
              <button 
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{ 
                  padding: '10px 22px', 
                  borderRadius: 25, 
                  border: 'none', 
                  whiteSpace: 'nowrap',
                  backgroundColor: isActive ? '#111111' : '#f2f2f4', 
                  color: isActive ? '#ffffff' : '#444444', 
                  fontSize: 14,
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* รายการเมนูตามหมวดหมู่ */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredOptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
              ยังไม่มีรายการในหมวดหมู่นี้
            </div>
          ) : (
            filteredOptions.map((item, idx) => {
              const qty = quantities[item.id] || 0;
              return (
                <div 
                  key={item.id}
                  style={{ 
                    display: 'flex', 
                    justify: 'space-between', 
                    alignItems: 'center', 
                    width: '100%',
                    padding: '18px 0', 
                    borderBottom: idx === filteredOptions.length - 1 ? 'none' : '1px solid #f2f2f4',
                    boxSizing: 'border-box'
                  }}>
                  
                  {/* ชื่อรายการ */}
                  <span style={{ fontSize: 16, fontWeight: '700', color: '#111111', flex: 1, paddingRight: 16 }}>
                    {item.name}
                  </span>
                  
                  {/* ตัวควบคุมจำนวน */}
                  {qty > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          border: '1.5px solid #111111',
                          backgroundColor: '#ffffff',
                          color: '#111111',
                          fontSize: 18,
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}>
                        -
                      </button>
                      <span style={{ fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#111111',
                          color: '#ffffff',
                          fontSize: 18,
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}>
                        +
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{ 
                        padding: '8px 20px', 
                        borderRadius: 20, 
                        border: 'none', 
                        backgroundColor: '#111111', 
                        color: '#ffffff', 
                        fontSize: 14,
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}>
                      + เพิ่ม
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* แถบตะกร้าลอยอยู่ด้านล่างสุด */}
      {totalCount > 0 && (
        <div style={{ 
          position: 'fixed', 
          bottom: 24, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: 'calc(100% - 32px)', 
          maxWidth: 640, 
          zIndex: 1000 
        }}>
          <button 
            onClick={handleSendOrder}
            style={{ 
              width: '100%', 
              padding: '16px 24px', 
              borderRadius: 16, 
              border: 'none', 
              backgroundColor: '#111111', 
              color: '#ffffff', 
              fontSize: 16, 
              fontWeight: '700', 
              boxShadow: '0 8px 24px rgba(0,0,0,0.22)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
            🧺 ตะกร้า ({totalCount} รายการ) — แตะเพื่อส่งออเดอร์
          </button>
        </div>
      )}

    </div>
  );
}
