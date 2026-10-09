## Nerede kaldım

- Görev listesinin son işi gönderi olunca ✓ çıkmıyordu (Seyhun: "en son gönderiyi oluşturdu, yarışla bağlayıp kaydetti ama tik işareti çıkmadı; o tik işaretini de almalı, sonra çalışmayı durdurmalı"; telefonda denenmedi): gönderi işinde önce cevap verilir (listede ✓), gönderi sayfası 400 ms sonra açılır (`startPost`). Listenin son işi bitince "Başka bir isteğin var mı?" sorulmaz ve mikrofon yeniden açılmaz; liste ✓ ile kalır, asistan durur (`planEnd`, `reply`; `done`, AssistantSheet).

## Sıradaki işler

- Asistana birkaç iş söyle, sonuncusu "Instagram gönderisi hazırla" olsun; gönderi sayfası açılınca listede son satırda da ✓ olmalı, mikrofon açılmamalı.

## Asistan

- Görev listesi bitince asistan soru sormaz, dinlemeye geçmez: ✓'li liste kalır (2026-10-09).
