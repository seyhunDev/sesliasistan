## Nerede kaldım
- Doğal Gemini sesi her yerde (Seyhun 2026-11-25: "Bu doğal seslendirmeyi oradaki seslendirmelerde de yapalım", fitness'ta da kullanılacak; telefonda denenmedi). Ortak servis `src/lib/server/tts.js` (`synthesize`): önce Gemini-TTS (Cloud TTS, `gemini-2.5-flash-tts`, tarz yönergesi), 6 sn'de olmazsa Chirp 3 HD, sonra cihaz sesi. `/api/tts` bu servisi kullanır (`style`, `cache` alanları yeni). İstemci yardımcısı `src/lib/speech/ttsClient.js` (`ttsUrl`, `sayWith`). Velora Sailing ile aynı model ve ses (Aoede).
- Taşınanlar: asistan cevapları (TtsProvider, ilk parça bekleme 4→8 sn), Ayarlar örnek cümlesi (önbellekli), İngilizce kelime satırları (önbellekli), Bilgi ekranında gelen mesajlar (önceden yalnız cihaz sesiydi; giriş yoksa yine cihaz sesi).
- Önbellek: `cache: true` → Firebase Storage `tts-cache/`. Kullanım sayacı `tts-gem` (Ayarlar › Kullanım'da tahmini $). Kılavuz: `docs/seslendirme.md`. Test: `npm run test:ses` "Ortak seslendirme".

## Sıradaki işler
00. Netlify'a `GEMINI_TTS_KEY` ekle (servis hesabına bağlı, Vertex AI User rollü API anahtarı; düz anahtar 403 alıyor). Eklenmeden Gemini denenir, reddedilince Chirp ile okur.
0. Telefonda dene: asistan cevabı doğal ses mi, gecikme kabul edilebilir mi (yavaşsa Netlify'da `TTS_ENGINE=chirp` ile eskiye döner).
1. Fitness yeniden tasarımında anlatım `sayWith(audio, metin, { style: "fitness", cache: true })` ile yapılsın.

## Asistan
- Seslendirme tek yerden: `lib/server/tts.js`. Yeni sesli özellik doğrudan Google'a istek atmaz; `useTts().speak` ya da `lib/speech/ttsClient.js` kullanır. Sabit metinde `cache: true`, kişisel veri taşıyan cevapta değil.
- Fitness adım adım antrenman (FitGuided) anlatımı da ortak servise bağlandı: `FIT_VOICE = { style: "fitness", cache: true }`; ses gelmezse bekleme süresi 5→8 sn + metin.
