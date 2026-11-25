"use client";

import { useEffect, useRef, useState } from "react";
import { micClosed, micOpening, micReset } from "@/lib/speech/audioSession";
import { settleWait } from "@/lib/speech/playback";
import { pcmToWav16k } from "@/lib/speech/wav";
import { stopEn } from "./WordView";

// İngilizce mikrofonu (Kalıplar › Hatırla, Konuş): İngilizce cevabı kaydeder (yazıya döküm sunucuda, yapay zeka çağrısında;
// asistanın mikrofonu Türkçe yazar). start() → kayıt; stop() → Blob (çok kısaysa null); cancel() → atılır. En çok 30 sn.
// Durum (state): "off" · "opening" (mikrofon açılıyor, henüz kaydetmiyor) · "rec" (kaydediyor) · "stopping" (son parça bekleniyor).
// Hatırla'da "basınca tıkanıyor" (Seyhun 2026-11-25) düzeltmesi:
// - açılırken ve dururken gelen dokunuşlar yok sayılır (önceden açılmadan "bitti"ye basınca kayıt boş gidiyordu),
// - okunan İngilizce mikrofondan önce susar ve kısa bir an beklenir (iPhone'da okumadan hemen sonra açılan mikrofon ses vermiyordu),
// - mikrofon açılamazsa bir kez yeniden denenir; 1,8 sn'de hiç ses gelmezse bir kez yeniden açılır,
// - kayıt (MediaRecorder) boş ya da bozuk gelirse aynı anda toplanan ham sesten WAV gönderilir,
// - durma sözü en çok 2,5 sn bekler (iPhone'da onstop bazen gelmiyordu, ekran "dinliyor"da kalıyordu).
// Ses seviyesi (0-1) yalnız levelRef öğesinin --lv değişkenine yazılır (her karede yeniden çizim yok).
const MAX_MS = 30000;
const STOP_WAIT_MS = 2500;
const CHECK_MS = 1800;
const MIN_BYTES = 1500;
const typeOf = () => ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) || "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ask = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
const DENIED = "Mikrofon izni yok. iPhone: Ayarlar › Velora (ya da Safari) › Mikrofon.";
const DEAD = "Mikrofondan ses gelmiyor. Sayfayı kapatıp yeniden aç.";

