"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`
        id, created_at, status,
        sessions ( tables ( table_number ) ),
        order_items (
          quantity,
          menu_items ( name, is_buffet ),
          order_item_options ( buffet_options ( category, name ) )
        )
      `)
      .neq("status", "completed")
      .order("created_at", { ascending: true });

    if (data) setOrders(data);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel("kitchen-realtime").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders()).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const completeOrder = async (id) => {
    await supabase.from("orders").update({ status: "completed" }).eq("id", id);
    fetchOrders();
  };

  return (
    <div style={{ padding: "2rem", backgroundColor: "#111827", color: "#fff", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#f472b6", borderBottom: "1px solid #374151", paddingBottom: "1rem" }}>👨‍🍳 จอสั่งงานครัว (Realtime)</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {orders.map((o) => (
          <div key={o.id} style={{ backgroundColor: "#1f2937", border: "2px solid #ec4899", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#db2777", padding: "0.75rem 1rem", fontWeight: "bold" }}>
              โต๊ะ {o.sessions?.tables?.table_number || "-"}
            </div>
            <div style={{ padding: "1rem" }}>
              {o.order_items?.map((item, idx) => (
                <div key={idx} style={{ marginBottom: "0.5rem" }}>
                  <strong>{item.menu_items?.name || "รายการตักเพิ่ม"} x{item.quantity}</strong>
                  {item.order_item_options?.map((opt, oIdx) => (
                    <div key={oIdx} style={{ fontSize: "0.85rem", color: "#fbcfe8", marginLeft: "0.5rem" }}>
                      • {opt.buffet_options?.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={() => completeOrder(o.id)} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#10b981", color: "#fff", border: "none", fontWeight: "bold", cursor: "pointer" }}>
              ✓ ทำเสร็จแล้ว
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}