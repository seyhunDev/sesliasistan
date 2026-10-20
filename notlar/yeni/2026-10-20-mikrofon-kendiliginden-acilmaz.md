## Nerede kaldım

- Seyhun: "mikrofon kapanıyor, sonra tekrar açılıyor ama sesi algılamıyor". Neden: okuma ya da teklif ("saatini söyle", "son tarih söyle", "Kimi ekleyeyim?") sonrası `listenOnce` mikrofonu kendiliğinden açıyordu; iPhone'da hemen ardından açılan mikrofon veri verse de sessiz kalabiliyor (micCheck yalnız hiç veri gelmeyeni yakalar). Artık `listenOnce` da `HANDS_FREE` kuralına bağlı: mikrofon kendiliğinden açılmaz, cevap "Konuş"a basınca söylenir (bekleyen soru yine yerelde işlenir).
- Yapay zeka hatası: Google'da kaldırılmış model (404) "Asistan yanıt vermedi" ya da tüm modeller beklemede diye "kota doldu" görünüyordu. Yeni tür `model` ("model bulunamadı"): telefonda "Netlify'daki GEMINI_MODEL değişmeli" yazar, süre satırında "Yapay zeka model bulunamadı" görünür.

## Sıradaki işler

- Seyhun telefonda Sürüm'ü ve asistan süre satırını (cevabın altındaki gri satır) kontrol edecek; hata adı oradan okunur. Netlify › Logs › Functions › assistant'ta "[assistant] HATA · …" satırı.
- Ses ölçümü sessizse (genlik sıfır) de mikrofonu ölü sayma: telefonda denenmeden yapılmadı.

## Asistan

- Karar (2026-10-20): mikrofon hiçbir durumda kendiliğinden açılmaz (dokun-konuş, HANDS_FREE=false kapsamına `listenOnce` da girdi).
