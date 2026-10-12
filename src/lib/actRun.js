// Numaralı işin alanlarını doğrudan işe çevirir (Seyhun: "uygulamada hızlıca yapılabilecek yapıda versin, uygulama hemen
// yerine getirsin", 2026-10-12). Görev listesindeki yapay zeka işi numara + alanlarla verdiyse (actCatalog.js) yoklama ve
// yarış akışı ikinci kez yapay zekaya sormaz: adlar sporculara burada eşlenir. Emin olunamazsa (ad bulunamadı, iki yarış
// uyuyor, tarih okunamadı) null döner ve akış eski yoldan (cümle → yapay zeka) gider. Saf işlevler, testi yönlendirme ›
// "Numaralı iş: doğrudan".
import { OTHERS, actList, actText, isoDay } from "./actCatalog";
import { matchNames } from "./trainingLog";

const shift = (day, n) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
};

// "bugün" / boş → ekrandaki gün ya da bugün; "dün" → bir gün önce; YYYY-AA-GG aynen; başka söyleyiş "" (eski yol)
export function dayFrom(v, today, screenDay = "") {
  const d = actText(v, 20).toLocaleLowerCase("tr");
  if (!d || d === "bugün" || d === "bugun") return screenDay || today;
  if (d === "dün" || d === "dun") return shift(today, -1);
  return isoDay(d);
}

// Yoklama (iş 3): parseAttendance ile aynı biçim { date, changes, prev, names, unknown, message, total, others } ya da null
export function attendanceFromArgs(args, list, { today, day = "" } = {}) {
  const a = args || {};
  const date = dayFrom(a.day, today, day);
  if (!date || !list?.length) return null;
  const changes = {};
  for (const [key, state] of [["came", "present"], ["absent", "absent"], ["excused", "excused"]]) {
    const names = actList(a[key]);
    if (!names.length) continue;
    const m = matchNames(names, list);
    if (m.unknown.length) return null;
    m.ids.forEach((id) => (changes[id] = state));
  }
  if (!Object.keys(changes).length) return null;
  const others = OTHERS[actText(a.others, 10)] || "";
  if (others) list.forEach((x) => !(x.id in changes) && (changes[x.id] = others));
  const y = date.slice(0, 4);
  const md = date.slice(5);
  const prev = Object.fromEntries(Object.keys(changes).map((id) => [id, list.find((x) => x.id === id)?.att?.[y]?.[md] || null]));
  const names = Object.fromEntries(list.map((x) => [x.id, x.studentName]));
  return { date, changes, prev, names, unknown: [], message: "", total: list.length, others };
}

// Yarış adı karşılaştırması: Türkçe harfsiz, "yarışı/yarış" sözü atılmış
const plain = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâî]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i" })[c])
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(yarisi|yarisina|yarisinin|yaris)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Yarış (iş 1 oluştur, iş 2 sporcu ekle): /api/race'in döndürdüğü biçim (op create | update) ya da null
export function raceFromArgs(act, args, { athletes, races }) {
  const a = args || {};
  const names = actList(a.athletes);
  const m = matchNames(names, athletes || []);
  if (m.unknown.length) return null;
  if (Number(act) === 1) {
    const name = actText(a.name, 80);
    if (!name) return null;
    if ((races || []).some((r) => plain(r.name) === plain(name))) return null; // aynı adlı yarış var: yapay zeka karar versin
    const start = isoDay(a.start);
    const end = isoDay(a.end) || start;
    if ((a.start && !start) || (a.end && !isoDay(a.end)) || (start && end < start)) return null;
    return { op: "create", name, city: actText(a.city, 40), district: actText(a.district, 40), abroad: a.abroad === true || a.abroad === "true", startDate: start, endDate: start ? end : "", athleteIds: m.ids, note: "", unknown: [] };
  }
  if (Number(act) === 2) {
    const q = plain(a.race);
    if (!q || !m.ids.length) return null;
    const same = (races || []).filter((r) => plain(r.name) === q);
    const hits = same.length ? same : (races || []).filter((r) => plain(r.name).includes(q));
    if (hits.length !== 1) return null;
    return { op: "update", raceId: hits[0].id, name: "", city: "", district: "", abroad: false, startDate: "", endDate: "", athleteIds: m.ids, note: "", unknown: [] };
  }
  return null;
}
