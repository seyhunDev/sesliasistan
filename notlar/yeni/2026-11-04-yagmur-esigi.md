## Nerede kaldım

- Tahminde yağmur simgesi yalnız yağış ihtimali %50 ve üstündeyse; altındaysa o saat "Kapalı" (bulut) gösterilir, mm yine yazılır (`weather.js` softCode, dayHours ve yarış `rowsFrom` içinde). Günün simgesi (gün şeridi, başka gün seçilince üstteki satır): günün hiçbir saati %50'ye varmıyorsa yağmurlu değil (`dayCode`, `homeTiles.dayWeather`, WeatherTop). Seyhun 2026-11-04 kartta "İkisi de".
- Yarış havası (RaceWx DayChart): bugün için ana sayfadaki radar düzeltmesi (radarRows, yarışın yerinde) ve altında turuncu "Şu an" satırı.
- Radar ileriyi görmez; gelecek saat/gün yalnız ihtimal eşiğiyle yumuşatılır. Telefonda denenmedi.

## Sıradaki işler

- Yağmurlu bir günde ana sayfa gün şeridi, Hava ve yarış havası simgelerine telefonda bak.

## Asistan

- Yağmur gösterimi: şu an ve son 2 saat radara göre; ileride yağmur simgesi ihtimal %50 ve üstü.
