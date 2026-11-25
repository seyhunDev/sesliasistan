## Nerede kaldım

- Kilitten / arka plandan dönünce uygulama "yükleniyor gibi yenileniyor"du (Seyhun 2026-11-08: "bir kere açtıysam arka planda öyle kalmalı, direkt açmalıyım"). İki yerde sayfa göz önünde baştan yükleniyordu:
  - iPhone uygulaması (`mobil/ios/App/App/VeloraViewController.swift` `oneGeldi`): öne gelince web sayfasına küçük bir soru soruluyor, 3 sn'de cevap gelmezse sayfa yeniden yükleniyordu. Kilitten dönüşte web süreci uyanırken cevap 3 sn'yi geçebiliyordu. Artık yalnız hata dönerse (süreç ölmüş) ya da sayfa boşsa yenilenir; hiç cevap gelmezse 15 sn sonra. Xcode ile yeniden kurulunca geçerli.
  - Web (`src/lib/newVersion.js` `onHide`): yeni sürüm varken arkada 3 dk kalınca yenileme zamanlayıcısı. iPhone kilitliyken kod durduğu için zamanlayıcı dönüş anında geç çalışıp göz önünde yeniliyordu. Geç çalışan zamanlayıcı (`lateWake`, 15 sn'den geç) artık yenilemez; yeni sürüm sonraki sayfa geçişinde alınır.
- Test: `npm run test:elle` › Yeni sürüm "kilitten dönüşte yenilenmez". Telefonda denenmedi. (`test:elle`'de main'de zaten kırık 6 test var: geri düğmesi, asistan küre/kutu, yarış ⋯ menüsü, yayın sayfası; bu işle ilgisiz.)

## Sıradaki işler

- iPhone uygulamasını Xcode ile yeniden kur (yerel değişiklik `mobil/`).
- Hâlâ olursa: Firestore iç hatası (b815) sonrası kendini yenileme (`healFirestore`) de dönüşte görülebilir; Ayarlar'daki hata kaydına bakılır.
