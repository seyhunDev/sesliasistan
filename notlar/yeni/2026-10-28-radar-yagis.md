## Nerede kaldım
- Ölçülen yağış geç geliyordu: SYNOP istasyonları yağışı 6-12 saatlik toplam olarak, 1-3 saat gecikmeyle veriyor. Çözüm: radar. Yeni `/api/rain-radar?lat&lon` (src/app/api/rain-radar/route.js) RainViewer'ın ücretsiz radar döşemelerinden (zoom 7, renk 2) seçilen noktanın son 2 saatini 10 dakikada bir okur: `{ src, frames: [{ at, level }] }`, level 0 yok · 1 hafif · 2 orta · 3 kuvvetli (renkten yaklaşık, mm değil). Yardımcılar `src/lib/rainRadar.js` (tileOf, levelOf, küçük PNG çözücü decodePng, levelAt 3×3), istemci `src/features/weather/useRainRadar.js` (useRainRadar, radarByHour).
- `/api/wind-obs` istasyon bilgisine `lat`, `lon` eklendi (haritada ölçümün geldiği yer). Tahminin geldiği model noktası zaten `w.model` (lat, lon, elevation).
- Bulut ortamı RainViewer'a ulaşamadığı için radar canlı denenmedi; renk sınıflandırması yaklaşık.
- Görünüm (grafikte radar yağışı; hava sayfasında seçilen nokta + tahmin karesi + istasyon haritası, dokunarak nokta seçme) "Ana sayfa ve asistan yeni tasarım" konuşmasına iletildi.

## Sıradaki işler
- Yayından sonra radarın gerçekten veri döndürdüğünü kontrol et (yağmurlu bir günde).
