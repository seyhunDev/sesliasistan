## Nerede kaldım

- Hareket videosu başka sitelerden (Seyhun: "başka web sitelerinden de videoları göstermek mümkün mü", örnek muscleandstrength.com/exercises/hover.html; telefonda ve o sitede denenmedi, bulut ortamı siteye ulaşamadı): hareketin bağlantı kutusuna (program düzenleme ve Fitness › Hareketler) bir sitenin hareket sayfası yapıştırılınca sunucu sayfayı indirir ve içindeki videoyu bulur (`/api/page-video`, `findPageVideo`, src/lib/fitness/pageVideo.js). Sırası: sayfaya gömülü YouTube oynatıcısı (YouTube videosu olarak eklenir), sitenin kendi videosu (og:video, `<video>/<source>`, sayfadaki .mp4/.m3u8 adresi; hareketin videolarına eklenir, uygulamada oynar), en son sayfadaki YouTube bağlantısı. Bulamazsa "Bu sayfada video bulamadım". Yalnız giriş yapan, yalnız açık internetteki sayfalar (yerel ağ adresleri indirilmez). Kural değişikliği yok. Testleri `test:elle` › "Fitness: başka sitedeki hareket videosu".

## Sıradaki işler

- Fitness › Hareketler'de bir harekete muscleandstrength sayfasının bağlantısını yapıştır, Ekle; video geliyor ve sporcu ekranında oynuyor mu bak. "Bulamadım" derse ya da video oynamazsa (site başka sitelerde oynatmayı engelliyor olabilir) yeni threade yaz.
