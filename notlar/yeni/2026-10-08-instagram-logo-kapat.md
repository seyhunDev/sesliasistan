## Nerede kaldım

- Instagram görselinde logo ve kulüp adı kapatılabilir (Seyhun: "yukarıdaki logoyu ve Dikili Yelken Spor Kulübü yazılarını opsiyonel olarak kaldırabilmeliyiz"; telefonda denenmedi): gönderi ekranında önizlemenin altındaki "Yazı" aracında "Logo ve kulüp adı" anahtarı. Kapatınca logo ve kulüp adı görselde çizilmez; Klasik (Afiş, Klasik, Kart, Bant) ve Modern'de çalışır, gönderiyle kaydedilir (`noBrand`, `cleanPost`; postImage.js `drawAfis`/Klasik, postModern.js `brand`). Gönderi ekranındayken asistana "logoyu kaldır", "kulüp adını kaldır", "logoyu geri getir" denince yapay zekaya gitmeden uygulanır (`sizeAsk`). Kural değişikliği yok. Testi `test:elle` › "Instagram tasarım" › "logo kapatma".

## Sıradaki işler

- Bir gönderide "Yazı" aracında "Logo ve kulüp adı"nı kapat; görselde üstteki logo ve yazı kalkmalı, kaydedip yeniden açınca kapalı kalmalı.
