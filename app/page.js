import Link from 'next/link';

const linkStyle = {
  display: 'block',
  padding: '1.25rem',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  textAlign: 'center',
};

export default function HomePage() {
  return (
    <main
      style={{
        padding: '2rem',
        fontFamily: 'sans-serif',
        minHeight: '100vh',
        backgroundColor: '#fff0f5',
        color: '#2b2b2b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          color: '#db2777',
          fontSize: '2.8rem',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}
      >
        Itim Buffet 🍦
      </h1>

      <p
        style={{
          color: '#9d174d',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        ระบบสั่งไอศกรีมบุฟเฟต์ตักเพิ่ม
      </p>

      <nav
        aria-label="เมนูหลัก"
        style={{
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <Link
          href="/generate-qr"
          style={{
            ...linkStyle,
            backgroundColor: '#db2777',
            color: '#ffffff',
          }}
        >
          📱 จัดการ QR โต๊ะ
        </Link>

        <Link
          href="/kitchen"
          style={{
            ...linkStyle,
            backgroundColor: '#831843',
            color: '#ffffff',
          }}
        >
          👨‍🍳 หน้าครัว
        </Link>

        <Link
          href="/order/1"
          style={{
            ...linkStyle,
            backgroundColor: '#ffffff',
            color: '#db2777',
            border: '2px solid #db2777',
          }}
        >
          🍨 ทดลองสั่งโต๊ะ 1
        </Link>
      </nav>
    </main>
  );
}
