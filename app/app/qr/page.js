'use client';

export default function QRPage() {
  const baseUrl = 'https://itim-meow.vercel.app/order?table=';
  const tables = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFF0F3',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Kanit", sans-serif',
      color: '#4A2E35'
    }}>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
          }
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
          .qr-card {
            page-break-inside: avoid;
            border: 2px solid #FF7597 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* Header */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: 20,
          marginBottom: 24,
          boxShadow: '0 4px 12px rgba(255, 182, 193, 0.2)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: '#FF4D6D', fontWeight: '800' }}>
              📱 QR Code สำหรับตั้งโต๊ะ (โต๊ะ 1 - 10)
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#885060' }}>
              กดปุ่มด้านขวาเพื่อสั่งปริ้นท์แปะที่โต๊ะได้ทันทีเหมียว 🐾
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '10px 20px',
              borderRadius: 14,
              border: 'none',
              backgroundColor: '#FF4D6D',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 77, 109, 0.3)'
            }}>
            🖨️ พิมพ์ QR Code ทั้งหมด
          </button>
        </div>

        {/* QR Cards Grid */}
        <div className="qr-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20
        }}>
          {tables.map((tableNum) => {
            const orderUrl = `${baseUrl}${tableNum}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(orderUrl)}`;

            return (
              <div
                key={tableNum}
                className="qr-card"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 20,
                  textAlign: 'center',
                  border: '2px solid #FFC6D9',
                  boxShadow: '0 4px 16px rgba(255, 182, 193, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#FF4D6D',
                  marginBottom: 12,
                  backgroundColor: '#FFF0F3',
                  padding: '6px 16px',
                  borderRadius: 12,
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  🍨 โต๊ะ {tableNum}
                </div>

                <div style={{
                  padding: 10,
                  backgroundColor: '#FFF',
                  borderRadius: 16,
                  border: '1px solid #FFE4EC',
                  marginBottom: 12
                }}>
                  <img
                    src={qrImageUrl}
                    alt={`QR Code โต๊ะ ${tableNum}`}
                    width={180}
                    height={180}
                    style={{ display: 'block', borderRadius: 8 }}
                  />
                </div>

                <div style={{ fontSize: 14, fontWeight: '700', color: '#4A2E35', marginBottom: 2 }}>
                  สแกนสั่งอาหารที่นี่
                </div>
                <div style={{ fontSize: 12, color: '#885060' }}>
                  Itim-meow Buffet 🐾
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
