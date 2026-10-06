## Nerede kaldım

- Asistan sesi alamıyordu (Seyhun: "ses alınamadı, tanınmadı gibi uyarılar veriyor, asistan çalışmıyor"; telefonda denenmedi): "Ses alınamadı" kaydın telefonda boş kalması demek (sunucuya gitmeden). Aynı yayında gelen iPhone ses oturumu değişikliği (mikrofon kapanınca `transient` kipe geçme, arka plan sesi için) en güçlü şüpheli; kapatıldı (`SESSION_SWITCH = false`, src/lib/speech/audioSession.js; açmak için true, önce telefonda denenmeli). Bu yüzden mikrofon kapanınca arka plandaki YouTube/müzik yine kendiliğinden devam etmeyebilir. Gemini Transcribe boş yazı döndürürse artık Whisper da denenir (önce "anlaşılamadı" deniyordu); Google 8 sn'de yanıt vermezse 30 dk doğrudan Whisper kullanılır (önceden 15 sn bekleniyordu). Netlify günlüğünde "gtranscribe boş yazı döndü" satırı görülürse Gemini yanıtının biçimi düzeltilir.

## Sıradaki işler

- Yayından sonra asistanı dene: dokun, konuş, gönder; yazı gelmeli. Hâlâ "Ses alınamadı" diyorsa uygulamayı ana ekrandan tamamen kapatıp aç ve yeniden dene; sürerse yeni threade yaz.
