## Nerede kaldım

- Rüzgâr grafiğinde ölçülen ile tahmin daha net ayrıldı (Seyhun "A · Ölçülen beyaz çizgi": "tahmin baştan sona var, ölçülen bulunduğumuz saate kadar"): tahmin bütün gün dolu renkli alan, ölçülen rüzgâr şimdiye kadar noktalı beyaz çizgi, ölçülen sağanak ince beyaz kesik çizgi. "← ölçülen | tahmin →" yazısı kalktı. Ölçülen saatlerin altındaki kn yazısı beyaz, tahmin saatleri soluk.
- Yağmur çubuk yerine alan grafiği: mavi alan (saatlik mm, sağda mm ölçeği, en yüksek saatte "N mm/sa"); ölçülen yağmur (istasyon toplamı saatlere bölünür) beyaz noktalı çizgi + "N mm geldi".
- Açıklama tek satır: Rüzgâr · Sağanak · Yağmur · Ölçülen (beyaz çizgi).
- `src/features/home/CockpitWind.jsx` (ana sayfa, Hava, yarış sayfası). Ekran testleri "Hava › yağmur grafiği" ve "ölçülen / beklenen yağmur". Telefonda denenmedi.

## Sıradaki işler

- Yarış günü ana sayfada ve widget'ta yarış yerinin havası büyük, Dikili altta tek satır (Seyhun onayladı, örnek yaris-yeri-hava).

## Tasarım

- Ölçülen her grafikte noktalı beyaz çizgi, tahmin dolu alan; yağmur mavi alan.
