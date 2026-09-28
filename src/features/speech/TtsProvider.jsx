"use client";
import { authFetch } from "@/lib/authFetch";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// Yanıtları sesli okur. Önce sunucudan doğal ses (Gemini) ister, olmazsa cihazın kendi sesine düşer.
// speak(text, onDone): okuma bitince onDone çağrılır (durdurulursa veya yeni bir okuma başlarsa çağrılmaz).
const KEY = "sa_tts_on";
const NOOP = { supported: false, enabled: false, speaking: false, hasTr: true, toggle() { }, speak() { }, speakThen(_, cb) { cb?.(); }, stop() { }, maybeSpeak() { } };
const Ctx = createContext(NOOP);

const canDevice = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
const plain = (t) => String(t).replace(/[*_`#>~]/g, "").replace(/\s+/g, " ").trim();

function pickVoice() {
  const list = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith("tr"));
  if (!list.length) return null;
  return list.find((v) => /premium|enhanced|yelda|google/i.test(v.name)) || list[0];
}

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
  const voice = useRef(null);
  const cur = useRef(null); // cihaz sesi ifadesi (tarayıcı çöp toplamasın)
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
    if (canDevice()) window.speechSynthesis.cancel();
    cur.current = null;
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const dev = canDevice();
    setSupported(dev || typeof Audio !== "undefined");
    try { setEnabled(localStorage.getItem(KEY) === "1"); } catch { }
    audio.current = new Audio();
    audio.current.preload = "auto";

    const load = () => {
      if (!dev) return;
      voice.current = pickVoice();
      setHasTr(!!voice.current);
    };
    load();
    if (dev) window.speechSynthesis.addEventListener?.("voiceschanged", load);

    // iOS: ilk dokunuşta sesi aç, sonraki otomatik okumalar çalışır
    const unlock = () => {
      if (unlocked.current) return;
      unlocked.current = true;
      try {
        audio.current.src = silentWav();
        audio.current.play().catch(() => { });
      } catch { }
      if (dev) {
        try {
          const u = new SpeechSynthesisUtterance(" ");
          u.volume = 0;
          window.speechSynthesis.speak(u);
        } catch { }
      }
    };
    const evs = ["pointerup", "click", "touchend"];
    evs.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
    // Mikrofon başlayınca konuşan ses susar (mikrofon kendi sesini duymasın)
    window.addEventListener("sa-stop-tts", stop);

    return () => {
      if (dev) window.speechSynthesis.removeEventListener?.("voiceschanged", load);
      evs.forEach((e) => window.removeEventListener(e, unlock, { capture: true }));
      window.removeEventListener("sa-stop-tts", stop);
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
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    if (voice.current) u.voice = voice.current;
    const end = () => {
      if (cur.current !== u) return;
      cur.current = null;
      setSpeaking(false);
      onDone?.();
    };
    u.onstart = () => cur.current === u && setSpeaking(true);
    u.onend = end;
    u.onerror = end;
    cur.current = u;
    setTimeout(() => synth.speak(u), 60); // cancel'dan hemen sonra konuşma bazı tarayıcılarda düşüyor
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

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { }
    if (next) speak("Sesli yanıt açık.");
    else stop();
  }, [enabled, speak, stop]);

  return <Ctx.Provider value={{ supported, enabled, speaking, hasTr, toggle, speak, speakThen, stop, maybeSpeak }}>{children}</Ctx.Provider>;
}

export const useTts = () => useContext(Ctx);
