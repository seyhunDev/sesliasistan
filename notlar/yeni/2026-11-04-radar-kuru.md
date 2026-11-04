## Nerede kaldım

- Radar bulunduğun noktada ve 5 km içinde yağış görmüyorsa ana sayfa ve Hava sayfasında şu anki hava yağmurlu gösterilmiyor: arka plan (ck-hero data-sky), simge ve durum yazısı nötr "Parçalı bulutlu" (gece "Kapalı"), radarın baktığı saatlerin (son 2 saat + şimdi) tablodaki yağmur simgesi ve mm'si kalkıyor. Sonraki saatler tahmin olarak kalıyor; turuncu "Şu an" satırı durumu yazıyor. Seyhun 2026-11-04 "burada ve etrafta yağmur yoksa arka planı yağmurlu yapmayalım… ikon yağmur, arka plan yağmurlu ama burası güneşli".
- Kod `features/weather/rainLine.js` (radarNow, radarRows, dryNow), kullanılan yer Cockpit ve WeatherTop.
- Telefonda ve gerçek radarla denenmedi.

## Sıradaki işler

- Yağışlı ama noktada kuru bir günde telefonda bak.
