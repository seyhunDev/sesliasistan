## Nerede kaldım
- Çoklu canlı kaynak (Seyhun: "2 drone, 2 telefon, sabit kameralar, bu sistemi kurmalıyız"; görünürlük Liste dışı; telefonda denenmedi): tek YouTube kanalı, her kaynağa kalıcı anahtar. Yayın › Video › kaynağa dokun › "YouTube anahtarı aç" (`src/features/broadcast/SrcKey.jsx`, `lib/youtube.js` `ytNewStream`, reusable liveStream) → "Adresi kopyala" / "Anahtarı kopyala" (her seferinde YouTube'dan okunur, Firestore'a yazılmaz; kaynakta yalnız `ytStream` kimliği, `lib/raceRounds.js` cleanSources). Yayın sayfası açıkken 3 dakikada bir `ytPrepare`: anahtarlı kaynağın bağlı yayını yoksa ya da bittiyse Liste dışı, kendiliğinden başlayıp biten yayın açılır, anahtara bağlanır, link kaynağa yazılır. Cihazda Go Live yeterli.
- Google izni genişledi (`youtube` kapsamı, `lib/server/ytAuth.js`): önceki bağlantı bir kez "YouTube'a bağlan" ister. Test yaris.mjs "YouTube yükleme".

## Sıradaki işler
0. Telefonda: kaynakta anahtar aç → PRISM/DJI Fly'a adres + anahtar → Go Live → kaynak "Yayında" → ekrana al. İki cihazla aynı anda dene (YouTube'un aynı anda kaç yayına izin verdiği).
