import { icsOf } from "@/lib/ics";

// Plan ekranındaki işlemler (Ertele, Kopyala, Paylaş, Takvime ekle) için saf yardımcılar.
const D = (s) => new Date(`${s}T00:00`);
const pad = (n) => String(n).padStart(2, "0");
const shift = (s, n) => {
  const d = D(s);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// "6 Ekim Salı · 10:00" / "6 Ekim Salı – 8 Ekim Perşembe" / "6 Ekim Salı · Tüm gün"
export function planWhen(p) {
  if (!p?.date) return "";
  const long = (s) => D(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  if (p.endDate && p.endDate !== p.date) return `${long(p.date)} – ${long(p.endDate)}`;
  return `${long(p.date)} · ${p.time || "Tüm gün"}`;
}

// Kopyala / paylaş metni: başlık, zaman, yer (iptal edildiyse başta "İPTAL")
export function planText(p) {
  const head = `${p?.status === "cancelled" ? "İPTAL: " : ""}${String(p?.title || "").trim()}`;
  return [head, planWhen(p), p?.place ? `Yer: ${String(p.place).trim()}` : ""].filter(Boolean).join("\n");
}

// Ertele: tarih (ve varsa bitiş) n gün ileri; saat ve süre aynı kalır
export const postponePatch = (p, n = 1) => ({ date: shift(p.date, n), ...(p.endDate ? { endDate: shift(p.endDate, n) } : {}) });

// Tek planlık takvim dosyası (iPhone'da açınca "Takvime ekle" sorar)
export const planIcs = (p, now) => icsOf([p], { name: p?.title || "Plan", now });
export const icsName = (p) => `${String(p?.title || "plan").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "plan"}.ics`;
