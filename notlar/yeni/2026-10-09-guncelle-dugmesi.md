## Nerede kaldım

- "Güncelle" düğmesi (Seyhun: "güncelleme olduğunda bir buton olsun, basınca sayfa yenilensin, yeni sürüm kullanılmaya başlasın"; telefonda denenmedi): uygulama açılınca, uygulamaya dönünce ve açıkken 5 dakikada bir `/api/version` (son yayının sürümü, oturumsuz, önbelleksiz) okunur; telefondaki sürümden farklıysa her sayfada üstte "Yeni sürüm var · 9 Ekim 21:10 · Güncelle" kartı çıkar (`NewVersionBar.jsx`, `src/lib/newVersion.js`: `checkVersion`, `watchVersion`, `applyUpdate`). Güncelle: service worker yenilenir, sayfa sunucudan yeniden yüklenir (sayfalar ağdan önce geldiği için yeni sürüm açılır); sonra "Güncellendi" notu çıkar. × o açılış için gizler. Asistan: "uygulamayı güncelle", "güncellemeyi yükle", "yeni sürüme geç", "sayfayı yenile" (yeni sürüm yoksa "Uygulama zaten güncel" + son güncelleme; `updateAsk`, route `appUpdate`); "son güncelleme ne" sorusunda yayında daha yeni sürüm varsa söyler. Testleri `test:elle` › "Yeni sürüm", yönlendirme › appUpdate.

## Sıradaki işler

- Yayından sonra uygulama açıkken bir sonraki yayını bekle: birkaç dakika içinde (ya da uygulamaya dönünce) üstte "Yeni sürüm var · Güncelle" çıkmalı; bas, sayfa yenilenip "Güncellendi" notu gelmeli.
