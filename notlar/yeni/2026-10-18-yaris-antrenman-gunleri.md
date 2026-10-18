## Nerede kaldım

- Yarış multimedya: gün şeridinin sonunda "+ Gün" var; yarıştan önce ya da sonra antrenman günü elle eklenir (`raceLive.days`, `saveDays`). Boş elle eklenen gün aynı yerden kaldırılır.
- Gün adları: yarış günleri "1. gün, 2. gün" (tek gün "Yarış"), diğerleri tarih sırasıyla "Antrenman 1, 2" (`dayNames`). Önceden yarış dışı gün (18 Eki) "1. gün", yarışın ilk günü "2. gün" görünüyordu.
- Antrenman günlerindeki yarışlar kendi içinde 1'den numaralanır; yarış serisinin numarasını kaydırmaz (`renumber(starts, rdays)`).
- Gün şeridi artık tek gün olsa da görünür; bugün listedeki bir günse sayfa Süre ile açılır.

## Sıradaki işler

- Telefonda dene: + Gün ile 20 Eki ekle, orada sayaç/fotoğraf; yarış günündeki ilk yarış "1. yarış" mı.
