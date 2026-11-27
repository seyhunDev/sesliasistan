"use client";

// /api/paket istemcisi (lib/paket.js; Seyhun 2026-11-27 sporcu paketleri, havale ile ödeme)
import { authFetch } from "@/lib/authFetch";

async function call(method, body, q = "") {
  const res = await authFetch(`/api/paket${q}`, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Olmadı, tekrar dene.");
  return j;
}
export const paketGetir = () => call("GET");
export const paketIste = (size, period) => call("POST", { size, period });
export const odemeYaptim = () => call("POST", { odedim: true });
export const istekIptal = () => call("POST", { iptal: true });
export const adminListe = () => call("GET", null, "?liste=1");
export const adminOnay = (uid) => call("PATCH", { uid, onay: true });
export const adminRed = (uid) => call("PATCH", { uid, red: true });
export const adminPaketVer = (uid, paket) => call("PATCH", { uid, paket });
export const adminOdemeKaydet = (odeme) => call("PATCH", { odeme });
