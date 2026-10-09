## Nerede kaldım

- Asistan kutusu her durumda (Seyhun: "söylediklerim yazılmıyor, yalnız Dinliyorum yazıyor; işlemler yapılırken ve bittikten sonra da tasarım aynı olmalı, yalnız ilk baştaki yuvarlak düğme kalsın"; onay bekliyor, telefonda denenmedi): asistan açıkken (yazı klavyesi dışında) alt alan hep aynı geniş yuvarlak kutu (`AssistBox`, TabBar.jsx): dinlerken canlı yazı + × · ses dalgası · ■ · ↑; yazıya çevrilirken ve işler yapılırken söylenen cümle kutuda kalır (`said`, AssistantSheet onLive; görev listesindeki işler cümlenin yerine geçmez), noktalar yavaşça parlar, ■ işi durdurur; cevap okunurken noktalar yeşil, ■ okumayı keser; iş bitince "Yaz ya da konuş…" (dokun: klavye), + Oluştur, 🎤 konuş, × kapatır. Canlı yazı daha sık gelir: aralıksız konuşmada 3 sn'de bir (`SEG_MAX` 8 → 3 sn, vad.js), ses ölçer çalışmıyorsa da 3 sn'de bir (useSpeech). Boştaki yuvarlak düğme ve sekmeler değişmedi. Örnek: `/mnt/project-files/asistan/asistan-kutusu-durumlar.png`.

## Sıradaki işler

- Telefonda dene: konuşurken yazı birkaç saniyede bir kutuya geliyor mu; gönderince cümle kutuda kalıyor mu; iş bitince "Yaz ya da konuş…" görünüyor mu.

## Tasarım

- Asistan açıkken alt alan her durumda tek kutu: üstte yazı, altta × · dalga/noktalar · durum düğmesi · ↑ (2026-10-09).
