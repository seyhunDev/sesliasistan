## Nerede kaldım
- Güncellemeden sonra mavi ekran ve bağlantı kaybı (Seyhun 2026-11-26: "güncellendiğinde arka mavi ekran geliyor; güncellemeden sonra internet gidiyor, kapatıp açmak zorunda kalıyorum"; telefonda denenmedi).
- Mavi: service worker sayfayı önce telefondaki kopyadan açıyor; güncellemede eski sürümün kopyası (lacivert açılış ekranı, #1578'den önce) bir an görünüyordu. `public/sw.js` VERSION sa-v18: eski sayfa ve dosya kopyaları silinir. İnternetsiz sayfası da koyu gri (#0b0b0c).
- Bağlantı: yeni sürüm çoğunlukla uygulama arkadayken kendiliğinden yükleniyor (lib/newVersion.js onHide). iPhone arkadaki sayfanın bağlantısını keser, Firestore asılı kalır; watchReconnect yalnız "arkaya gitti → döndü" görünce bağlantıyı yeniliyordu, arkada yüklenen sayfa hiç "arkaya gitti" görmediği için yenilemiyordu. Artık arkada yüklenen sayfa ilk öne gelişte bağlantıyı yeniler (`src/features/pwa/netWatch.js`).
- Test: `npm run test:cevrimdisi` 30/30; yeni "Arkada güncellenince" (sayfa arkada yüklenir, Firestore istekleri asılı, öne gelince 8 sn içinde kayıt gider). Düzeltme olmadan bu test kalıyor (denendi). Yerel testlerdeki 57 kalan main'de de aynı, bu işle ilgisiz.

## Sıradaki işler
0. Telefonda: güncelleme sonrası uygulamaya dön; açılış koyu gri olmalı, veriler kendiliğinden gelmeli.
