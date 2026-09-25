export const metadata = {
  title: 'Itim Buffet',
  description: 'ระบบสั่งอาหารไอศกรีมบุฟเฟ่ต์',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}