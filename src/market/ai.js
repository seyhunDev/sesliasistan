"use client";

// Yapay zekayla menü (/api/market-menu): { text } ya da { image: { mimeType, data } } → { isFood, name, serves, items }
// Marketteki ürün adları da gider ki malzemeler o adlarla gelsin.
import { authFetch } from "@/lib/authFetch";

export async function askMenu(payload, products = []) {
  const names = [...new Set(products.map((p) => p.name))];
  const res = await authFetch("/api/market-menu", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, products: names }), timeout: 30000 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Malzemeler çıkarılamadı");
  return data;
}
