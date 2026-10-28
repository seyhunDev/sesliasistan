## Nerede kaldım
- Rüzgâr grafiği altındaki yağış "A · Saat saat çubuk" oldu (CockpitWind.jsx): her saat bir çubuk; beyaz = yağan (radar, yoksa istasyon toplamı saatlere dağıtılır), mavi = tahmin. Üstte tek özet satırı "Yağmur …" (src/features/weather/rainLine.js): "N mm yağdı · 16–20 arası kuvvetli, 12 mm bekleniyor". Kuvvetli (≥4 mm/sa) ise özet amber. Eski alan grafiği, radar kutuları ve amber "Kuvvetli yağış" kutusu kaldırıldı. Tepe rakamı yalnız gelecek saatlerde.
- Ana sayfa, /weather ve yarış sayfası aynı bileşeni kullanır.
- Yarış sayfası hava kartında (RaceWx.jsx) günlerin altında aynı BÖLGE haritası (RegionMap) var; yer = yarış yeri, dokununca yer değişmez. İstasyon yalnız 30 km içindeyse gösterilir.

## Sıradaki işler
- Grafik ters çevirme (ölçülen dolu, tahmin çizgi) kararı Seyhun'da bekliyor.
- Telefonda denenmedi.
