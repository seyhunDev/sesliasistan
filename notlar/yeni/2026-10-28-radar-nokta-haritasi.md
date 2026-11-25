## Nerede kaldım
- Seyhun "Evet, böyle yap" (örnek radar-nokta): rüzgâr başlığının verisi (#857: /api/rain-radar, istasyonun lat/lon) görünür oldu.
- CockpitWind: bugün için son 2 saatin yağışı radardan (useRainRadar): 10 dakikalık dolu kutular, boy ve renk şiddet (hafif #7dd3fc, orta #38bdf8, kuvvetli #818cf8), üstte "radar · orta"; açıklamaya "Radar". İstasyonun ölçtüğü yağmur aynı kaldı.
- Hava sayfası (WeatherTop): "Saat saat" üstünde NOKTA kartı, PointMap.jsx (Leaflet, koyu Esri karo): mavi nokta seçilen yer, kesikli kare tahmin hücresi (w.model, ±0,04°), beyaz nokta istasyon. Dokununca nokta taşınır (Nominatim'den yer adı ya da "Seçilen nokta"), profile weatherPlace yazılır, 8 sn "Geri al". Kaynak satırına "Radar: RainViewer".
- Testler: elle "radar ve nokta haritası", ekran "Hava › radar ve nokta".

## Sıradaki işler
- Telefonda denenmedi; harita ekran testinde yüklenmiyor (unpkg kapalı), gerçek cihazda bakılmalı.
