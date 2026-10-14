## Nerede kaldım

- Sesli okuma (Seyhun: "bugün, yarın hangi planlar var ya da notları oku dediğimde sesli okusun; izin yoksa izin düğmesi; okuma bitince mikrofon yine açılsın, kapat deyince kapansın"; telefonda denenmedi):
  - Hangi cümleler okunur: oku, okur musun, seslendir, söyle, anlat, özetle sözlerinin geçtiği cümleler ("notları oku", "görevlerimi anlat", "haftayı özetle") ve liste soruları ("bugün hangi planlarımız var", "yarın neler var", "yarın toplantı var mı").
  - Birine yazılacak söz okuma sayılmaz ("Ali'ye söyle yarın gelsin", "ekibe anlat …"). İş içeren cümle de okuma sayılmaz ("… ekle", "notları aç", "sesli yanıtı kapat"). Kural: `wantsRead`, src/lib/readAloud.js.
  - Sesli yanıt açıksa cevap okunur, okuma bitince mikrofon bir kez açılır. 8 sn konuşulmazsa mikrofon kapanır. Yeni istek söylenebilir; "kapat" denirse asistan kapanır.
  - Sesli yanıt kapalıysa cevabın altında "Sesli yanıtı aç" düğmesi çıkar. Dokununca sesli yanıt açılır (Ayarlar'daki ayar), cevap okunur, sonra mikrofon açılır.
  - Diğer istekler eskisi gibi çalışır.
  - Kodda: `readMode` (useAssistant, `run` içinde yazılır), `reply` (beyin/cevap.js), `enable` (TtsProvider).
  - Kural değişikliği yok. Testi `test:asistan` › "Sesli okuma (oku, söyle, anlat)".

## Sıradaki işler

- Telefonda dene:
  - Sesli yanıt kapalıyken asistana "bugün hangi planlarımız var" de. "Sesli yanıtı aç"a bas, cevap okunmalı, sonra mikrofon açılmalı. "kapat" de.
  - Sonra "notlarımı oku" ve "yarın neler var" de.
  - Okunmayan ya da yanlışlıkla okunan cümle olursa cümleyi yaz, kurala eklenir.
