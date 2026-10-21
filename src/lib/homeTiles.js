// Ana sayfadaki büyük kartların (Aidatlar, Yarışlar, Instagram, Antrenman günlüğü) yazıları.
// Firestore'a ek okuma yok: aidat ve gönderi özeti ilgili sayfa açılınca bu cihazda saklanır (sa-home-sum),
// yarış bilgisi raceHome.js'in zaten yaptığı okumadan, antrenman bellekteki planlardan gelir.
import { canLog, isLogNote, isTraining, monthLog } from "./trainingLog";
import { isFit, statusOf } from "./fitness/model";
import { monthRows } from "./dues";
import { planState } from "./agenda";

const KEY = "sa-home-sum";
export function readSum() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}
export function saveSum(part, value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readSum(), [part]: value }));
  } catch {}
}

const monthName = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
const cap = (s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
const dayGap = (ms, now) => Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(ms).setHours(0, 0, 0, 0)) / 864e5);

// Her kart: { big, sub, warn }. Büyük satır tek bakışta anlaşılır bir sonuç ("12/30 ödedi", "5 gün kaldı"), alt satır neyle ilgili olduğu.
// Aidat özeti: { ym, paidCount, count, pending } (aidat sayfası yazar)
export function duesTile(sum, ym) {
  const m = cap(monthName(ym));
  if (!sum || sum.ym !== ym) return { big: `${m} aidatı`, sub: "Görmek için dokun" };
  const left = Math.max(0, sum.count - sum.paidCount);
  return {
    big: `${sum.paidCount}/${sum.count} ödedi`,
    sub: sum.pending > 0 ? `${sum.pending} ödeme onay bekliyor` : left > 0 ? `${m} · ${left} kişi ödemedi` : `${m} · herkes ödedi`,
    warn: sum.pending > 0,
    bar: sum.count > 0 ? Math.min(1, sum.paidCount / sum.count) : null, // kartta doluluk çubuğu (ödeyenler / hepsi)
  };
}

// Aidat kartının canlı özeti: ana sayfa açılınca dues/settings (roster: etkin sporcular) ve bu ayın kaydı okunur (2 okuma),
// böylece sunucunun bankadan kendiliğinden yazdığı ödeme Aidatlar sayfası açılmadan da görünür. Bekleyen banka ödemesi
// sayısı yalnız Aidatlar sayfasında hesaplanır, son bilinen değer kalır.
export function duesLive(cfg, month, ym, prev) {
  const roster = cfg?.roster || [];
  if (!roster.length) return prev;
  const t = monthRows(roster.filter((a) => a.id && a.studentName), month || {}, cfg, ym);
  return { ym, paidCount: t.paidCount, count: t.count, pending: prev?.ym === ym ? prev.pending || 0 : 0 };
}

// Yarış: nextInfo (raceHome.js) { name (ilçe ya da adın ilk kelimesi), when ("5 gün", "yarın", "bugün", "sürüyor"), left } ve yaklaşan sayısı
export function raceTile(next, up) {
  if (!next) return { big: up > 0 ? `${up} yarış` : "Yarış yok", sub: up > 0 ? "Yaklaşan yarışlar" : "Yeni yarış ekle" };
  const big = /^\d/.test(next.when) ? `${next.when} kaldı` : cap(next.when);
  return { big, sub: `${next.name} yarışı · ${next.left > 0 ? `${next.left} iş eksik` : "hazır"}`, warn: next.left > 0 };
}

// Gönderi özeti: { count, last: { title, at } } (Instagram sayfası yazar)
export function postsTile(sum, now = Date.now()) {
  if (!sum?.count) return { big: "Gönderi yok", sub: "Yeni gönderi hazırla" };
  const g = sum.last?.at ? dayGap(sum.last.at, now) : null;
  const when = g == null ? "" : g <= 0 ? "bugün" : g === 1 ? "dün" : `${g} gün önce`;
  return { big: `${sum.count} gönderi`, sub: when ? `Sonuncusu ${when}` : sum.last?.title || "Kayıtlı gönderiler" };
}

// Antrenman: bu ayın antrenman ve günlük sayısı; günü geçmiş, günlüğü yazılmamış antrenman uyarı olur
export function trainingTile(plans, today) {
  const m = monthLog(plans, today.slice(0, 7));
  const missing = plans.filter((p) => canLog(p, today) && !p.log && p.date >= `${today.slice(0, 7)}-01`).length;
  return {
    big: `${m.total} antrenman`,
    sub: missing > 0 ? `${missing} günlük yazılmadı` : m.logged.length ? `Bu ay · ${m.logged.length} günlük yazıldı` : "Bu ay",
    warn: missing > 0,
  };
}

