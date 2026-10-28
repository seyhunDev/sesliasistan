// Yarış sonuçları: yarışın results alanı { fleet: tekne sayısı, rows: { sporcuId: { place, note, … } }, files: [künye] }.
// Satırda sonuç belgesinden gelenler de durur (resultSheet.js): cls sınıf, cat kategori (Senior/Junior/Bambino),
// place/n genel sıra ve sınıftaki sporcu sayısı, cp/cn Junior/Bambino sırası, gp/gn kızlar sırası, f belgenin kimliği.
// files: yüklenen sonuç PDF'leri { id, name, size, parts, at, path, url } (noticeFile.js; yeniler Storage'da, eskiler Firestore'da parçalı).
// Sporcu kartında yarış geçmişi ve Instagram "sonuç" gönderisi buradan beslenir (saf fonksiyonlar, test edilir).
import { resultLine } from "./resultSheet";
import { storedOf } from "./storedFile";
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
      Object.assign(row, { cls, cat: ["Senior", "Junior", "Bambino"].includes(x?.cat) ? x.cat : "", n: int(x?.n, 1000), cp: int(x?.cp, 500), cn: int(x?.cn, 1000), gp: int(x?.gp, 500), gn: int(x?.gn, 1000), jp: int(x?.jp, 500), jn: int(x?.jn, 1000) });
      if (/^[\w-]{1,40}$/.test(x?.f || "")) row.f = x.f;
    }
    rows[id] = row;
  }
  const fleet = int(v.fleet, 1000);
  const files = (Array.isArray(v.files) ? v.files : [])
    .filter((f) => /^[\w-]{1,40}$/.test(f?.id || ""))
    .slice(0, 8)
    .map((f) => ({ id: f.id, name: S(f.name, 120) || "sonuç.pdf", size: Number(f.size) || 0, parts: Math.max(1, Number(f.parts) || 1), at: S(f.at, 10), ...storedOf(f) }));
  if (!Object.keys(rows).length && !fleet && !files.length) return null;
  // day: sonucun son yazıldığı gün; prev: önceki günün sıraları (raceDay.js stampResults; yarış günü "dünden fark")
  const day = /^\d{4}-\d{2}-\d{2}$/.test(v.day || "") ? v.day : "";
  const prev = Object.fromEntries(Object.entries(v.prev && typeof v.prev === "object" ? v.prev : {}).filter(([id]) => /^[\w-]{1,80}$/.test(id)).slice(0, 60).map(([id, p]) => [id, int(p, 500)]).filter(([, p]) => p));
  return { fleet, rows, ...(files.length ? { files } : {}), ...(day ? { day } : {}), ...(Object.keys(prev).length ? { prev } : {}) };
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
    .map((a, i) => {
      const x = res?.rows?.[ids[i]];
      // r: sıralar (Instagram sonuç açıklaması kategori kategori yazar)
      const r = x?.place ? { cls: x.cls || "", cat: x.cat || "", place: x.place, n: x.n || "", cp: x.cp || "", cn: x.cn || "", gp: x.gp || "", gn: x.gn || "" } : null;
      return { ...a, res: placeText(res, ids[i]), ...(r ? { r } : {}), _p: x?.place || 999 };
    })
    .sort((a, b) => a._p - b._p)
    .map(({ _p, ...a }) => a);
}
