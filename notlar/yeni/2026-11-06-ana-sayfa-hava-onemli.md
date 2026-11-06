## Nerede kaldım
- Ana sayfa hava bölümü (Cockpit): sıcaklık satırının altında tek cümlelik yapay zeka özeti, lacivert panelde "önemli" kart ve küçük gidiş grafiği, altında eski saat saat tablo (HourTable) aynen.
- Kurallar `src/features/weather/insight.js` (saf, testli "ana sayfa hava önemli kart"): yağmur (radar burada/15 km içinde, ya da tahmin ≥%50 ve ≥0,3 mm) > rüzgâr artışı (≥15 kn ve şimdikinden +8 kn) > sıcaklık değişimi (±6°). Hiçbiri yoksa kart yok, sıcaklık grafiği (sakin gün). Radar-kuru kuralı (#1210) radarRows/radarNow'dan geldiği gibi korunur.
- Cümle: `/api/weather-brief` (Gemini, tek cümle, `thinkingLevel: minimal` gemini.js içinde); telefonda 30 dk aynı gerçekler için saklanır (`sa-wbrief`), yapay zeka yoksa kuralların yedek cümlesi gösterilir. Yalnız bugün için çağrılır.
- Yenileme zaten useWeather'da: açılışta, 15 dk'da bir, uygulamaya dönünce, konum değişince.
- Radar burada yağış gösteriyorsa "Şu an" turuncu satırı (NowRain) kartla çakışmasın diye gizlenir.

## Sıradaki işler
- Ana sayfanın alt bölümleri (Seyhun: hava bitince sırayla).
- Telefonda denenmedi; yağmur/rüzgâr kartı gerçek veride görülmeli.