// Ana sayfa › KULÜP: yalnız bilgisi olan kart görünür (Seyhun: "ne varsa onlar gösterilsin, yoksa gösterilmesin").
// Her işlev yarım genişlik kartın bilgisini { big, sub, warn, bar } ya da gösterilmeyecekse null verir.
// Aidat: bu ayın özeti varsa ve ödemeyen ya da onay bekleyen varsa (herkes ödeyince gizlenir).
export function clubDues(sum, ym) {
  if (!sum || sum.ym !== ym || !sum.count) return null;
  const left = Math.max(0, sum.count - sum.paidCount);
  if (!left && !(sum.pending > 0)) return null;
  return {
    big: `${sum.paidCount}/${sum.count}`,
    sub: sum.pending > 0 ? `${sum.pending} onay bekliyor` : `${left} kişi ödemedi`,
    warn: sum.pending > 0,
    bar: Math.min(1, sum.paidCount / sum.count),
  };
}
// Fiş / Fatura: ödenmemiş fatura varsa o (invoiceTile: big toplam, sub "2 ödenmedi · …"), yoksa ayın fiş harcaması; ikisi de yoksa null
export function clubFis(inv, receipts) {
  if (inv) {
    const n = parseInt(inv.sub, 10) || 1;
    const late = /(\d+) gecikti/.exec(inv.sub || "");
    return { big: `${n} fatura`, sub: late ? `${late[1]} gecikti · ${inv.big}` : `${inv.big} ödenecek`, warn: true };
  }
  return receipts || null;
}
// Antrenman: bu ay antrenman ya da yazılmamış günlük varsa
export function clubTraining(plans, today) {
  const t = trainingTile(plans, today);
  return /^0 /.test(t.big) && !t.warn ? null : { ...t, big: t.big.replace(/ antrenman$/, "") };
}
// Antrenman kartı (tam genişlik): bu haftanın 7 günü (Pzt–Paz) ve ayın özeti. Gün durumu: done (günlüğü yazıldı), miss (günü geçti,
// günlük yok), today (bugün; has: bugün antrenman var), plan (ileride antrenman), none (antrenman yok). Bellekteki planlardan, ek okuma yok.
// Bu hafta ve bu ay hiç antrenman yoksa (ve yazılmamış günlük yoksa) null: kart görünmez.
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
// Fitness antrenmanları (Antrenman kartında günlere eklenir): kendi planların (p.fit, "Sen") ve sporcuların planları (fitOthers).
// Çıktı [{ date, id, name, st (done|skip|missed|today|next), mine }]; iptaller yok.
export function fitDays(plans = [], others = [], people = [], me = "") {
  const nameOf = (uid) => people.find((m) => m.uid === uid)?.name || "Sporcu";
  const own = plans.filter((p) => isFit(p) && (!p.fit?.for || p.fit.for === me)).map((p) => ({ p, mine: true }));
  const oth = others.filter((p) => isFit(p) && p.fit?.for && p.fit.for !== me).map((p) => ({ p, mine: false }));
  return [...own, ...oth]
    .filter(({ p }) => p.date && p.status !== "cancelled")
    .map(({ p, mine }) => ({ date: p.date, id: p.id, name: mine ? "Sen" : nameOf(p.fit.for), mine, plan: p }));
}
// Fitness'ta aç bağlantısı: sporcu varsa o günün sporcu listesi, yalnız kendinse Fitness › Benim
export function fitHref(date, fit = []) {
  if (!fit.length) return "";
  return fit.some((f) => !f.mine) ? `/fitness?sporcular=1&gun=${date}` : "/fitness?tab=me";
}
// Güne dokununca alttan pencere açılır (Seyhun: "fitness sayfasına gitmeye gerek yok, alttan bir yer açılsın; plan yoksa antrenman ekle, yoklamasını al").
// tap: dokunulur mu (yelken planı, fitness ya da yoklama yetkisi). sail: o günün yelken planları. attHref: yoklama (yetki ve gün geçmiş/bugün).
// add: yelken planı yok ve yetki var → "Antrenman ekle" (gün geldiyse yoklamayla birlikte). fit: kimlerin fitness'ı, fitHref: Fitness'ta aç.
// Gün şeridindeki ünlemin sebebi: günü geçmiş, günlüğü yazılmamış antrenman (trainingWeek "miss" ile aynı kural)
export function needsLog(p, today) {
  return !!p && isTraining(p) && p.status !== "cancelled" && !!p.date && p.date < today && !p.log;
}
export function dayInfo(day, att, today) {
  const sail = day.sail || [];
  const fit = day.fit || [];
  const other = day.other || [];
  const yok = att ? attHref(day.date, today) || "" : "";
  return { other, tap: sail.length > 0 || fit.length > 0 || other.length > 0 || !!att, sail, attHref: yok, add: !!att && !sail.length, fit, fitHref: fitHref(day.date, fit) };
}
// weeks: kaç haftalık gün (ana sayfa şeridi 3, kaydırılır; özet sayıları tüm günlerden). fromYesterday: Pazartesi yerine dünden başlar
// (Seyhun: "bulunduğumuz gün" önde olsun; bugün ikinci sırada, solda dün).
export function trainingWeek(plans = [], today, fit = [], weeks = 1, fromYesterday = false) {
  const base = new Date(`${today}T12:00:00`);
  const start = new Date(base);
  start.setDate(base.getDate() - (fromYesterday ? 1 : (base.getDay() + 6) % 7));
  const tr = plans.filter((p) => isTraining(p) && p.status !== "cancelled" && p.date);
  // Antrenman ve fitness dışındaki planlar (iptal ve bitenler hariç), saat sırasıyla
  const others = plans
    .filter((p) => p.date && !isTraining(p) && !isFit(p) && p.status !== "cancelled" && !p.done)
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const days = Array.from({ length: 7 * weeks }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const w = DOW[(d.getDay() + 6) % 7];
    const date = ymd(d);
    const on = tr.filter((p) => p.date === date);
    const logged = on.length > 0 && on.every((p) => p.log);
    const state = date === today ? (logged ? "done" : "today") : !on.length ? "none" : date > today ? "plan" : on.some((p) => needsLog(p, today)) ? "miss" : "done";
    const f = fit.filter((x) => x.date === date).map((x) => ({ ...x, st: statusOf(x.plan || x, today) }));
    const rank = { missed: 0, today: 1, next: 1, skip: 2, done: 3 };
    f.sort((a, b) => (a.mine === b.mine ? 0 : a.mine ? -1 : 1) || rank[a.st] - rank[b.st] || a.name.localeCompare(b.name, "tr"));
    return { date, d: d.getDate(), w, state, has: on.length > 0, sail: on, fit: f, other: others.filter((p) => p.date === date) };
  });
  const ym = today.slice(0, 7);
  const m = monthLog(plans, ym);
  const missing = plans.filter((p) => canLog(p, today) && !p.log && p.date >= `${ym}-01`).length;
  const planned = days.filter((x) => x.has).length;
  const fitN = days.reduce((t, x) => t + x.fit.length, 0);
  const otherN = days.reduce((t, x) => t + x.other.length, 0);
  if (!planned && !m.total && !missing && !fitN && !otherN) return null;
  return {
    days,
    planned,
    done: days.filter((x) => x.state === "done").length,
    total: m.total,
    avgWind: m.avgWind,
    missing,
    fitN,
    otherN,
    fitDone: days.reduce((t, x) => t + x.fit.filter((f) => f.st === "done").length, 0),
    month: cap(monthName(ym)),
  };
}
// Instagram: kayıtlı gönderi varsa
export const clubPosts = (sum, now) => (sum?.count ? postsTile(sum, now) : null);
// Sıradaki yarış kartı (tam genişlik): nextInfo (raceHome.js) varsa { id (dokununca o yarışın sayfası), title, sub ("17-19 Ekim · Foça · 6 sporcu"),
// left (eksik iş), total, done (hazırlık çubuğu), day/mon (soldaki tarih kutusu: "17", "EKİ"), days, when }; yoksa null
const MON = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
export function clubRace(next) {
  if (!next) return null;
  const sub = [next.dates, next.place, next.count ? `${next.count} sporcu` : ""].filter(Boolean).join(" · ");
  const d = /^\d{4}-(\d{2})-(\d{2})$/.exec(next.start || "");
  const left = next.left || 0;
  const total = Math.max(next.total || 0, left);
  return {
    id: next.id || "",
    title: next.title || `${next.name} yarışı`,
    sub,
    left,
    steps: Array.isArray(next.steps) ? next.steps.slice(0, 3) : [],
    total,
    done: total - left,
    day: d ? String(Number(d[2])) : "",
    mon: d ? MON[Number(d[1]) - 1] : "",
    days: /^\d/.test(next.when) ? parseInt(next.when, 10) : null,
    when: cap(next.when),
  };
}
// Antrenman kartında güne dokununca o günün yoklaması (Seyhun: "güne tıkladım, o günün yoklaması açılsın"); gelecek gün yoklanmaz (null)
export const attHref = (date, today) => (date && date <= today ? `/athletes/attendance?gun=${date}` : null);
// Ana sayfa notları iki grupta: sabitlenenler ve diğerleri (sıra homeNotes'taki gibi)
export const noteGroups = (list = []) => [["SABİT", list.filter((n) => n.pinned)], ["SON NOTLAR", list.filter((n) => !n.pinned)]].filter(([, l]) => l.length);

