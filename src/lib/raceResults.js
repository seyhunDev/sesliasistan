// Yarış sonuçları: yarışın results alanı { fleet: tekne sayısı, rows: { sporcuId: { place, note } } }.
// Sporcu kartında yarış geçmişi ve Instagram "sonuç" gönderisi buradan beslenir (saf fonksiyonlar, test edilir).
const int = (v, max) => {
  const n = Math.round(Number(String(v ?? "").replace(/[^\d]/g, "")));
  return Number.isFinite(n) && n > 0 && n <= max ? n : "";
};
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function cleanResults(v) {
  if (!v || typeof v !== "object") return null;
  const rows = {};
  for (const [id, x] of Object.entries(v.rows || {}).slice(0, 60)) {
    if (!/^[\w-]{1,80}$/.test(id)) continue;
    const place = int(x?.place, 500);
    const note = S(x?.note, 60);
    if (place || note) rows[id] = { place, note };
  }
  const fleet = int(v.fleet, 1000);
  return Object.keys(rows).length || fleet ? { fleet, rows } : null;
}

// "3. / 24" ya da "3." ya da not
export function placeText(res, id) {
  const x = res?.rows?.[id];
  if (!x) return "";
  const p = x.place ? `${x.place}.${res.fleet ? ` / ${res.fleet}` : ""}` : "";
  return [p, x.note].filter(Boolean).join(" · ");
}

// Sonuç girilebilir mi: yarış başladı
export const resultsOpen = (r, today) => !!r?.startDate && r.startDate <= today;

// Sporcunun yarış geçmişi: [{ id, name, date, place, text }] yeniden eskiye
export function historyOf(races, athleteId) {
  return races
    .filter((r) => (r.athleteIds || []).includes(athleteId))
    .map((r) => ({ id: r.id, name: r.name, date: r.startDate || "", place: r.results?.rows?.[athleteId]?.place || "", text: placeText(r.results, athleteId) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Instagram için: sporculara sonuç eklenir, dereceliler önce
export function withResults(list, ids, res) {
  return list
    .map((a, i) => ({ ...a, res: placeText(res, ids[i]), _p: res?.rows?.[ids[i]]?.place || 999 }))
    .sort((a, b) => a._p - b._p)
    .map(({ _p, ...a }) => a);
}
