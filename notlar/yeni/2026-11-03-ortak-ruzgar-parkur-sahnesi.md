# Canlı ekran: ortak rüzgâr bloğu ve parkur sahnesi her adımda (2026-11-03)

## Nerede kaldım

- Seyhun: "rüzgâr gösteriminde çok eksiltmişsin; sağanak, gerçekleşen önemli; ok dairede ortalanmamış; adımlar birbiriyle uyumlu gitmeli" ve "parkurda sadece sayılar yazıyor, parkur animasyonumuzu kullanalım; hiç verisi yoksa rüzgârı 0 kabul ederek yine parkuru kuralım".
- `WindNow` (LiveScreen.jsx): daire içinde ortalı SVG ok (rüzgârın gittiği yön), knot, sağanak (sarı, rüzgârdan büyükse), yön + derece, kaynak (istasyon saati / manuel / start'ta tahmin). `curWind` artık sağanak da döndürür.
- `WindHours`: uygulamanın ortak saatlik tablosu (`features/weather/HourTable`): rüzgâr, sağanak, yön; geçen saatlerde istasyon ölçümü açık mavi, şimdi kırmızı çerçeve, start pembe çizgi. Senaryo 1 sütununda (WindCol), videolu bantta (SidePanel) ve senaryo 2 dönen panelde ("Gün boyunca rüzgâr" ayrı panel) aynı iki parça.
- Parkur her yerde sahne (`courseSvg`): bant ve dönen panelde sayı çipleri yerine `.lv-sceneb`. Ölçüm yokken `defaultCard` (eksen 0°, rüzgâr/hat yok, bütün noktalar tahmini) ile yine kurulur; veri girilince gerçek kart.
- Hata: senaryo 2 (`near`) her geri sayımda açılıyordu; artık yalnız sayaç çalışırken, turuncu bayrakta ya da start'a 1 saatten azken.
- Örnekler: yayin-tasarim/senaryo/ortak-*.png. Test: yaris.mjs "canlı ekran ortak rüzgâr bloğu ve parkur sahnesi".

## Sıradaki işler

- Senaryo 3 tehir (örnek 3-*.png onay bekliyor), sonra 4–7.
- Örnek G (parkur sahnesi sade) onay bekliyor.
- Telefonda denenmedi.
