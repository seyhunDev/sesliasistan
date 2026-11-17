## Nerede kaldım

- Bugünün yelken antrenmanına dokununca Bilgi Yönet açılır (Seyhun 2026-11-17: "antrenmanı oradan, kanaldan yöneteceğim"):
  - Ana sayfa kokpitindeki "Süre" düğmesi "Yönet" oldu (Cockpit, IpadHome); gün penceresindeki yelken satırı (DayPick) da Yönet'e gider.
  - Adres `lib/trainingLog.js` `antYonet(p)`: `/bilgi/yonet?ant=<plan id>&ad=<ad>`; başka günün antrenmanı eski sayfada (`/training/day?id=`).
  - Yönet'te (`BilgiAdmin`) kanal kapalıysa kanal adı antrenmanın adıyla hazır gelir; üstteki hapların başında "Antrenman" düğmesi eski sayfayı açar (yoklama, günlük, Bitiren kim, sıralama).
- Test: test:elle "bugünün antrenmanı Yönet'te".
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun'un seçimi bekleniyor: Antrenman düğmesi kalsın mı (önerilen), yalnız Yönet mi, yoksa eski sayfada Yönet düğmesi mi.
