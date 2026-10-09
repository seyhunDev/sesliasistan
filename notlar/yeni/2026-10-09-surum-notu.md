## Nerede kaldım

- Yayın bilgi notu (Seyhun: "her yayından sonra yukarıda küçük bilgi notu, en son hangi değişikliği yaptık; kod güncellendi mi bilemiyorum"; telefonda denenmedi): derlemede son birleşen değişikliğin başlığı, PR numarası ve yayın zamanı uygulamaya gömülür (`next.config.mjs` `env`: `NEXT_PUBLIC_BUILD_AT`, `_SHA` (Netlify `COMMIT_REF`), `_MSG` git'ten; "Merge branch 'main' into …" ise birleştirme olmayan son commit). Yeni sürüm bu cihazda ilk açılınca üstte küçük kart: "Güncellendi · 9 Ekim 18:15" + "#247 · açıklama"; 12 sn sonra ya da × ile kapanır, bir kez çıkar (`sa-build`, `UpdateNote.jsx`). Ayarlar › Diğer ayarlar'ın sonunda her zaman "Sürüm" satırı (`buildLine`). Asistan: "son güncelleme ne", "en son ne değişti", "uygulama güncellendi mi", "hangi sürümdeyim" yerelde cevaplanır (`versionAsk`, `buildSpeech`, src/lib/buildInfo.js; route `version`). Yerelde `next dev`'de bilgi yok, not çıkmaz. Android uygulaması canlı siteyi açtığı için orada da çalışır. Testleri `test:elle` › "Yayın bilgisi", yönlendirme › version.

## Sıradaki işler

- Bu yayından sonra uygulamayı aç: üstte "Güncellendi · …" notu çıkmalı; Ayarlar'ın en altında Sürüm satırına bak. Asistana "son güncelleme ne" de. Not çıkmıyorsa uygulama eski sürümde kalmış demektir: kapatıp yeniden aç.
