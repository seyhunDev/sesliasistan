"use client";
import { authFetch } from "@/lib/authFetch";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { bestVoice, rankVoices, speechChunks, speechText } from "@/lib/speech/speakText";
import { timingSpeak } from "@/lib/assistTiming";

// Yanıtları sesli okur. Önce sunucudan doğal ses (Gemini) ister, olmazsa cihazın kendi sesine düşer.
// speak(text, onDone): okuma bitince onDone çağrılır (durdurulursa veya yeni bir okuma başlarsa çağrılmaz).
// Cihaz sesi: en doğal Türkçe ses (Premium > Gelişmiş > Kompakt) seçilir, metin Türkçe okunuşa çevrilir
// (saat, para, birim, emoji; lib/speech/speakText.js) ve kısa parçalar halinde aralıksız okunur.
// Ses ve hız bu cihazda saklanır (Ayarlar › Sesli yanıt).
const KEY = "sa_tts_on";
const VOICE_KEY = "sa_tts_voice";
const RATE_KEY = "sa_tts_rate";
export const RATES = [["0.9", "Yavaş"], ["1", "Normal"], ["1.1", "Hızlı"]];
export const SAMPLE = "Merhaba, ben asistanın. Yarın saat 10:30'da antrenman var, rüzgar 12 knot.";
const NOOP = { supported: false, enabled: false, speaking: false, hasTr: true, voices: [], voiceUri: "", rate: "1", setVoice() { }, setRate() { }, toggle() { }, speak() { }, speakThen(_, cb) { cb?.(); }, stop() { }, maybeSpeak() { } };
const Ctx = createContext(NOOP);

