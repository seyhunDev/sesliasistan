// Kullanım kaydı (Seyhun 2026-11-26, Admin sayfası): yalnız izin veren ("Kabul") hesaplarda; uygulamayı geliştirmek için.
// Tutulan: giriş-çıkış saati, açılan sayfanın ADI ve süresi, cihaz, sürüm. Tutulmayan: yazılanlar, mesajlar, fotoğraflar,
// konum, sayfa adresindeki kimlikler (yalnız ilk bölüm: /athletes/123 -> "Sporcular").
// Veri: orgs/{org}/kullanim/{uid} = { ad, tur, izin, son, cihaz, surum, gunler: { "2026-11-26": saniye } }
//       orgs/{org}/kullanim/{uid}/gun/{YYYY-MM-DD} = { sn, sayfa: { "Ana sayfa": saniye }, oturum: { "<giriş ms>": çıkış ms } }
// Telefonda birikir, birkaç dakikada bir tek seferde yazılır (Firestore okuma/yazma sınırı). 90 günden eski günler silinir.
// Testler de içe aktarır: "@/" içe aktarması yok.

export const SAKLA_GUN = 90;
export const YAZ_ARALIK = 5 * 60e3; // telefonda biriken kayıt en geç bu kadar sonra yazılır
export const ESIK_SN = 2; // bundan kısa sayfa görüntülemesi sayılmaz

// İstanbul saatine göre gün: "2026-11-26"
export const gunOf = (ms = Date.now()) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);
export const gunEkle = (gun, n) => new Date(Date.parse(`${gun}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

// Sayfa adresinden yalnız sayfanın adı (adresteki kimlik, arama, kişi adı kaydedilmez)
const SAYFA = {
  "": "Ana sayfa", athletes: "Sporcular", "athletes/races": "Yarışlar", "athletes/attendance": "Yoklama", training: "Antrenman",
  plans: "Planlar", calendar: "Takvim", weather: "Hava", wind: "Rüzgâr", settings: "Ayarlar", "settings/admin": "Admin",
  messages: "Mesajlar", notes: "Notlar", tasks: "Görevler", dues: "Aidatlar", payments: "Hesap", receipts: "Fişler",
  invoices: "Faturalar", fitness: "Fitness", english: "İngilizce", sailing: "Kulüp", staff: "Kişiler", people: "Kişiler",
  media: "Medya", shopping: "Alışveriş", yemek: "Yemek", sanal: "Sanal market", mail: "Mail", sea: "Deniz trafiği",
  cams: "Kameralar", inventory: "Envanter", birthdays: "Doğum günleri", events: "Etkinlikler", archive: "Arşiv",
  schedule: "Ders programı", "my-attendance": "Yoklamam", "my-races": "Yarışlarım", bilgi: "Bilgi", posts: "Gönderiler",
  debts: "Borçlar", canli: "Canlı", meeting: "Toplantı",
};
export function sayfaAdi(path = "/") {
  const p = String(path).split(/[?#]/)[0].replace(/^\/+|\/+$/g, "").split("/");
  const iki = p.slice(0, 2).join("/");
  if (SAYFA[iki] && p.length >= 2) return SAYFA[iki];
  if (p[0] in SAYFA) return SAYFA[p[0]];
  return /^[a-z-]{2,20}$/.test(p[0]) ? p[0] : "Diğer";
}

// Cihaz: kısa ad (model ve sürüm numarası kadar; tarayıcı parmak izi tutulmaz)
export function cihazOf(ua = "", { touch = 0, app = false } = {}) {
  ua = String(ua);
  let c = "Bilgisayar";
  const ios = ua.match(/OS (\d+)[._](\d+)?[^)]* like Mac OS X/);
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) c = "iPad";
  else if (/iPhone/.test(ua)) c = "iPhone";
  else if (/Android/.test(ua)) c = "Android";
  else if (/Macintosh/.test(ua)) c = "Mac";
  else if (/Windows/.test(ua)) c = "Windows";
  const v = ios ? ` · ${c === "iPad" ? "iPadOS" : "iOS"} ${ios[1]}${ios[2] ? `.${ios[2]}` : ""}` : (ua.match(/Android (\d+)/) ? ` · Android ${ua.match(/Android (\d+)/)[1]}` : "");
  return `${c}${v}${app ? " · uygulama" : ""}`;
}

// Telefondaki birikmiş kayıt: { [gun]: { sn, sayfa: { ad: sn }, oturum: { girisMs: cikisMs } } }
// Bir sayfa süresi ekler (gece yarısını geçen süre başladığı güne yazılır; basit tutuldu)
export function sureEkle(birik, { gun, sayfa, sn }) {
  sn = Math.round(sn);
  if (!(sn >= ESIK_SN)) return birik;
  sn = Math.min(sn, 3600); // ekran açık unutulursa bir görüntüleme en çok 1 saat
  const g = (birik[gun] ||= { sn: 0, sayfa: {}, oturum: {} });
  g.sn += sn;
  g.sayfa[sayfa] = (g.sayfa[sayfa] || 0) + sn;
  return birik;
}
export function oturumYaz(birik, giris, cikis) {
  const g = (birik[gunOf(giris)] ||= { sn: 0, sayfa: {}, oturum: {} });
  g.oturum[String(giris)] = cikis;
  return birik;
}

// Silinecek eski günler: bugünden SAKLA_GUN önceki ve ondan önceki 7 gün (her gün bir kez çalışır; arada açılmayan günler de düşer)
export const eskiGunler = (bugun) => Array.from({ length: 7 }, (_, i) => gunEkle(bugun, -(SAKLA_GUN + i)));

// Admin: hesapların gunler alanından son n günde her gün kaç kişi girdi
export function gunlukKisi(hesaplar, bugun, n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const g = gunEkle(bugun, i - n + 1);
    return { gun: g, kisi: hesaplar.filter((h) => (h.gunler?.[g] || 0) > 0).length };
  });
}
export const sonGunlerde = (h, bugun, n) => Array.from({ length: n }, (_, i) => gunEkle(bugun, -i)).some((g) => (h.gunler?.[g] || 0) > 0);

// 2930 -> "49 dk", 7800 -> "2 sa 10 dk"
export function sureYaz(sn = 0) {
  const dk = Math.round(sn / 60);
  if (dk < 1) return sn > 0 ? "1 dk'dan az" : "–";
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa${dk % 60 ? ` ${dk % 60} dk` : ""}`;
}
