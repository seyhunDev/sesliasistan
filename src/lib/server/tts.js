// Ortak seslendirme servisi (Seyhun, 2026-11-25: "doğal Gemini sesi her yerde, fitness'ta da").
// Tek giriş: synthesize({ text, voice, lang, style, rate, cache }) → { audio: Buffer, type, engine, cached }.
// Sıra: 1) Gemini-TTS (Cloud Text-to-Speech, model gemini-2.5-flash-tts; anlatıcı yönergesi "style" ile doğal, akıcı)
//       2) olmazsa Chirp 3 HD (aynı ses adı, hızlı ve ayda 1 milyon harf ücretsiz)
//       3) GOOGLE_TTS_KEY hiç yoksa ve TTS_ENGINE=gemini ise eski Gemini API yolu (GEMINI_API_KEY, WAV)
// Anahtar: GOOGLE_TTS_KEY (Netlify). Gemini-TTS için aynı Google projesinde (828345188662) "Vertex AI API" açık olmalı.
// Velora Sailing (seyhunDev/velora-sailing, scripts/tts.mjs) aynı modeli ve sesi kullanır.
// Önbellek: cache: true verilirse ses Firebase Storage'a tts-cache/<sha256>.mp3 olarak yazılır; aynı metin+ses+stil
// bir daha üretilmez (ücret yok). Sabit metinler (fitness anlatımı, kelime satırları, tanıtım) için açın; kişisel veri
// içerebilecek asistan cevapları için AÇMAYIN. Ayrıca süreç içinde küçük bir bellek önbelleği hep vardır.
// Kullanım: docs/seslendirme.md
import { createHash } from "node:crypto";

export const TTS_GEMINI_MODEL = () => process.env.TTS_GEMINI_MODEL || "gemini-2.5-flash-tts";
export const DEFAULT_VOICE = "Aoede"; // lib/speech/googleVoices.js ile aynı liste (Aoede, Kore, Leda, Charon, Puck, Orus)

// Anlatım tarzları (Gemini-TTS "prompt"u). İstemci yalnız anahtarı gönderir; serbest metin kabul edilmez.
export const TTS_STYLES = {
  asistan:
    "Sıcak, samimi ve doğal bir günlük konuşma tonuyla, akıcı Türkçe konuş. Cümleleri birbirine bağla; robot gibi kesik kesik okuma.",
  anlatim:
    "Gençlere ders anlatan sıcak, sakin ve neşeli bir antrenör gibi oku. Doğal bir hızda, cümleleri birbirine bağlayarak, akıcı bir sohbet tonuyla konuş.",
  fitness:
    "Enerjik ama sakin bir spor antrenörü gibi konuş: net, cesaretlendirici ve doğal. Hareket adlarını açık söyle, cümleler arasında kısa nefes payı bırak.",
  ingilizce: "Speak clear, natural, friendly American English at a relaxed pace for a language learner.",
};
const PACE = (rate) => (rate <= 0.92 ? " Biraz yavaş konuş." : rate >= 1.08 ? " Biraz hızlı konuş." : "");

const GEMINI_VOICES = new Set(["Aoede", "Kore", "Leda", "Charon", "Puck", "Orus"]);
const voiceId = (v) => {
  const s = String(v || "").replace(/^(tr-TR|en-US)-Chirp3-HD-/, "");
  return GEMINI_VOICES.has(s) ? s : DEFAULT_VOICE;
};

// Gemini kabul edilmezse (API kapalı, yetki, model yok) 10 dk denenmez; her istekte boşuna beklenmesin
let geminiOffUntil = 0;
const mem = new Map(); // süreç içi önbellek: anahtar → { audio, type, engine }

