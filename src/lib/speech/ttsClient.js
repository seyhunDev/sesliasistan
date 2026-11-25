// İstemci tarafı ortak seslendirme (docs/seslendirme.md). Sunucudaki doğal sesi (/api/tts → lib/server/tts.js:
// Gemini-TTS, olmazsa Chirp 3 HD) ister; gelmezse cihazın kendi sesine düşer.
// TtsProvider (useTts().speak) asistan cevapları içindir; bu dosya kendi ses öğesini yöneten ekranlar içindir
// (Bilgi ekranı, fitness anlatımı gibi). Aynı metin bellekte tutulur; cache: true ile sunucuda da saklanır.
import { authFetch } from "@/lib/authFetch";

const got = new Map(); // anahtar → Promise<objectURL>
let serverOff = false; // sunucuda anahtar yok (501) ya da giriş yok (401): bu oturumda bir daha deneme

/**
 * Metnin ses dosyası adresini (blob URL) verir.
 * @param {string} text ≤ 400 harf
 * @param {{ voice?: string, lang?: "tr"|"en", style?: "asistan"|"anlatim"|"fitness"|"ingilizce", rate?: number, cache?: boolean, timeoutMs?: number }} [o]
 */
export function ttsUrl(text, o = {}) {
  const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!t) return Promise.reject(new Error("Metin boş"));
  if (serverOff) return Promise.reject(Object.assign(new Error("sunucu sesi yok"), { status: 501 }));
  const key = [o.voice || "", o.lang || "tr", o.style || "", o.rate || 1, t].join("|");
  const hit = got.get(key);
  if (hit) return hit;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs || 8000);
  const job = authFetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: t, voice: o.voice, lang: o.lang, style: o.style, rate: o.rate, cache: !!o.cache }),
    signal: ctrl.signal,
  })
    .then(async (r) => {
      if (r.status === 501 || r.status === 401) serverOff = true;
      if (!r.ok) throw Object.assign(new Error(`tts ${r.status}`), { status: r.status });
      return URL.createObjectURL(await r.blob());
    })
    .finally(() => clearTimeout(timer));
  got.set(key, job);
  job.catch(() => got.delete(key));
  if (got.size > 60) got.delete(got.keys().next().value);
  return job;
}

// Cihaz sesiyle okur (yedek). Bitince onEnd.
export function sayDevice(text, { lang = "tr-TR", onStart, onEnd } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return onEnd?.();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (v) u.voice = v;
  u.onstart = () => onStart?.();
  u.onend = u.onerror = () => onEnd?.();
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

/**
 * Metni verilen ses öğesiyle okur (öğe dokunuşta açılmış olmalı, iPhone). Sunucu sesi olmazsa cihaz sesi.
 * Bitince onEnd; başlayınca onStart. Dönüş: durdurma işlevi.
 */
export function sayWith(audio, text, o = {}) {
  let dead = false;
  const { onStart, onEnd } = o;
  ttsUrl(text, o).then(
    (url) => {
      if (dead) return;
      audio.onplaying = () => onStart?.();
      audio.onended = () => onEnd?.();
      audio.onerror = () => onEnd?.();
      audio.src = url;
      audio.play().catch(() => !dead && sayDevice(text, { lang: o.lang === "en" ? "en-US" : "tr-TR", onStart, onEnd }));
    },
    () => !dead && sayDevice(text, { lang: o.lang === "en" ? "en-US" : "tr-TR", onStart, onEnd }),
  );
  return () => {
    dead = true;
    try { audio.pause(); } catch { /* yok */ }
    try { speechSynthesis.cancel(); } catch { /* yok */ }
  };
}
