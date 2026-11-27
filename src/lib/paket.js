// Sporcu paketleri (Seyhun 2026-11-27 "her antrenörün 3 ücretsiz sporcu hakkı, sonrası paket"; örnek
// https://claude.ai/artifact/55qoArYjYQCeJpyLvbmgCP onaylandı). Ödeme yok: kullanıcı paket ister (users/{uid}.paketIstek),
// Velora ana hesabı Admin › Paketler'den açar (users/{uid}.paket). İkisini yalnız sunucu yazar (/api/paket, firestore.rules).
// Sınır sunucuda: sporcu yalnız /api/sporcu-ekle'den eklenir, sporcu belgeleri sayılır (arşivdekiler de; silinen yer açar).
// Velora ana hesabı sınırsız; Admin "Sınırsız" (size 0) da verebilir. Saf modül: React ve Firebase yok (testlerde de kullanılır).

export const UCRETSIZ = 3;
// [sporcu sayısı, aylık ₺, yıllık ₺] (yıllık = 10 ay)
export const PAKETLER = [
  { size: 10, ay: 149, yil: 1490 },
  { size: 15, ay: 199, yil: 1990 },
  { size: 20, ay: 249, yil: 2490 },
];
export const SIZES = [UCRETSIZ, ...PAKETLER.map((p) => p.size)];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Türkiye günü

// Kayda girecek paket: { size, period: "ay" | "yil", until: "YYYY-MM-DD" | "" }; size 0 = sınırsız. Geçersizse null.
export function cleanPaket(p) {
  const size = Number(p?.size);
  if (!(size === 0 || SIZES.includes(size))) return null;
  return { size, period: p?.period === "yil" ? "yil" : "ay", until: DAY.test(String(p?.until || "")) ? String(p.until) : "" };
}
// İstek: yalnız ücretli paketler
export function cleanIstek(p) {
  const c = cleanPaket(p);
  return c && c.size > UCRETSIZ ? { size: c.size, period: c.period } : null;
}

// Paket geçerli mi (bitiş günü geçmediyse; bitişsiz paket süresiz)
export const paketGecerli = (p, gun = today()) => !!p && (!p.until || p.until >= gun);

// Hesabın sporcu sınırı: Infinity (sınırsız) ya da sayı
export function limitOf(paket, { admin = false, gun } = {}) {
  if (admin) return Infinity;
  const p = cleanPaket(paket);
  if (!p || !paketGecerli(p, gun)) return UCRETSIZ;
  return p.size === 0 ? Infinity : Math.max(UCRETSIZ, p.size);
}

export const fiyatOf = (size, period = "ay") => {
  const p = PAKETLER.find((x) => x.size === size);
  return p ? (period === "yil" ? p.yil : p.ay) : 0;
};
const tl = (n) => `${n.toLocaleString("tr-TR")} ₺`;
export const fiyatYazi = (size, period = "ay") => (fiyatOf(size, period) ? `${tl(fiyatOf(size, period))} / ${period === "yil" ? "yıl" : "ay"}` : "Ücretsiz");

// Ekrandaki kısa ad: "Ücretsiz · 3 sporcu", "15 sporcu", "Sınırsız"
export function paketAdi(paket, opts) {
  const l = limitOf(paket, opts);
  if (l === Infinity) return "Sınırsız";
  return l === UCRETSIZ ? `Ücretsiz · ${UCRETSIZ} sporcu` : `${l} sporcu`;
}
// Kalan hak (sınırsızda Infinity)
export const kalanOf = (count, limit) => (limit === Infinity ? Infinity : Math.max(0, limit - (Number(count) || 0)));

// Havale ile ödeme (Seyhun 2026-11-27 "IBAN vereceğim, havaleyle alacağız, admine düşsün, ben onaylayınca abonelik açılsın"):
// kullanıcı paketi seçer (istek "bekliyor", ekranda IBAN, tutar ve açıklama kodu), havaleyi yapınca "Ödemeyi yaptım" der
// (istek "odendi", ana hesaba bildirim). Admin › Paketler'de onaylanınca paket bugünden bir ay ya da bir yıl açılır.
// IBAN ve alıcı adı koda yazılmaz: Admin › Paketler'den girilir (veloraAyar/odeme, yalnız sunucu).
export const DURUM = { bekliyor: "Ödeme bekleniyor", odendi: "Ödeme bildirildi · onay bekliyor" };
// Havale açıklaması: hesaba göre sabit kısa kod ("VLR-AB12CD")
export const kodOf = (uid) => `VLR-${String(uid || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
// Bitiş günü: başlangıçtan bir ay ya da bir yıl sonra (aynı gün; ay sonu taşarsa ayın son günü)
export function bitisOf(bas, period) {
  const [y, m, d] = String(bas).split("-").map(Number);
  const ay = period === "yil" ? 12 : 1;
  const son = new Date(Date.UTC(y, m - 1 + ay + 1, 0)).getUTCDate();
  const t = new Date(Date.UTC(y, m - 1 + ay, Math.min(d, son)));
  return t.toISOString().slice(0, 10);
}
// Onaylanan paket: süren aynı paketin üstüne uzatılır (yenileme), yoksa bugünden başlar
export function onayla(istek, eski, gun = today()) {
  const c = cleanIstek(istek);
  if (!c) return null;
  const e = cleanPaket(eski);
  const bas = e && e.size === c.size && e.until && e.until >= gun ? e.until : gun;
  return { size: c.size, period: c.period, until: bitisOf(bas, c.period) };
}
export const ibanTemiz = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 34);
export const ibanYazi = (s) => ibanTemiz(s).replace(/(.{4})/g, "$1 ").trim();
export const ibanGecerli = (s) => /^TR\d{24}$/.test(ibanTemiz(s));