// Ana sayfa › Şu an kartındaki Yarış planına ait yarış (dokununca yarışın sayfası açılsın): plan adı yarışın adıyla aynıysa o,
// değilse bugün süren tek yarış. open: useRaceHome().open (bitmemiş yarışlar, ek okuma yok). Bulunamazsa null.
const norm = (s) => String(s || "").trim().toLocaleLowerCase("tr-TR");
// Ada göre yarış kaydı (Seyhun 2026-10-20: "bir yarışa basınca yarışa gidiyor, diğerinde plan çıkıyor"): plan yarışa kimlikle değil adla bağlı;
// ad tam aynıysa o, değilse adı ötekini içeren tek yarış ("Ege Kupası" ↔ "Ege Kupası 2026"). Harf/boşluk farkı yok sayılır. Bulunamazsa null.
const loose = (s) => norm(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function findRace(name, open = []) {
  const n = loose(name);
  if (!n) return null;
  const same = open.find((r) => loose(r.name) === n);
  if (same) return same;
  const near = open.filter((r) => loose(r.name) && (` ${loose(r.name)} `.includes(` ${n} `) || ` ${n} `.includes(` ${loose(r.name)} `)));
  return near.length === 1 ? near[0] : null;
}
export function raceForPlan(plan, open, today) {
  if (!plan || (plan.cat || plan.category) !== "Yarış" || !open?.length) return null;
  const same = findRace(raceKey(plan)?.name || plan.title, open);
  if (same) return same.id;
  const now = open.filter((r) => r.startDate <= today);
  return now.length === 1 ? now[0].id : null;
}

// Ana sayfa › İşlemler düğmeleri, gruplu (sıra sabit). o: { staff, owner, side (sporcu/öğrenci/veli), parent, athletes (sporcu yetkisi),
// races (Yarışlar ana sayfada), training, receipts, shop, lessons, fit (antrenörün hazırladığı fitness antrenmanı var) }. Toplantı bir sayfa değil: { id: "meeting" } döner.
// Dönüş: [{ title, items: [{ href | id, icon, label }] }]; boş grup çıkmaz.
export function homeActions(o) {
  const groups = [
    ["Günlük", [
      { href: "/plans", icon: "cal", label: "Planlar" },
      { href: "/notes", icon: "note", label: "Notlar" },
      !o.side && { id: "meeting", icon: "mic", label: "Toplantı" },
      o.side && { href: "/my-attendance", icon: "check", label: o.parent ? "Yoklama" : "Yoklamam" },
      { href: "/birthdays", icon: "cake", label: "Doğum günü" },
      o.shop && { href: "/shopping", icon: "cart", label: "Alışveriş" },
      (!o.staff || o.fit) && { href: "/fitness", icon: "dumbbell", label: "Fitness" },
      o.lessons && { href: "/schedule", icon: "book", label: "Dersler" },
      { href: "/archive", icon: "archive", label: "Arşiv" },
    ]],
    ["Kulüp", [
      o.athletes && { href: "/athletes", icon: "anchor", label: "Sporcular" },
      o.athletes && { href: "/athletes/attendance", icon: "checks", label: "Yoklama" },
      o.athletes && !o.side && { href: "/training/day", icon: "clock", label: "Antrenman" }, // sayaç, yoklama, yarışlar, günlük
      o.races && { href: "/athletes/races", icon: "flag", label: "Yarışlar" },
      (o.training || o.athletes) && !o.side && { href: "/training", icon: "trend", label: "Ant. günlüğü" },
      o.athletes && o.owner && { href: "/dues", icon: "wallet", label: "Aidatlar" },
      !o.staff && { href: "/inventory", icon: "box", label: "Envanter" },
      { href: "/wind", icon: "wind", label: "Rüzgâr" },
    ]],
    ["Yönetim", [
      o.receipts && { href: "/receipts", icon: "receipt", label: "Fiş / Fatura" },
      !o.staff && { href: "/mail", icon: "wallet", label: "Hesaplar" },
      !o.staff && { href: "/people/staff", icon: "users", label: "Kişiler" },
    ]],
    ["Sosyal", [!o.staff && { href: "/posts", icon: "instagram", label: "Instagram", brand: "instagram" }, !o.staff && { href: "/events", icon: "tent", label: "Etkinlikler" }]],
  ];
  return groups
    .map(([title, items]) => ({ title, items: items.filter(Boolean) }))
    .filter((g) => g.items.length);
}

// Ana sayfa › Kısayollar: İşlemler'in hepsi yerine en çok SHORTCUT_MAX düğme; kalanlar "Tümü" penceresinde (gruplu).
// Seçim kişinin profilinde (users/{uid}.homeLinks: anahtar listesi, anahtar = href ya da id). Seçim yoksa ya da seçilenler
// bu kişide yoksa varsayılanlar, eksik kalırsa grupların sırasıyla tamamlanır. Dönüş: düğmeler (homeActions öğeleri).
export const SHORTCUT_MAX = 7; // 4 sütunda iki sıra: 7 kısayol + "Tümü"
export const DEFAULT_SHORTCUTS = ["/plans", "/notes", "/athletes", "/athletes/attendance", "meeting", "/inventory", "/receipts"];
export const linkKey = (a) => a.href || a.id;
export function shortcutsOf(groups, picked) {
  const all = groups.flatMap((g) => g.items);
  const byKey = new Map(all.map((a) => [linkKey(a), a]));
  const own = Array.isArray(picked) ? picked.filter((k) => byKey.has(k)) : [];
  const keys = own.length ? own : DEFAULT_SHORTCUTS.filter((k) => byKey.has(k));
  if (!own.length) for (const a of all) if (keys.length < SHORTCUT_MAX && !keys.includes(linkKey(a))) keys.push(linkKey(a));
  return keys.slice(0, SHORTCUT_MAX).map((k) => byKey.get(k));
}
// Tümü penceresinde bir düğmeyi kısayollara ekle/çıkar: yeni anahtar listesi (dolu iken ekleme yapılmaz → null)
export function toggleShortcut(current, key) {
  if (current.includes(key)) return current.filter((k) => k !== key);
  return current.length >= SHORTCUT_MAX ? null : [...current, key];
}

// Ana sayfa › NOTLAR: arşivlenmemiş notlardan önce sabitlenenler, sonra en yeni (oluşturma ya da son değişiklik); en çok n tane.
// Bellekteki notlardan (DataProvider), Firestore'a ek okuma yok. Dönüş: { list, total }.
export function homeNotes(notes = [], n = 5) {
  const live = notes.filter((x) => x && !x.archived && !isLogNote(x)); // antrenman günlüğüne benzeyenler not sayılmaz
  const at = (x) => x.updatedAt || x.createdAt || "";
  const list = [...live].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || at(b).localeCompare(at(a))).slice(0, n);
  return { list, total: live.length };
}

