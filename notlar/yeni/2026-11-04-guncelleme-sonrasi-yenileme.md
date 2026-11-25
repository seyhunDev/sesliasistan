## Nerede kaldım

- Güncelleme sonrası "Yüklenemedi / İnterneti kontrol et" (Seyhun 2026-11-04: "her güncellemeden sonra, kapatıp açınca düzeliyor"). Neden: yayından sonra telefonda açık kalan eski sürüm çalışmaya devam ediyordu; sayfa geçişlerinde sunucuda artık olmayan eski kod parçalarını ve eski sayfa verisini istiyordu. "Yeni sürüm var · Güncelle" kartı vardı ama elle basmak gerekiyordu.
- Çözüm `src/lib/newVersion.js`: yeni sürüm görülünce uygulama ilk uygun anda kendini yeniler. (1) Uygulamaya dönünce (15 sn'den uzun arkadaysa sürüm hemen sorulur), (2) uygulama içi bir bağlantıya dokununca geçiş tam yükleme olur. Kayıt, sayaç, arama, takip sürerken (ekran kilidi tutuluyor), yazı yazarken, asistan ya da pencere açıkken yenilemez; o zaman kart kalır. Aynı sürüm için bir kez dener (`sa-auto-update`, sessionStorage).
- Yalnız web kodu; iPhone uygulamasını yeniden kurmak gerekmez. Telefonda denenmedi.
- Test: `npm run test:elle` › "Yeni sürüm" (canAutoUpdate).

## Sıradaki işler

- Hâlâ görülürse: hangi sayfada, hangi yazı (Yüklenemedi mi, İnternete bağlanılamadı mı) öğrenilip Ayarlar'daki hata kaydına (sa-crash) bakılacak.
