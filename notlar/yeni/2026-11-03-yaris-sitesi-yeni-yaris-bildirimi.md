## Nerede kaldım

- Yarış sitesinde (TYF Yelken Ligi İlan Tahtası) yeni yarış açılınca bildirim (Seyhun 2026-11-03 "yeni bir yarış eklenirse bildirim gelmeli"). `netlify/functions/race-site.mjs` saatte bir tarama ister (`raceSite/_known.scanAt`), `race-site-background.mjs` `scanNew` (lib/server/raceSiteSync.js) çalıştırır: şimdiki sezonun sınıf sekmeleri `raceSite/_known.acts` ile karşılaştırılır, yenisi varsa bildirim ("Sitede yeni yarış: 2. Ayak · OPTIMIST" ya da "Sitede N yeni yarış"), dokununca Siteden ekranı. İlk tarama yalnız mevcut yarışları kaydeder.
- Bildirim alanlar: Siteden ekranını açmış ana hesaplar (`_known.owners`, /api/race-site GET ekler) ve yarış izleyen hesaplar.
- İzlenen yarışa yeni belge gelince bildirim zaten vardı (#1117/#1118); ortak `notifyUser` ile yazıldı.
- Telefonda denenmedi.

## Sıradaki işler

- İlk bildirim geldiğinde metnin uygunluğunu Seyhun'a sor.
