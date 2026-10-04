import { noText, totalTL } from "./receipts.js";

// Veri yedeği (Ayarlar › Yedek indir): Excel sayfaları ve tam JSON. Saf fonksiyonlar (test edilir).
// Sporcu kişisel bilgileri (ayrı kulüp projesinde) yedeğe girmez; bildirim abonelikleri ve küçük görseller atılır.

const DROP = new Set(["push", "thumb", "photo", "image", "dataUrl", "reminded", "ack"]);

// JSON için temizlik: Firestore zaman damgası → ISO, gereksiz/gizli alanlar atılır
export function clean(v, depth = 0) {
  if (v == null || depth > 8) return v ?? null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map((x) => clean(x, depth + 1));
  if (typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !DROP.has(k)).map(([k, x]) => [k, clean(x, depth + 1)]));
  return v;
}

const who = (ids, nameOf) => (ids || []).map((u) => nameOf?.(u) || "").filter(Boolean).join(", ");
const byDate = (k) => (a, b) => String(a[k] || "").localeCompare(String(b[k] || ""));

// { "Planlar": [[başlıklar], [satır]…], … }
export function backupSheets({ plans = [], tasks = [], notes = [], receipts = [], races = [], events = [], members = [] }, nameOf) {
  return {
    Planlar: [
      ["Tarih", "Bitiş", "Saat", "Başlık", "Yer", "Kategori", "Durum", "Sorumlu"],
      ...[...plans].sort(byDate("date")).map((p) => [p.date || "", p.endDate || "", p.time || "", p.title || "", p.place || "", p.cat || "", p.status === "cancelled" ? "İptal" : "", who(p.assignees, nameOf)]),
    ],
    Görevler: [
      ["Son tarih", "Başlık", "Durum", "Sorumlu"],
      ...[...tasks].sort(byDate("due")).map((t) => [t.due || "", t.title || "", t.done ? "Yapıldı" : "Açık", who(t.assignees, nameOf)]),
    ],
    Notlar: [["Oluşturma", "Başlık", "Metin"], ...[...notes].sort(byDate("createdAt")).map((n) => [String(n.createdAt || "").slice(0, 10), n.title || "", n.body || ""])],
    Fişler: [
      ["Tarih", "Yer", "Tutar (TL)", "Ödeme", "Fiş no"],
      ...[...receipts].sort(byDate("date")).map((r) => [r.date || String(r.createdAt || "").slice(0, 10), r.merchant || "", totalTL(r) || "", r.payStatus === "paid" ? "Ödendi" : r.payStatus === "pending" ? "Bekliyor" : "", noText(r.no)]),
    ],
    Yarışlar: [
      ["Başlangıç", "Bitiş", "Ad", "Yer", "Sporcu sayısı"],
      ...[...races].sort(byDate("startDate")).map((r) => [r.startDate || "", r.endDate || "", r.name || "", [r.district, r.city].filter(Boolean).join(", "), (r.athleteIds || []).length]),
    ],
    Etkinlikler: [
      ["Tarih", "Bitiş", "Tür", "Ad", "Yer", "Kişi"],
      ...[...events].sort(byDate("startDate")).map((e) => [e.startDate || "", e.endDate || "", e.kind || "", e.title || "", e.place || "", e.people || ""]),
    ],
    Kişiler: [
      ["Ad", "Tür", "Telefon", "E-posta", "Durum"],
      ...[...members].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "tr")).map((m) => [m.name || "", m.kind || "staff", m.phone || "", m.email || "", m.status === "left" ? "Ayrıldı" : ""]),
    ],
  };
}

export const backupName = (today, ext) => `sesli-asistan-yedek-${today}.${ext}`;
