export const metadata = {
  title: 'Itim Meow',
  description: 'ระบบสั่งไอติมผ่าน QR Code',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
