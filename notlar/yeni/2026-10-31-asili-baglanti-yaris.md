## Nerede kaldım

- Güncellemeden sonra yarış sayfası "Yarış yükleniyor"da kalıyordu (Seyhun 2026-10-31). Neden: yarış sayfası ve multimedya `getDoc`/`getDocs` ile sunucuyu süresiz bekliyordu; iPhone'da yenileme sonrası Firestore bağlantısı asılı kalınca bu bekleme hiç bitmiyordu (bağlantı hiç kurulamazsa da ~10 sn sürüyordu).
- `src/lib/firebase/fastRead.js`: `readCache` (telefondaki kopya, hemen) + `readServer` (6 sn cevap yoksa bağlantı bir kez yenilenir `kickNet` (netWatch.js), yeniden sorulur, ~18 sn sonra hata; sonsuz bekleme yok).
- `loadRace(orgId, id, onCache)` ve `loadRaces(orgId, onCache)` önce kopyayı verir; yarış sayfası ve multimedya kopyayla hemen açılır, sunucudaki farklıysa güncellenir (yarış sayfasında düzenleyici yeniden kurulur). `loadLive` de `readServer` kullanır.
- Sunucuya ulaşılamaz ve kopya da yoksa sonsuz "yükleniyor" yerine `LoadFail` ("Yüklenemedi. İnterneti kontrol et." · Tekrar dene; `src/components/ui/LoadFail.jsx`).
- Test: `npm run test:yaris-ekran` "Asılı bağlantı" grubu (okuma bağlantısı asılıyken multimedya ve yarıştan önceki sayfa 5 sn içinde açılır; düzeltmeyle ~0,8 sn, öncesinde ~11 sn). Telefonda denenmedi.

## Sıradaki işler

- Aynı süresiz bekleme başka sayfalarda da var (`getDocs` ile okuyan listeler: Medya, sporcular vb.); gerekirse `readCache` + `readServer`'a geçirilir.
