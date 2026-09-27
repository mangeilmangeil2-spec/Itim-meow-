'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  // สถานะหน้าจอ: 'home' = หน้าแรก, 'form' = กรอกข้อมูลเปิดโต๊ะ, 'success' = โชว์ QR Code
  const [step, setStep] = useState('home');

  // ข้อมูลฟอร์ม
  const [tableNumber, setTableNumber] = useState('');
  const [adults, setAdults] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // ฟังก์ชันกดเปิดโต๊ะ
  const handleOpenTable = async (e) => {
    e.preventDefault();
    if (!tableNumber) {
      alert('กรุณากรอกเลขโต๊ะ');
      return;
    }

    setLoading(true);
    try {
      // 1. เช็คหรือสร้างโต๊ะในฐานข้อมูล
      let { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNumber)
        .maybeSingle();

      if (!tableData) {
        const { data: newTable, error: createError } = await supabase
          .from('tables')
          .insert([{ table_number: tableNumber }])
          .select()
          .single();
        if (createError) throw createError;
        tableData = newTable;
      }

      // 2. ปิด Session เก่าของโต๊ะนี้ (ถ้ามี)
      await supabase
        .from('sessions')
        .update({ status: 'closed', closed_at: new Date() })
        .eq('table_id', tableData.id)
        .eq('status', 'open');

      // 3. สร้าง Session ใหม่สำหรับโต๊ะนี้
      const totalHeadcount = Number(adults) + Number(childrenCount);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          table_id: tableData.id,
          headcount: totalHeadcount || 1,
          status: 'open'
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 4. สร้าง URL สำหรับสั่งอาหารประจำโต๊ะ
      const orderUrl = `${window.location.origin}/order?table=${tableNumber}`;
      setQrUrl(orderUrl);
      setStep('success');

    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // คัดลอกลิงก์
  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9f9fb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>

      {/* ================= STEP 1: หน้าแรกสุด (รูปที่ 1) ================= */}
      {step === 'home' && (
        <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 32, fontWeight: '800', color: '#111', marginBottom: 12 }}>
            บุฟเฟต์ขนมไทย
          </h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
            ระบบสั่งอาหารและจัดการออเดอร์หน้าร้าน
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              onClick={() => setStep('form')}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#111',
                color: '#fff',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
              สร้าง QR โต๊ะ
            </button>
            <Link href="/staff" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: '1px solid #111',
                backgroundColor: '#fff',
                color: '#111',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                หน้าครัว
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ================= STEP 2: หน้าฟอร์มเปิดโต๊ะ (รูปที่ 2) ================= */}
      {step === 'form' && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: '36px 28px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          boxSizing: 'border-box'
        }}>
          <h2 style={{ fontSize: 24, fontWeight: '800', textAlign: 'center', color: '#111', marginBottom: 24 }}>
            เปิดโต๊ะบุฟเฟต์ขนมไทย
          </h2>

          <form onSubmit={handleOpenTable} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: 15, marginBottom: 8 }}>
                เลขโต๊ะ
              </label>
              <input
                type="text"
                placeholder="เช่น 1"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #e0e0e0',
                  fontSize: 16,
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>
                จำนวนผู้ใหญ่ รวมรีฟิลน้ำ (คน) — 209 บาท/คน
              </label>
              <input
                type="number"
                min="0"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #e0e0e0',
                  fontSize: 16,
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>
                จำนวนเด็ก/นักศึกษา (คน) — 109 บาท/คน
              </label>
              <input
                type="number"
                min="0"
                value={childrenCount}
                onChange={(e) => setChildrenCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #e0e0e0',
                  fontSize: 16,
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#111',
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
              {loading ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะ'}
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 3: หน้าแสดง QR Code (รูปที่ 3) ================= */}
      {step === 'success' && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: '36px 28px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>✅</span> เปิดโต๊ะสำเร็จ
          </h2>

          <p style={{ fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 20 }}>
            โต๊ะ {tableNumber} | ผู้ใหญ่ {adults} ท่าน | เด็ก/นักศึกษา {childrenCount} ท่าน
          </p>

          {/* QR Code Generator API */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`}
              alt="QR Code"
              style={{ width: 220, height: 220, borderRadius: 12 }}
            />
          </div>

          <div style={{
            padding: '12px',
            backgroundColor: '#f5f5f7',
            borderRadius: 10,
            fontSize: 13,
            color: '#555',
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
                borderRadius: 10,
                border: '1px solid #111',
                backgroundColor: '#fff',
                color: '#111',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
              {copied ? '✅ คัดลอกสำเร็จ!' : 'คัดลอกลิงก์'}
            </button>

            <button
              onClick={() => {
                setStep('form');
                setTableNumber('');
                setAdults(0);
                setChildrenCount(0);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#111',
                color: '#fff',
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
              เปิดโต๊ะใหม่
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
