'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CustomerOrderPage() {
  const [tableNumber, setTableNumber] = useState('1');
  const [sessionId, setSessionId] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [buffetOptions, setBuffetOptions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('flavor');
  const [quantities, setQuantities] = useState({});
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
      const { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNum)
        .single();

      if (tableData) {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_id', tableData.id)
          .eq('status', 'open')
          .maybeSingle();

        if (sessionData) setSessionId(sessionData.id);
      }

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

  const totalCount = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const handleSendOrder = async () => {
    if (!sessionId) {
      alert('โต๊ะนี้ยังไม่ได้ทำการเปิดระบบ กรุณาติดต่อพนักงานครับ 🐾');
      return;
    }
    if (totalCount === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 รายการครับ 🍦');
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

      setMessage('✨ ส่งรายการให้ Itim-meow เรียบร้อยแล้วเหมียว! 🐱');
      setQuantities({});
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCallBill = async () => {
    if (confirm('คุณต้องการเรียกพนักงานเช็คบิลใช่ไหมเหมียว? 🐱')) {
      alert('แจ้งพนักงานให้แล้วครับ รอสักครู่นะครับ 🐾');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F5', color: '#FF5C8A', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🐱🍦</div>
      <div style={{ fontWeight: 'bold', fontSize: 16 }}>กำลังโหลดเมนู Itim-meow...</div>
    </div>
  );

  const categories = [
    { key: 'flavor', label: '🍦 ไอติม (รส)' },
    { key: 'topping', label: '🍡 ท็อปปิ้ง' },
    { key: 'sauce', label: '🍯 ซอส' },
    { key: 'drink', label: '🥤 เครื่องดื่ม' },
  ];

  const filteredOptions = buffetOptions.filter(o => o.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', fontFamily: '-apple-system, BlinkMacSystemFont, "Kanit", "Mitr", sans-serif', color: '#4A2E35' }}>
      
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 120px 20px', boxSizing: 'border-box' }}>
        
        {/* Header โต๊ะ + ชื่อร้าน Itim-meow */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 4px 16px rgba(255, 182, 193, 0.3)',
          border: '2px solid #FFC6D9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36 }}>🐱</span>
            <div>
              <div style={{ fontSize: 13, color: '#FF5C8A', fontWeight: '800' }}>Itim-meow 🍦</div>
              <div style={{ fontSize: 24, fontWeight: '800', color: '#4A2E35', lineHeight: '1.1' }}>
                โต๊ะ {tableNumber}
              </div>
            </div>
          </div>

          <button 
            onClick={handleCallBill}
            style={{ 
              padding: '10px 18px', 
              borderRadius: 20, 
              border: '2px solid #FFB3C6', 
              backgroundColor: '#FFF0F3', 
              color: '#FF4D6D',
              fontSize: 14, 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6
            }}>
            💰 เรียกเช็คบิล
          </button>
        </div>

        {/* ข้อความแจ้งเตือน */}
        {message && (
          <div style={{ padding: '14px 18px', backgroundColor: '#E8F5E9', color: '#2E7D32', borderRadius: 16, marginBottom: 20, textAlign: 'center', fontWeight: 'bold', border: '1.5px solid #C8E6C9' }}>
            {message}
          </div>
        )}

        {/* หมวดหมู่ (Tabs) */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, scrollbarWidth: 'none' }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat.key;
            return (
              <button 
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: 20, 
                  border: isActive ? 'none' : '1.5px solid #FFC6D9', 
                  whiteSpace: 'nowrap',
                  backgroundColor: isActive ? '#FF7597' : '#FFFFFF', 
                  color: isActive ? '#FFFFFF' : '#663B47', 
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 4px 12px rgba(255, 117, 151, 0.3)' : 'none'
                }}>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* รายการอาหาร */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: '12px 20px', border: '2px solid #FFC6D9', boxShadow: '0 4px 16px rgba(255, 182, 193, 0.2)' }}>
          {filteredOptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#A06B78' }}>
              🐾 ยังไม่มีรายการในหมวดนี้เหมียว
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
                    padding: '16px 0', 
                    borderBottom: idx === filteredOptions.length - 1 ? 'none' : '1px solid #FFE4EC'
                  }}>
                  
                  <span style={{ fontSize: 16, fontWeight: 'bold', color: '#4A2E35' }}>
                    🍦 {item.name}
                  </span>
                  
                  {qty > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '2px solid #FF7597',
                          backgroundColor: '#FFF0F3',
                          color: '#FF7597',
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
                      <span style={{ fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center', color: '#FF4D6D' }}>
                        {qty}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#FF7597',
                          color: '#FFFFFF',
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
                        padding: '8px 18px', 
                        borderRadius: 16, 
                        border: 'none', 
                        backgroundColor: '#FF7597', 
                        color: '#FFFFFF', 
                        fontSize: 14,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(255, 117, 151, 0.3)'
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

      {/* แถบตะกร้าลอยด้านล่าง */}
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
              borderRadius: 20, 
              border: 'none', 
              backgroundColor: '#FF4D6D', 
              color: '#FFFFFF', 
              fontSize: 16, 
              fontWeight: 'bold', 
              boxShadow: '0 8px 24px rgba(255, 77, 109, 0.4)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
            🧺 สั่งเลย ({totalCount} รายการ) — ส่งให้ Itim-meow 🐾
          </button>
        </div>
      )}

    </div>
  );
}