// Ana sayfa › SIRADA: bugünden başlayıp 7 gün içindeki sıradaki n plan (Seyhun: "şu an değil, sırada ne var önemli").
// İptal edilen, bitti işaretlenen ve bugün saati geçen planlar sayılmaz; çok günlü plan yalnız ilk görüldüğü günde bir kez.
// label: süren plan "ŞİMDİ", sonra "BUGÜN", "YARIN" ya da haftanın günü ("CUMA"). Bellekteki planlardan, ek okuma yok.
// Dönüş: [{ p, day, label, now }]
export function upcoming(plans = [], today, now = new Date(), n = 4, days = 7) {
  const out = [];
  const seen = new Set();
  const base = new Date(`${today}T12:00:00`);
  for (let i = 0; i < days && out.length < n; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const list = plans
      .filter((p) => p && p.date && !seen.has(p.id) && p.status !== "cancelled" && !p.done && p.date <= d && (p.endDate || p.date) >= d)
      .filter((p) => i > 0 || planState(p, now) !== "past")
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    for (const p of list) {
      if (out.length >= n) break;
      seen.add(p.id);
      const live = i === 0 && planState(p, now) === "now";
      const label = live ? "ŞİMDİ" : i === 0 ? "BUGÜN" : i === 1 ? "YARIN" : dt.toLocaleDateString("tr-TR", { weekday: "long" }).toLocaleUpperCase("tr-TR");
      out.push({ p, day: d, label, now: live });
    }
  }
  return out;
}

