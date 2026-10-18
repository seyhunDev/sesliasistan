## Nerede kaldım

- Yarış multimedya sayfası açıkken sayaç ve kayıtlar kendi cihazlar arasında canlı (`src/features/raceMedia/useLiveSync.js`, Seyhun'un seçimi "Kendi cihazlarım"). Belge `orgs/{org}/raceLive/{yarış}` dinleniyor; sayaç değişince `timer` alanına yazılıyor, öbür cihaz kendi sayacına yazıyor (bipler çalar). Açılışta yalnız süren uzak sayaç alınır (`takeTimer`). Kural değişikliği yok.
- iPhone'da sayfa kapalı ya da telefon kilitliyken bip çalmaz.

## Sıradaki işler

- İki cihazla dene: birinde Başlat, öbüründe sayaç ve bipler; +30 sn, iptal, Yarışı bitir.
- Süre sekmesi yeni düzeni (örnek /mnt/project-files/yaris-tasarim/multimedya/sure-yeni.png: alta Fotoğraf/Video, ana düğme + "+" yan yana, Start/Şamandıra 1/Şamandıra 2/Finish kareleri, "Bugünün yarışları" satırı) Seyhun'un onayını bekliyor.
- Herkese açık takip bağlantısı (veliler) istenirse sonra; kural yayını gerekir.
