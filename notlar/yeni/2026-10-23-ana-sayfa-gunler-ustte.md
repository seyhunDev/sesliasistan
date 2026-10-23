## Nerede kaldım

- Ana sayfada gün şeridi en üstte (Seyhun 2026-10-23 "Yap", örnek gunler.html): üstte tarih başlığı yok (tarih yalnız şeritte; ekran okuyucu için gizli h1), sağ üstte doğum günü / zil / Ayarlar. Bugün kutusu diğerlerinden geniş ve büyük.
- Güne dokununca o gün seçilir (OwnerHome `sel`): kokpitteki hava satırı (`dayWeather`, lib/homeTiles.js: saatlerden en düşük/en yüksek, öğlenin gökyüzü, gündüz 09–18 en sert rüzgâr–sağanak, "gün içi") ve rüzgâr grafiği o güne geçer; sıradaki plan kartının yerine o günün planları (`dayPlans`, Cockpit `DayPlans`, "Günü aç ›"). Seçili güne yeniden dokunmak ya da "Günü aç" o günün penceresini (DayPick) açar. Başka gün seçiliyken bugün beyaz çerçeveli (`.ck-tout`); bugüne dokununca geri döner.
- Hava tahmini 6 → 7 gün (weather.js forecast_days) ki şeridin 7. gününde de hava olsun; hava sayfasındaki gün listesi değişmedi (yine 5 gün). Tahmin olmayan günde "Bu gün için hava tahmini yok".
- Testler: elle "seçilen günün planları", "seçilen günün havası". Telefonda denenmedi.
