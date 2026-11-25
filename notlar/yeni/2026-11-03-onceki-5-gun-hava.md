## Nerede kaldım

- Seyhun 2026-11-03: önceki 5 günün havası, kapalı başlar. Hava sayfasında şeridin üstünde "‹ Önceki 5 gün" düğmesi; açınca şerit geçmiş 5 günü gösterir (gün adı + tarih), saatlik tabloda istasyon ölçümü açık mavi (gerçekleşen), sayılar o günün model değeri (tahmin). "Önümüzdeki günler ›" geri döner. Veri: Open-Meteo `past_days=5` (weather.js `shape` → `past`; eski önbellekte yoksa düğme çıkmaz).
- Yarış havası: gezilebilen günler yarıştan 5 gün önce başlar (`WX_BEFORE` 3 → 5), günler listesi / kaydırma; ölçüm `useWindObs` geçmiş günü de alır.
- Not: geçmiş günün "tahmin"i Open-Meteo'nun o günkü model hesabıdır, o gün yayımlanan tahminin kaydı değil.

## Sıradaki işler

- Ana sayfa ve Planlar gün şeridinde geçmiş gün istenirse ayrıca (bu iş hava sayfası ve yarış havası).
