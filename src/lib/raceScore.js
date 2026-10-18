// Antrenman yarışları: antrenman planının `races` alanında durur (ek koleksiyon, ek kural yok).
// races = [{ id, name, startAt (ms, sayaç 0 olduğunda), finishes: [{ id, name, code?, t? (startan beri sn) }] }]
// finishes bitiş sırasıdır; kodlu olan (DNF, DNS…) yer almaz, arkasındakiler bir sıra öne geçer.
// Puanlama yelken yarış kurallarındaki düşük puan sistemi (RRS Ek A): 1. → 1 puan, 2. → 2 puan…
// Katılan = o gün yoklamada "geldi" olanlar + yarışlara eklenen herkes. Yarışa eklenmeyen katılan DNC olur.
// DNC, DNS, DNF, BFD, OCS, RET, DSQ: katılan sayısı + 1 puan. 4 yarış ve üstünde herkesin en kötü sonucu atılır.
// Eşitlik (A8): sonuçlar iyiden kötüye dizilir, ilk farkta iyi olan önde (atılan sonuç sayılmaz);
// yine eşitse son yarıştan geriye doğru, o yarışta iyi olan önde.
export const CODES = [
  ["DNF", "Bitirmedi"],
  ["DNS", "Start etmedi"],
  ["BFD", "Siyah bayrak"],
  ["OCS", "Erken çıktı"],
  ["RET", "Çekildi"],
  ["DSQ", "Diskalifiye"],
];
export const DISCARD_AT = 4;

const str = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const okCode = (c) => (CODES.some(([k]) => k === c) ? c : "");

// Kayıt temizliği (Firestore'a yazmadan önce)
export function cleanRaces(races) {
  return (Array.isArray(races) ? races : [])
    .map((r, i) => {
      const seen = new Set();
      const finishes = (Array.isArray(r?.finishes) ? r.finishes : [])
        .map((f) => ({ id: str(f?.id, 60), name: str(f?.name, 60), ...(okCode(f?.code) ? { code: f.code } : {}), ...(Number.isFinite(f?.t) && f.t >= 0 ? { t: Math.round(f.t) } : {}) }))
        .filter((f) => f.id && f.name && !seen.has(f.id) && seen.add(f.id))
        .slice(0, 80);
      return { id: str(r?.id, 30) || `y${i + 1}`, name: str(r?.name, 40) || `Yarış ${i + 1}`, ...(Number.isFinite(r?.startAt) ? { startAt: r.startAt } : {}), finishes };
    })
    .slice(0, 30);
}

// Sıradaki yer: kodlu olanlar sayılmaz. Sonuç { [id]: 1, … }
export function places(race) {
  const out = {};
  let n = 0;
  for (const f of race?.finishes || []) if (!f.code) out[f.id] = ++n;
  return out;
}

// Katılanlar: yoklamada gelenler ({ id, name }) + yarışlara eklenen herkes, ad sırasıyla
export function entrantsOf(present, races) {
  const m = new Map();
  for (const a of present || []) if (a?.id) m.set(a.id, a.name);
  for (const r of races || []) for (const f of r.finishes || []) if (!m.has(f.id)) m.set(f.id, f.name);
  return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => String(a.name).localeCompare(String(b.name), "tr"));
}

// Puan durumu. Sonuç { n, penalty, discard (atılan sayısı), rows: [{ id, name, cells: [{ pts, place, code, drop }], total, net, rank }] }
export function standings(races, present) {
  const list = races || [];
  const entrants = entrantsOf(present, list);
  const n = entrants.length;
  const penalty = n + 1;
  const discard = list.length >= DISCARD_AT ? 1 : 0;
  const pl = list.map(places);
  const rows = entrants.map((e) => {
    const cells = list.map((r, i) => {
      const f = (r.finishes || []).find((x) => x.id === e.id);
      if (!f) return { pts: penalty, code: "DNC" };
      if (f.code) return { pts: penalty, code: f.code };
      return { pts: pl[i][e.id], place: pl[i][e.id] };
    });
    if (discard && cells.length) {
      let w = 0;
      cells.forEach((c, i) => (c.pts >= cells[w].pts ? (w = i) : null)); // eşit en kötülerden sonuncusu
      cells[w] = { ...cells[w], drop: true };
    }
    const total = cells.reduce((s, c) => s + c.pts, 0);
    const net = total - cells.filter((c) => c.drop).reduce((s, c) => s + c.pts, 0);
    return { ...e, cells, total, net };
  });
  const tie = (a, b) => {
    const sa = a.cells.filter((c) => !c.drop).map((c) => c.pts).sort((x, y) => x - y);
    const sb = b.cells.filter((c) => !c.drop).map((c) => c.pts).sort((x, y) => x - y);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
    for (let i = a.cells.length - 1; i >= 0; i--) if (a.cells[i].pts !== b.cells[i].pts) return a.cells[i].pts - b.cells[i].pts;
    return String(a.name).localeCompare(String(b.name), "tr");
  };
  rows.sort((a, b) => a.net - b.net || tie(a, b));
  rows.forEach((r, i) => (r.rank = i + 1));
  return { n, penalty, discard, rows };
}

// Yarışın başlangıcı: yarışa start zamanı yazılmamışsa ve sayaç son 2 saat içinde 0'a ulaştıysa, ilk bitişte
// o an start sayılır (sayaç başka bir yarışa start olmadıysa). Sayaçsız yarışta süre yazılmaz.
export function startFor(race, races, zero, now = Date.now()) {
  if (Number.isFinite(race?.startAt)) return race.startAt;
  if (!Number.isFinite(zero) || zero > now || now - zero > 2 * 3600e3) return null;
  if ((races || []).some((r) => r.id !== race?.id && r.startAt === zero)) return null;
  return zero;
}

// Bitiş ekle: sporcu sıranın sonuna (varsa süresiyle)
export function addFinish(race, a, now = Date.now()) {
  if ((race.finishes || []).some((f) => f.id === a.id)) return race;
  const t = Number.isFinite(race.startAt) ? Math.max(0, Math.round((now - race.startAt) / 1000)) : undefined;
  return { ...race, finishes: [...(race.finishes || []), { id: a.id, name: a.name, ...(t != null ? { t } : {}) }] };
}
export const setCode = (race, id, code) => ({ ...race, finishes: race.finishes.map((f) => (f.id === id ? (code ? { ...f, code } : (({ code: _, ...x }) => x)(f)) : f)) });
export const removeFinish = (race, id) => ({ ...race, finishes: race.finishes.filter((f) => f.id !== id) });
// Sırayı değiştir: listede bir yukarı (-1) ya da aşağı (+1)
export function moveFinish(race, id, d) {
  const l = [...race.finishes];
  const i = l.findIndex((f) => f.id === id);
  const j = i + d;
  if (i < 0 || j < 0 || j >= l.length) return race;
  [l[i], l[j]] = [l[j], l[i]];
  return { ...race, finishes: l };
}
export const newRace = (races) => {
  const used = new Set((races || []).map((r) => r.id));
  let k = (races || []).length + 1;
  while (used.has(`y${k}`)) k++;
  return { id: `y${k}`, name: `Yarış ${(races || []).length + 1}`, finishes: [] };
};
export const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
