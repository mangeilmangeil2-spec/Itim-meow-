'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function StaffPage() {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
// ดึงข้อมูลออเดอร์พร้อมเมนูอาหารจาก buffet_options
const { data: ordersData, error: orderErr } = await supabase
  .from('orders')
  .select(`
    id,
    session_id,
    status,
    created_at,
    order_items (
      id,
      quantity,
      menu_item_id,
      buffet_options:menu_item_id (
        id,
        name
      )
    )
  `)
  .order('created_at', { ascending: false });

if (orderErr) console.error('Fetch orders error:', orderErr);
      // 2. ดึงข้อมูลออเดอร์พร้อมเมนูอาหาร
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          session_id,
          status,
          created_at,
          order_items (
            id,
            quantity,
            menu_item_id,
            buffet_options (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      setTables(tablesData || []);
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Fetch staff data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // ตั้งระบบอัปเดตหน้าครัวอัตโนมัติทุกๆ 3 วินาที (Auto-refresh)
    const interval = setInterval(() => {
      fetchData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const cleanName = (name) => {
    if (!name) return '';
    return name.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\s]+/gu, '').trim();
  };

  // ปิดโต๊ะ & เคลียร์บิล
  const handleCloseSession = async (sessionId, tableNum) => {
    if (!confirm(`ยืนยันเช็คบิลและปิดโต๊ะ ${tableNum} ใช่หรือไม่เหมียว? 🧾`)) return;

    try {
      await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);

      fetchData();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการปิดโต๊ะ: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F3', color: '#FF4D6D', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
        กำลังโหลดข้อมูลหน้าครัว... 🍨🐱
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF0F3',
      padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Kanit", sans-serif'
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: 20,
          marginBottom: 20,
          boxShadow: '0 4px 12px rgba(255, 182, 193, 0.2)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: '#FF4D6D', fontWeight: '800' }}>
              🧑‍🍳 หน้าครัว Itim-meow (Live Orders)
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#885060' }}>
              ระบบอัปเดตอัตโนมัติทุก 3 วินาที 🐾
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            style={{
              padding: '10px 18px',
              borderRadius: 14,
              border: 'none',
              backgroundColor: '#FF7597',
              color: '#FFFFFF',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
            🔄 รีเฟรชทันที
          </button>
        </div>

        {/* Table Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {tables.map((tbl) => {
            const activeSession = tbl.sessions?.find(s => s.status === 'open' || s.status === 'bill_requested');
            const tableOrders = activeSession
              ? orders.filter(o => o.session_id === activeSession.id)
              : [];

            return (
              <div
                key={tbl.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  border: activeSession ? (activeSession.status === 'bill_requested' ? '3px solid #FF3366' : '2px solid #FF7597') : '1px solid #FFE4EC',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 20, color: '#4A2E35', fontWeight: '800' }}>
                      โต๊ะ {tbl.table_number}
                    </h2>
                    {activeSession ? (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 'bold',
                        backgroundColor: activeSession.status === 'bill_requested' ? '#FFE5E5' : '#E6F4EA',
                        color: activeSession.status === 'bill_requested' ? '#FF3366' : '#137333'
                      }}>
                        {activeSession.status === 'bill_requested' ? '🧾 เรียกเช็คบิล' : '🟢 กำลังรับประทาน'}
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, backgroundColor: '#F0F0F0', color: '#888' }}>
                        ⚪ โต๊ะว่าง
                      </span>
                    )}
                  </div>

                  {activeSession ? (
                    tableOrders.length === 0 ? (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: '#A06B78', fontSize: 13 }}>
                        ยังไม่มีออเดอร์ใหม่เข้ามา 🍦
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                        {tableOrders.map((ord, idx) => (
                          <div key={ord.id || idx} style={{ padding: 10, backgroundColor: '#FFF5F7', borderRadius: 12, border: '1px solid #FFE4EC' }}>
                            <div style={{ fontSize: 11, color: '#885060', marginBottom: 6, fontWeight: 'bold' }}>
                              ออเดอร์ #{ord.id} ({ord.created_at ? new Date(ord.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''})
                            </div>
                            {ord.order_items?.map((item) => (
                              <div key={item.id} style={{ fontSize: 14, fontWeight: '700', color: '#4A2E35', margin: '2px 0' }}>
                                • {cleanName(item.buffet_options?.name || 'รายการอาหาร')} <span style={{ color: '#FF4D6D' }}>x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#CCC', fontSize: 13 }}>
                      โต๊ะนี้ยังไม่ได้เปิดใช้งาน
                    </div>
                  )}
                </div>

                {activeSession && (
                  <button
                    type="button"
                    onClick={() => handleCloseSession(activeSession.id, tbl.table_number)}
                    style={{
                      marginTop: 16,
                      width: '100%',
                      padding: '10px',
                      borderRadius: 12,
                      border: 'none',
                      backgroundColor: '#FF4D6D',
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}>
                    💰 เช็คบิล & ปิดโต๊ะ {tbl.table_number}
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
