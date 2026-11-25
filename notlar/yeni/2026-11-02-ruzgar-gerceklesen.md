## Nerede kaldım

- Yarış öncesi rüzgâr gösteriminde grafik beklenen (tahmin, beyaz çizgi) ile gerçekleşeni (yarış yerine en yakın istasyon, mavi alan) birlikte gösteriyor. Açıklama renkli: "— Beklenen", "▬ Gerçekleşen · Dikili", "● Bizim ölçüm" (Seyhun 2026-11-02).
- Her saatte yön oku var; ölçülen saatler mavi, tahmin saatleri soluk (hava durumu sayfasındaki gibi).
- Üstteki "Şimdi" değeri bizim parkur ölçümümüzden geliyor. O yoksa istasyonun son saati yazıyor ("Gerçekleşen · Dikili 13:00").
- Veri zaten /api/canli'de vardı (forecast.obs, OGIMET, 100 km). Bu PR'da yalnız görünüm değişti (LiveScreen.jsx WindDay, WindBody; css .lv-leg).

## Sıradaki işler

- Gerçek yarış yerinde istasyon verisi geliyor mu bak (Dikili 17180).
