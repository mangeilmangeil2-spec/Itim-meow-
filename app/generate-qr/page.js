'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabaseClient';

export default function GenerateQRPage() {
  const [tables, setTables] = useState([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);

    async function fetchTables() {
      const { data, error: fetchError } = await supabase
        .from('tables')
        .select('*')
        .order('table_number');

      if (fetchError) setError(fetchError.message);
      else setTables(data ?? []);
    }

    fetchTables();
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#374151' }}>คิวอาร์โค้ดประจำโต๊ะ</h1>

      {error && (
        <p style={{ textAlign: 'center', color: '#b91c1c' }}>
          โหลดข้อมูลโต๊ะไม่สำเร็จ: {error}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', marginTop: '2rem' }}>
        {tables.map((table) => {
          const orderUrl = `${baseUrl}/order/${table.table_number}`;

          return (
            <div
              key={table.id}
              style={{
                backgroundColor: '#fff',
                padding: '1.5rem',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}
            >
              <h2 style={{ color: '#db2777', margin: '0 0 1rem' }}>
                โต๊ะ {table.table_number}
              </h2>
              <QRCodeSVG value={orderUrl} size={180} />
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '1rem', wordBreak: 'break-all' }}>
                {orderUrl}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
