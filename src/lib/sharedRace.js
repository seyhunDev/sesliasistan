// Ortak yarışlar (Seyhun 2026-10-28): yarışın herkese açık kısmı üst düzeyde sharedRaces/{id} belgesinde durur; Velora'yı kullanan
// herkes okur, başka kulüp talimatı yeniden yüklemeden listeden seçer, yalnız kendi sporcularını ekler. Kulübün yarışı
// (orgs/{org}/races/{id}) ortağa `shared` alanıyla bağlanır; sporcu, evrak, bütçe, yolculuk, not, fotoğraf/video kulüpte kalır.
// Ortakta: ad, tarih, yer, talimat (okunan bilgi + PDF künyesi), spot; alt belgeler sheets (tam sonuç listesi),
// live/wind (ölçülen rüzgâr), course/{gün} (parkur). Yalnız ekleyen kulüp ve Velora ana hesabı değiştirir (firestore.rules).
// Saf fonksiyonlar (test edilir: scripts/asistan-test/yerel/yaris.mjs).

export const VELORA_ADMIN = "seyhunyildiz@gmail.com";
export const SHARED_FIELDS = ["name", "federation", "city", "district", "abroad", "startDate", "endDate", "notice", "noticeFile", "spot"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const S = (v, n) => String(v ?? "").trim().slice(0, n);
const plain = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c])
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// Ayırt etmeyen sözler ("2026 Foça Optimist Kupası" ile "Foça Optimist Kupası 2026" aynı yarış)
const NOISE = new Set(["yarisi", "yaris", "regatta", "regati", "kupasi", "kupa", "ve", "the", "of", "cup"]);
const words = (s) => plain(s).split(" ").filter((w) => w.length > 1 && !NOISE.has(w) && !/^\d{4}$/.test(w));

// Kulübün yarışından ortak kısım. Ad ve başlangıç tarihi yoksa paylaşılmaz (null).
// Talimat PDF'i yalnız Storage'daysa (indirme adresi herkesten açılır); eski parçalı Firestore talimatı paylaşılmaz.
export function sharedOf(r) {
  if (!r || !S(r.name, 120) || !DAY.test(r.startDate || "")) return null;
  const f = r.noticeFile;
  const file = f?.url && f?.path ? { id: S(f.id, 40), name: S(f.name, 120), size: Number(f.size) || 0, at: S(f.at, 30), path: S(f.path, 200), url: S(f.url, 1200) } : null;
  return {
    name: S(r.name, 120),
    federation: S(r.federation, 60),
    city: S(r.city, 60),
    district: S(r.district, 60),
    abroad: !!r.abroad,
    startDate: r.startDate,
    endDate: DAY.test(r.endDate || "") ? r.endDate : "",
    notice: r.notice && typeof r.notice === "object" ? r.notice : null,
    noticeFile: file,
    spot: r.spot && typeof r.spot === "object" ? r.spot : null,
  };
}

// Ortaktan kulübün yarışına gelenler (seçince ve ortak değişince)
export function fromShared(s) {
  const out = { shared: s.id, sharedAt: s.at || "" };
  for (const k of SHARED_FIELDS) out[k] = k === "abroad" ? !!s[k] : (s[k] ?? (["notice", "noticeFile", "spot"].includes(k) ? null : ""));
  return out;
}

// Ortak kısım değişmiş mi (yalnız değişince yazılır)
export const sameShared = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Aynı yarış mı: aynı başlangıç günü ve adın ayırt edici sözlerinin çoğu ortak (iki kulüp aynı yarışı iki kez açmasın)
export function sameRace(a, b) {
  if (!a?.startDate || a.startDate !== b?.startDate) return false;
  const x = new Set(words(a.name));
  const y = new Set(words(b.name));
  if (!x.size || !y.size) return false;
  const both = [...x].filter((w) => y.has(w)).length;
  return both / Math.min(x.size, y.size) >= 0.6;
}

// Ortak yarışı kim değiştirir: ekleyen kulüp ya da Velora ana hesabı
export const canEditShared = (s, uid, email) => !!s && (s.by === uid || String(email || "").toLowerCase() === VELORA_ADMIN);

