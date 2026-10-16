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
export function dayInfo(day, att, today) {
  const sail = day.sail || [];
  const fit = day.fit || [];
  const other = day.other || [];
  const yok = att ? attHref(day.date, today) || "" : "";
  return { other, tap: sail.length > 0 || fit.length > 0 || other.length > 0 || !!att, sail, attHref: yok, add: !!att && !sail.length, fit, fitHref: fitHref(day.date, fit) };
}
export function trainingWeek(plans = [], today, fit = []) {
  const base = new Date(`${today}T12:00:00`);
  const start = new Date(base);
  start.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const tr = plans.filter((p) => isTraining(p) && p.status !== "cancelled" && p.date);
  // Antrenman ve fitness dışındaki planlar (iptal ve bitenler hariç), saat sırasıyla
  const others = plans
    .filter((p) => p.date && !isTraining(p) && !isFit(p) && p.status !== "cancelled" && !p.done)
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const days = DOW.map((w, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = ymd(d);
    const on = tr.filter((p) => p.date === date);
    const logged = on.length > 0 && on.every((p) => p.log);
    const state = date === today ? (logged ? "done" : "today") : !on.length ? "none" : date > today ? "plan" : logged ? "done" : "miss";
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
export function raceForPlan(plan, open, today) {
  if (!plan || (plan.cat || plan.category) !== "Yarış" || !open?.length) return null;
  const same = open.find((r) => norm(r.name) && norm(r.name) === norm(plan.title));
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
      o.races && { href: "/athletes/races", icon: "flag", label: "Yarışlar" },
      (o.training || o.athletes) && !o.side && { href: "/training", icon: "trend", label: "Antrenman" },
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
export function dayHead(day, today) {
  const t = new Date(`${today}T12:00:00`);
  t.setDate(t.getDate() + 1);
  if (day === ymd(t)) return "Yarın";
  const d = new Date(`${day}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", "")}`;
}

// Kişinin sayfası (kişi sayfası ayrı işte yapılıyor; o gelene kadar: sporcu kartı ya da Kişiler'deki grubu). Tek yerde değişir.
export function personHref(m) {
  if (!m) return "/people/staff";
  if (m.athleteId) return `/athletes/${m.athleteId}`;
  const g = { athlete: "athletes", student: "athletes", parent: "athletes", family: "family", other: "other" }[m.kind] || "staff";
  return `/people/${g}`;
}

// Ana sayfadaki yuvarlak kişi şeridi (Instagram hikâyeleri gibi): bugün doğum günü olanlar önde, sonra çalışan, aile, sporcu, diğer; ada göre.
// Silinen kişi (status left) girmez. bdays: bugünkü doğum günü kayıtları (memberUid ile bağlı).
export function storyPeople(members = [], bdays = []) {
  const born = new Set(bdays.map((b) => b.memberUid).filter(Boolean));
  const rank = { staff: 1, family: 2, athlete: 3, student: 3, parent: 4, other: 5 };
  return members
    .filter((m) => m && m.name && m.status !== "left")
    .map((m) => ({ id: m.uid, name: m.name, href: personHref(m), bday: born.has(m.uid), r: rank[m.kind] || 1 }))
    .sort((a, b) => (b.bday - a.bday) || a.r - b.r || a.name.localeCompare(b.name, "tr"));
}