async function cloudTts(body, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_KEY)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const raw = await res.text();
    if (!res.ok) {
      const e = new Error(`${res.status} ${raw.slice(0, 200)}`);
      e.status = res.status;
      throw e;
    }
    const b64 = JSON.parse(raw).audioContent;
    if (!b64) throw new Error("ses verisi yok");
    return Buffer.from(b64, "base64");
  } catch (e) {
    if (e.name === "AbortError") throw Object.assign(new Error("zaman aşımı"), { status: 0 });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function gemini({ text, voice, lang, style, rate, timeoutMs }) {
  return cloudTts(
    {
      input: { prompt: (TTS_STYLES[style] || TTS_STYLES.asistan) + (lang === "en" ? "" : PACE(rate)), text },
      voice: { languageCode: lang === "en" ? "en-US" : "tr-TR", name: voice, modelName: TTS_GEMINI_MODEL() },
      audioConfig: { audioEncoding: "MP3" },
    },
    timeoutMs,
  );
}

const CHIRP_TR = (v) => [...new Set([`tr-TR-Chirp3-HD-${v}`, process.env.GOOGLE_TTS_VOICE, "tr-TR-Chirp3-HD-Aoede", "tr-TR-Wavenet-E", "tr-TR-Standard-E"].filter(Boolean))];
const CHIRP_EN = () => [...new Set([process.env.GOOGLE_TTS_VOICE_EN, "en-US-Chirp3-HD-Aoede", "en-US-Neural2-F", "en-US-Standard-F"].filter(Boolean))];

async function chirp({ text, voice, lang, rate }) {
  let last = "";
  for (const name of lang === "en" ? CHIRP_EN() : CHIRP_TR(voice)) {
    try {
      const audioConfig = { audioEncoding: "MP3" };
      if (!/Chirp/i.test(name)) audioConfig.speakingRate = rate;
      return await cloudTts({ input: { text }, voice: { languageCode: name.slice(0, 5), name }, audioConfig }, 8000);
    } catch (e) {
      last = `${name}: ${e.message}`;
      console.error("[tts] chirp", last);
      if (e.status === 400 || e.status === 404) continue; // ses yok: sıradakini dene
      break;
    }
  }
  throw new Error(last || "olmadı");
}

// Eski yol: Gemini API (generativelanguage, GEMINI_API_KEY), ham PCM → WAV. Yalnız GOOGLE_TTS_KEY yoksa.
function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
async function geminiApi({ text, voice, style }) {
  let last = "";
  for (const model of [...new Set([process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts"])]) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${TTS_STYLES[style] || TTS_STYLES.asistan}\n\n${text}` }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        }),
        signal: ctrl.signal,
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${raw.slice(0, 160)}`);
      const part = JSON.parse(raw).candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw new Error("ses verisi yok");
      const sr = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1]) || 24000;
      return pcmToWav(Buffer.from(part.inlineData.data, "base64"), sr);
    } catch (e) {
      last = `${model}: ${e.name === "AbortError" ? "zaman aşımı" : e.message}`;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(last);
}

export const ttsReady = () => !!process.env.GOOGLE_TTS_KEY || (process.env.TTS_ENGINE === "gemini" && !!process.env.GEMINI_API_KEY);
const geminiOn = () => process.env.TTS_ENGINE !== "chirp" && Date.now() > geminiOffUntil;

export const ttsKey = ({ text, voice, lang, style, rate }) =>
  createHash("sha256").update([TTS_GEMINI_MODEL(), voice, lang, style, rate, text].join("|")).digest("hex").slice(0, 40);

// Firebase Storage önbelleği (yalnız cache: true). Yönetici hesabı ya da kova yoksa sessizce atlanır.
async function bucketFile(key) {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!name) return null;
  const { adminReady, adminDb } = await import("@/lib/server/admin");
  if (!adminReady()) return null;
  adminDb(); // varsayılan uygulama açılsın
  const { getStorage } = await import("firebase-admin/storage");
  return getStorage().bucket(name).file(`tts-cache/${key}.mp3`);
}

/**
 * Metni sese çevirir.
 * @param {object} o
 * @param {string} o.text      en çok ~400 harf (uzun metni istemci parçalar)
 * @param {string} [o.voice]   Aoede | Kore | Leda | Charon | Puck | Orus (varsayılan Aoede)
 * @param {"tr"|"en"} [o.lang]
 * @param {keyof TTS_STYLES} [o.style] asistan | anlatim | fitness | ingilizce
 * @param {number} [o.rate]    0.7–1.4 (Gemini'de yönergeye "biraz yavaş/hızlı" olarak eklenir)
 * @param {boolean} [o.cache]  sabit metin: Storage'da sakla, bir daha üretme
 * @param {number} [o.timeoutMs] Gemini için bekleme (sonra Chirp), varsayılan 6000
 */
export async function synthesize(o) {
  const text = String(o?.text ?? "").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("Metin boş");
  const lang = o?.lang === "en" ? "en" : "tr";
  const voice = voiceId(o?.voice);
  const style = TTS_STYLES[o?.style] ? o.style : lang === "en" ? "ingilizce" : "asistan";
  const rate = Math.min(1.4, Math.max(0.7, Number(o?.rate) || 1));
  const key = ttsKey({ text, voice, lang, style, rate });

  const m = mem.get(key);
  if (m) return { ...m, cached: true };

  let file = null;
  if (o?.cache) {
    try {
      file = await bucketFile(key);
      if (file && (await file.exists())[0]) {
        const [buf] = await file.download();
        const hit = { audio: buf, type: "audio/mpeg", engine: file.metadata?.metadata?.engine || "gemini" };
        remember(key, hit);
        return { ...hit, cached: true };
      }
    } catch (e) {
      console.error("[tts] önbellek okunamadı", e.message);
      file = null;
    }
  }

  let out = null;
  const errs = [];
  if (process.env.GOOGLE_TTS_KEY) {
    if (geminiOn()) {
      try {
        out = { audio: await gemini({ text, voice, lang, style, rate, timeoutMs: o?.timeoutMs || 6000 }), type: "audio/mpeg", engine: "gemini" };
      } catch (e) {
        errs.push(`gemini: ${e.message}`);
        console.error("[tts] gemini", e.message);
        if ([400, 401, 403, 404].includes(e.status)) geminiOffUntil = Date.now() + 10 * 60 * 1000;
      }
    }
    if (!out) {
      try {
        out = { audio: await chirp({ text, voice, lang, rate }), type: "audio/mpeg", engine: "chirp" };
      } catch (e) {
        errs.push(`chirp: ${e.message}`);
      }
    }
  } else if (process.env.TTS_ENGINE === "gemini" && process.env.GEMINI_API_KEY && lang !== "en") {
    try {
      out = { audio: await geminiApi({ text, voice, style }), type: "audio/wav", engine: "gemini-api" };
    } catch (e) {
      errs.push(`gemini-api: ${e.message}`);
    }
  }
  if (!out) throw Object.assign(new Error("Ses üretilemedi"), { detail: errs.join(" · ") || "anahtar yok" });

  remember(key, out);
  // Yalnız Gemini sesi kalıcı saklanır (Chirp yedeği saklanırsa Gemini açılınca eski ses kalırdı)
  if (file && out.engine === "gemini") {
    try {
      await file.save(out.audio, { contentType: out.type, resumable: false, metadata: { metadata: { engine: out.engine } } });
    } catch (e) {
      console.error("[tts] önbelleğe yazılamadı", e.message);
    }
  }
  return { ...out, cached: false, chars: text.length };
}

function remember(key, v) {
  mem.set(key, v);
  if (mem.size > 40) mem.delete(mem.keys().next().value);
}
