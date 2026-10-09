## Nerede kaldım

- Yoklamada ad yoksa kısa soru (Seyhun: "spor ismi söylenmediyse ne yapalım, mikrofon otomatik mi açılsa, liste çok uzun olur, pratikleştirmeliyiz"; telefonda denenmedi): yoklama cümlesinde ad yoksa ya da ad sporcularda bulunamazsa ("bugün antrenmana ilave katıldı, yoklamaya onu ekle") asistan artık yapay zekanın uzun cevabı yerine "Kimi ekleyeyim? Adını söyle ya da seç." der. Altında yanlış duyulan kelimeye en yakın en çok 4 sporcu düğme olarak çıkar ("ilave" → İlayda; `closeNames`, lib/names.js); bütün liste gösterilmez. Soru sesle sorulduysa okununca mikrofon bir kez kendiliğinden açılır, ad söylenip susunca gönderilir (dokunmak gerekmez, 8 sn konuşulmazsa kapanır; `listenOnce`). Cevap ilk cümlenin günü ve durumuyla yoklamaya yazılır ("dün … katılmadı" + "İlayda" → "yoklama: dün İlayda gelmedi"; `attRetry`, lib/attAsk.js; bekleyen soru `attName`). "Vazgeç/hayır" bırakır.
- Bekleme yazıları istekten (Seyhun: "ses analiz ediliyor, anlaşılıyor gibi yazılar olmasın, istekle ilgili olsun"): "Sesin yazıya çevriliyor", "Söylediğin okunuyor", "Anlaşılıyor" kaldırıldı; ses yazıya çevrilirken yazı yok (küre rengi bekleniyor der). İstek belli olunca ilk satır isteğin kendisinden: "29 Ekim Cumhuriyet yarışı oluştur" → "29 Ekim Cumhuriyet yarışı oluşturuluyor…", "yarın 10'da antrenman ekle" → "Yarın 10'da antrenman ekleniyor…" (`aboutLine`, assistTasks.js); gecikirse işin türüne göre sıradaki yazılar (Takvim kontrol ediliyor…). Testleri `test:asistan` › "Yoklama: ad sorusu", "Bekleme yazıları".

## Sıradaki işler

- Asistana sesle "bugün antrenmana ilave katıldı, yoklamaya ekle" de: soru gelmeli, mikrofon kendiliğinden açılmalı, adı söyleyince yoklama yazılmalı; bir de düğmeden seç. Bekleme yazısının isteğini anlatıp anlatmadığına bak.

## Asistan

- Yoklamada ad yoksa: kısa soru + en yakın 4 sporcu düğmesi + (sesliyse) mikrofon bir kez kendiliğinden açılır. Genel olarak mikrofon yine dokunarak açılır (2026-10-09).
- Bekleme yazıları teknik değil, isteğin kendisinden ("… oluşturuluyor"); ses yazıya çevrilirken yazı yok (2026-10-09).
