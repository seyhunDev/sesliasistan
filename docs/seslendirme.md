# Seslendirme (doğal Gemini sesi)

Uygulamadaki bütün sesli okumalar tek bir servisten geçer: **`src/lib/server/tts.js`** (`synthesize`).
Seyhun, 2026-11-25: "doğal Gemini sesi her yerde, fitness'ta da".

## Nasıl çalışır

1. **Gemini-TTS** (Vertex AI `generateContent`, model `gemini-2.5-flash-tts`, anahtar `GEMINI_TTS_KEY`; ses WAV olarak gelir). Anlatıcıya yönerge verilir
   (`TTS_STYLES`: asistan / anlatim / fitness / ingilizce), bu yüzden kesik kesik değil, sohbet gibi akıcı okur.
2. Gemini 6 sn'de gelmezse ya da reddedilirse **Chirp 3 HD** (aynı ses adı, hızlı, ayda 1 milyon harf ücretsiz).
   API kapalı / yetki yok (400-404) gelirse Gemini 10 dk, kota dolu (429) gelirse 1 dk denenmez.
   Not: Cloud Text-to-Speech'in `modelName` yolu API anahtarı kabul etmiyor (401), bu yüzden Vertex kullanılır.
3. Sunucu sesi hiç gelmezse istemci **cihazın kendi sesiyle** okur.

Velora Sailing (`seyhunDev/velora-sailing`, `scripts/tts.mjs`) aynı modeli ve sesi kullanır.

### Ayarlar (Netlify ortam değişkenleri)

| Değişken | Ne işe yarar |
|---|---|
| `GOOGLE_TTS_KEY` | Google Cloud API anahtarı (proje 828345188662). Gemini-TTS için aynı projede **Vertex AI API** açık olmalı. |
| `GEMINI_TTS_KEY` | Gemini-TTS için anahtar. Düz API anahtarı Vertex'te 403 "aiplatform.endpoints.predict denied" alır; servis hesabına bağlı (rolü **Vertex AI User**) bir API anahtarı gerekir. Yoksa Gemini hiç denenmez, Chirp okur. Vertex kotası düşük (dakikada birkaç istek); aşılınca Chirp. Velora Sailing'de de aynı ad. |
| `TTS_GEMINI_MODEL` | İsteğe bağlı, varsayılan `gemini-2.5-flash-tts` (`gemini-2.5-pro-tts` daha iyi, daha pahalı). |
| `TTS_ENGINE=chirp` | Gemini'yi kapatır, yalnız Chirp. (`device`: anahtar yoksa doğrudan cihaz sesi.) |

Sesler: Aoede (Kadın 1, varsayılan), Kore, Leda, Charon, Puck, Orus (`src/lib/speech/googleVoices.js`).

## Kullanım

### Asistan gibi akan cevaplar: `useTts()`

```js
const tts = useTts();
tts.speak("Yarın 10:30'da antrenman var.");                       // asistan tarzı
tts.speak(metin, () => sonraki(), { style: "fitness", cache: true }); // sabit metin: sunucuda saklanır
```

### Kendi ses öğesini yöneten ekranlar (fitness anlatımı, Bilgi ekranı): `lib/speech/ttsClient.js`

```js
import { sayWith, ttsUrl } from "@/lib/speech/ttsClient";
// Ses öğesi dokunuşta açılmış olmalı (iPhone)
const durdur = sayWith(audio, "Şimdi 30 saniye plank. Karnını sık, nefes almayı unutma.", {
  style: "fitness", cache: true, onStart, onEnd,
});
// Sıradaki adımı önceden hazırlamak için: ttsUrl(sonrakiMetin, { style: "fitness", cache: true })
```

### Sunucuda (API ucu, betik)

```js
import { synthesize } from "@/lib/server/tts";
const { audio, type, engine, cached } = await synthesize({ text, voice: "Aoede", style: "fitness", cache: true });
```

HTTP: `POST /api/tts` gövde `{ text (≤400 harf), voice?, lang? "tr"|"en", style?, rate?, cache? }` (giriş gerekir).
Yanıt `audio/wav` (Gemini) ya da `audio/mpeg` (Chirp), başlıkta `x-tts-engine` (gemini|chirp) ve `x-tts-cached` (1|0). Uzun metni parçalayın
(`speechChunks` 280 harf; `useTts` bunu kendisi yapar).

## Masraf ve önbellek

- **`cache: true`** = ses Firebase Storage'da `tts-cache/<sha256>.wav` olarak saklanır; aynı metin + ses + tarz + hız
  bir daha üretilmez, ücret yok. **Sabit metinlerde açın** (fitness adım anlatımı, egzersiz adları, kelime satırları,
  ayarlardaki örnek cümle). Kişisel bilgi taşıyabilecek **asistan cevaplarında açmayın**.
- Yalnız Gemini sesi kalıcı saklanır (Chirp yedeği saklanmaz; Gemini dönünce doğal ses gelsin).
- Ayrıca sunucuda küçük bir bellek önbelleği ve istemcide aynı oturumda tekrar isteme yoktur.
- Tahmini fiyat: Gemini-TTS ≈ 1000 harf için 2 sent (`TTS_GEM_PRICE_CHR`, `src/lib/aiUsage.js`).
  Ayarlar › Kullanım'da "Gemini doğal ses: bu ay N harf (≈ $)" satırı görünür; önbellekten gelen ses sayılmaz.

## Test

`npm run test:ses` → "Ortak seslendirme": Gemini isteği (model + yönerge + ses), yavaş hız, Chirp yedeği, bellek.
