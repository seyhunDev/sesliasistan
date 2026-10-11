// Yarış sonuçları: yarışın results alanı { fleet: tekne sayısı, rows: { sporcuId: { place, note, … } }, files: [künye] }.
// Satırda sonuç belgesinden gelenler de durur (resultSheet.js): cls sınıf, cat kategori (Senior/Junior/Bambino),
// n kategorideki sporcu sayısı, gp/gn kızlar sırası ve sayısı, ov/ovN sınıfın genelindeki sıra, f belgenin kimliği.
// files: yüklenen sonuç PDF'leri { id, name, size, parts, at } (noticeFile.js ile parçalı saklanır).
// Sporcu kartında yarış geçmişi ve Instagram "sonuç" gönderisi buradan beslenir (saf fonksiyonlar, test edilir).
import { resultLine } from "./resultSheet";
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
    if (!place && !note) continue;
    const row = { place, note };
    const cls = S(x?.cls, 30);
    if (cls) {
      Object.assign(row, { cls, cat: ["Senior", "Junior", "Bambino"].includes(x?.cat) ? x.cat : "", n: int(x?.n, 1000), gp: int(x?.gp, 500), gn: int(x?.gn, 1000), ov: int(x?.ov, 1000), ovN: int(x?.ovN, 1000) });
      if (/^[\w-]{1,40}$/.test(x?.f || "")) row.f = x.f;
    }
    rows[id] = row;
  }
  const fleet = int(v.fleet, 1000);
  const files = (Array.isArray(v.files) ? v.files : [])
    .filter((f) => /^[\w-]{1,40}$/.test(f?.id || ""))
    .slice(0, 8)
    .map((f) => ({ id: f.id, name: S(f.name, 120) || "sonuç.pdf", size: Number(f.size) || 0, parts: Math.max(1, Number(f.parts) || 1), at: S(f.at, 10) }));
  if (!Object.keys(rows).length && !fleet && !files.length) return null;
  return files.length ? { fleet, rows, files } : { fleet, rows };
}

// "3. / 24" ya da "3." ya da not
export function placeText(res, id) {
  const x = res?.rows?.[id];
  if (!x) return "";
  if (x.cls) return [resultLine(x), x.note].filter(Boolean).join(" · ");
  const p = x.place ? `${x.place}.${res.fleet ? ` / ${res.fleet}` : ""}` : "";
  return [p, x.note].filter(Boolean).join(" · ");
}

// Sonuç girilebilir mi: yarış başladı
export const resultsOpen = (r, today) => !!r?.startDate && r.startDate <= today;

// Sporcunun yarış geçmişi: [{ id, name, date, place, text }] yeniden eskiye
export function historyOf(races, athleteId) {
  return races
    .filter((r) => (r.athleteIds || []).includes(athleteId) || r.results?.rows?.[athleteId])
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
