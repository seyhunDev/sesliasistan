## Nerede kaldım

- Seyhun 2026-10-26 "Galeriden de sil"i seçti: iPhone uygulamasında çekilen videonun aslı Fotoğraflar'a kaydedilirken kimliği (localIdentifier) alınır, künyeye `asset` olarak yazılır (raceLive.js cleanMedia). Velora'dan silinince `deletePhotos` (nativeIos.js) → eklenti `photosDelete` (VeloraKamera.swift) Fotoğraflar'dan da siler; iPhone kendisi onay sorar, ilk seferde fotoğraf okuma izni ister.
- Yalnız bu güncellemeden sonra çekilen videolar için geçerli (eskilerin kimliği yok). Xcode'da yeniden derleme gerekir. Telefonda denenmedi.
- Medya bilgi yazısı buna göre değişti (sa-medya-bilgi3, bir kez yeniden görünür).

## Sıradaki işler

- Telefonda dene: çek, Velora'dan sil, iPhone'un sorusuna "Sil" de, Fotoğraflar'da "Son Silinenler"e gittiğini gör.

## Tasarım

- Multimedya sayfasındaki Hava sekmesi kalktı (Seyhun 2026-10-26: "multimedyada artık gerek yok"). Sekmeler Süre · Medya · Sonuçlar; yarış günü değilse Medya açılır. Yarışın havası yarış sayfasının Hava sekmesinde. Elle rüzgâr kaydı ("Rüzgar yaz") da onunla gitti; eski kayıtlar belgede duruyor. WeatherTab.jsx antrenman günü sayfasında kullanılmaya devam ediyor.
