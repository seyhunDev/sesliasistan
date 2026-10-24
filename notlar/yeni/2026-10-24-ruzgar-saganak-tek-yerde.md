## Nerede kaldım

- Rüzgâr ve sağanak her yerde tek yazı: "alt rüzgâr–sağanak kn" (2–4 kn), iki renk yerine tek renk (Seyhun 2026-10-24). Ortak biçim `kn(wind, gust)` src/features/weather/weather.js; kullanan: ana sayfa Cockpit başlığı, CockpitWind (ana sayfa + hava sayfası grafiği), WeatherTop başlığı ve "Saat saat" listesi.
- CockpitWind grafiğinin altındaki 3 saatlik yazıda ölçülen (istasyon) saatlerde tahmin yerine ölçülen "rüzgâr–sağanak" yazar (mavi).
- Grafikteki ayrı "en sert sağanak" etiketi (dikey çizgi + "15:00 · 23 kn") kaldırıldı.

## Sıradaki işler

- Telefonda bak: ölçülen saatlerin mavi yazısı okunuyor mu.

## Tasarım

- Rüzgâr ve sağanak ayrı gösterilmez, her yerde "2–4 kn" tek yazı; ölçülen de aynı biçimde.
