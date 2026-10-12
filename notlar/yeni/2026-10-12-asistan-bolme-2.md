## Nerede kaldım

- Asistan dosyası bölünüyor, 2. adım: asistanın beyni (cümleyi işe yönlendirme, yapay zekaya sorma, görev listesi zinciri, cevap ve kapanış) `src/features/assistant/beyin/` altına taşındı: `yonlendirme.js` (run, yerel komutlar, sayfa açma), `yapayZeka.js` (askAI, yanıtı işleme, onaysız işler, silme sorusu), `gorevListesi.js` (görev listesi, sıradaki iş, durdurma), `cevap.js` (cevap, "başka isteğin var mı", kapanış), `ortak.js` (kaydet/vazgeç kuralları, MORE). `AssistantSheet.jsx` 2.056 → ~1.190 satır. `ctx` artık bileşenin başında tanımlanır, sonda doldurulur. Tam testteki taslak cevap testi kuralları artık `beyin/ortak.js`'ten alır. Davranış değişmedi: `test:hizli` 2000/2000, `test:hepsi --yzsiz` önceki ile birebir, derleme geçti, lint hata sayısı aynı (3). Telefonda denenmedi. Kural değişikliği yok.

## Sıradaki işler

- 3. adım: durum, referanslar ve etkiler `useAssistant.js` kancasına taşınacak; `AssistantSheet.jsx` yalnız ekran kalacak.
- Yeni asistan işi `isler/`'e, yönlendirme değişikliği `beyin/yonlendirme.js`'e yazılır. `scripts/tam-test/akis.mjs` hâlâ `run()` başındaki kararın taklidi; run değişirse güncellenir.
