// Google seslendirme (Chirp 3 HD) Türkçe sesleri: Ayarlar › Sesli yanıt'ta dinlenip seçilir (Seyhun, 2026-10-19).
// İstemci seçilen sesin kısa adını gönderir, sunucu (api/tts) yalnız bu listedekini kabul eder.
// İlk ses varsayılandır (önceden de varsayılan buydu).
export const GOOGLE_VOICES = [
  ["Aoede", "Kadın 1"],
  ["Kore", "Kadın 2"],
  ["Leda", "Kadın 3"],
  ["Charon", "Erkek 1"],
  ["Puck", "Erkek 2"],
  ["Orus", "Erkek 3"],
];

// Kısa ad → Google'daki tam ad; listede yoksa ""
export const googleVoiceName = (id) => (GOOGLE_VOICES.some(([v]) => v === id) ? `tr-TR-Chirp3-HD-${id}` : "");