// levelRef: sayfanın ses halkası öğesi; onLong: 30 sn dolunca çağrılır (sayfa kaydı gönderir); onFail(yazı): mikrofon açılamadı
export function useEnMic({ onFail, onLong, levelRef: given } = {}) {
  const [state, setState] = useState("off");
  const R = useRef({});
  const cb = useRef({});
  const own = useRef(null);
  const levelRef = given || own;
  useEffect(() => {
    cb.current = { onFail, onLong, close };
  });
  useEffect(() => () => cb.current.close?.(R.current), []); // sayfa kapanınca mikrofon kapanır

  const set = (s, v) => R.current === s && setState(v);

  // Yalnız kendi oturumunu kapatır (eski bir açılışın hatası yenisini kapatmaz)
  function close(s) {
    if (!s || s.closed) return;
    s.closed = true;
    clearTimeout(s.timer);
    clearTimeout(s.check);
    cancelAnimationFrame(s.raf);
    try {
      s.proc?.disconnect();
      s.src?.disconnect();
    } catch {
      /* kapalı */
    }
    s.ctx?.close?.().catch(() => {});
    s.stream?.getTracks().forEach((t) => t.stop());
    if (s.stream) micClosed();
    levelRef.current?.style.setProperty("--lv", "0");
    if (R.current === s) {
      R.current = {};
      setState("off");
    }
  }

  const open = async (s) => {
    micOpening();
    try {
      return await ask();
    } catch (e) {
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") throw e;
      micReset();
      await sleep(300);
      if (R.current !== s) throw new Error("iptal");
      return ask();
    }
  };

  const wire = (s) => {
    const ctx = s.ctx;
    if (!ctx) return;
    try {
      ctx.resume?.().catch(() => {});
      s.src = ctx.createMediaStreamSource(s.stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      s.src.connect(an);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      s.rate = ctx.sampleRate;
      s.pcm = [];
      s.pcmLen = 0;
      s.peak = 0;
      proc.onaudioprocess = (e) => {
        if (R.current !== s || s.closed) return;
        const x = e.inputBuffer.getChannelData(0);
        s.pcm.push(new Float32Array(x));
        s.pcmLen += x.length;
        for (let i = 0; i < x.length; i += 16) s.peak = Math.max(s.peak, Math.abs(x[i]));
      };
      s.src.connect(proc);
      proc.connect(ctx.destination);
      s.proc = proc;
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        if (R.current !== s || s.closed) return;
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += ((buf[i] - 128) / 128) ** 2;
        const lv = Math.min(1, Math.sqrt(sum / buf.length) * 5);
        s.lv = s.lv * 0.6 + lv * 0.4 || lv;
        levelRef.current?.style.setProperty("--lv", s.lv.toFixed(3));
        s.raf = requestAnimationFrame(tick);
      };
      s.raf = requestAnimationFrame(tick);
    } catch {
      /* ölçer yok: kayıt yine sürer */
    }
  };

  const record = (s) => {
    const type = typeOf();
    s.chunks = [];
    s.mr = new MediaRecorder(s.stream, type ? { mimeType: type } : undefined);
    s.mr.ondataavailable = (e) => e.data?.size && s.chunks.push(e.data);
    s.mr.start(1000);
    s.t0 = Date.now();
  };

  const start = async () => {
    if (R.current.state) return; // açılıyor ya da kaydediyor: ikinci dokunuş yok sayılır
    stopEn();
    const s = (R.current = { state: "opening", tries: 0, lv: 0 });
    setState("opening");
    // Ses motoru dokunuş anında açılır (iPhone'da sonradan açılan motor askıda kalıyor)
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      s.ctx = AC ? new AC() : null;
    } catch {
      s.ctx = null;
    }
    try {
      const wait = settleWait();
      if (wait) await sleep(wait);
      if (R.current !== s) return;
      s.stream = await open(s);
      if (R.current !== s) return s.stream.getTracks().forEach((t) => t.stop());
      wire(s);
      record(s);
      s.state = "rec";
      set(s, "rec");
      s.timer = setTimeout(() => cb.current.onLong?.(), MAX_MS);
      s.check = setTimeout(() => deadCheck(s), CHECK_MS);
    } catch (e) {
      if (R.current !== s) return;
      close(s);
      cb.current.onFail?.(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? DENIED : "Mikrofon açılamadı, tekrar dene.");
    }
  };

  // Mikrofon açık görünüp hiç ses vermiyorsa (iPhone) bir kez yeniden açılır, olmazsa söylenir
  const deadCheck = async (s) => {
    if (R.current !== s || s.state !== "rec") return;
    const bytes = s.chunks.reduce((n, c) => n + c.size, 0);
    const pcmZero = s.pcmLen > 0 && s.peak === 0;
    if ((bytes > 0 || s.pcmLen > 0) && !pcmZero) return;
    if (s.tries >= 1) {
      close(s);
      return cb.current.onFail?.(DEAD);
    }
    s.tries += 1;
    try {
      s.mr.ondataavailable = null;
      if (s.mr.state !== "inactive") s.mr.stop();
    } catch {
      /* kapalı */
    }
    s.stream.getTracks().forEach((t) => t.stop());
    try {
      s.proc?.disconnect();
      s.src?.disconnect();
    } catch {
      /* kapalı */
    }
    micReset();
    await sleep(300);
    if (R.current !== s) return;
    try {
      s.stream = await ask();
      if (R.current !== s) return s.stream.getTracks().forEach((t) => t.stop());
      wire(s);
      record(s);
      s.check = setTimeout(() => deadCheck(s), CHECK_MS);
    } catch {
      close(s);
      cb.current.onFail?.(DEAD);
    }
  };

  const pcmWav = async (s) => {
    if (!s.pcmLen || !s.peak || s.pcmLen < (s.rate || 44100) * 0.4) return null;
    const all = new Float32Array(s.pcmLen);
    let at = 0;
    for (const c of s.pcm) {
      all.set(c, at);
      at += c.length;
    }
    return pcmToWav16k(all, s.rate).catch(() => null);
  };

  // Kayıt biter: Blob ya da (çok kısa / boşsa) null. Açılırken çağrılırsa açılış iptal edilir.
  const stop = async () => {
    const s = R.current;
    if (!s.state) return null;
    if (s.state === "stopping") return s.done;
    if (s.state === "opening" || !s.mr) {
      close(s);
      return null;
    }
    s.state = "stopping";
    set(s, "stopping");
    clearTimeout(s.check);
    const long = Date.now() - s.t0 > 600;
    const mr = s.mr;
    s.done = new Promise((ok) => {
      let over = false;
      const end = async () => {
        if (over) return;
        over = true;
        clearTimeout(guard);
        const blob = new Blob(s.chunks, { type: mr.mimeType || "audio/webm" });
        let out = long && blob.size > MIN_BYTES ? blob : null;
        if (!out && long) out = await pcmWav(s);
        close(s);
        ok(out);
      };
      const guard = setTimeout(end, STOP_WAIT_MS);
      mr.onstop = end;
      try {
        if (mr.state === "inactive") end();
        else mr.stop();
      } catch {
        end();
      }
    });
    return s.done;
  };

  const cancel = () => {
    const s = R.current;
    if (!s.state) return;
    if (s.mr) {
      s.mr.onstop = null;
      s.mr.ondataavailable = null;
      try {
        if (s.mr.state !== "inactive") s.mr.stop();
      } catch {
        /* kapalı */
      }
    }
    close(s);
  };

  return { state, on: state !== "off", rec: state === "rec", start, stop, cancel };
}
