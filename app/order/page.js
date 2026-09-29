'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// 1. หมวดหมู่เมนู
const categories = [
  { key: 'flavor', label: '🍦 ไอติม (รส)' },
  { key: 'topping', label: '🍡 ท็อปปิ้ง' },
  { key: 'sauce', label: '🍯 ซอส' },
  { key: 'drink', label: '🥤 เครื่องดื่ม' },
];

// 2. ตัดอีโมจิเก่าที่ติดมาจาก DB
const cleanName = (name) => {
  if (!name) return '';
  return name.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\s]+/gu, '').trim();
};

// 3. ฟังก์ชันเลือกไอคอนตามหมวดหมู่
const getCategoryIcon = (category) => {
  if (!category) return '🍦';
  const cat = String(category).toLowerCase().trim();

  if (cat.includes('flavor') || cat.includes('ไอติม') || cat.includes('รส')) return '🍦';
  if (cat.includes('topping') || cat.includes('ท็อปปิ้ง')) return '🍡';
  if (cat.includes('sauce') || cat.includes('ซอส')) return '🍯';
  if (cat.includes('drink') || cat.includes('เครื่องดื่ม') || cat.includes('น้ำ')) return '🥤';

  return '🍦';
};

function OrderComponent() {
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams?.get('session_id');
  const tableParam = searchParams?.get('table');

  const [sessionId, setSessionId] = useState(sessionIdParam || null);
  const [activeCategory, setActiveCategory] = useState('flavor');
  const [buffetOptions, setBuffetOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ค้นหา session_id อัตโนมัติกรณี URL มีแค่ ?table=X
  useEffect(() => {
    async function resolveSession() {
      if (sessionIdParam) {
        setSessionId(sessionIdParam);
        return;
      }

      if (tableParam) {
        try {
          // ดึง session ล่าสุดที่เปิดอยู่ของโต๊ะนี้
          const { data: tableData } = await supabase
            .from('tables')
            .select('id')
            .eq('table_number', tableParam)
            .single();

          if (tableData) {
            const { data: sessionData } = await supabase
              .from('sessions')
              .select('id')
              .eq('table_id', tableData.id)
              .in('status', ['open', 'bill_requested'])
              .order('id', { ascending: false })
              .limit(1)
              .single();

            if (sessionData) {
              setSessionId(sessionData.id);
            }
          }
        } catch (err) {
          console.error('Resolve session error:', err);
        }
      }
    }

    resolveSession();
  }, [sessionIdParam, tableParam]);

  // ดึงข้อมูลเมนู
  useEffect(() => {
    async function fetchOptions() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('buffet_options')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        setBuffetOptions(data || []);
      } catch (err) {
        console.error('Error fetching options:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOptions();
  }, []);

  // กรองเมนูตามหมวดหมู่
  const filteredOptions = buffetOptions.filter((o) => {
    if (!o.category) return false;
    const itemCat = String(o.category).toLowerCase().trim();
    const activeCat = String(activeCategory).toLowerCase().trim();

    if (activeCat === 'flavor') return itemCat.includes('flavor') || itemCat.includes('ไอติม') || itemCat.includes('รส');
    if (activeCat === 'topping') return itemCat.includes('topping') || itemCat.includes('ท็อปปิ้ง');
    if (activeCat === 'sauce') return itemCat.includes('sauce') || itemCat.includes('ซอส');
    if (activeCat === 'drink') return itemCat.includes('drink') || itemCat.includes('เครื่องดื่ม') || itemCat.includes('น้ำ');

    return itemCat === activeCat;
  });

  // จำนวนของรายการที่เลือก
  const getSelectedQuantity = (optionId) => {
    const item = selectedOptions.find((opt) => opt.id === optionId);
    return item ? item.quantity : 0;
  };

  // เพิ่ม / ลด จำนวน
  const updateQuantity = (option, delta) => {
    setSelectedOptions((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === option.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const newQty = currentQty + delta;
        if (newQty <= 0) {
          return prev.filter((item) => item.id !== option.id);
        } else {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
          return updated;
        }
      } else {
        if (delta > 0) {
          return [...prev, { ...option, quantity: 1 }];
        }
        return prev;
      }
    });
  };

  // รวมจำนวนชิ้นทั้งหมด
  const totalItemsCount = selectedOptions.reduce((sum, item) => sum + item.quantity, 0);

  // ส่งออเดอร์
  const handleSubmitOrder = async () => {
    if (selectedOptions.length === 0) {
      alert('กรุณาเลือกรายการอาหารก่อนส่งออเดอร์เหมียว! 🐾');
      return;
    }

    try {
      setSubmitting(true);

      // 1. บันทึกข้อมูลลงตาราง orders
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert([{ session_id: sessionId || null, status: 'pending' }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. บันทึกรายการลงตาราง order_items
      const orderItems = selectedOptions.map((opt) => ({
        order_id: orderData.id,
        menu_item_id: opt.id,
        quantity: opt.quantity,
      }));

      const { error: itemErr } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemErr) throw itemErr;

      alert('ส่งออเดอร์เรียบร้อยแล้วเหมียว! 🍨🎉');
      setSelectedOptions([]);
    } catch (err) {
      console.error('Submit order error:', err);
      alert('เกิดข้อผิดพลาดในการส่งออเดอร์: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // เรียกเช็คบิล
  const handleRequestBill = async () => {
    if (!confirm('คุณต้องการเรียกเช็คบิลใช่หรือไม่เหมียว? 🧾')) return;

    try {
      if (sessionId) {
        await supabase
          .from('sessions')
          .update({ status: 'bill_requested' })
          .eq('id', sessionId);
      }
      alert('แจ้งพนักงานเรียกเช็คบิลเรียบร้อยแล้วเหมียว! กรุณารอสักครู่ 🐾🧾');
    } catch (err) {
      console.error('Request bill error:', err);
      alert('เกิดข้อผิดพลาดในการเรียกเช็คบิล: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F5', color: '#FF5C8A', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍦🐱</div>
        <div style={{ fontWeight: 'bold', fontSize: 18 }}>กำลังโหลดเมนูอาหาร...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF5F7',
      padding: '16px 16px 140px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Kanit", "Mitr", sans-serif',
      color: '#4A2E35',
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        
        {/* Header ส่วนหัว + ปุ่มเช็คบิล */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: 20,
          boxShadow: '0 2px 12px rgba(255, 182, 193, 0.25)',
          border: '1px solid #FFE4EC',
          marginBottom: 16,
          boxSizing: 'border-box'
        }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: '800', color: '#FF5C8A', margin: 0, lineHeight: 1.2 }}>
              🍨 เลือกเมนูไอศกรีม
            </h1>
            <p style={{ fontSize: 12, color: '#885060', margin: '4px 0 0 0' }}>
              สั่งได้ไม่อั้นตามใจชอบเหมียว 🐾
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestBill}
            style={{
              padding: '8px 14px',
              borderRadius: 14,
              border: 'none',
              backgroundColor: '#FF5C8A',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 3px 10px rgba(255, 92, 138, 0.25)',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}>
            🧾 เช็คบิล
          </button>
        </div>

        {/* แถบหมวดหมู่ */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 16
        }}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 20,
                  border: isActive ? 'none' : '2px solid #FFC6D9',
                  backgroundColor: isActive ? '#FF7597' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#885060',
                  fontWeight: 'bold',
                  fontSize: 14,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 12px rgba(255, 117, 151, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* รายการเมนู */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          border: '2px solid #FFC6D9',
          padding: 16,
          boxShadow: '0 4px 16px rgba(255, 182, 193, 0.2)'
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#A06B78' }}>
              ยังไม่มีรายการในหมวดหมู่นี้เหมียว 🐱
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredOptions.map((o) => {
                const icon = getCategoryIcon(activeCategory);
                const nameWithoutIcon = cleanName(o.name);
                const qty = getSelectedQuantity(o.id);

                return (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: 18,
                      backgroundColor: qty > 0 ? '#FFF0F3' : '#FFF9FA',
                      border: qty > 0 ? '2px solid #FF7597' : '1px solid #FFE4EC',
                      boxShadow: '0 2px 8px rgba(255, 182, 193, 0.1)',
                      boxSizing: 'border-box'
                    }}>
                    
                    {/* ชื่อเมนู */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, paddingRight: 12 }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: 15, fontWeight: '700', color: '#4A2E35' }}>
                        {nameWithoutIcon}
                      </span>
                    </div>

                    {/* ปุ่มเพิ่ม / ปุ่มปรับจำนวน */}
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQuantity(o, 1)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 14,
                          border: 'none',
                          backgroundColor: '#FF7597',
                          color: '#FFFFFF',
                          fontWeight: 'bold',
                          fontSize: 14,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(255, 117, 151, 0.25)',
                          flexShrink: 0
                        }}>
                        + เพิ่ม
                      </button>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#FF7597',
                        borderRadius: 14,
                        padding: '3px',
                        boxShadow: '0 2px 8px rgba(255, 117, 151, 0.3)',
                        flexShrink: 0
                      }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(o, -1)}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            border: 'none',
                            backgroundColor: '#FFFFFF',
                            color: '#FF4D6D',
                            fontWeight: '800',
                            fontSize: 18,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                          -
                        </button>
                        <span style={{
                          padding: '0 10px',
                          color: '#FFFFFF',
                          fontWeight: 'bold',
                          fontSize: 14,
                          minWidth: 18,
                          textAlign: 'center'
                        }}>
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(o, 1)}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            border: 'none',
                            backgroundColor: '#FFFFFF',
                            color: '#FF4D6D',
                            fontWeight: '800',
                            fontSize: 18,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* แถบสรุปรายการ & ยืนยันส่งออเดอร์ */}
      {selectedOptions.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '568px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '12px 18px',
          border: '2px solid #FF7597',
          boxShadow: '0 8px 24px rgba(255, 77, 109, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 999,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: '#885060' }}>รายการที่เลือก</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#FF4D6D' }}>
              {totalItemsCount} ชิ้น ({selectedOptions.length} เมนู)
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: submitting ? '#CCCCCC' : '#FF4D6D',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(255, 77, 109, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              marginLeft: 'auto'
            }}>
            {submitting ? 'กำลังส่ง...' : '🚀 ยืนยันส่งออเดอร์'}
          </button>
        </div>
      )}

    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F5', color: '#FF5C8A' }}>
        กำลังโหลด...
      </div>
    }>
      <OrderComponent />
    </Suspense>
  );
}
