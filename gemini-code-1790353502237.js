"use client";

import { use, useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function OrderPage({ params }) {
  const { tableNumber } = use(params);

  const [sessionId, setSessionId] = useState(null);
  const [flavors, setFlavors] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [sauces, setSauces] = useState([]);

  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  useEffect(() => {
    async function init() {
      const { data: tData } = await supabase.from("tables").select("id").eq("table_number", tableNumber).single();
      if (tData) {
        const { data: sData } = await supabase.from("sessions").select("id").eq("table_id", tData.id).eq("status", "active").single();
        if (sData) setSessionId(sData.id);
        else setShowModal(true);
      }
      const { data: opts } = await supabase.from("buffet_options").select("*").eq("is_available", true);
      if (opts) {
        setFlavors(opts.filter((o) => o.category === "flavor"));
        setToppings(opts.filter((o) => o.category === "topping"));
        setSauces(opts.filter((o) => o.category === "sauce"));
      }
    }
    if (tableNumber) init();
  }, [tableNumber]);

  const handleStart = async () => {
    const { data: tData } = await supabase.from("tables").select("id").eq("table_number", tableNumber).single();
    const { data: sData } = await supabase.from("sessions").insert([{ table_id: tData.id, status: "active" }]).select().single();
    
    const { data: menus } = await supabase.from("menu_items").select("*").eq("is_buffet", true);
    const adultMenu = menus?.find((m) => m.name.includes("ผู้ใหญ่"));
    const childMenu = menus?.find((m) => m.name.includes("เด็ก"));

    const { data: oData } = await supabase.from("orders").insert([{ session_id: sData.id, status: "confirmed" }]).select().single();
    
    const items = [];
    if (adults > 0 && adultMenu) items.push({ order_id: oData.id, menu_item_id: adultMenu.id, quantity: adults, price: adultMenu.price });
    if (children > 0 && childMenu) items.push({ order_id: oData.id, menu_item_id: childMenu.id, quantity: children, price: childMenu.price });
    
    await supabase.from("order_items").insert(items);
    setSessionId(sData.id);
    setShowModal(false);
  };

  const toggle = (id, list, setList) => {
    if (list.includes(id)) setList(list.filter((i) => i !== id));
    else setList([...list, id]);
  };

  const handleSubmit = async () => {
    if (selectedFlavors.length === 0) return alert("กรุณาเลือกรสชาติอย่างน้อย 1 รส");
    const { data: oData } = await supabase.from("orders").insert([{ session_id: sessionId, status: "pending" }]).select().single();
    const { data: iData } = await supabase.from("order_items").insert([{ order_id: oData.id, quantity: 1, price: 0 }]).select().single();
    
    const opts = [...selectedFlavors, ...selectedToppings, ...selectedSauces].map((optId) => ({
      order_item_id: iData.id,
      option_id: optId,
    }));
    await supabase.from("order_item_options").insert(opts);
    alert("ส่งออเดอร์เรียบร้อยครับ! 🍦");
    setSelectedFlavors([]);
    setSelectedToppings([]);
    setSelectedSauces([]);
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif", backgroundColor: "#fff0f5", minHeight: "100vh", maxWidth: "450px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", color: "#db2777" }}>Itim Buffet (โต๊ะ {tableNumber})</h2>
      
      <h3>🍨 เลือกรสชาติ</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {flavors.map((f) => (
          <button key={f.id} onClick={() => toggle(f.id, selectedFlavors, setSelectedFlavors)} style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #db2777", backgroundColor: selectedFlavors.includes(f.id) ? "#db2777" : "#fff", color: selectedFlavors.includes(f.id) ? "#fff" : "#374151" }}>
            {f.name}
          </button>
        ))}
      </div>

      <h3>🍓 เลือกท็อปปิ้ง</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {toppings.map((t) => (
          <button key={t.id} onClick={() => toggle(t.id, selectedToppings, setSelectedToppings)} style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #db2777", backgroundColor: selectedToppings.includes(t.id) ? "#db2777" : "#fff", color: selectedToppings.includes(t.id) ? "#fff" : "#374151" }}>
            {t.name}
          </button>
        ))}
      </div>

      <h3>🍫 ราดซอส</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        {sauces.map((s) => (
          <button key={s.id} onClick={() => toggle(s.id, selectedSauces, setSelectedSauces)} style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #db2777", backgroundColor: selectedSauces.includes(s.id) ? "#db2777" : "#fff", color: selectedSauces.includes(s.id) ? "#fff" : "#374151" }}>
            {s.name}
          </button>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={showModal} style={{ width: "100%", padding: "1rem", backgroundColor: "#db2777", color: "#fff", border: "none", borderRadius: "12px", fontSize: "1.1rem", fontWeight: "bold", marginTop: "1.5rem", cursor: "pointer" }}>
        ส่งสั่งตักเพิ่ม (ฟรี)
      </button>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "#fff", padding: "1.5rem", borderRadius: "16px", width: "100%", maxWidth: "300px", textAlign: "center" }}>
            <h3 style={{ color: "#db2777", marginTop: 0 }}>เปิดโต๊ะบุฟเฟ่ต์</h3>
            <div style={{ marginBottom: "1rem" }}>
              <p>ผู้ใหญ่ (199.-): <button onClick={() => setAdults(Math.max(0, adults - 1))}>-</button> {adults} <button onClick={() => setAdults(adults + 1)}>+</button></p>
              <p>เด็ก (99.-): <button onClick={() => setChildren(Math.max(0, children - 1))}>-</button> {children} <button onClick={() => setChildren(children + 1)}>+</button></p>
            </div>
            <button onClick={handleStart} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#db2777", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
              ยืนยันเปิดโต๊ะ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}