## Nerede kaldım
- Ana sayfada hava satırına ya da rüzgâr grafiğine dokununca hava durumu artık alttan pencere değil, tam sayfa açılıyor: `/weather` (geri düğmeli, `src/app/(app)/weather/page.jsx`, içerik yine ortak WeatherDetail). Sesle "hava durumunu aç" da bu sayfayı açar (lib/nav.js); yalnız "hava durumu" demek eskisi gibi asistana sorulur.
- Ortak alttan pencere (`components/ui/Sheet.jsx`) açıkken arkadaki sayfa artık kaymıyor (html/body overflow kilidi, iç içe pencere sayacı); uygulamadaki bütün alttan pencerelere geçer. Telefonda denenmedi.

## Sıradaki işler
- Foça gibi küçük kıyı yerleri için MGM otomatik istasyonları: Seyhun'un Mac'ten curl çıktısı bekleniyor.
