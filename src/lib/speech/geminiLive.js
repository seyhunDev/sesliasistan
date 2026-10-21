// Gemini Live: ses akışla Google'a gider, söylenen kelime kelime yazıya döner (Claude uygulaması gibi; Seyhun, 2026-10-21).
// Telefon /api/live-token'dan kısa ömürlü anahtar alır, Google'a doğrudan WebSocket ile bağlanır (asıl anahtar telefona
// gitmez). Yalnız dinlerken görünen canlı yazı içindir; gönderilen son yazı yine kaydın sunucuda çevirisidir (useSpeech).
// Hat açılamaz ya da koparsa useSpeech eski yola (parça parça çeviri) döner.
import { authFetch } from "@/lib/authFetch";

// 16 kHz tek kanal 16 bit PCM (Gemini Live'ın istediği biçim)
export function pcm16(input, rate) {
  const ratio = rate / 16000;
  const n = Math.floor(input.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
export function b64(int16) {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const wsText = async (d) => (typeof d === "string" ? d : d instanceof Blob ? d.text() : new TextDecoder().decode(d));

export const LIVE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

// Bir modelle bağlantı kurar; kurulum tamamlanınca açık soketi döndürür, olmazsa hata fırlatır
export function openLive(token, model, onMsg, ms = 8000) {
  return new Promise((ok, fail) => {
    const ws = new WebSocket(`${LIVE_URL}?access_token=${encodeURIComponent(token)}`);
    let ready = false;
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      fail(new Error(`${model}: ${Math.round(ms / 1000)} sn içinde hazır olmadı`));
    }, ms);
    ws.onopen = () => {
      const audio = /native-audio/.test(model);
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: { responseModalities: [audio ? "AUDIO" : "TEXT"] },
            inputAudioTranscription: {},
            systemInstruction: { parts: [{ text: "Sadece dinle. Hiçbir zaman cevap verme." }] },
          },
        }),
      );
    };
    ws.onmessage = async (e) => {
      let m;
      try {
        m = JSON.parse(await wsText(e.data));
      } catch {
        return;
      }
      if (m.setupComplete && !ready) {
        ready = true;
        clearTimeout(timer);
        ok(ws);
        return;
      }
      onMsg(m);
    };
    ws.onclose = (e) => {
      clearTimeout(timer);
      if (!ready) fail(new Error(`${model}: kapandı ${e.code} ${e.reason || ""}`.trim()));
    };
  });
}

const QUEUE_MAX = 16000 * 12; // bağlanırken biriken ses en çok 12 sn (ilk kelimeler kaybolmasın)

// Dinleme boyunca canlı yazı. push(ses, örnekleme hızı) her ses parçasında; end() dinleme bitince (son kelimeler gelsin
// diye kısa süre açık kalır); close() hemen kapatır. onText(bütün yazı), onDown(neden): hat açılamadı ya da koptu.
export function startLive({ onText, onDown } = {}) {
  const x = { ws: null, queue: [], queued: 0, text: "", closed: false, sent: 0, model: "", t0: Date.now() };
  const down = (why) => {
    if (x.closed || x.ending) return; // dinleme bitti, hat kendiliğinden kapandı: hata değil
    x.down = true;
    onDown?.(String(why || "").slice(0, 160));
  };
  const send = (pcm) => {
    try {
      x.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64(pcm), mimeType: "audio/pcm;rate=16000" } } }));
      x.sent += pcm.length;
    } catch {}
  };
  (async () => {
    if (typeof WebSocket === "undefined") throw new Error("WebSocket yok");
    const res = await authFetch("/api/live-token", { method: "POST", timeout: 8000 });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.token) throw new Error(j.error || `anahtar ${res.status}`);
    const onMsg = (m) => {
      const t = m.serverContent?.inputTranscription?.text;
      if (t && !x.closed) {
        x.text += t;
        onText?.(x.text.replace(/\s+/g, " ").trim(), x.model);
      }
    };
    const tried = [];
    for (const model of j.models || []) {
      if (x.closed) return;
      try {
        x.ws = await openLive(j.token, model, onMsg, 6000);
        x.model = model;
        break;
      } catch (e) {
        tried.push(e.message);
      }
    }
    if (!x.ws) throw new Error(tried.join(" | ") || "model yok");
    if (x.closed) return x.ws.close();
    x.ws.onclose = (e) => down(`hat kapandı ${e.code}`);
    for (const p of x.queue) send(p);
    x.queue = [];
    if (x.ending) end();
  })().catch((e) => down(e?.message || e));

  const report = () => {
    const sec = Math.round(x.sent / 16000);
    if (!x.model || sec < 1) return;
    authFetch("/api/live-token", { method: "POST", body: JSON.stringify({ used: sec }), headers: { "content-type": "application/json" }, timeout: 8000 }).catch(() => {});
  };
  const close = () => {
    if (x.closed) return;
    x.closed = true;
    try { x.ws?.close(); } catch {}
    report();
  };
  const end = () => {
    x.ending = true;
    if (x.closed || !x.ws) return;
    try { x.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })); } catch {}
    setTimeout(close, 1200);
  };
  return {
    push(input, rate) {
      if (x.closed || x.down || x.ending) return;
      const pcm = pcm16(input, rate || 48000);
      if (x.ws?.readyState === 1) send(pcm);
      else if (!x.ws && x.queued < QUEUE_MAX) (x.queue.push(pcm), (x.queued += pcm.length));
    },
    end,
    close,
    get ok() {
      return !!x.ws && !x.down && !x.closed;
    },
    get model() {
      return x.model;
    },
  };
}
