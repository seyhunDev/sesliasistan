## Nerede kaldım

- Mac'te uygulama açılırken / uygulamalar arası dönüşte beyaz ekran (Seyhun 2026-11-04 "uygulama gibi indirmediğimiz için mi?"). Sebep indirme değil: service worker sayfa açılışında önce sunucuyu bekliyordu (en çok 4 sn); sunucu yavaş ya da uykudaysa bu süre boyunca ekran bomboş kalıyordu. Safari sekmesi ile Dock'a eklenmiş uygulama aynı motoru ve aynı service worker'ı kullanır, ikisinde de oluyordu.
- Çözüm `public/sw.js` (sa-v17): kayıtlı kopyası olan sayfa HEMEN kopyadan açılır, ağdaki yeni sayfa arkada kaydedilir. Yerelde ölçüldü: sunucu 6 sn cevap vermezken sayfa 76 ms'de açıldı.
- Eski kopya sorun olmasın diye: yeni sürüme geçerken (`newVersion.js` applyUpdate, arkaya gidişte yenileme, sayfa geçişinde tam yükleme) ve kod parçası yükleme hatasında (`crash.js` reloadOnce) önce sayfa kopyaları silinir (`crash.js` dropPages).
- Gerçek Mac'te denenmedi.

## Sıradaki işler

- Hâlâ beyaz ekran görülürse: Safari sekmesinde mi, Dock uygulamasında mı, Xcode Mac uygulamasında mı olduğu öğrenilecek.
