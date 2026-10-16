## Nerede kaldım

- Hazır cümle veri seti (Seyhun: "hazır insan davranışlarına göre oluşturduğumuz bir datamız olsun, en önemlilerinden oluşan iyi bir data seti, üstüne eklemelerle gideceğiz"; uygulamaya henüz bağlı değil, davranış değişmedi): `src/lib/brain/seedPhrases.js` (`SEED`, 30 iş). Okuma: notları oku, bugün/yarın/bu hafta planları, görevler, okunmamış mesajlar, hava, doğum günleri, sıradaki yarış, aidat ödemeyenler, kasa, açık faturalar, alışveriş listesi, günün özeti. İşler: plan, görev, not, mesaj, arama, görevi tamamla, sil, ertele, yoklama, listeye ekle, sayfa aç, geri al. Sohbet: kapat, sus, tekrar oku, yardım. Her işte `id`, `title`, `kind` (read/do/talk), `route` (routesOf adı ya da "ai"), `quick` (yapay zekasız cevaplanır mı), `keys` (yakalama kalıpları), `say` (örnek cümleler, 180+), `not` (karışmaması gerekenler).
- Eşleyici `src/lib/brain/seedMatch.js`: `seedTop(söz)` en iyi işi, `seedFind(paragraf)` uzun konuşmadaki bütün işleri söylenme sırasıyla verir; `withLearned(SEED, [{id, x}])` öğrenilen cümleleri ekler (puanlama ileride). Türkçe harfsiz, kesmesiz, "9.30" cümleyi bölmez.
- Testi `test:asistan` › "Hazır cümle seti" (biçim, her örnek tek başına ve paragrafın içinde, olmaması gerekenler, öğrenilenler). Kural değişikliği yok.

## Sıradaki işler

- "Dosya haritası" threadindeki hızlı yakalayıcı bu seti kullanacak (asistan dosyaları orada). Yeni cümle eklemek: ilgili işin `say` listesine yaz, `npm run test:asistan` geçene kadar `keys`'i ayarla.
- Puanlama 2. adım: başarılı sözler `withLearned` ile sete eklenir.