// Sırada'da aynı yarışın planları tek satırda (Seyhun 2026-10-20: "aynı başlıktan 5 tane var, hepsi farklı iş gibi"): Yarış planı "Yarış adı: iş"
// (talimattan) ya da yarışın kendi adı (başlangıç günü). rows: [{ p, day }]. Aynı yarıştan iki ya da daha çok satır varsa
// { race: ad, start (yarışın kendi planı ya da null), items: [{ p, day, label }], day (ilk gün) }, değilse { p, day, start: yarışın kendi planı mı }
export function raceKey(p) {
  if ((p?.cat || p?.category) !== "Yarış") return null;
  const t = String(p.title || "").trim();
  const i = t.indexOf(":");
  return i > 0 ? { name: t.slice(0, i).trim(), label: t.slice(i + 1).trim() } : t ? { name: t, label: "", whole: true } : null;
}
export function raceGroups(rows = []) {
  const keyOf = (r) => raceKey(r.p)?.name.toLocaleLowerCase("tr-TR") || "";
  const count = {};
  for (const r of rows) if (keyOf(r)) count[keyOf(r)] = (count[keyOf(r)] || 0) + 1;
  const out = [];
  const at = {};
  for (const r of rows) {
    const k = keyOf(r);
    const rk = raceKey(r.p);
    if (!k || count[k] < 2) {
      out.push({ ...r, start: !!rk?.whole });
      continue;
    }
    if (!at[k]) {
      at[k] = { race: rk.name, start: null, items: [], day: r.day };
      out.push(at[k]);
    }
    if (rk.whole && !at[k].start) at[k].start = r;
    else at[k].items.push({ ...r, label: rk.label || rk.name });
  }
  return out;
}
// Ana sayfanın tek listesi (Seyhun 2026-10-20: "tek bir listemiz olsun, tarihli liste saat saat ve sıradaki"): yarının satırları ve sonrakiler
// birlikte gruplanır (raceGroups), böylece yarışın yarınki işi yalnız yarışın satırında görünür. Dönüş { next: yarının tek planları, later: en çok n satır }
export function homeList(next, rest = [], n = 4) {
  const rows = [...(next ? next.rows.map((r) => ({ ...r, day: next.day })) : []), ...rest];
  const all = raceGroups(rows);
  const isNext = (x) => next && !x.race && x.day === next.day;
  return { next: all.filter(isNext), later: all.filter((x) => !isNext(x)).slice(0, n) };
}
// Ana sayfa takvimi iki gün (Seyhun: "bugün ve en yakın tarih; yarın varsa yarın"): bugün (geçmiş saatler hariç) ve
// planı olan en yakın sonraki gün; kalan planlar "Sırada seni bekleyenler" (rest, en çok n). Gün başlığı: Bugün, Yarın ya da "Cum 17 Eki".
export function twoDays(plans = [], today, now = new Date(), n = 4, horizon = 60) {
  const all = upcoming(plans, today, now, 200, horizon);
  const later = all.find((r) => r.day > today)?.day || "";
  const pick = (day) => all.filter((r) => r.day === day).map(({ p, now: live }) => ({ p, now: live }));
  const days = [{ day: today, label: "Bugün", rows: pick(today) }];
  if (later) days.push({ day: later, label: dayHead(later, today), rows: pick(later) });
  const rest = all.filter((r) => r.day !== today && r.day !== later).slice(0, n);
  return { days, rest };
}
// Ana sayfa Hesap alanı: kasanın bu ayki girişleri (sayılan nakit hareketlerinden, ts ms). Dönüş { inSum, inN, outSum }
export function cashMonth(counted = [], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const m = counted.filter((x) => (x.ts || 0) >= start);
  const sum = (f) => Math.round(m.filter(f).reduce((n, x) => n + Math.abs(x.amount), 0) * 100) / 100;
  return { inSum: sum((x) => x.amount > 0), inN: m.filter((x) => x.amount > 0).length, outSum: sum((x) => x.amount < 0) };
}
// Süren planın bitişi: "12:00'ye kadar", "10:30'a kadar" (saat + durationMin, varsayılan 60 dk). Ek, sayının okunuşunun son sözcüğüne göre.
const ONES = ["", "e", "ye", "e", "e", "e", "ya", "ye", "e", "a"];
const TENS = ["a", "a", "ye", "a", "a", "ye"];
const dative = (n) => (n === 0 ? "a" : n % 10 ? ONES[n % 10] : TENS[n / 10]);
// Ana sayfa plan satırının kalan gün işareti (Seyhun 2026-10-19: "tarihleri yazıyoruz ama önemli olan kaç gün kaldığı"): bugün ve yarın kırmızı,
// 2 gün kala sarı ünlemli, sonrası gri "N gün". Dönüş { text, tone: red | warn | mut } ya da geçmiş günde null
export function leftTag(day, today) {
  if (!day || !today) return null;
  const n = Math.round((Date.parse(`${day}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 864e5);
  if (n < 0 || Number.isNaN(n)) return null;
  if (n === 0) return { text: "Bugün", tone: "red" };
  if (n === 1) return { text: "Yarın", tone: "red" };
  if (n === 2) return { text: "! 2 gün", tone: "warn" };
  return { text: `${n} gün`, tone: "mut" };
}
// Ana sayfa listesinde gizlenen plan (Seyhun 2026-10-20: "gizle; 10 gün kala, 20 gün ya da artı eksiyle; tarihi gelince gösterilsin"):
// planın homeDays alanı (gün) varsa, yoksa listenin toplu ayarı (all: users.homeDays, "yalnız N gün kalanları göster") varsa, gününe ondan
// fazla gün varken listede çıkmaz (takvimde hep görünür)
export function homeHidden(p, today, all) {
  const n = Number.isFinite(p?.homeDays) ? p.homeDays : all;
  return Number.isFinite(n) && !!p?.date && Math.round((Date.parse(`${p.date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 864e5) > n;
}
export function untilText(time, durationMin = 60) {
  if (!/^\d{1,2}:\d{2}$/.test(time || "")) return "";
  const [h, m] = time.split(":").map(Number);
  const t = (h * 60 + m + (durationMin || 60)) % 1440;
  const eh = Math.floor(t / 60);
  const em = t % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}'${dative(em || eh)} kadar`;
}
export function dayHead(day, today) {
  const t = new Date(`${today}T12:00:00`);
  t.setDate(t.getDate() + 1);
  if (day === ymd(t)) return "Yarın";
  const d = new Date(`${day}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", "")}`;
}

// Liste satırının tarihi: hep gün adı ve gün ("Per 3"), başka aydaysa ay da ("Per 3 Ara"); "Yarın" yazılmaz (kalan gün işaretinde)
export function shortDay(day, today) {
  const d = new Date(`${day}T12:00:00`);
  const wd = d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  const mon = day.slice(0, 7) === String(today || "").slice(0, 7) ? "" : ` ${d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", "")}`;
  return `${wd} ${d.getDate()}${mon}`;
}

// Kişinin sayfası (/people/p/<uid>): ad, Mesaj · Ara · WhatsApp, yapılacaklar, para, kulüp, bilgiler. Tek yerde değişir.
export function personHref(m) {
  if (!m?.uid) return "/people/staff";
  return `/people/p/${m.uid}`;
}

// Renk tonu (globals.css .tone-*): kişi türü ve plan türü ayırt edilsin diye (Seyhun: "sporcular, çalışanlar, veliler farklı renk").
// Kişi: çalışan yeşil, sporcu/öğrenci mavi, veli lila, aile açık kahve, diğer tonsuz. Plan: antrenman yeşil, yarış mavi, toplantı lila, kamp kahve, fitness turuncu, diğer gri.
const KIND_TONE = { staff: "st", athlete: "sp", student: "sp", parent: "ve", family: "fa" };
export const personTone = (kind) => KIND_TONE[kind || "staff"] || "";
const CAT_TONE = { Antrenman: "st", Yarış: "sp", Toplantı: "ve", Kamp: "fa" };
export function planTone(p) {
  if (!p) return "gen";
  if (isFit(p)) return "fit";
  return CAT_TONE[p.cat || p.category] || "gen";
}
// Plan türünün kısa adı (Bugün/Yarın satırındaki etiket); Genel ve türsüz planda boş
export function planTag(p) {
  if (!p) return "";
  if (isFit(p)) return "Fitness";
  const c = p.cat || p.category || "";
  return c && c !== "Genel" ? c : "";
}

// Ana sayfadaki yuvarlak kişi şeridi (Instagram hikâyeleri gibi): bugün doğum günü olanlar önde, sonra çalışan, aile, sporcu, diğer; ada göre.
// Silinen kişi (status left) girmez. bdays: bugünkü doğum günü kayıtları (memberUid ile bağlı).
export function storyPeople(members = [], bdays = []) {
  const born = new Set(bdays.map((b) => b.memberUid).filter(Boolean));
  const rank = { staff: 1, family: 2, athlete: 3, student: 3, parent: 4, other: 5 };
  return members
    .filter((m) => m && m.name && m.status !== "left")
    .map((m) => ({ id: m.uid, name: m.name, photo: m.photo || "", href: personHref(m), bday: born.has(m.uid), r: rank[m.kind] || 1, tone: personTone(m.kind) }))
    .sort((a, b) => (b.bday - a.bday) || a.r - b.r || a.name.localeCompare(b.name, "tr"));
}

// Ana sayfa kokpitindeki sıradaki iş (Cockpit.jsx, 2026-10-21): bugün süren ya da sıradaki plan (bitişi = saat + süre, süre yoksa 60 dk; saatsiz plan gün boyu),
// yoksa 7 gün içindeki ilk plan. İptal, tamamlanan ve fitness planları sayılmaz. Yoksa null.
export function nextPlan(plans, now, today = now.toLocaleDateString("sv-SE")) {
  const hm = now.toTimeString().slice(0, 5);
  const end = (p) => {
    if (!p.time) return "24:00";
    const [h, m] = p.time.split(":").map(Number);
    const t = h * 60 + m + (Number(p.durationMin) || 60);
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };
  const lim = new Date(now.getTime() + 7 * 864e5).toLocaleDateString("sv-SE");
  return (
    (plans || [])
      .filter((p) => p?.date && p.status !== "cancelled" && p.status !== "done" && p.date >= today && p.date <= lim && !p.fit)
      .filter((p) => p.date > today || end(p) > hm)
      .sort((a, b) => `${a.date} ${a.time || "99"}`.localeCompare(`${b.date} ${b.time || "99"}`))[0] || null
  );
}

// Ana sayfa › Kulüp listesi (Seyhun 2026-10-21: "kulüp kısmına yarışları, fitness'ı, son antrenmanı ve kimlerin katıldığını koyalım")
const SHORT_MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const shortDate = (date) => {
  const d = new Date(`${date}T12:00:00`);
  return `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${SHORT_MON[d.getMonth()]}`;
};
const daysTo = (date, today) => Math.round((Date.parse(`${date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 864e5);

// Yarış satırı: süren yarış (başladı, bitmedi) önce, yoksa sıradaki. open: [{ id, name, startDate, endDate, place, count }] (raceHome.js)
// { id, title, sub ("17-19 Eki · Foça · 6 sporcu" ya da "Sürüyor · Foça"), right ("Sürüyor", "Yarın", "4 gün") } ya da null
export function clubRaceRow(open = [], today) {
  const list = open.filter((r) => r.startDate && (r.endDate || r.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const r = list.find((x) => x.startDate <= today) || list[0];
  if (!r) return null;
  const now = r.startDate <= today;
  const n = daysTo(r.startDate, today);
  const dates = r.endDate && r.endDate !== r.startDate ? `${shortDate(r.startDate)} - ${shortDate(r.endDate)}` : shortDate(r.startDate);
  return {
    id: r.id,
    title: r.name || "Yarış",
    sub: [now ? "Sürüyor" : dates, r.place, r.count ? `${r.count} sporcu` : ""].filter(Boolean).join(" · "),
    right: now ? "Bugün" : n === 1 ? "Yarın" : `${n} gün`,
  };
}

// Son antrenman: yoklamada "geldi" işareti olan en son gün (bugün dahil) ve gelenlerin adları. athletes: loadAthletes() (att: { 2026: { "10-20": "present" } })
// { date, when ("Sal 20 Eki"), names (ilk adlar, alfabetik), n, title (o günün antrenman planı adı) } ya da null
export function lastTraining(athletes = [], plans = [], today) {
  let last = "";
  for (const a of athletes)
    for (const [y, days] of Object.entries(a.att || {}))
      for (const [md, v] of Object.entries(days || {})) {
        const date = `${y}-${md}`;
        if (v === "present" && date <= today && date > last) last = date;
      }
  if (!last) return null;
  const [y, md] = [last.slice(0, 4), last.slice(5)];
  const names = athletes
    .filter((a) => a.att?.[y]?.[md] === "present")
    .map((a) => String(a.studentName || "").trim().split(/\s+/)[0])
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "tr"));
  const plan = plans.find((p) => p.date === last && isTraining(p) && p.status !== "cancelled");
  return { date: last, when: last === today ? "Bugün" : shortDate(last), names, n: names.length, title: plan?.title || "", planId: plan?.id || "" };
}

// Fitness satırı: bu haftanın (Pazartesi-Pazar) fitness antrenmanları ve yapılanlar. fit: fitDays()
export function fitWeek(fit = [], today) {
  const base = new Date(`${today}T12:00:00`);
  const mon = new Date(base);
  mon.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const week = fit.filter((f) => f.date >= ymd(mon) && f.date <= ymd(sun));
  return { n: week.length, done: week.filter((f) => statusOf(f.plan || f, today) === "done").length };
}
