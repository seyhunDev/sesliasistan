## Nerede kaldım

- Rüzgâr grafiğinin altındaki yağış şeridi çubuk grafik oldu (Seyhun "A · Mavi çubuk"): her saat bir çubuk, boyu mm kadar. Beklenen yağmur mavi (#3b82f6), 1 mm ve üstünde üstünde sayı; ölçülen yağmur (istasyonun 3/6 saatlik toplamı o saatlere bölünür) açık mavi (#9cc3ee, ölçülen rüzgârla aynı), üstünde toplam "N mm". Şimdi çizgisi çubuklarda da var.
- Açıklama TEK SATIR (Seyhun: "iki satır olmasın"): Rüzgâr · Sağanak · Yağmur · Ölçülen; yalnız grafikte olanlar. Ölçülen hem rüzgâr hem yağmur için.
- `src/features/home/CockpitWind.jsx` (ana sayfa, Hava, yarış sayfası). Ekran testi "Hava › yağış çubukları" ve "ölçülen / beklenen yağmur" (açıklama yüksekliği < 20 px). Telefonda denenmedi.

## Sıradaki işler

- Uzun yağışlı günlerde her çubuğun üstündeki sayı kalabalık olursa yalnız tepe saatlere sayı yazmayı düşün.

## Tasarım

- Yağış: beklenen mavi çubuk, ölçülen açık mavi çubuk; grafiğin açıklaması her zaman tek satır.
