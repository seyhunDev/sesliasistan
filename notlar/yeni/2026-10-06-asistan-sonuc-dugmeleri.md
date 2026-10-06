## Nerede kaldım

- Asistan sohbetinde sonuç düğmeleri yerinde kalıyor, sohbet altta sürüyor (Seyhun: "mesaj attıktan sonra Sohbete git, WhatsApp'tan gönder düğmeleri duruyor, yeni sohbet onların üstünde devam ediyor; düğmeler kalsın ama sohbet altında devam etsin, bastığımı da takip edelim"; telefonda denenmedi): önceden kayıt listesi (Ekledim), "Sohbeti aç", "WhatsApp grubuna da gönder", "… sayfasını aç" konuşmanın en altında ayrı kart olarak duruyordu; yeni istek bunların üstüne yazılıyordu. Artık bu düğmeler ait oldukları cevabın hemen altına sabitlenir (`links` turda, `turnLinks`, AssistantSheet; Thread `extra`), sonraki istekler ve cevaplar altlarında akar; eski düğmeler sonra da çalışır. Dokunulan düğme soluklaşır, WhatsApp düğmesi "WhatsApp'ta paylaşıldı · yeniden" yazar (`used`, sohbet kapanınca sıfırlanır). Onay bekleyen kartlar (mesaj Gönder/Vazgeç, silme, yarış seçimi) eskisi gibi en altta.

## Sıradaki işler

- Asistana sporculara bir mesaj gönderdir, sonra "envantere git" de: "Sohbeti aç" ve WhatsApp düğmeleri ilk cevabın altında kalmalı, yeni istek ve cevap onların altında görünmeli. WhatsApp düğmesine bastıktan sonra soluklaşıyor mu bak.
