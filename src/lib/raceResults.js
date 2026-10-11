// Yarış sonuçları: yarışın results alanı { fleet: tekne sayısı, rows: { sporcuId: { place, note, … } }, files: [künye] }.
// Satırda sonuç belgesinden gelenler de durur (resultSheet.js): cls sınıf, cat kategori (Senior/Junior/Bambino),
// place/n genel sıra ve sınıftaki sporcu sayısı, cp/cn Junior/Bambino sırası, gp/gn kızlar sırası, f belgenin kimliği.
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
      Object.assign(row, { cls, cat: ["Senior", "Junior", "Bambino"].includes(x?.cat) ? x.cat : "", n: int(x?.n, 1000), cp: int(x?.cp, 500), cn: int(x?.cn, 1000), gp: int(x?.gp, 500), gn: int(x?.gn, 1000) });
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
// En iyi ilk üç derecesi (genel, Junior/Bambino, kızlar): { pod: 1-3, top: "Optimist Junior sıralamasında üçüncü" } ya da null
const ORD = ["", "birinci", "ikinci", "üçüncü"];
export function podiumOf(x) {
  if (!x?.place && !x?.cp && !x?.gp) return null;
  const c = x.cls || "";
  const opts = [
    [x.place, c ? `${c} genel sıralamasında` : "yarışta"],
    [x.cat && x.cat !== "Senior" ? x.cp : 0, `${c} ${x.cat} sıralamasında`.trim()],
    [x.gp, `${c} kızlar sıralamasında`.trim()],
  ].filter(([n]) => n >= 1 && n <= 3);
  if (!opts.length) return null;
  const [n, where] = opts.reduce((a, b) => (b[0] < a[0] ? b : a));
  return { pod: n, top: `${where} ${ORD[n]}` };
}

export function withResults(list, ids, res) {
  return list
    .map((a, i) => {
      const p = podiumOf(res?.rows?.[ids[i]]);
      return { ...a, res: placeText(res, ids[i]), ...(p || {}), _p: p ? p.pod - 1000 : res?.rows?.[ids[i]]?.place || 999 };
    })
    .sort((a, b) => a._p - b._p)
    .map(({ _p, ...a }) => a);
}
