## Nerede kaldım
- Admin › Açılış (Seyhun 2026-11-27 "açılış masası… ben adminden yöneteceğim bunları hepsini"; telefonda denenmedi): Açılış masası
  sayfası uygulamaya taşındı, yalnız Velora ana hesabında. `/settings/admin/acilis` (features/admin/Acilis.jsx), içerik tek yerde
  `src/lib/acilis.js` (kalanlar, cihaz testleri, otomatik test özeti, bağlantılar). İşaretler `orgs/{org}/ayar/acilis.isaret`
  (her cihazda aynı; kural değişmedi, ana hesap zaten yazar). Gruplar dokununca açılır. Uçtan uca testte işaretleme adımı: 58/58.

## Sıradaki işler
0. Telefonda Ayarlar › Admin › Açılış açılıyor, işaret başka cihazda da görünüyor mu.
1. Otomatik test özeti (OTO, OTO_TARIH) yeni test çalışınca lib/acilis.js'de elle güncellenir.
