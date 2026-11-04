## Nerede kaldım

- Seyhun 2026-11-04 ("ana sayfa, hava sayfası, yarış detayı aynı tasarım"): hava sayfasındaki 5 günlük şerit (DayStrip, silindi) ve "Önceki 5 gün" düğmesi kalktı; yerine yarış sayfasındaki ortak `DayNav` (src/features/weather/DayNav.jsx): ‹ Dün · Bugün · Çar 4 Kas · Yarın ›, önceki 5 gün ve 7 gün ileri gezilir, açılışta bugün. Tablo ve grafik (HourTable) zaten ortak.
- Ana sayfa gün şeridi (HomeDays) planları da seçtiği için olduğu gibi kaldı.

## Sıradaki işler

- Ana sayfada da DayNav istenirse HomeDays'in plan noktaları ve gün penceresi nereye gideceği ana sayfa konuşmasıyla kararlaştırılmalı.
