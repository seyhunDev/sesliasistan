## Nerede kaldım

- Plan başlığı ve "onaylıyor musun" düzeltmesi (Seyhun: "bana yarın akşam için bir akşam yemeği planla dedim, başlık 'bana' diye başladı; hem onaylıyor musun diye soruyor hem ekliyor"; telefonda denenmedi): (1) Başlıktan hitap ve dolgu sözleri atılır ("bana", "benim için", "lütfen", baştaki "bir", sondaki "planla/ekle"): "Bana için akşam yemeği" → "Akşam yemeği" (`cleanTitle`, src/lib/titleClean.js; yapay zeka kayıtlarında `toDrafts`, yerel kurallarda `classify`). Yapay zeka istemine ve şemaya başlık kuralı eklendi. "akşam yemeği", "sabah kahvaltısı" artık saat sözü sayılıp başlıktan silinmiyor (normalize.js `MEAL`, rules.js). (2) Bilgisi tamam kayıt sormadan eklenirken yapay zekanın cümlesi "Ekledim"in önüne ekleniyordu; süzgeç yalnız "kaydedeyim mi?"yi atıyordu, "onaylıyor musun?" ve "oluşturuyorum" kalıyordu. Artık soru cümleleri ve işi anlatan cümleler atılır, yalnız ek bilgi (çakışan plan, rüzgâr) kalır (`extraNote`, steps.js; AssistantSheet `extra`). İsteme "onay sorusu yazma" eklendi. Testleri `test:asistan` › "Temiz başlık ve sorusuz ekleme".

## Sıradaki işler

- Asistana "bana yarın akşam 8'de akşam yemeği planla" de: başlık "Akşam yemeği" olmalı, yalnız "Ekledim: Akşam yemeği, Yarın, 20:00." demeli, onay sormamalı.
