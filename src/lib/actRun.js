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

// ---- Kalan numaralı işler (4-15): görev satırının alanlarından hazır komut. Akış cümleyi yeniden okumaz;
// komut nesnesi akışın kendi okuyucusunun verdiği biçimde (incomeCommand, callCommand, athleteCommand, duesCommand,
// invoiceCommand, shopCommand). Metin işleri (gönderi, günlük, fitness) kalıp cümleyle kendi yoluna gider, yalnız yol önde
// (başka işe kaymaz). Sayfa açma (9) zaten yapay zekasız: kalıp cümle sayfa listesinden açılır.
const MONTHS = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
const CATS = [
  [/aidat/u, "Aidat"],
  [/bağış/u, "Bağış"],
  [/kano/u, "Kano eğitimi"],
  [/\bsup\b/u, "SUP eğitimi"],
  [/yetişkin/u, "Yetişkin eğitimi"],
  [/amatör|denizcilik/u, "Amatör denizcilik eğitimi"],
];
const low = (v) => actText(v, 60).toLocaleLowerCase("tr-TR");
const tl = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
// Ay adı → YYYY-AA (incomeCommand ile aynı: bu aydan sonraki ay geçen yılındır); boş → bu ay; okunamazsa ""
export function ymFrom(month, today) {
  const y = Number(String(today).slice(0, 4));
  const cur = Number(String(today).slice(5, 7));
  const m = low(month);
  if (!m) return `${y}-${String(cur).padStart(2, "0")}`;
  const i = MONTHS.indexOf(m.split(" ")[0]);
  if (i < 0) return "";
  return `${i + 1 > cur + 1 ? y - 1 : y}-${String(i + 1).padStart(2, "0")}`;
}

// { act, args } → yol adayı (assistRoute.js biçiminde) ya da null (alan eksik: eski yol)
export function routeFromAct(a, { today }) {
  if (!a) return null;
  const x = a.args || {};
  switch (Number(a.act)) {
    case 4: {
      const who = actText(x.who, 60);
      const ym = ymFrom(x.month, today);
      return who && ym ? { id: "more", pre: { kind: "income", cmd: { cat: "Aidat", amount: tl(x.amount), who, ym, note: "" } } } : null;
    }
    case 5: {
      const amount = tl(x.amount);
      if (!amount) return null;
      const c = low(x.cat);
      const cat = (CATS.find(([re]) => re.test(c)) || [null, "Diğer"])[1];
      const note = cat === "Diğer" && c && c !== "gelir" ? actText(x.cat, 60) : "";
      return { id: "more", pre: { kind: "income", cmd: { cat, amount, who: actText(x.who, 60), ym: ymFrom("", today), note } } };
    }
    case 7: {
      const items = actList(x.items);
      return items.length ? { id: "shopping", sc: { op: "add", what: items.join(", ") } } : null;
    }
    case 8: {
      const who = low(x.who);
      return who ? { id: "more", pre: { kind: "call", cmd: { who, hotel: /otel/u.test(who) } } } : null;
    }
    case 10: {
      const t = low(x.seller);
      return t ? { id: "invoice", ic: { op: "paid", t, cash: x.cash === true || x.cash === "true" }, asked: false } : null;
    }
    case 11: {
      const name = actText(x.name, 60);
      const y = actText(x.year, 4);
      return name ? { id: "more", pre: { kind: "athlete", cmd: { op: "add", name, birth: /^\d{4}$/.test(y) ? `${y}-01-01` : "", explicit: true } } } : null;
    }
    case 14:
      return { id: "more", pre: { kind: "dues", cmd: { op: "remind" } } };
    case 15:
      return { id: "more", pre: { kind: "dues", cmd: { op: "ask", paid: false } } };
    case 6:
      return { id: "post" };
    case 12:
      return { id: "log" };
    case 13:
      return { id: "fitness" };
    default:
      return null;
  }
}

// Yol listesinde aynı işin adayı varsa (izin ve koşullar orada denetlendi) öne alınır ve hazır komutla birleşir;
// yoksa liste olduğu gibi kalır (bu kişi bu işi yapamaz ya da kalıp tanınmadı: eski yol)
export function withAct(routes, direct) {
  const i = direct ? routes.findIndex((r) => r.id === direct.id) : -1;
  if (i < 0) return routes;
  return [{ ...routes[i], ...direct }, ...routes.filter((_, k) => k !== i)];
}
