## Nerede kaldım

- Asistan cevapları artık yalnız okuma isteğinde sesli okunuyor ("notlarımı oku", "bugün neler var", "görevlerimi anlat"; tanıma `src/lib/readAloud.js` wantsRead). Diğer cevaplar yalnız yazılır; sonrasında mikrofonun açılması eskisi gibi.
- Kapatılan okumalar: yapay zeka cevabı ve akışta gelen cümleler (`beyin/cevap.js`, `beyin/yapayZeka.js`), ön cevap bilgisi, kayıt açılırken söylenen söz (`openRecord`), ekleme ekranındaki soru (`AddSheet`), fiş kaydı numarası (`ReceiptSheet`).
- Ayarlar › Sesli yanıt açıklaması: "“Notlarımı oku” gibi istediğinde yanıt sesli okunur".
- Ekran testi 73/73 (yeni adım: okuma istenmeyen soru sesli okunmaz). Telefonda denenmedi.
- Seyhun 2026-10-19: "sesli asistan çalışmıyor, ilk asistan sayfası açılıyor sonra çalışıyor gibi". Tarayıcıda (iPhone ana ekran taklidi dahil) akış sorunsuz; telefondaki sürüm ve ekran kaydı istendi.

## Sıradaki işler

- Okuma sesi kötü: Netlify'da GOOGLE_TTS_KEY yoksa telefonun kendi sesi kullanılıyor. Seçenekler Seyhun'a sunuldu (Google sesi anahtarla ya da mevcut Gemini anahtarıyla Gemini sesi).
- Seyhun'un ekran kaydı gelince asistanın telefonda çalışmama sorununu çöz.

## Asistan

- Sesli okuma yalnız açık okuma isteğinde (Seyhun, 2026-10-19). Yeni bir yerde tts.speak/maybeSpeak eklenmez; okunacaksa readMode üzerinden.
