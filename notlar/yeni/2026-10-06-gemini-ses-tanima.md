## Nerede kaldım

- Son yazıyı Gemini 3.5 Transcribe yazıyor (Seyhun: "Claude'un ses tanıması çok iyi, sesimi alıp mantıklı çevirip gösteriyor; Claude, GPT, Gemini nasıl yapıyor araştır, uygulamayı geliştirelim"; telefonda ve canlıda denenmedi). Araştırma: `/mnt/project-files/ses-tanima/arastirma.md` (üç uygulama da sesi sunucuda büyük modelle çevirip dolgu sözlerini ve düzeltmeleri temizliyor). Dokunup gönderince kayıt önce Google'ın konuşma modeline gider (`gemini-3.5-transcribe`, SMART kip: "eee, ııı" dolguları, tekrarlar, yarım başlangıçlar atılır; "3'te, yok 2'de olsun" denince son hali yazılır; noktalama), Türkçe (`tr-TR`) ve kelime listesiyle (kişi adları, yarış adları, sık kelimeler; en çok 100; `sttVocab`, `sttBody`, `sttText`, src/lib/speech/geminiStt.js; `viaTranscribe`, /api/transcribe). Madde madde gelen yanıt tek satıra çevrilir. Hata verirse (model yok, istek kabul edilmedi, kota) 6 saat denenmez, eskisi gibi Groq Whisper, OpenAI, Gemini sırası çalışır. Dinlerken 2 sn'de bir gelen ara yazı değişmedi (Whisper, hızlı). Kapatmak için Netlify'da `GEMINI_TRANSCRIBE_MODEL=off`; model adı da bu değişkenle değişir; `STT_PROVIDER` yalnız yedeklerin sırasını seçer. Yeni anahtar gerekmez (GEMINI_API_KEY). Ayarlar › Kullanım'da "Gemini ses tanıma: bu ay N dk (≈ $)" (dakikası ≈ $0,005; sayaç `usage/ai_*` belgesinde `stt-sec`, `countAi(au, kind, n)`; `sttUsage`, aiUsage.js). Kural değişikliği yok. Testleri `test:ses` › "Gemini ses tanıma".

## Sıradaki işler

- Gemini ses tanımayı dene: yayından sonra asistana dokun, "eee yarın, yok yarın değil cuma 10'da antrenman ekle" gibi takılarak konuş, gönder; yazı temiz ve "cuma 10'da" olmalı. Rüzgârda ve sporcu/yarış adlarıyla da dene. Netlify › Functions › transcribe günlüğünde "[transcribe] gtranscribe … ms" görünmeli; "gtranscribe 400/404" görünürse metni yeni threade ver (model adı ya da istek biçimi düzeltilir, bu arada Whisper çalışır). Whisper'dan kötüyse Netlify'da `GEMINI_TRANSCRIBE_MODEL=off`.
- Sonraki adım (araştırmadaki 2. öneri): dinlerken canlı yazıyı Gemini Transcribe Live ile akış halinde almak (her 2 sn'de bütün kaydı yeniden göndermek biter).

## Asistan

- Son ses yazısı önce Gemini 3.5 Transcribe (SMART kip, dolgu ve düzeltme temizliği), Whisper yedek; ara yazı Whisper (2026-10-06).
