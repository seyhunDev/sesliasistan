## Nerede kaldım

- Seyhun 2026-11-03: uygulamadaki bütün hava gösterimleri tek tasarım (Windy tarzı saat saat tablo `HourTable`), her saat bir sütun. Hava sayfası = `DayStrip` (5 gün) + `HourTable` (light); yarış havası `RaceWx`, canlı yayın `LiveScreen` WindBody ve ana sayfa aynı bileşeni kullanır. Eski çubuk/çizgi grafikler (WindBody SVG, RaceWx DayChart SVG) kaldırıldı.
- Gerçekleşen: `hourCols.js` geçmiş ve şimdiki saatte istasyon ölçümünü (`useWindObs`, canlı ekranda kendi `obs`) sütuna işler (açık mavi, açıklama "Ölçülen (Dikili istasyonu)"), ölçülen yağış `obsMm` ile raporun kapsadığı saatlere bölünür (12:00'de biten 3 saatlik 6 mm → 09, 10, 11'e 2'şer). Şimdi kırmızı çerçeve; plan/start çizgisi `marks=[{at:"HH:MM", label}]` (canlı ekranda `plan.at`; RaceWx `marks` prop'u alır).
- Harita her yerde 'Harita' düğmesi (tam ekran RegionMap); yarış sayfasında mini önizleme kalktı.
- Ekran testi Hava 3/3 tabloya uyarlandı. Ana sayfa "gün penceresi Yapıldı" adımı bu işten bağımsız kırmızı.

## Sıradaki işler

- Yarış planı saati bilinen yerlerde RaceWx'e `marks` geçirmek (yarış/multimedya konuşmaları).
- Seyhun "bir önceki ana sayfa tasarımı" demek istedi: hangi tasarımı kastettiği sorulmadı, cevap bekleniyor.
- Telefonda denenmedi.
