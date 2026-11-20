## Nerede kaldım
- Bilgi › Yönet › Hava yeniden yapıldı (Seyhun 2026-11-20 "ana sayfadaki hava durum tasarımını kullanalım, yarışın yapıldığı yerdeki hava"): tasarım ana sayfa / hava sayfasıyla aynı (HavaPanel + gün şeridi DayCell + saat saat HourTable), yeni `src/features/weather/PlaceWx.jsx`.
- Yer: o günün canlı yarışı `loadRace` + `racePlace` (yarış sahası, yoksa Çevre'deki alan, yoksa ilçe; yarış sayfasıyla aynı). Önceki sürüm canlı listesindeki yarışta ilçe olmadığı için Dikili'yi gösteriyordu. Yarış yoksa seçili hava konumu.
- `loadWeatherAt(yer)` (weather.js) seçili konumu değiştirmeden o yerin havasını alır; HavaPanel, DayCell, useObsRows `at` alır (verilmezse eskisi gibi seçili konum).
- RaceWx.jsx'teki geçici `WxDays` kaldırıldı.

## Sıradaki işler
- Telefonda gerçek veriyle denenmedi.
