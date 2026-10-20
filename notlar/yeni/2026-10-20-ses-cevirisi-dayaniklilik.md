## Nerede kaldım

- Ses yazıya çevirme ("Ses yazıya çevrilemedi · gtranscribe:beklemede, gemini:hata" hatası):
  - iPhone'un kendi tanıması artık tek boş sonuçta kendiliğinden kapanmıyor. Önceden bir kez yazı gelmeyince "off" yazılıp sunucu yoluna dönülüyordu, sunucu da hata veriyordu. Artık yalnız izin verilmezse (not-allowed / service-not-allowed) kapanır; boş sonuçta "Telefon sesi yazıya çeviremedi, tekrar konuşur musun?" denir, sonraki dinlemede yine telefonunki kullanılır (`useSpeech.js`, `detect.js`).
  - Sunucu (`api/transcribe`): yedek Gemini kalan süreyi aşmıyor (eskiden sabit 20 sn); Gemini Transcribe beklemedeyse yedekler ona süre bırakır ve sonda son çare olarak kalan süreyle yine denenir. Bir servis çalışınca bekleme kaydı silinir, telefona `x-ai-cool` içinde 0 gider ve telefondaki kayıt da kalkar (`gemini.js` clearCool).
- Telefonda denenmedi.

## Sıradaki işler

- Seyhun: birkaç gün telefonun kendi tanımasıyla dene; boş kalırsa sıklığını yaz.
- Netlify'a GROQ_API_KEY eklenirse sunucu yolunda hızlı yedek olur.
- Asistan motoru 2. adım (süre sınırları), 4 (küçük veri özeti), 5 (hızlı kalıplar).

## Asistan

- Ses akışı: telefon yazıya çevirir → yerel kurallar/kalıplar → olmazsa yapay zeka. Telefonun tanıması yalnız izin yoksa kendiliğinden kapanır.
