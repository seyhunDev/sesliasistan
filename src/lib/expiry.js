// Sporcu belgelerinin bitiş tarihleri: lisans vizesi, sağlık raporu, sigorta (sporcu kartında, YYYY-MM-DD).
// Sporcular sayfası, sporcu kartı ve yarış evrakı uyarıları buradan hesaplanır (saf fonksiyonlar, test edilir).
export const EXPIRY = [
  ["licenseUntil", "Lisans vizesi"],
  ["healthUntil", "Sağlık raporu"],
  ["insuranceUntil", "Sigorta"],
];
export const EXPIRY_KEYS = EXPIRY.map(([k]) => k);
export const SOON_DAYS = 30;

const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const days = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
const short = (s) => new Date(`${s}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });

// Bir sporcunun belgeleri: [{ key, label, date, left (gün), state: "expired" | "soon" | "ok" | "none" }]
// at: bakılan gün (bugün ya da yarışın son günü)
export function expiryOf(a, at) {
  return EXPIRY.map(([key, label]) => {
    const date = ok(a?.[key]) ? a[key] : "";
    if (!date) return { key, label, date: "", left: null, state: "none" };
    const left = days(at, date);
    return { key, label, date, left, state: left < 0 ? "expired" : left <= SOON_DAYS ? "soon" : "ok" };
  });
}

// Uyarı gerektiren belgeler (bitti ya da yakında bitiyor); tarih girilmemiş olanlar sayılmaz
export const alertsOf = (a, at) => expiryOf(a, at).filter((x) => x.state === "expired" || x.state === "soon");

// "Lisans vizesi bitti (12 Eyl 2026)" / "Sağlık raporu 5 gün sonra bitiyor"
export function alertText(x) {
  if (x.state === "expired") return `${x.label} bitti (${short(x.date)})`;
  return x.left === 0 ? `${x.label} bugün bitiyor` : `${x.label} ${x.left} gün sonra bitiyor`;
}

// Sporcu listesi için: uyarısı olan sporcular, önce bitenler
export function expiryList(athletes, today) {
  return athletes
    .map((a) => ({ a, items: alertsOf(a, today) }))
    .filter((x) => x.items.length)
    .sort((x, y) => Math.min(...x.items.map((i) => i.left)) - Math.min(...y.items.map((i) => i.left)));
}

// Yarış: yarışın son günü itibarıyla geçersiz olan belgeler (yalnız "bitti" sayılır)
export const raceExpired = (a, race) => expiryOf(a, race?.endDate || race?.startDate || "").filter((x) => x.date && x.state === "expired");
