## Nerede kaldım
- Ana sayfanın ilk ekranı telefona tam oturuyor (Seyhun 2026-10-28 "A · Yalnız saydıkların"). İlk ekranda gün şeridi, yarış sayacı (RaceLive), hava ve rüzgâr grafiği var; yarış başka yerdeyse altta ev yeri satırı. Sıradaki plan ve iş düğmeleri kaydırınca geliyor.
- Cockpit.jsx `useFit`: telefonda (genişlik < 768) yükseklik = pencere − kutunun yeri − sekme çubuğu; `min-height` olarak veriliyor, içerik sığmazsa uzuyor. `--u` = yüksekliğin yüzde biri. Gün rakamları ve kutuları (HomeDays), sayaç ve düğmeleri (RaceLive) ve sıcaklık clamp(…var(--u)…) ile büyüyüp küçülüyor. Kalan yeri grafik dolduruyor (CockpitWind `fill`: çizim alanı ölçülüyor, viewBox yüksekliği orana göre; DayChart `fill`). Masaüstünde eski görünüm.
- iPhone SE'de yarış varken biraz taşabiliyor (ekran testi bunu kabul ediyor).

## Sıradaki işler
- Yarış günü hava: yarış yerini daraltma, ev yerini yan yana ya da alt alta gösterme örneği (Seyhun sordu).
- Telefonda denenmedi.
