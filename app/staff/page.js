'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function StaffPage() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลโต๊ะที่กำลังเปิดใช้งาน และออเดอร์ทั้งหมด
  const fetchKitchenData = async () => {
    try {
      // 1. ดึง sessions ที่ open อยู่ พร้อมข้อมูลโต๊ะ
      const { data: sessionsData, error: sessionErr } = await supabase
        .from('sessions')
        .select(`
          id,
          headcount,
          created_at,
          status,
          tables (
            id,
            table_number
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: true });

      if (sessionErr) throw sessionErr;

      if (!sessionsData || sessionsData.length === 0) {
        setActiveSessions([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessionsData.map(s => s.id);

      // 2. ดึง orders ของ sessions เหล่านั้น
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id,
          session_id,
          created_at,
          order_items (
            id,
            quantity,
            is_free_refill,
            menu_items ( name ),
            order_item_options (
              id,
              buffet_options ( name, category )
            )
          )
        `)
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (ordersErr) throw ordersErr;

      // 3. จัดกลุ่มออเดอร์ลงแต่ละ Session/โต๊ะ
      const formattedSessions = sessionsData.map(session => {
        const sessionOrders = (ordersData || []).filter(o => o.session_id === session.id);
        return {
          ...session,
          orders: sessionOrders
        };
      });

      setActiveSessions(formattedSessions);
    } catch (err) {
      console.error('Fetch kitchen data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenData();

    // ฟังเหตุการณ์อัปเดตเรียลไทม์
    const channel = supabase
      .channel('kitchen_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchKitchenData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchKitchenData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchKitchenData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ฟังก์ชันเคลียร์โต๊ะ / เช็คบิลเก็บเงิน
  const handleCloseSession = async (sessionId, tableNum) => {
    if (!confirm(`ยืนยันการเช็คบิล/เคลียร์ โต๊ะ ${tableNum} ใช่ไหมเหมียว? 🐾`)) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'closed', 
          closed_at: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) throw error;

      alert(`เช็คบิล โต๊ะ ${tableNum} เรียบร้อยแล้วครับ! 🎉`);
      fetchKitchenData(); // รีโหลดหน้าทันที
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเช็คบิล: ' + err.message);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F5', color: '#FF5C8A', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>👨‍🍳🐱</div>
      <div style={{ fontWeight: 'bold', fontSize: 18 }}>กำลังโหลดออเดอร์หน้าครัว...</div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF5F7',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Kanit", "Mitr", sans-serif',
      color: '#4A2E35'
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Header หน้าครัว */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          backgroundColor: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: 24,
          border: '2px solid #FFC6D9',
          boxShadow: '0 4px 16px rgba(255, 182, 193, 0.3)'
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: '800', color: '#FF5C8A', margin: 0 }}>
              👨‍🍳 หน้าครัว Itim-meow (Live Orders)
            </h1>
            <p style={{ fontSize: 13, color: '#885060', margin: '4px 0 0 0' }}>
              อัปเดตรายการสั่งซื้อและจัดการเช็คบิลแบบเรียลไทม์ 🐾
            </p>
          </div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '10px 18px',
              borderRadius: 16,
              border: '2px solid #FF9EAA',
              backgroundColor: '#FFF0F3',
              color: '#FF5C8A',
              fontWeight: 'bold',
              fontSize: 14,
              cursor: 'pointer'
            }}>
              🏠 หน้าเปิดโต๊ะ
            </button>
          </Link>
        </div>

        {/* รายการโต๊ะที่เปิดอยู่ */}
        {activeSessions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            border: '2px dashed #FFC6D9',
            color: '#885060'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😴🐱</div>
            <h3 style={{ margin: 0, fontSize: 18 }}>ยังไม่มีโต๊ะที่เปิดอยู่เลยเหมียว</h3>
            <p style={{ fontSize: 14, marginTop: 6, color: '#A06B78' }}>
              เปิดโต๊ะใหม่จากหน้าแรกเพื่อเริ่มรับออเดอร์
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20
          }}>
            {activeSessions.map((session) => {
              const tableNum = session.tables?.table_number || 'N/A';
              
              return (
                <div key={session.id} style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  border: '3px solid #FFC6D9',
                  boxShadow: '0 6px 20px rgba(255, 182, 193, 0.3)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}>
                  <div>
                    {/* หัวการ์ดโต๊ะ */}
                    <div style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      paddingBottom: 12,
                      borderBottom: '2px dashed #FFE4EC',
                      marginBottom: 14
                    }}>
                      <div>
                        <span style={{ fontSize: 22, fontWeight: '800', color: '#FF5C8A' }}>
                          โต๊ะ {tableNum}
                        </span>
                        <span style={{ fontSize: 12, color: '#885060', marginLeft: 8 }}>
                          ({session.headcount || 1} ท่าน)
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        backgroundColor: '#E8F5E9',
                        color: '#2E7D32',
                        borderRadius: 12,
                        fontWeight: 'bold'
                      }}>
                        ● กำลังรับทาน
                      </span>
                    </div>

                    {/* รายการออเดอร์ของโต๊ะนี้ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                      {session.orders.length === 0 ? (
                        <div style={{ fontSize: 13, color: '#A06B78', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                          ยังไม่ได้ส่งรายการอาหาร 🍦
                        </div>
                      ) : (
                        session.orders.map((order, index) => (
                          <div key={order.id} style={{
                            backgroundColor: '#FFF9FA',
                            borderRadius: 16,
                            padding: 12,
                            border: '1px solid #FFD6E5'
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#FF7597', marginBottom: 6 }}>
                              ออเดอร์ที่ #{index + 1} — {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </div>

                            {order.order_items.map((item) => (
                              <div key={item.id}>
                                {item.order_item_options && item.order_item_options.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {item.order_item_options.map((opt) => (
                                      <div key={opt.id} style={{ fontSize: 14, fontWeight: 'bold', color: '#4A2E35', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>🍦 {opt.buffet_options?.name}</span>
                                        <span style={{ color: '#FF5C8A' }}>x1</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 14, fontWeight: 'bold', color: '#4A2E35' }}>
                                    🍧 {item.menu_items?.name || 'บุฟเฟต์ไอศกรีม'} x {item.quantity}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ปุ่มเช็คบิล / ปิดโต๊ะ */}
                  <button
                    onClick={() => handleCloseSession(session.id, tableNum)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 16,
                      border: 'none',
                      backgroundColor: '#FF4D6D',
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(255, 77, 109, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}>
                    💰 เช็คบิล & ปิดโต๊ะ {tableNum}
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
