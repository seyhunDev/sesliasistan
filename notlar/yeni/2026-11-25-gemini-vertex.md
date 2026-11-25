## Nerede kaldım
- Gemini sesi Vertex'e geçti (PR #1509 sonrası): Cloud TTS'in `modelName` yolu API anahtarını kabul etmiyordu (401), her şey Chirp'e düşüyordu. `lib/server/tts.js` artık Vertex `generateContent` (proje 828345188662, `gemini-2.5-flash-tts`, `GEMINI_TTS_KEY`) çağırıyor, PCM → WAV. Velora Sailing v1.234'te aynı yol çalıştı. Kota dolarsa (429) 1 dk Chirp. Önbellek dosyaları `tts-cache/*.wav`.

## Sıradaki işler
0. Telefonda asistana bir şey sor, Ayarlar › Kullanım'da "Gemini doğal ses" satırı çıkıyor mu bak.
