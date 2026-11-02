## Nerede kaldım

- Yayın › Program › "Programı ekle": yarış programının fotoğrafı, PDF'i ya da yapıştırılan yazısı yapay zekâyla okunur (`/api/race-program`, Gemini; `lib/raceProgram.js` cleanProgram, programPatch). Önizleme: gün, not, ilk start ya da "Yarış yok". "Programa yaz": en sık saat her günün ilk startı (daily), farklı günler times, aradaki yarışsız günler off; yarışın tarihleri ilk ve son yarış günü olur (`saveRaceDates`, races.js).

## Sıradaki işler

- Gerçek programla ve gerçek yapay zekâyla denenmedi (bulutta anahtar yok); Seyhun'un gönderdiği programla kontrol et.
- Telefonda denenmedi.
