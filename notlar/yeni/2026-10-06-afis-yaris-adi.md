## Nerede kaldım
- Instagram: "Yarış duyurusu" artık "Yarış" (Seyhun: "yarış duyurusu diye değil yarış olarak yazalım; seçeneklerde ve aşağıdaki bilgilerde de; yarış ile antrenmanın rengi yer değiştirsin"; telefonda denenmedi): tür adı (Ne paylaşacaksın) ve görseldeki etiket "YARIŞ" (`KINDS`, postModel.js); eski kayıtlardaki "YARIŞ DUYURUSU" etiketi açılınca "YARIŞ" olur (`cleanPost`). Yapay zeka istemi de YARIŞ yazar (`/api/post-caption`). Renkler yer değiştirdi: Yarış Gece rengi (mint etiket, koyu lacivert gölge), Antrenman Deniz rengi (sarı etiket, lacivert gölge) (`KIND_THEME`). Kayıtlı eski gönderilerin rengi değişmez. Testleri `test:elle` › "Instagram tasarım".

## Sıradaki işler
0. Yeni gönderide türü Yarış yap: etiket "YARIŞ" ve mint olmalı; Antrenman'da sarı olmalı.
