## Nerede kaldım
- Bölge haritası (RegionMap; hava sayfası ve yarış sayfası) artık sayfada sürekli durmuyor: "Harita" düğmesi tam ekran açar, yere yakın (zoom 12) başlar, tek parmakla her yöne kaydırılır, iki parmakla büyür/küçülür; ✕ kapatır.
- Oklar yaklaştıkça sıklaşır (`denseArrows`, src/lib/regionMap.js): ekranda ~56 pikselde bir ok; ≈5 km'lik ızgara noktalarının arası çift doğrusal ara değerle (yön u/v ile) doldurulur. Bu yeni veri değil, modelin değeri yumuşatılır. Harita verinin merkezinden 12 km'den uzağa kayınca o bölgenin ızgarası yüklenir.
- Veri: Open-Meteo (ECMWF, ICON, GFS gibi küresel modeller, ~9-13 km çözünürlük). Koy içi gerçek ayrıntı için ölçüm gerekir (kulübe rüzgâr istasyonu ya da MGM otomatik istasyonları).
- Telefonda denenmedi; bulut ortamı harita karolarına ulaşamadığı için ekran görüntüsü alınamadı.

## Sıradaki işler
- Seyhun'un koy içi ayrıntı için seçeneği (kulüp istasyonu / MGM) seçmesi bekleniyor.
