## Nerede kaldım

- Hava sayfası ana sayfayla aynı oldu (Seyhun 2026-11-12 "hava durumu sayfasını da ana sayfa hava durumuna göre yap… gerçekleşen değerleri de göster… birleştir"; örnek ana-sayfa/sade-2026-11/hava.html).
- Ortak parça `src/features/weather/WxPanel.jsx`: HavaPanel (pusula + saat saat rüzgâr), DayCell (gün kutusu), Compass, WindChart, useObsRows. IpadHome ve WeatherTop ikisi de bunu kullanır.
- Ölçülen rüzgâr (useWindObs, /api/wind-obs, en yakın istasyon): grafikte beyaz çizgi + noktalar, 3 saatlik rakamlar ölçülmüşse beyaz; pusula son 2 saatte ölçüm varsa ondan ("ölçülen HH:00"). Ana sayfada da görünür.
- Hava sayfası (`WeatherTop`): lacivert `.iph.iph-page`; Hava kutusu, 12 gün (önceki 5 gün "ölçülen", yana kayar), saat saat tablo (HourTable) + Bölge haritası (geniş ekranda yan yana), MGM / Windy, kaynak. WindRibbon ve DayNav bu sayfadan kalktı (yarış havasında duruyor).

## Sıradaki işler

- Seyhun telefonda ve iPad'de bakacak; gerçek istasyon verisiyle (özellikle geçmiş günler) kontrol.