const canDevice = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
const plain = (t) => String(t).replace(/[*_`#>~]/g, "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim(); // satır sonları kalır (okunuşta cümle arası olur)

const read = (k) => {
  try { return localStorage.getItem(k) || ""; } catch { return ""; }
};
const write = (k, v) => {
  try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { }
};

// iOS'ta sesi "açmak" için sessiz bir ses dosyası
function silentWav() {
  const n = 800;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

export function TtsProvider({ children }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [hasTr, setHasTr] = useState(true);
  const [voices, setVoices] = useState([]); // Türkçe sesler, en iyisi başta
  const [voiceUri, setVoiceUri] = useState(""); // kullanıcının seçtiği ses ("" = otomatik)
  const [rate, setRateState] = useState("1");
  const voice = useRef(null);
  const rateRef = useRef(1);
  const cur = useRef(null); // cihaz sesi: okunan parçalar (tarayıcı çöp toplamasın)
  const cancelAt = useRef(0);
  const audio = useRef(null); // kalıcı ses öğesi
  const cache = useRef(new Map()); // aynı metin tekrar istenmesin
  const serverOk = useRef(false); // Gemini TTS çok yavaş olduğu için varsayılan olarak cihaz sesi kullanıyoruz
  const rid = useRef(0);
  const unlocked = useRef(false);
  const on = useRef(false);
  on.current = enabled;

  const stop = useCallback(() => {
    rid.current += 1; // bekleyen isteklerin ve bitiş bildirimlerinin sonucunu geçersiz kılar
    try { audio.current?.pause(); } catch { }
    if (canDevice()) {
      const s = window.speechSynthesis;
      // Yalnız konuşuyorsa sustur: iOS'ta cancel'dan hemen sonraki konuşma düşebiliyor, boşuna bekletmeyelim
      if (s.speaking || s.pending || cur.current) {
        s.cancel();
        cancelAt.current = Date.now();
      }
    }
    cur.current = null;
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const dev = canDevice();
    setSupported(dev || typeof Audio !== "undefined");
    try { setEnabled(localStorage.getItem(KEY) === "1"); } catch { }
    const r0 = read(RATE_KEY) || "1";
    setRateState(r0);
    rateRef.current = Number(r0) || 1;
    setVoiceUri(read(VOICE_KEY));
    audio.current = new Audio();
    audio.current.preload = "auto";

    // iPhone'da ses listesi geç gelir ve voiceschanged her zaman tetiklenmez: birkaç kez yeniden bakılır
    const load = () => {
      if (!dev) return;
      const all = window.speechSynthesis.getVoices();
      voice.current = bestVoice(all, read(VOICE_KEY));
      setVoices(rankVoices(all));
      setHasTr(!!voice.current);
    };
    load();
    const tries = [300, 1000, 2500].map((ms) => setTimeout(load, ms));
    if (dev) window.speechSynthesis.addEventListener?.("voiceschanged", load);

    // iOS: otomatik okumanın çalışması için sesin bir dokunuşla "açılması" gerekir (sessiz ses çalınır).
    // Ama telefonda herhangi bir ses çalmak arka plandaki müziği/YouTube'u durdurur. Bu yüzden yalnızca
    // sesli yanıt açıkken ve kişi asistanla uğraşırken yapılır: asistanı açınca, asistan/ekleme penceresinde (data-voice) dokununca ya da mikrofon açılınca.
    // Uygulamayı açmak veya ana sayfada gezinmek sesi hiç açmaz.
    const unlock = () => {
      if (unlocked.current || !on.current) return;
      unlocked.current = true;
      try {
        const a = audio.current;
        const url = silentWav();
        a.src = url;
        // Sessiz ses çalınca öğe boşaltılır: dolu kalırsa iPhone ses oturumunu bırakmaz, arka plandaki ses devam etmez
        const drop = () => {
          if (a.src !== url) return;
          try { a.pause(); a.removeAttribute("src"); a.load(); } catch { }
          URL.revokeObjectURL(url);
        };
        a.play().then(() => setTimeout(drop, 300), drop);
      } catch { }
      if (dev) {
        try {
          const u = new SpeechSynthesisUtterance(" ");
          u.volume = 0;
          window.speechSynthesis.speak(u);
        } catch { }
      }
    };
    const onTap = (e) => e.target?.closest?.("[data-voice]") && unlock();
    const onMic = () => (unlock(), stop()); // mikrofon zaten sesi alır; konuşan yanıt susar
    const evs = ["pointerup", "click", "touchend"];
    evs.forEach((e) => window.addEventListener(e, onTap, { capture: true, passive: true }));
    // Mikrofon başlayınca konuşan ses susar (mikrofon kendi sesini duymasın)
    window.addEventListener("sa-stop-tts", onMic);
    window.addEventListener("sa-tts-prime", unlock);

    return () => {
      tries.forEach(clearTimeout);
      if (dev) window.speechSynthesis.removeEventListener?.("voiceschanged", load);
      evs.forEach((e) => window.removeEventListener(e, onTap, { capture: true }));
      window.removeEventListener("sa-stop-tts", onMic);
      window.removeEventListener("sa-tts-prime", unlock);
      stop();
    };
  }, [stop]);

  const speakDevice = useCallback((text, id, onDone) => {
    if (id !== rid.current) return;
    if (!canDevice()) {
      setSpeaking(false);
      onDone?.();
      return;
    }
    const synth = window.speechSynthesis;
    const parts = speechChunks(speechText(text));
    if (!parts.length) {
      setSpeaking(false);
      onDone?.();
      return;
    }
    // Parçalar tarayıcının kuyruğuna birlikte verilir: aralarında bekleme olmaz, bitiş son parçada
    const list = parts.map((p) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = voice.current?.lang || "tr-TR";
      if (voice.current) u.voice = voice.current;
      u.rate = rateRef.current;
      return u;
    });
    const end = () => {
      if (cur.current !== list) return;
      cur.current = null;
      setSpeaking(false);
      onDone?.();
    };
    list[0].onstart = () => {
      if (cur.current !== list) return;
      setSpeaking(true);
      timingSpeak(); // süre kaydı: okuma başladı
    };
    list.forEach((u, i) => {
      u.onerror = end;
      if (i === list.length - 1) u.onend = end;
    });
    cur.current = list;
    const go = () => {
      if (id !== rid.current) return;
      if (synth.paused) synth.resume(); // iOS: bir kesintiden (arama, başka ses) sonra duraklamış kalabiliyor
      list.forEach((u) => synth.speak(u));
    };
    // cancel'dan hemen sonra konuşma bazı tarayıcılarda (iOS) düşüyor; yalnız o zaman kısa bekle
    const wait = 80 - (Date.now() - cancelAt.current);
    if (wait > 0) setTimeout(go, wait);
    else go();
  }, []);

  const speak = useCallback(
    async (text, onDone) => {
      const t = plain(text || "");
      if (!t) {
        onDone?.();
        return;
      }
      stop();
      const id = rid.current;

      if (serverOk.current && audio.current) {
        setSpeaking(true);
        try {
          let url = cache.current.get(t);
          if (!url) {
            const res = await authFetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t }) });
            if (!res.ok) {
              const e = new Error(`tts ${res.status}`);
              e.status = res.status;
              throw e;
            }
            url = URL.createObjectURL(await res.blob());
            cache.current.set(t, url);
          }
          if (id !== rid.current) return; // arada başka bir okuma başladı veya durduruldu
          const a = audio.current;
          a.onended = () => {
            if (id !== rid.current) return;
            setSpeaking(false);
            onDone?.();
          };
          a.onerror = () => {
            if (id !== rid.current) return;
            setSpeaking(false);
            speakDevice(t, id, onDone);
          };
          a.src = url;
          await a.play();
          return;
        } catch (e) {
          if (e.status === 501) serverOk.current = false; // sunucuda ses anahtarı yok: bir daha deneme
          if (id !== rid.current) return;
          setSpeaking(false);
        }
      }
      speakDevice(t, id, onDone); // yedek: cihazın kendi sesi
    },
    [stop, speakDevice],
  );

  const maybeSpeak = useCallback((text) => {
    if (on.current) speak(text);
  }, [speak]);

  // Sesli yanıt açıksa okuyup bitince cb'yi çağırır; kapalıysa hemen çağırır
  const speakThen = useCallback((text, cb) => {
    if (on.current) speak(text, cb);
    else cb?.();
  }, [speak]);

  const setVoice = useCallback((uri) => {
    write(VOICE_KEY, uri);
    setVoiceUri(uri || "");
    if (canDevice()) voice.current = bestVoice(window.speechSynthesis.getVoices(), uri);
  }, []);

  const setRate = useCallback((r) => {
    write(RATE_KEY, r === "1" ? "" : r);
    setRateState(r);
    rateRef.current = Number(r) || 1;
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { }
    if (next) speak("Sesli yanıt açık.");
    else stop();
  }, [enabled, speak, stop]);

  return <Ctx.Provider value={{ supported, enabled, speaking, hasTr, voices, voiceUri, rate, setVoice, setRate, toggle, speak, speakThen, stop, maybeSpeak }}>{children}</Ctx.Provider>;
}

export const useTts = () => useContext(Ctx);
