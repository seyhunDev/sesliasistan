## Nerede kaldım

- Hava sayfasında (bugün) saat tablosunun altında radar satırı: "Burada şu an orta yağış var", "Burada yağmıyor · 8 km kuzeyinde hafif yağış" ya da tahmin önümüzdeki 3 saatte yağış derken "Burada ve 30 km içinde şu an yağış yok" (hepsi "(radar 13:40)" ile). Seyhun 2026-11-04 kartta "Radarla burada / çevrede"yi seçti.
- Neden: tablo seçilen noktanın tahmini ama hava modeli ~9–11 km'lik kareyi tek değer sayar; sağanak karenin bir köşesindeyse bütün kareye yayılır. Radar (RainViewer, z7 ≈ 1 km/piksel) şu anki gerçeği söyler.
- `/api/rain-radar` artık `near` da döner (son karede 30 km içindeki en yakın yağış: km, 8 yön, şiddet); hesap `lib/rainRadar.js` `nearestRain`, yazı `features/weather/rainLine.js` `hereLine`. Tahmin sütunları değişmedi.
- Bu oturumdan RainViewer'a erişilemedi; gerçek radarla ve telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: yağışlı bir günde satırın çıktığını ve yönün doğru olduğunu kontrol et.

## Asistan

- Yağmur tahmini ile "burada" ayrımı radarla yapılır (tahmin modeli Türkiye'de ~10 km çözünürlükte, daha ince ücretsiz model yok).
