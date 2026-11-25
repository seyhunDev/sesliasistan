## Nerede kaldım
- Bildirime dokununca ekran dönüp kalıyordu (Seyhun 2026-11-20 "mesaj bildirimine tıklayınca ekran dönüp kalıyor"). Neden: dokunulan an uygulama çoğu zaman uzun süre arkadaydı; uygulama içi geçişin (router.push) sayfa verisi isteği ölü bağlantıda cevapsız kalıyordu, Next'in bu isteğe süre sınırı yok. Ortadaki yükleniyor çemberi 10 sn dönüp kayboluyor, sayfa hiç değişmiyordu. Sahte Firebase + Chrome'da eski kodla yeniden üretildi (20 sn sonra hâlâ eski sayfa).
- Düzeltme `src/lib/openOutside.js`: bildirim (iPhone/Android uygulaması `nativePush`, web bildirimi `sw.js`), widget ve kilit ekranı sayacı (`IosBridge`) aynı yoldan açılır: sayfa görünür olunca (en çok 1,5 sn beklenir) başlar; yeni sürüm yayınlandıysa sayfa baştan yüklenir; uygulama içi geçiş 4 sn'de olmazsa sayfa tam yüklemeyle açılır. Denemede asılı istekte sayfa 4,4 sn'de açıldı; normalde 0,1 sn, tam yükleme yok.
- Web bildirimi: sayfa service worker'a bağlı değilken `navigate()` hatası yutuluyordu (uygulama öne gelir, sayfa değişmezdi). Artık sayfaya `{ sa: "open", url }` mesajı gider (`listenWorkerOpen`, Pwa.jsx).
- Test: `npm run test:bildirim` › "Bildirime dokununca açılış" (9). Xcode ile yeniden kurmak gerekmez.

## Sıradaki işler
- Telefonda denenmedi: uygulama birkaç dakika arkadayken mesaj bildirimine dokun; en çok 4-5 sn'de sohbet açılmalı.
- Yavaşlık (genel bakış, 2026-11-22): açılışta 2,6 MB kod, her açılışta planlar/görevler/notlar/fişler/doğum günleri/dersler tam liste canlı dinleniyor, düzende 12 sağlayıcı. Sıradaki adaylar: Firestore'a da süre sınırı (ölü bağlantıda hızlı yeniden bağlanma), AddSheet gibi büyük parçaları geç yükleme, eski fiş/notları sayfaya girince okuma.
