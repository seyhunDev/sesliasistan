"use client";
import { authFetch } from "@/lib/authFetch";

import { useCallback, useEffect, useRef, useState } from "react";
import { isIOS, pickProvider } from "@/lib/speech/detect";

const ERR = {
  "not-allowed": "Mikrofon izni verilmedi. Tarayıcı ayarlarından bu siteye mikrofon izni ver.",
  "service-not-allowed": "Bu cihazda ses tanıma kapalı. Ayarlar'dan Dikte'yi aç.",
  "no-speech": "Ses duyulmadı, tekrar dene.",
  "audio-capture": "Mikrofon bulunamadı.",
  network: "Ses tanıma için internet gerekli.",
  "language-not-supported": "Türkçe ses tanıma bu tarayıcıda desteklenmiyor.",
};
const FATAL = ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported", "network"];
const NO_SPEECH = "Ses duyulmadı, tekrar dene.";
const MAX_SEC = 90; // güvenlik sınırı
const FINAL_WAIT = 700; // durdurunca son sonucu en fazla bu kadar bekle (ms)
const VOICE_LVL = 0.09; // kayıt yolunda "ses var" eşiği

// status: "idle" | "listening" | "transcribing"
// onFinal(text, mode): mode "send" (hemen gönder) | "edit" (metin kutuda kalsın)
// start({ autoStop: ms }): bu kadar süre konuşulmazsa dinleme biter (0 = kapalı, örn. basılı tutma modu).
//   Konuşulduysa metni gönderir, hiç konuşulmadıysa "ses duyulmadı" der.
export function useSpeech({ onFinal, onFail, lang = "tr-TR" } = {}) {
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState("idle");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(null); // otomatik bitmeye kalan saniye (3 sn sessizlikten sonra)

  const R = useRef({ status: "idle", sid: 0 });
  const cb = useRef({});
  cb.current = { onFinal, onFail };
  const fail = (m) => {
    if (!R.current.silent) cb.current.onFail?.(m); // otomatik başlatılan dinlemede hata sessiz geçilir
  };
  const stopRef = useRef(null);

  const setSt = (v) => {
    R.current.status = v;
    setStatus(v);
  };

  const releaseAudio = () => {
    const s = R.current;
    clearInterval(s.timer);
    s.timer = null;
    clearTimeout(s.finalTimer);
    s.stream?.getTracks().forEach((t) => t.stop());
    s.stream = null;
    try { s.ctx?.close(); } catch {}
    s.ctx = null;
    s.analyser = null;
  };

  const finish = () => {
    releaseAudio();
    setSt("idle");
    setFinalText("");
    setInterim("");
    setLevel(0);
    setElapsed(0);
    setRemaining(null);
  };

  const ticker = () => {
    const s = R.current;
    clearInterval(s.timer);
    s.t0 = Date.now();
    s.lvl = 0;
    s.timer = setInterval(() => {
      const now = Date.now();
      const sec = Math.floor((now - s.t0) / 1000);
      setElapsed(sec);

      let raw;
      if (s.analyser) {
        s.analyser.getByteTimeDomainData(s.buf);
        let sum = 0;
        for (let i = 0; i < s.buf.length; i++) {
          const v = (s.buf[i] - 128) / 128;
          sum += v * v;
        }
        raw = Math.min(1, Math.sqrt(sum / s.buf.length) * 4); // gerçek ses seviyesi (kayıt yolu)
        if (raw > VOICE_LVL) {
          s.voiceSeen = true;
          s.lastSpeech = now;
        }
      } else {
        // Web Speech ses seviyesi vermez: yeni kelime geldiğinde dalga hareketlenir
        raw = now - (s.lastAct || 0) < 400 ? 0.35 + Math.random() * 0.5 : 0.05 + Math.random() * 0.05;
      }
      s.lvl = s.lvl * 0.55 + raw * 0.45; // yumuşatma: dalga titremesin
      setLevel(s.lvl);

      if (s.status !== "listening") return;
      if (sec >= MAX_SEC) {
        stopRef.current?.("send");
        return;
      }
      if (s.autoStop > 0) {
        const silent = now - Math.max(s.lastSpeech || 0, s.t0);
        setRemaining(silent >= 3000 ? Math.max(0, Math.ceil((s.autoStop - silent) / 1000)) : null);
        if (silent >= s.autoStop) {
          if (s.text || s.voiceSeen) stopRef.current?.("send"); // konuşulmuştu: gönder
          else {
            cancelNow(); // hiç konuşulmadı: kapat
            fail(NO_SPEECH);
          }
        }
      } else setRemaining(null);
    }, 100);
  };

  // Sonucu teslim et (bir kez): eldeki metinle devam eder
  const deliver = (sid, mode) => {
    const s = R.current;
    if (s.sid !== sid || s.delivered) return;
    s.delivered = true;
    const text = s.text;
    const err = s.error;
    const rec = s.rec;
    s.rec = null;
    try { rec?.abort(); } catch {}
    finish();
    if (text) cb.current.onFinal?.(text, mode);
    else fail(ERR[err] || NO_SPEECH);
  };

  // ---- Yol 1: tarayıcı ses tanıması, canlı yazı ----
  const startWebSpeech = (sid) => {
    const s = R.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    s.restarts = 0;
    s.base = ""; // önceki oturumlardan biriken metin

    const begin = () => {
      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = !isIOS(); // iOS'ta sürekli mod güvenilmez, cümle sonunda kendiliğinden biter
      rec.maxAlternatives = 1;
      s.rec = rec;
      s.error = null;

      rec.onresult = (e) => {
        if (s.sid !== sid || s.rec !== rec) return;
        let f = "";
        let i = "";
        for (let k = 0; k < e.results.length; k++) {
          const res = e.results[k];
          if (res.isFinal) f += res[0].transcript;
          else i += res[0].transcript;
        }
        const pre = s.base ? `${s.base} ` : "";
        const full = `${pre}${f}${i}`.trim();
        if (full !== s.text) s.lastSpeech = Date.now();
        s.text = full;
        s.lastAct = Date.now();
        setFinalText(`${pre}${f}`);
        setInterim(i);
      };
      rec.onerror = (e) => {
        if (s.sid === sid && s.rec === rec) s.error = e.error;
      };
      rec.onend = () => {
        if (s.sid !== sid || s.rec !== rec) return;
        // Motor kendiliğinden bitirdiyse (sessizlik, cümle sonu) ve kullanıcı hâlâ dinleniyorsa yeniden başlat
        if (s.status === "listening" && !FATAL.includes(s.error) && s.restarts < 80 && Date.now() - s.t0 < MAX_SEC * 1000) {
          s.restarts += 1;
          s.base = s.text;
          setTimeout(() => {
            if (s.sid === sid && s.status === "listening") begin();
          }, 120);
          return;
        }
        deliver(sid, s.mode || "send");
      };
      try {
        rec.start();
      } catch {
        if (s.text) deliver(sid, s.mode || "send");
        else {
          finish();
          fail("Ses tanıma başlatılamadı.");
        }
      }
    };
    begin();
  };

  // ---- Yol 2: kayıt + sunucuda çeviri ----
  const startServer = async (sid) => {
    const s = R.current;
    const alive = () => s.sid === sid;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      if (!alive()) return;
      finish();
      fail(e.name === "NotAllowedError" ? ERR["not-allowed"] : ERR["audio-capture"]);
      return;
    }
    if (!alive()) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    s.stream = stream;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(an);
      s.ctx = ctx;
      s.analyser = an;
      s.buf = new Uint8Array(an.fftSize);
    } catch {}

    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const type = mr.mimeType || mime || "audio/webm";
    const chunks = [];
    s.mr = mr;
    mr.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
    mr.onstop = async () => {
      if (!alive()) return;
      const mode = s.mode || "send";
      releaseAudio();
      const blob = new Blob(chunks, { type });
      if (blob.size < 1500) {
        finish();
        fail("Ses alınamadı, tekrar dene.");
        return;
      }
      try {
        const fd = new FormData();
        fd.append("audio", blob, `kayit.${type.includes("mp4") ? "m4a" : "webm"}`);
        const res = await authFetch("/api/transcribe", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!alive()) return;
        if (!res.ok) throw new Error(data.error || "Ses çevrilemedi");
        finish();
        if (data.text) cb.current.onFinal?.(data.text, mode);
        else fail("Ses anlaşılamadı, tekrar dene.");
      } catch (e) {
        if (!alive()) return;
        finish();
        fail(e.message);
      }
    };
    mr.start();
    if (s.stopReq) mr.stop(); // parmak izin ekranı sırasında kalktıysa
  };

  const cancelNow = () => {
    const s = R.current;
    if (s.status === "idle") return;
    s.sid += 1; // eski işlemin geri dönüşlerini yok say
    const rec = s.rec;
    s.rec = null;
    try { rec?.abort(); } catch {}
    try { if (s.mr && s.mr.state !== "inactive") s.mr.stop(); } catch {}
    s.mr = null;
    finish();
  };

  const start = useCallback((opts = {}) => {
    const s = R.current;
    if (s.status !== "idle") return;
    s.silent = !!opts.auto;
    if (!window.isSecureContext) {
      fail("Mikrofon için HTTPS gerekir. Tünel adresini (https://…) kullan.");
      return;
    }
    const kind = pickProvider();
    if (kind === "none") {
      fail("Bu tarayıcıda ses kaydı yok. Yazarak ekleyebilirsin.");
      return;
    }
    s.sid += 1;
    const sid = s.sid;
    Object.assign(s, {
      kind, text: "", base: "", error: null, lastAct: 0, lastSpeech: 0, voiceSeen: false, analyser: null,
      stopReq: false, mr: null, rec: null, mode: "send", delivered: false, autoStop: opts.autoStop || (opts.auto ? 15000 : 0), restarts: 0,
    });
    setFinalText("");
    setInterim("");
    setLevel(0);
    setRemaining(null);
    setProvider(kind);
    setSt("listening");
    ticker();
    if (kind === "webspeech") startWebSpeech(sid);
    else startServer(sid);
    navigator.vibrate?.(12);
    window.dispatchEvent(new Event("sa-stop-tts")); // konuşan yanıt susar, mikrofon onu duymasın
  }, []);

  const stop = useCallback((mode = "send") => {
    const s = R.current;
    if (s.status !== "listening") return;
    const m = mode === "edit" ? "edit" : "send";
    if (Date.now() - s.t0 < 600 && !s.text) {
      cancelNow();
      fail("Çok kısa, tekrar dene.");
      return;
    }
    s.mode = m;
    setSt("transcribing");
    if (s.kind === "webspeech") {
      const sid = s.sid;
      try { s.rec?.stop(); } catch {}
      s.finalTimer = setTimeout(() => deliver(sid, m), FINAL_WAIT); // son sonuç gecikirse eldeki metinle devam
    } else if (s.mr && s.mr.state !== "inactive") s.mr.stop();
    else s.stopReq = true;
  }, []);
  stopRef.current = stop;

  const cancel = useCallback(() => cancelNow(), []);
  const setAutoStop = useCallback((ms) => {
    R.current.autoStop = ms;
  }, []);

  useEffect(() => {
    setProvider(pickProvider());
    return () => cancelNow();
  }, []);

  return { provider, status, finalText, interim, level, elapsed, remaining, start, stop, cancel, setAutoStop };
}
