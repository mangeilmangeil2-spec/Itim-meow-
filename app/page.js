'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const [step, setStep] = useState('home');

  const [tableNumber, setTableNumber] = useState('');
  const [adults, setAdults] = useState('0');
  const [childrenCount, setChildrenCount] = useState('0');

  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  // รายการโต๊ะในระบบ (1-15)
  const availableTables = Array.from({ length: 15 }, (_, i) => i + 1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleOpenTable = async (e) => {
    e.preventDefault();
    if (!tableNumber) {
      alert('กรุณาเลือกเลขโต๊ะก่อนครับ 🐾');
      return;
    }

    setLoading(true);
    try {
      const cleanTableNum = String(tableNumber);

      let { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', cleanTableNum)
        .maybeSingle();

      if (!tableData) {
        const { data: newTable, error: createError } = await supabase
          .from('tables')
          .insert([{ table_number: cleanTableNum }])
          .select()
          .single();

        if (createError) throw createError;
        tableData = newTable;
      }

      await supabase
        .from('sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('table_id', tableData.id)
        .eq('status', 'open');

      const totalHeadcount = (parseInt(adults) || 0) + (parseInt(childrenCount) || 0);

      let { error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          table_id: tableData.id,
          headcount: totalHeadcount > 0 ? totalHeadcount : 1,
          status: 'open'
        }]);

      if (sessionError) {
        await supabase
          .from('sessions')
          .insert([{
            table_id: tableData.id,
            status: 'open'
          }]);
      }

      const currentOrigin = origin || window.location.origin;
      const orderUrl = `${currentOrigin}/order?table=${encodeURIComponent(cleanTableNum)}`;
      setQrUrl(orderUrl);
      setStep('success');

    } catch (err) {
      console.error('Error:', err);
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF0F5',
      backgroundImage: 'radial-gradient(#FFB6C1 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Kanit", "Mitr", sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: '#4A2E35'
    }}>

      {/* STEP 1: หน้าแรก */}
      {step === 'home' && (
        <div style={{
          textAlign: 'center',
          maxWidth: 420,
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '40px 28px',
          borderRadius: 28,
          boxShadow: '0 10px 30px rgba(255, 182, 193, 0.4)',
          border: '3px solid #FFC6D9'
        }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🐱🍦</div>
          <h1 style={{ fontSize: 36, fontWeight: '800', color: '#FF5C8A', marginBottom: 8, letterSpacing: '-0.5px' }}>
            Itim-meow 🐾
          </h1>
          <p style={{ fontSize: 15, color: '#885060', marginBottom: 28, fontWeight: '500' }}>
            ระบบสั่งไอติมหวานเจี๊ยบ & จัดการออเดอร์สุดน่ารัก 💖
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            <button
              onClick={() => setStep('form')}
              style={{
                padding: '14px 24px',
                borderRadius: 20,
                border: 'none',
                backgroundColor: '#FF7597',
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 117, 151, 0.4)'
              }}>
              🐾 สร้าง QR โต๊ะ
            </button>
            <Link href="/staff" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '14px 24px',
                borderRadius: 20,
                border: '2px solid #FF9EAA',
                backgroundColor: '#FFF0F3',
                color: '#FF5C8A',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                👨‍🍳 หน้าครัว
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: ฟอร์มเปิดโต๊ะ */}
      {step === 'form' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          padding: '36px 28px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 10px 30px rgba(255, 182, 193, 0.4)',
          border: '3px solid #FFC6D9',
          boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 6 }}>🐾</div>
          <h2 style={{ fontSize: 24, fontWeight: '800', textAlign: 'center', color: '#FF5C8A', marginBottom: 24 }}>
            เปิดโต๊ะ Itim-meow
          </h2>

          <form onSubmit={handleOpenTable} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* ดร็อปดาวน์เลือกเลขโต๊ะ */}
            <div>
              <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: 15, color: '#663B47', marginBottom: 8 }}>
                🏷️ เลือกเลขโต๊ะ
              </label>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 16,
                  border: '2px solid #FFC6D9',
                  backgroundColor: '#FFF9FA',
                  fontSize: 18,
                  fontWeight: 'bold',
                  boxSizing: 'border-box',
                  outline: 'none',
                  textAlign: 'center',
                  color: tableNumber ? '#FF5C8A' : '#A06B78',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  textAlignLast: 'center'
                }}
              >
                <option value="" disabled>-- เลือกโต๊ะ --</option>
                {availableTables.map((num) => (
                  <option key={num} value={num} style={{ color: '#4A2E35', fontWeight: 'bold' }}>
                    โต๊ะ {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: 14, color: '#663B47', marginBottom: 8 }}>
                👑 จำนวนผู้ใหญ่ (คน) — 209 บาท/คน
              </label>
              <input
                type="number"
                min="0"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 16,
                  border: '2px solid #FFC6D9',
                  backgroundColor: '#FFF9FA',
                  fontSize: 16,
                  boxSizing: 'border-box',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: 14, color: '#663B47', marginBottom: 8 }}>
                🐣 จำนวนเด็ก/นักศึกษา (คน) — 109 บาท/คน
              </label>
              <input
                type="number"
                min="0"
                value={childrenCount}
                onChange={(e) => setChildrenCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 16,
                  border: '2px solid #FFC6D9',
                  backgroundColor: '#FFF9FA',
                  fontSize: 16,
                  boxSizing: 'border-box',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setStep('home')}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 18,
                  border: '2px solid #FFC6D9',
                  backgroundColor: '#FFF0F3',
                  color: '#885060',
                  fontSize: 15,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: 18,
                  border: 'none',
                  backgroundColor: '#FF7597',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 117, 151, 0.4)'
                }}>
                {loading ? 'กำลังเปิดโต๊ะ...' : '✨ เปิดโต๊ะเลย'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: โชว์ QR Code */}
      {step === 'success' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          padding: '36px 28px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 10px 30px rgba(255, 182, 193, 0.4)',
          border: '3px solid #FFC6D9',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>😻🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: '800', color: '#FF5C8A', marginBottom: 8 }}>
            เปิดโต๊ะ Itim-meow สำเร็จแล้วเหมียว!
          </h2>

          <p style={{ fontSize: 14, fontWeight: 'bold', color: '#663B47', marginBottom: 20 }}>
            โต๊ะ {tableNumber} | ผู้ใหญ่ {adults} ท่าน | เด็ก {childrenCount} ท่าน
          </p>

          <div style={{
            display: 'flex',
            justify: 'center',
            marginBottom: 20,
            padding: 16,
            backgroundColor: '#FFF0F3',
            borderRadius: 20,
            border: '2px dashed #FFB3C6'
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`}
              alt="QR Code"
              style={{ width: 200, height: 200, borderRadius: 12 }}
            />
          </div>

          <div style={{
            padding: '12px',
            backgroundColor: '#FFF9FA',
            borderRadius: 14,
            border: '1px solid #FFC6D9',
            fontSize: 13,
            color: '#885060',
            wordBreak: 'break-all',
            marginBottom: 16
          }}>
            {qrUrl}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleCopyLink}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 16,
                border: '2px solid #FF9EAA',
                backgroundColor: '#FFF0F3',
                color: '#FF5C8A',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
              {copied ? '✅ คัดลอกลิงก์เรียบร้อย!' : '📋 คัดลอกลิงก์'}
            </button>

            <button
              onClick={() => {
                setStep('form');
                setTableNumber('');
                setAdults('0');
                setChildrenCount('0');
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 16,
                border: 'none',
                backgroundColor: '#FF7597',
                color: '#fff',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 117, 151, 0.4)'
              }}>
              ➕ เปิดโต๊ะถัดไป
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
