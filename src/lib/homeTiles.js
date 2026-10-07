// Ana sayfadaki büyük kartların (Aidatlar, Yarışlar, Instagram, Antrenman günlüğü) yazıları.
// Firestore'a ek okuma yok: aidat ve gönderi özeti ilgili sayfa açılınca bu cihazda saklanır (sa-home-sum),
// yarış bilgisi raceHome.js'in zaten yaptığı okumadan, antrenman bellekteki planlardan gelir.
import { canLog, isLogNote, monthLog } from "./trainingLog";
import { monthRows } from "./dues";

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
    sub: sum.pending > 0 ? `${sum.pending} banka ödemesi bekliyor` : left > 0 ? `${m} · ${left} kişi ödemedi` : `${m} · herkes ödedi`,
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
  const t = monthRows(roster.filter((a) => a.id && a.studentName), month || {}, cfg);
  return { ym, paidCount: t.paidCount, count: t.rows.length, pending: prev?.ym === ym ? prev.pending || 0 : 0 };
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

// Ana sayfa › İşlemler düğmeleri, gruplu (sıra sabit). o: { staff, owner, side (sporcu/öğrenci/veli), parent, athletes (sporcu yetkisi),
// races (Yarışlar ana sayfada), training, receipts, shop, lessons }. Toplantı bir sayfa değil: { id: "meeting" } döner.
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
  return groups.map(([title, items]) => ({ title, items: items.filter(Boolean) })).filter((g) => g.items.length);
}

// Ana sayfa › Kısayollar: İşlemler'in hepsi yerine en çok SHORTCUT_MAX düğme; kalanlar "Tümü" penceresinde (gruplu).
// Seçim kişinin profilinde (users/{uid}.homeLinks: anahtar listesi, anahtar = href ya da id). Seçim yoksa ya da seçilenler
// bu kişide yoksa varsayılanlar, eksik kalırsa grupların sırasıyla tamamlanır. Dönüş: düğmeler (homeActions öğeleri).
export const SHORTCUT_MAX = 6;
export const DEFAULT_SHORTCUTS = ["/plans", "/notes", "/athletes", "/athletes/attendance", "meeting", "/inventory"];
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
