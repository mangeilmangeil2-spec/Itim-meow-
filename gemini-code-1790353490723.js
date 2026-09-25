import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", minHeight: "100vh", backgroundColor: "#fff0f5", color: "#2b2b2b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: "#db2777", fontSize: "2.8rem", marginBottom: "0.5rem" }}>Itim Buffet 🍦</h1>
      <p style={{ color: "#9d174d", marginBottom: "2rem" }}>ระบบสั่งไอศกรีมบุฟเฟต์ตักเพิ่ม</p>
      
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: "360px" }}>
        <li>
          <Link href="/generate-qr" style={{ display: "block", padding: "1.25rem", backgroundColor: "#db2777", color: "#ffffff", borderRadius: "12px", textDecoration: "none", fontWeight: "bold", textAlign: "center" }}>📱 /generate-qr</Link>
        </li>
        <li>
          <Link href="/kitchen" style={{ display: "block", padding: "1.25rem", backgroundColor: "#831843", color: "#ffffff", borderRadius: "12px", textDecoration: "none", fontWeight: "bold", textAlign: "center" }}>👨‍🍳 /kitchen</Link>
        </li>
        <li>
          <Link href="/order/1" style={{ display: "block", padding: "1.25rem", backgroundColor: "#ffffff", color: "#db2777", border: "2px solid #db2777", borderRadius: "12px", textDecoration: "none", fontWeight: "bold", textAlign: "center" }}>🍨 ทดลองสแกนโต๊ะ 1 (/order/1)</Link>
        </li>
      </ul>
    </main>
  );
}