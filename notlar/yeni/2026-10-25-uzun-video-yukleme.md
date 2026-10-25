## Nerede kaldım

- Seyhun: "1 dakikadan uzun kayıtlar ne telefona ne buluta yükleniyor". Nedeni (çıkarım, telefonda denenmedi): iPhone kamerasının 1080p videosu 1 dk'da ~100 MB; 60 MB Storage sınırına sığması için web'de küçültülüyordu. Bu küçültme videoyu baştan sona oynatarak çalışıyor; ekran kilitlenince ya da uygulama arkaya geçince oynatma durup hiç bitmiyordu, aslı da sınırı aştığı için yüklenemiyordu.
- iPhone uygulaması (`VeloraKamera.swift`): aslı iPhone Fotoğraflar'a kaydediliyor (telefonda kalır); buluta gidecek 1080p kopya AVAssetWriter ile donanımda hazırlanıyor (süreye göre ≤55 MB, en çok 5 Mbit). Web küçültmesi hiç çalışmıyor (`cloudCopy` kopyanın bit hızını uygun görüp olduğu gibi yüklüyor). Kayıt düğmesi hazırlanırken yanıp söner.
- Web'de (`fitMedia.js shrinkVideo`): oynatma durursa yeniden başlatılır, 20 sn ilerlemezse vazgeçilir; kayıt telefonda bekler ve sonra yeniden denenir ("Video küçültülürken durdu…").
- Uygulama Xcode'dan yeniden kurulmalı.

## Sıradaki işler

- Telefonda 1-2 dakikalık video: Fotoğraflar'a düşüyor mu, buluta yükleniyor mu, kopya ne kadar sürüyor.
