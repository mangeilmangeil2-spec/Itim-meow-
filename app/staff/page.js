'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function StaffDashboardPage() {
  const [orders, setOrders] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลออเดอร์ที่สั่งเข้ามา
  const fetchStaffData = async () => {
    try {
      // 1. ดึงข้อมูล Session โต๊ะที่กำลังเปิดอยู่นี้
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*, tables(table_number)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      setActiveSessions(sessions || []);

      if (!sessions || sessions.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);

      // 2. ดึงข้อมูลรายการสั่งอาหาร (Orders)
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          session_id,
          sessions ( table_id, tables ( table_number ) ),
          order_items (
            id,
            headcount,
            order_item_options (
              buffet_options ( name, category )
            )
          )
        `)
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      setOrders(orderData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
    // รีเฟรชอัตโนมัติทุกๆ 5 วินาที เพื่อเช็คออเดอร์ใหม่
    const interval = setInterval(() => {
      fetchStaffData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันสำหรับรวมจำนวนรายการที่สั่งซ้ำกัน (เช่น ช็อกโกแลต x2)
  const aggregateItems = (orderItems) => {
    const counts = {};
    orderItems?.forEach(item => {
      item.order_item_options?.forEach(opt => {
        const name = opt.buffet_options?.name;
        if (name) {
          counts[name] = (counts[name] || 0) + 1;
        }
      });
    });
    return Object.entries(counts);
  };

  // เคลียร์โต๊ะ / ปิด Session เช็คบิล
  const handleCloseSession = async (sessionId, tableNum) => {
    if (confirm(`ต้องการเคลียร์โต๊ะ ${tableNum} และเช็คบิลเรียบร้อยใช่ไหม?`)) {
      await supabase
        .from('sessions')
        .update({ status: 'closed', closed_at: new Date() })
        .eq('id', sessionId);
      fetchStaffData();
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: 'sans-serif', padding: '24px' }}>
      
      {/* Header หน้าร้าน */}
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 'bold', color: '#111' }}>
            👨‍🍳 หน้าพนักงาน / จอห้องครัว
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 14 }}>
            รายการออเดอร์ที่ลูกค้าสั่งเข้ามา (รีเฟรชอัตโนมัติทุก 5 วินาที)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/" style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: '#111', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 14 }}>
            + เปิดโต๊ะใหม่
          </a>
          <button onClick={fetchStaffData} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}>
            🔄 รีเฟรช
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* รายการโต๊ะที่กำลังนั่งอยู่ */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#333' }}>
            🟢 โต๊ะที่กำลังใช้งานอยู่ ({activeSessions.length} โต๊ะ)
          </h3>
          {activeSessions.length === 0 ? (
            <div style={{ color: '#888', fontSize: 14 }}>ไม่มีโต๊ะที่เปิดอยู่ขณะนี้</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {activeSessions.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: '1px solid #e0e0e0', borderRadius: 8, backgroundColor: '#fafafa' }}>
                  <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                    โต๊ะ {s.tables?.table_number}
                  </span>
                  <button 
                    onClick={() => handleCloseSession(s.id, s.tables?.table_number)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', backgroundColor: '#d32f2f', color: '#fff', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>
                    เช็คบิล / ปิดโต๊ะ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* บอร์ดออเดอร์รายการอาหาร */}
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 'bold' }}>
          📋 รายการสั่งไอติมล่าสุด
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>กำลังโหลดข้อมูล...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, backgroundColor: '#fff', borderRadius: 12, color: '#888' }}>
            ยังไม่มีออเดอร์สั่งเข้ามาในขณะนี้
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {orders.map(ord => {
              const items = aggregateItems(ord.order_items);
              if (items.length === 0) return null; // ข้ามออเดอร์เปิดโต๊ะธรรมดา

              const orderTime = new Date(ord.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={ord.id} style={{ backgroundColor: '#fff', border: '2px solid #111', borderRadius: 12, padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  
                  {/* หัวออเดอร์ */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#888' }}>เวลา {orderTime} น.</span>
                      <h2 style={{ margin: 0, fontSize: 24, fontWeight: '800', color: '#d32f2f' }}>
                        โต๊ะ {ord.sessions?.tables?.table_number}
                      </h2>
                    </div>
                  </div>

                  {/* รายการไอติม / ท็อปปิ้ง */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {items.map(([itemName, count]) => (
                      <div key={itemName} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold', color: '#111' }}>
                        <span>• {itemName}</span>
                        <span style={{ color: '#d32f2f', fontSize: 18 }}>x{count}</span>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
