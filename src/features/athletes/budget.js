// Yarış bütçesi: kalemler, kişi sayıları ve hesap. Yarış kaydının "budget" alanında durur (kişisel bilgi yok).
// Hem telefon hem sunucu (yapay zeka cevabını temizlemek için) kullanır; "use client" yok.
//
// budget = { staff, nights, items: [{ id, cat, title, amount, unit, qty, club, est? }], paid: { <sporcu id>: true } }
//   unit "athlete": sporcu başına (kayıt ücreti) → tutar × adet × sporcu
//   unit "person":  kişi başına, antrenör/refakatçi dahil (otel, yemek) → tutar × adet × (sporcu + antrenör)
//   unit "shared":  ortak (minibüs, tekne taşıma) → tutar × adet; sporculara bölünür
//   qty: adet ya da gece (otelde gece sayısı); club: kulüp karşılar (sporcu payına girmez)
//   est: tutar yapay zekanın tahmini (kullanıcı kalemi kaydedince kalkar); amount 0 = tutar henüz girilmedi
// Sporcu payı: sporcu başı kalemler + kişi başı kalemlerin tamamı (antrenör payı sporculara bölünür) + ortaklar / sporcu.

export const CATS = ["Kayıt", "Konaklama", "Ulaşım", "Yemek", "Tekne/Ekipman", "Diğer"];
export const UNITS = [
  ["athlete", "Sporcu başı"],
  ["person", "Kişi başı"],
  ["shared", "Ortak"],
];
const UNIT_KEYS = UNITS.map(([k]) => k);

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, max = 10_000_000) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n * 100) / 100), max) : 0;
};
const int = (v, max) => Math.min(Math.max(0, Math.round(Number(v) || 0)), max);
export const newId = () => Math.random().toString(36).slice(2, 10);

export function cleanItem(x) {
  const cat = CATS.includes(x?.cat) ? x.cat : "Diğer";
  return {
    id: /^[\w-]{1,20}$/.test(x?.id || "") ? x.id : newId(),
    cat,
    title: S(x?.title, 80) || cat,
    amount: num(x?.amount),
    unit: UNIT_KEYS.includes(x?.unit) ? x.unit : "athlete",
    qty: Math.max(1, int(x?.qty ?? 1, 365)),
    club: !!x?.club,
    ...(x?.est === true && num(x?.amount) > 0 ? { est: true } : {}),
  };
}

export function cleanBudget(b) {
  if (!b || typeof b !== "object") return null;
  const paid = Object.fromEntries(Object.entries(b.paid || {}).filter(([k, v]) => /^[\w-]{1,64}$/.test(k) && v === true).slice(0, 200));
  return {
    staff: int(b.staff, 50),
    nights: int(b.nights, 60),
    items: (Array.isArray(b.items) ? b.items : []).map(cleanItem).slice(0, 60),
    paid,
    // Gerçekleşen harcama: bu yarışa bağlanan fişlerin kimlikleri (fişler ayrı koleksiyonda)
    spent: [...new Set((Array.isArray(b.spent) ? b.spent : []).filter((x) => typeof x === "string" && /^[\w-]{1,64}$/.test(x)))].slice(0, 100),
  };
}

// Yarış tarihlerinden gece sayısı
export function nightsOf(r) {
  if (!r?.startDate) return 0;
  const a = new Date(`${r.startDate}T12:00:00`);
  const b = new Date(`${r.endDate || r.startDate}T12:00:00`);
  return Math.max(0, Math.round((b - a) / 864e5));
}

export const emptyBudget = (r) => ({ staff: 1, nights: nightsOf(r), items: [], paid: {}, spent: [] });

// Yarışa bağlanabilecek fişler: yarıştan 7 gün önce ile 3 gün sonrası arası (bağlı olanlar her zaman)
const shift = (d, n) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export function nearReceipts(receipts, r, spent = []) {
  if (!r?.startDate) return receipts.filter((x) => spent.includes(x.id));
  const from = shift(r.startDate, -7);
  const to = shift(r.endDate || r.startDate, 3);
  return receipts.filter((x) => spent.includes(x.id) || ((x.date || "") >= from && (x.date || "") <= to)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}
// Bağlı fişlerin toplamı (TL); totalTL: fiş tutarı kuruştan TL'ye
export const spentTotal = (receipts, spent = [], totalTL) => receipts.filter((x) => spent.includes(x.id)).reduce((n, x) => n + (totalTL(x) || 0), 0);

// Hesap: athletes = sporcu sayısı
export function totals(b, athletes) {
  const A = Math.max(0, athletes);
  const P = A + (b?.staff || 0);
  const lines = (b?.items || []).map((it) => {
    const each = it.amount * (it.qty || 1);
    const total = it.unit === "athlete" ? each * A : it.unit === "person" ? each * P : each;
    const share = it.club || !A ? 0 : total / A;
    return { ...it, each, total, share };
  });
  const total = lines.reduce((n, l) => n + l.total, 0);
  const club = lines.filter((l) => l.club).reduce((n, l) => n + l.total, 0);
  const perAthlete = lines.reduce((n, l) => n + l.share, 0);
  return { lines, total, club, fromAthletes: total - club, perAthlete, athletes: A, people: P };
}

export const tl = (n) => `${(Math.round((n || 0) * 100) / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;

// Kalemin hesap açıklaması: "3.500 ₺ × 4 gece × 6 kişi"
export function howText(l, t) {
  const parts = [tl(l.amount)];
  if (l.qty > 1) parts.push(`${l.qty} ${l.cat === "Konaklama" ? "gece" : "adet"}`);
  if (l.unit === "athlete") parts.push(`${t.athletes} sporcu`);
  if (l.unit === "person") parts.push(`${t.people} kişi`);
  return parts.join(" × ") + (l.unit === "shared" ? " (ortak)" : "");
}
