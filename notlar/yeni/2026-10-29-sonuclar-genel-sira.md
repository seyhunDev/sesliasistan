## Nerede kaldım
- Multimedya › Sonuçlar satırları yenilendi: solda büyük genel sıra (ilk 3 camgöbeği), ad (doğum yılı), altında yelken no · kulüp (uzunsa …), en altta herkes için Junior / Kızlar / Junior Kızlar sıra kutuları (1. dolu camgöbeği), sağda net puan; lacivert liste başlığı; bizimkilerin satırı açık mavi + sol çizgi.
- `rowRanks(fleet)` (src/lib/raceLive.js) her satırın kategori sıralarını verir; test "satır sıraları" (test:yaris).

## Sıradaki işler
- Telefonda deneme yapılmadı.
- Optimist Junior/Bambino doğum yılı kuralları gelince CAT_RULES.

## Tasarım
- Sonuç satırında genel sıra her zaman solda büyük sayı; kategori sıraları altta küçük kutularda. Kulüp adı yelken no ile aynı satırda, başka bilgiyle yan yana değil.
