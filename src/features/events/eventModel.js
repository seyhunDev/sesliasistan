// Etkinlikler (kamp, balık, gezi, konser…): ortak planlama kaydı. orgs/{orgId}/events.
// Hem telefon hem sunucu (yapay zeka cevabını temizlemek için) kullanır; "use client" yok, Firebase yok.
//
// event = {
//   title, kind (KINDS), place, startDate, endDate, people (kişi sayısı), note,
//   summary (genel değerlendirme), tips [metin],
//   needs [{ id, cat, title, done }]           ihtiyaç listesi (kategoriye göre gruplanır)
//   budget [{ id, title, amount, unit, qty, est }] unit "person" kişi başı | "shared" ortak; est: tahmini tutar
//   todos [{ id, title, date, done }]           yapılacaklar
//   planAdded (planlara eklendi mi), source ("ai" | "manual")
// }

export const KINDS = [
  ["kamp", "Kamp", "tent"],
  ["balik", "Balık", "fish"],
  ["gezi", "Gezi", "map"],
  ["konser", "Konser", "music"],
  ["piknik", "Piknik", "sun"],
  ["diger", "Diğer", "tag"],
];
const KIND_KEYS = KINDS.map(([k]) => k);
export const kindOf = (k) => KINDS.find(([x]) => x === k) || KINDS[KINDS.length - 1];

export const UNITS = [
  ["person", "Kişi başı"],
  ["shared", "Ortak"],
];

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const L = (v, n) => String(v ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (v) => (DATE.test(v || "") ? v : "");
const int = (v, max) => Math.min(Math.max(0, Math.round(Number(v) || 0)), max);
const num = (v, max = 10_000_000) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n * 100) / 100), max) : 0;
};
export const newId = () => Math.random().toString(36).slice(2, 10);
const id = (x) => (/^[\w-]{1,20}$/.test(x?.id || "") ? x.id : newId());
const arr = (a, max) => (Array.isArray(a) ? a : []).slice(0, max);

export const cleanNeed = (x) => ({ id: id(x), cat: S(x?.cat, 24) || "Diğer", title: S(x?.title, 80), done: !!x?.done });
export const cleanCost = (x) => {
  const amount = num(x?.amount);
  return {
    id: id(x),
    title: S(x?.title, 80) || "Masraf",
    amount,
    unit: x?.unit === "shared" ? "shared" : "person",
    qty: Math.max(1, int(x?.qty ?? 1, 365)),
    ...(x?.est === true && amount > 0 ? { est: true } : {}),
  };
};
export const cleanTodo = (x) => ({ id: id(x), title: S(x?.title, 100), date: date(x?.date), done: !!x?.done });

export function cleanEvent(e = {}) {
  const startDate = date(e.startDate);
  const endDate = date(e.endDate);
  return {
    title: S(e.title, 80),
    kind: KIND_KEYS.includes(e.kind) ? e.kind : "diger",
    place: S(e.place, 80),
    startDate,
    endDate: endDate && startDate && endDate > startDate ? endDate : "",
    people: int(e.people, 500),
    note: L(e.note, 2000),
    summary: L(e.summary, 1500),
    tips: arr(e.tips, 12).map((t) => S(t, 200)).filter(Boolean),
    needs: arr(e.needs, 120).map(cleanNeed).filter((x) => x.title),
    budget: arr(e.budget, 50).map(cleanCost),
    todos: arr(e.todos, 40).map(cleanTodo).filter((x) => x.title),
    planAdded: !!e.planAdded,
    source: e.source === "ai" ? "ai" : "manual",
  };
}

export const freshEvent = (kind = "diger") => cleanEvent({ kind });

// Bütçe hesabı: kişi başı kalemler × kişi sayısı (kişi yoksa 1), ortaklar olduğu gibi
export function totals(ev) {
  const P = Math.max(1, ev?.people || 0);
  const lines = (ev?.budget || []).map((c) => {
    const each = c.amount * (c.qty || 1);
    return { ...c, each, total: c.unit === "person" ? each * P : each };
  });
  const total = lines.reduce((n, l) => n + l.total, 0);
  return { lines, total, perPerson: total / P, people: P, est: lines.some((l) => l.est) };
}

export const tl = (n) => `${Math.round(n || 0).toLocaleString("tr-TR")}\u00a0₺`;

// Kalemin hesap açıklaması: "350 ₺ × 2 × 4 kişi" (adet/gün × kişi)
export function howText(l, people) {
  const parts = [tl(l.amount)];
  if (l.qty > 1) parts.push(String(l.qty));
  if (l.unit === "person") parts.push(`${Math.max(1, people || 0)} kişi`);
  return parts.join(" × ") + (l.unit === "shared" ? " (ortak)" : "");
}

// Gün sayısı (bitiş yoksa 1)
export function daysOf(ev) {
  if (!ev?.startDate) return 0;
  const a = Date.parse(`${ev.startDate}T12:00:00`);
  const b = Date.parse(`${ev.endDate || ev.startDate}T12:00:00`);
  return Math.max(1, Math.round((b - a) / 864e5) + 1);
}

// Kısa özet cümlesi (asistan söyler): "24 ihtiyaç, tahmini bütçe 8.500 ₺ (kişi başı 2.125 ₺), 5 yapılacak"
export function countsText(ev) {
  const t = totals(ev);
  const parts = [];
  if (ev.needs.length) parts.push(`${ev.needs.length} ihtiyaç`);
  if (t.total > 0) parts.push(`${t.est ? "tahmini " : ""}bütçe ${tl(t.total)}${ev.people > 1 ? ` (kişi başı ${tl(t.perPerson)})` : ""}`);
  if (ev.todos.length) parts.push(`${ev.todos.length} yapılacak`);
  return parts.join(", ");
}

// "7-9 Ekim", "30 Eylül-2 Ekim", "12 Ekim" (yıl yalnız bu yıl değilse)
export function rangeText(a, b) {
  if (!DATE.test(a || "")) return "";
  const x = new Date(`${a}T12:00:00`);
  const y = new Date(`${DATE.test(b || "") ? b : a}T12:00:00`);
  const mon = (d) => d.toLocaleDateString("tr-TR", { month: "long" });
  const yr = y.getFullYear() !== new Date().getFullYear() ? ` ${y.getFullYear()}` : "";
  if (+x === +y) return `${x.getDate()} ${mon(x)}${yr}`;
  if (x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear()) return `${x.getDate()}-${y.getDate()} ${mon(y)}${yr}`;
  return `${x.getDate()} ${mon(x)}-${y.getDate()} ${mon(y)}${yr}`;
}
