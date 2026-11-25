## Nerede kaldım

- Yarışın hava grafiği kaydırılarak gün değişir (Seyhun 2026-10-31): Seyhun'un dediği gibi sola çekince geri, sağa çekince ileri (`raceWeather.js` `swipeStep`, yön tek sabit `SWIPE_BACK_LEFT`; ters isterse onu çevir). Yarış detayında, yarış günü üst kartında (RaceDayTop mini) ve Saha'da (Saha'da sayfanın günü değişir: RaceMedia → CourseTab `onDay` → RaceWx).
- Yarış detayında yarıştan önceki 3 gün de gezilir ve Gün listesinde "Yarıştan N gün önce" diye çıkar (`wxDays`). Saha'da yalnız sayfanın günleri.
- Telefonda denenmedi.

## Sıradaki işler

- Yön doğru mu, Seyhun'a soruldu (genel alışkanlık tersidir).
