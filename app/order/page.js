'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase'; // ปรับ Path ตามโครงสร้างโปรเจกต์ของคุณ

// 1. หมวดหมู่รายการอาหาร
const categories = [
  { key: 'flavor', label: '🍦 ไอติม (รส)' },
  { key: 'topping', label: '🍡 ท็อปปิ้ง' },
  { key: 'sauce', label: '🍯 ซอส' },
  { key: 'drink', label: '🥤 เครื่องดื่ม' },
];

// 2. ฟังก์ชันตัดอีโมจิเก่าที่ติดมากับชื่อใน DB ออก
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
  const sessionId = searchParams?.get('session_id');

  const [activeCategory, setActiveCategory] = useState('flavor');
  const [buffetOptions, setBuffetOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ดึงข้อมูลเมนูอาหาร
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

  // กรองรายการตามหมวดหมู่
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

  // เลือก / ยกเลิกรายการ
  const toggleSelectOption = (option) => {
    setSelectedOptions((prev) => {
      const exists = prev.find((item) => item.id === option.id);
      if (exists) {
        return prev.filter((item) => item.id !== option.id);
      } else {
        return [...prev, option];
      }
    });
  };

  // ฟังก์ชันส่งออเดอร์เข้าครัว
  const handleSubmitOrder = async () => {
    if (selectedOptions.length === 0) {
      alert('กรุณาเลือกรายการอาหารก่อนส่งออเดอร์เหมียว! 🐾');
      return;
    }

    try {
      setSubmitting(true);

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert([{ session_id: sessionId ? parseInt(sessionId) : null, status: 'pending' }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const { data: itemData, error: itemErr } = await supabase
        .from('order_items')
        .insert([{ order_id: orderData.id, quantity: 1 }])
        .select()
        .single();

      if (itemErr) throw itemErr;

      const optionInserts = selectedOptions.map((opt) => ({
        order_item_id: itemData.id,
        option_id: opt.id,
      }));

      const { error: optErr } = await supabase
        .from('order_item_options')
        .insert(optionInserts);

      if (optErr) throw optErr;

      alert('ส่งออเดอร์เรียบร้อยแล้วเหมียว! 🍨🎉');
      setSelectedOptions([]);
    } catch (err) {
      console.error('Submit order error:', err);
      alert('เกิดข้อผิดพลาดในการส่งออเดอร์: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ฟังก์ชันเรียกเช็คบิล
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
      padding: '20px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Kanit", "Mitr", sans-serif',
      color: '#4A2E35'
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        
        {/* Header + ปุ่มเช็คบิล */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          backgroundColor: '#FFFFFF',
          padding: '12px 18px',
          borderRadius: 20,
          boxShadow: '0 2px 10px rgba(255, 182, 193, 0.2)',
          border: '1px solid #FFE4EC'
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: '800', color: '#FF5C8A', margin: 0 }}>
              🍨 เลือกเมนูไอศกรีม
            </h1>
            <p style={{ fontSize: 12, color: '#885060', margin: '2px 0 0 0' }}>
              สั่งได้ไม่อั้นตามใจชอบเหมียว 🐾
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestBill}
            style={{
              padding: '8px 14px',
              borderRadius: 14,
              border: '2px solid #FF7597',
              backgroundColor: '#FFF0F3',
              color: '#FF4D6D',
              fontWeight: 'bold',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 8px rgba(255, 117, 151, 0.15)',
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
                  padding: '10px 16px',
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

        {/* กล่องแสดงรายการเมนู (จัดระยะเรียงซ้าย-ขวาใหม่) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          border: '2px solid #FFC6D9',
          padding: 16,
          boxShadow: '0 4px 16px rgba(255, 182, 193, 0.2)',
          marginBottom: 100
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#A06B78' }}>
              ยังไม่มีรายการในหมวดหมู่นี้เหมียว 🐱
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredOptions.map((o) => {
                const isSelected = selectedOptions.some((item) => item.id === o.id);
                const icon = getCategoryIcon(activeCategory);
                const nameWithoutIcon = cleanName(o.name);

                return (
                  <div
                    key={o.id}
                    onClick={() => toggleSelectOption(o)}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderRadius: 16,
                      backgroundColor: isSelected ? '#FFF0F3' : '#FFF9FA',
                      border: isSelected ? '2px solid #FF7597' : '1px solid #FFE4EC',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                    
                    {/* ชื่อเมนู + ไอคอนอยู่ซ้ายมือ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: 16, fontWeight: 'bold', color: '#4A2E35', wordBreak: 'break-word' }}>
                        {nameWithoutIcon}
                      </span>
                    </div>

                    {/* ปุ่มเลือกขยับไปขวาสุด */}
                    <button
                      type="button"
                      style={{
                        padding: '8px 18px',
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: isSelected ? '#FF4D6D' : '#FF7597',
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        fontSize: 14,
                        cursor: 'pointer',
                        flexShrink: 0,
                        boxShadow: isSelected ? '0 2px 8px rgba(255, 77, 109, 0.3)' : 'none'
                      }}>
                      {isSelected ? '✓ เลือกแล้ว' : '+ เพิ่ม'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* แถบสรุปรายการ & ปุ่มส่งออเดอร์ */}
        {selectedOptions.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 568,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: '14px 20px',
            border: '2px solid #FF7597',
            boxShadow: '0 8px 24px rgba(255, 77, 109, 0.25)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            zIndex: 100
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#885060' }}>รายการที่เลือก</div>
              <div style={{ fontSize: 16, fontWeight: '800', color: '#FF4D6D' }}>
                {selectedOptions.length} รายการ
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                borderRadius: 16,
                border: 'none',
                backgroundColor: submitting ? '#CCCCCC' : '#FF4D6D',
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontSize: 15,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(255, 77, 109, 0.3)'
              }}>
              {submitting ? 'กำลังส่ง...' : '🚀 ยืนยันส่งออเดอร์'}
            </button>
          </div>
        )}

      </div>
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
