## Nerede kaldım

- Yayın (canlı ekran) 2026-11-02: yarışa günler varken bekleme ekranında "Yarışa 6 gün", tarih aralığı, ilk start, yer; sağda "Beklenen rüzgâr" (yarış günleri, ilk start'tan 4 saat ortalama, sağanak, yön). Sunucu `/api/canli` `ahead` alanı (open-meteo, 16 güne kadar, 1 saat önbellek); `raceDays`, `aheadWind`, `daysUntil` lib/raceLive.js.
- Bekleme ekranında yarışın adı soluk, en üstte (`lv-hname`).
- Rüzgâr gösteriminde "Şimdi → Start" bandı (lv-wnow) kalktı; yalnız grafik ve renk açıklaması.
- Parkur yarış boyunca tek seçim: kartlar raceLive belgesinde `cards` ({ cards, sel, cardAt }), gün belgesine de yazılır; okurken `withRaceCards` (lib/raceCourse.js).
- Yayını sıfırla: video linki, gösterim, parkur ölçümleri ve (varsayılan açık) videolar da silinir; programın günleri/saatleri (daily, times, off, showAt), kayıt listesi ve parkur kartları kalır.
- Yayın › Parkur: kartlar üstte ("Parkur", sağda seçili kart), eski "Parkur ve rüzgâr" bölümü "Parkur ölçümleri" adıyla altta ve kapalı.
- Telefonda denenmedi; ileri tahmin gerçek yarışla denenmedi.

## Sıradaki işler

- Seyhun ILCA parkur kartının adını ve rotasını değiştirecek.
- Program içe aktarma (yapay zeka) gerçek anahtarla denenmedi.
