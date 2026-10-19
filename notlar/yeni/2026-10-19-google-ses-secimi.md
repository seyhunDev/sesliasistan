## Nerede kaldım

- Seyhun okuma sesi için "Google sesi"ni seçti (2026-10-19). Ayarlar › Sesli yanıt'a Google ses düğmeleri eklendi: Kadın 1-3, Erkek 1-3 (Chirp 3 HD: Aoede, Kore, Leda, Charon, Puck, Orus; liste `src/lib/speech/googleVoices.js`). Dokununca seçilir ve örnek cümle o sesle okunur; seçim bu cihazda (`sa_tts_gvoice`).
- `/api/tts` istekte gelen sesi yalnız listedekilerden kabul eder, önce onu dener; olmazsa eski sıra (GOOGLE_TTS_VOICE, Aoede, Wavenet-E, Standard-E).
- Sunucuda anahtar yoksa (501) düğmeler gizlenir, telefonun sesi okur.
- Telefonda denenmedi (anahtar yok).

## Sıradaki işler

- Seyhun Google Cloud'da Text-to-Speech API'yi açıp anahtar alacak ve Netlify'a GOOGLE_TTS_KEY olarak ekleyecek; sonra Ayarlar'dan sesleri dinleyip seçecek.
