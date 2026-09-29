'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function StaffPage() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // ดึงข้อมูลโต๊ะและออเดอร์ทั้งหมด
  const fetchKitchenData = async () => {
    try {
      setErrorMessage('');

      // 1. ดึง sessions ที่ open และ bill_requested อยู่ (แก้บั๊กโต๊ะหายตอนกดเช็คบิล)
      const { data: sessionsData, error: sessionErr } = await supabase
        .from('sessions')
        .select('*')
        .in('status', ['open', 'bill_requested'])
        .order('id', { ascending: true });

      if (sessionErr) throw sessionErr;

      if (!sessionsData || sessionsData.length === 0) {
        setActiveSessions([]);
        setLoading(false);
        return;
      }

      // 2. ดึงข้อมูล tables
      const tableIds = sessionsData.map(s => s.table_id).filter(Boolean);
      let tablesMap = {};
      if (tableIds.length > 0) {
        const { data: tablesData } = await supabase
          .from('tables')
          .select('*')
          .in('id', tableIds);
        
        (tablesData || []).forEach(t => {
          tablesMap[t.id] = t.table_number;
        });
      }

      // 3. ดึง orders ของ sessions เหล่านี้
      const sessionIds = sessionsData.map(s => s.id);
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .in('session_id', sessionIds)
        .order('id', { ascending: true });

      if (ordersErr) throw ordersErr;

      // 4. ดึง order_items และ order_item_options
      const orderIds = (ordersData || []).map(o => o.id);
      let itemsMap = {};
      
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        const itemIds = (itemsData || []).map(i => i.id);
        let optionsMap = {};
        let optionsDataList = [];

        if (itemIds.length > 0) {
          const { data: optionsData } = await supabase
            .from('order_item_options')
            .select('*')
            .in('order_item_id', itemIds);
          
          optionsDataList = optionsData || [];
          
          optionsDataList.forEach(opt => {
            if (!optionsMap[opt.order_item_id]) optionsMap[opt.order_item_id] = [];
            optionsMap[opt.order_item_id].push(opt.option_id);
          });
        }

        // รวม ID ทั้งหมด (menu_item_id + option_id) เพื่อนำไปค้นชื่อเมนูจาก buffet_options ในรอบเดียว
        const menuItemIds = (itemsData || []).map(i => i.menu_item_id).filter(Boolean);
        const optionIds = optionsDataList.map(opt => opt.option_id).filter(Boolean);
        const allBuffetIds = Array.from(new Set([...menuItemIds, ...optionIds]));

        let buffetNameMap = {};
        if (allBuffetIds.length > 0) {
          const { data: buffetData } = await supabase
            .from('buffet_options')
            .select('*')
            .in('id', allBuffetIds);
          
          (buffetData || []).forEach(b => {
            buffetNameMap[b.id] = b.name;
          });
        }

        // ประกอบข้อมูล order_items พร้อมชื่อเมนู
        (itemsData || []).forEach(item => {
          if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
          
          const optionNames = (optionsMap[item.id] || []).map(optId => buffetNameMap[optId]).filter(Boolean);

          itemsMap[item.order_id].push({
            ...item,
            name: buffetNameMap[item.menu_item_id] || 'รายการไอศกรีม',
            options: optionNames
          });
        });
      }

      // 5. รวมข้อมูลทั้งหมดเข้าด้วยกัน
      const formattedSessions = sessionsData.map(session => {
        const sessionOrders = (ordersData || [])
          .filter(o => o.session_id === session.id)
          .map(order => ({
            ...order,
            items: itemsMap[order.id] || []
          }));

        return {
          ...session,
          table_number: tablesMap[session.table_id] || 'ไม่ระบุ',
          orders: sessionOrders
        };
      });

      setActiveSessions(formattedSessions);
    } catch (err) {
      console.error('Fetch kitchen data error:', err);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenData();

    // ฟังเหตุการณ์อัปเดตแบบ Realtime
    const channel = supabase
      .channel('kitchen_realtime_v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchKitchenData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchKitchenData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchKitchenData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ฟังก์ชันเช็คบิล / ปิดโต๊ะ
  const handleCloseSession = async (sessionId, tableNum) => {
    if (!confirm(`ยืนยันการเช็คบิล/เคลียร์ โต๊ะ ${tableNum} ใช่ไหมเหมียว? 🐾`)) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'closed'
        })
        .eq('id', sessionId);

      if (error) throw error;

      alert(`เช็คบิล โต๊ะ ${tableNum} เรียบร้อยแล้วครับ! 🎉`);
      fetchKitchenData();
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
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
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
              รายการออเดอร์และเช็คบิลแบบเรียลไทม์ 🐾
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={fetchKitchenData}
              style={{
                padding: '10px 16px',
                borderRadius: 16,
                border: 'none',
                backgroundColor: '#FF7597',
                color: '#FFF',
                fontWeight: 'bold',
                fontSize: 14,
                cursor: 'pointer'
              }}>
              🔄 รีเฟรช
            </button>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '10px 16px',
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
        </div>

        {errorMessage && (
          <div style={{ padding: 14, backgroundColor: '#FFEBE9', color: '#D32F2F', borderRadius: 16, marginBottom: 20, fontWeight: 'bold', fontSize: 14 }}>
            ⚠️ {errorMessage}
          </div>
        )}

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
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: 20
          }}>
            {activeSessions.map((session) => {
              const isBillRequested = session.status === 'bill_requested';

              return (
                <div key={session.id} style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  border: isBillRequested ? '3px solid #FF4D6D' : '3px solid #FFC6D9',
                  boxShadow: isBillRequested ? '0 6px 20px rgba(255, 77, 109, 0.4)' : '0 6px 20px rgba(255, 182, 193, 0.3)',
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
                          โต๊ะ {session.table_number}
                        </span>
                        <span style={{ fontSize: 12, color: '#885060', marginLeft: 8 }}>
                          ({session.headcount || 1} ท่าน)
                        </span>
                      </div>
                      
                      {/* ป้ายเตือนเมื่อมีการเรียกเช็คบิล */}
                      {isBillRequested ? (
                        <span style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          backgroundColor: '#FFEBE9',
                          color: '#D32F2F',
                          borderRadius: 12,
                          fontWeight: 'bold'
                        }}>
                          🔔 เรียกเช็คบิล!
                        </span>
                      ) : (
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
                      )}
                    </div>

                    {/* รายการออเดอร์ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                      {session.orders.length === 0 ? (
                        <div style={{ fontSize: 13, color: '#A06B78', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                          ยังไม่มีออเดอร์ใหม่เข้ามา 🍦
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
                              ออเดอร์ #{index + 1}
                            </div>

                            {order.items.length === 0 ? (
                              <div style={{ fontSize: 13, color: '#4A2E35' }}>🍦 สั่งชุดไอศกรีมบุฟเฟต์</div>
                            ) : (
                              order.items.map((item, i) => (
                                <div key={item.id || i} style={{ marginBottom: 4 }}>
                                  {/* แสดงชื่อเมนูพร้อมจำนวน */}
                                  <div style={{ fontSize: 14, fontWeight: 'bold', color: '#4A2E35', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>🍨 {item.name}</span>
                                    <span style={{ color: '#FF5C8A' }}>x{item.quantity || 1}</span>
                                  </div>

                                  {/* แสดงท็อปปิ้งเสริม (ถ้ามี) */}
                                  {item.options && item.options.length > 0 && (
                                    <div style={{ paddingLeft: 12, fontSize: 12, color: '#885060' }}>
                                      {item.options.map((optName, optIdx) => (
                                        <div key={optIdx}>+ {optName}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ปุ่มเช็คบิล */}
                  <button
                    onClick={() => handleCloseSession(session.id, session.table_number)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 16,
                      border: 'none',
                      backgroundColor: isBillRequested ? '#D32F2F' : '#FF4D6D',
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(255, 77, 109, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justify.content: 'center',
                      gap: 6
                    }}>
                    💰 เช็คบิล & ปิดโต๊ะ {session.table_number}
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
