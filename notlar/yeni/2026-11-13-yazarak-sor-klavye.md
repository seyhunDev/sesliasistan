## Nerede kaldım

- Yazarak sor kutusu (Seyhun 2026-11-13 iPad'de "klavye açıldığında tasarım çok kötü"; örnek ana-sayfa/sade-2026-11/klavye.html, "Yap"):
  - Asistan kapalıyken yazarken (`Dome` `typing && !active`, `data-typing`) arkada levha yok; sayfa kararır ve bulanıklaşır (`.atype-dim`), boş yere dokununca kapanır.
  - Kutu lacivert (#0f2140, kenar #2a4472), en çok 40rem; sol menü varken sayfa alanının ortasında (`.dome:not([data-on])` zaten 15rem sağda).
  - Klavye açıkken (`visualViewport`, `data-kb`) alt güvenli alan boşluğu kalkar, kutu klavyeye yapışık.
  - X, görsel ve gönder/konuşma düğmeleri aynı boy (`ROUND` size-12), yan düğmeler lacivert cam yuvarlak.
- Tarayıcıda iPad yatay/dik ve telefonda denendi (gerçek klavye yok); gerçek cihazda denenmedi.

## Sıradaki işler

- iPad'de gerçek klavyeyle bak; boşluk kalırsa `data-kb` hesabı.