// Kulübün listesinde olmayan, bitmemiş ortak yarışlar; yakın olan önce
export function pickable(list, mine, today) {
  const have = new Set((mine || []).map((r) => r.shared).filter(Boolean));
  return (list || [])
    .filter((s) => !have.has(s.id) && (s.endDate || s.startDate) >= today && !(mine || []).some((r) => sameRace(r, s)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

// Ortakta olup kulübün sonuçlarına henüz işlenmemiş sonuç listeleri
export const newSheets = (s, race) => (s?.sheets || []).filter((id) => !(race?.results?.files || []).some((f) => f.id === id));

// ---- Yarış takvimi (/races, herkes görür) ----
const endOf = (s) => s.endDate || s.startDate || "";
// Talimattaki sınıflar: cleanNotice boş alanı "" yazar (dizi değil); takvim "classes.join is not a function" ile çöküyordu (2026-10-28)
export const classesOf = (n) => (Array.isArray(n?.classes) ? n.classes.filter((c) => typeof c === "string" && c) : []);
// Yaklaşan (yakın önce) ve geçmiş (yeni önce); arama ad, yer ve sınıflarda (her söz geçmeli)
export function calendarOf(list, today, q = "") {
  const want = plain(q).split(" ").filter(Boolean);
  const hit = (s) => {
    const hay = plain([s.name, s.district, s.city, ...classesOf(s.notice)].join(" "));
    return want.every((w) => hay.includes(w));
  };
  const all = (list || []).filter((s) => s?.name && s.startDate && hit(s));
  return {
    up: all.filter((s) => endOf(s) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    past: all.filter((s) => endOf(s) < today).sort((a, b) => b.startDate.localeCompare(a.startDate)),
  };
}

const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
// "7–9 Kas", "30 Eki–2 Kas", "7 Kas"
export function shortRange(a, b) {
  if (!DAY.test(a || "")) return "";
  const [, am, ad] = a.split("-").map(Number);
  if (!DAY.test(b || "") || b === a) return `${ad} ${MON[am - 1]}`;
  const [, bm, bd] = b.split("-").map(Number);
  return am === bm ? `${ad}–${bd} ${MON[bm - 1]}` : `${ad} ${MON[am - 1]}–${bd} ${MON[bm - 1]}`;
}

// Sonuçlar: ortaktaki listelerden (sheets: [{ fleets, at }], yeniden eskiye değil, yükleniş sırasıyla) sınıf başına son liste.
// Dönüş [{ cls, rows }]
export function fleetsOf(sheets) {
  const by = new Map();
  for (const sh of [...(sheets || [])].sort((a, b) => String(a.at).localeCompare(String(b.at)))) for (const f of sh.fleets || []) if (f?.cls && f.rows?.length) by.set(f.cls, f);
  return [...by.values()];
}
// Seçili sınıfın süzgeçleri: Junior / Bambino (varsa) ve Kızlar (varsa)
export function filtersOf(fleet) {
  const rows = fleet?.rows || [];
  return [...["Junior", "Bambino"].filter((c) => rows.some((r) => r.cat === c)), ...(rows.some((r) => r.sex === "K") ? ["Kızlar"] : [])];
}
// Süzülmüş sıralama: süzgeçte sıra kendi içinde baştan sayılır; arama sırayı değiştirmez. Dönüş [{ place, ...satır }]
export function rankView(fleet, filter = "", q = "") {
  const rows = (fleet?.rows || []).filter((r) => !filter || (filter === "Kızlar" ? r.sex === "K" : r.cat === filter)).map((r, i) => ({ ...r, place: i + 1 }));
  const want = plain(q).split(" ").filter(Boolean);
  const num = String(q || "").replace(/\D/g, "");
  return rows.filter((r) => {
    const hay = plain([r.name, r.club].join(" "));
    return want.filter((w) => !/^\d+$/.test(w)).every((w) => hay.includes(w)) && (!num || String(r.sail || "").replace(/\D/g, "").includes(num));
  });
}
