## Nerede kaldım

- Yanlış duyulan fiillerle sıralı iş (Seyhun: "Atatürk Kupası yarışı oluru afişini hazirla ve bugün İlay antrenmana katıldı, onu yoklamaya ekle" dedi, yalnız yoklama yapıldı; telefonda denenmedi): ses tanıma "oluştur"u "oluru", "hazırla"yı "hazirla" yazınca cümlede tek iş fiili sayılıyor, görev listesi kurulmuyordu. Artık istek işlenmeden önce bozuk iş fiilleri düzeltilir ("yarışı oluru" → "yarışı oluştur", hazirla, olustur, gonder, hatirlat, odedi, katildi; "GSİM oluru alındı" değişmez; `fixVerbs`, normalize.js; AssistantSheet `run`). "Afiş hazırla/oluştur" Instagram gönderisi sayılır (`wantsPost`). Görev listesi istemine (/api/tasks) "ses tanıma kelimeleri bozabilir, yanlış duyulmuş fiil yüzünden iş atlama" eklendi. Testleri `test:asistan` › "Yanlış duyulan fiiller".

## Sıradaki işler

- Asistana aynı cümleyi bir daha söyle: yarış, afiş (gönderi) ve yoklama üç iş olarak listede görünmeli.
