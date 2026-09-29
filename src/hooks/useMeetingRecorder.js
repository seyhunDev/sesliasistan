"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appAllowed, errorState, offMessage, permissionHelp } from "@/lib/permissions";
import { toWav16k } from "@/lib/speech/wav";
import { transcribeChunk } from "@/services/meetingService";

export const MEETING_MAX_MS = 15 * 60 * 1000; // en fazla 15 dakika
const CHUNK_MS = 60 * 1000; // 1 dakikalık parçalar: küçük yükleme, sunucu süre sınırına takılmaz

// Toplantı kaydı: ses 1 dakikalık bağımsız parçalar halinde kaydedilir, her parça kayıt sürerken
// sırayla yazıya çevrilir. Çevrilemeyen parçanın sesi saklanır (sonra tekrar denenir).
// status: idle | rec | finishing
// parts: [{ state: "wait" | "ok" | "fail", text }]
export function useMeetingRecorder({ onFail } = {}) {
  const [status, setStatus] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [parts, setParts] = useState([]);
  const R = useRef({ blobs: [], texts: [], queue: [], busy: false, waiters: [] });
  const cb = useRef({});
  cb.current = { onFail };
  const stopRef = useRef(null);

  const setPart = (i, patch) => setParts((p) => p.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  // Sıradaki parçayı yazıya çevir (tek tek, kota ve sıra korunur)
  const pump = useCallback(async () => {
    const s = R.current;
    if (s.busy) return;
    s.busy = true;
    while (s.queue.length) {
      const i = s.queue.shift();
      try {
        const text = await transcribeChunk(await toWav16k(s.blobs[i]));
        s.texts[i] = text;
        s.blobs[i] = null; // çevrildi, sese gerek yok
        setPart(i, { state: "ok", text });
      } catch {
        s.texts[i] = null;
        setPart(i, { state: "fail", text: "" });
      }
    }
    s.busy = false;
    s.waiters.splice(0).forEach((f) => f());
  }, []);

  const addPart = useCallback(
    (blob) => {
      const s = R.current;
      if (!blob || blob.size < 2000) return; // boş parça
      const i = s.blobs.length;
      s.blobs.push(blob);
      s.texts.push(undefined);
      setParts((p) => [...p, { state: "wait", text: "" }]);
      s.queue.push(i);
      pump();
    },
    [pump],
  );

  const newRecorder = useCallback(() => {
    const s = R.current;
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(s.stream, mime ? { mimeType: mime } : undefined);
    const type = mr.mimeType || mime || "audio/webm";
    const chunks = [];
    mr.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
    mr.onstop = () => {
      addPart(new Blob(chunks, { type }));
      s.recStops?.();
    };
    mr.start();
    s.mr = mr;
    s.chunkT0 = Date.now();
  }, [addPart]);

  const release = () => {
    const s = R.current;
    clearInterval(s.timer);
    s.stream?.getTracks().forEach((t) => t.stop());
    s.stream = null;
    try { s.ctx?.close(); } catch {}
    s.ctx = null;
    s.wake?.release?.().catch(() => {});
    s.wake = null;
    setLevel(0);
  };

  const start = useCallback(async () => {
    const s = R.current;
    if (status !== "idle") return false;
    if (!appAllowed("microphone")) {
      cb.current.onFail?.(offMessage("microphone"));
      return false;
    }
    try {
      s.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      cb.current.onFail?.(errorState(e) === "denied" ? `Mikrofon izni verilmedi. ${permissionHelp("microphone")}` : "Mikrofon açılamadı.");
      return false;
    }
    Object.assign(s, { blobs: [], texts: [], queue: [], t0: Date.now() });
    setParts([]);
    setElapsed(0);
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      s.ctx = new AC();
      s.ctx.resume?.().catch(() => {});
      const an = s.ctx.createAnalyser();
      an.fftSize = 256;
      s.ctx.createMediaStreamSource(s.stream).connect(an);
      s.an = an;
      s.buf = new Uint8Array(an.fftSize);
    } catch {}
    try {
      s.wake = await navigator.wakeLock?.request("screen"); // kayıt sürerken ekran kapanmasın
    } catch {}
    newRecorder();
    setStatus("rec");
    let lvl = 0;
    s.timer = setInterval(() => {
      const ms = Date.now() - s.t0;
      setElapsed(ms);
      if (s.an) {
        s.an.getByteTimeDomainData(s.buf);
        let sum = 0;
        for (let i = 0; i < s.buf.length; i++) sum += ((s.buf[i] - 128) / 128) ** 2;
        lvl = lvl * 0.6 + Math.min(1, Math.sqrt(sum / s.buf.length) * 4) * 0.4;
        setLevel(lvl);
      }
      if (ms >= MEETING_MAX_MS) stopRef.current?.();
      else if (Date.now() - s.chunkT0 >= CHUNK_MS) {
        const old = s.mr;
        newRecorder(); // yeni parça başlasın, eskisi kapanıp sıraya girsin
        old.stop();
      }
    }, 250);
    return true;
  }, [status, newRecorder]);

  // Kaydı bitirir; tüm parçalar çevrilince { parts: [{ text, blob }], sec } döner
  const stop = useCallback(async () => {
    const s = R.current;
    if (!s.mr) return null;
    setStatus("finishing");
    const sec = Math.round((Date.now() - s.t0) / 1000);
    clearInterval(s.timer);
    await new Promise((res) => {
      s.recStops = res;
      if (s.mr.state !== "inactive") s.mr.stop();
      else res();
    });
    s.recStops = null;
    s.mr = null;
    release();
    if (s.busy || s.queue.length) await new Promise((res) => s.waiters.push(res));
    setStatus("idle");
    return { sec, parts: s.blobs.map((b, i) => ({ text: s.texts[i] ?? null, blob: b })) };
  }, []);
  stopRef.current = stop;

  // Vazgeç: kaydı at
  const cancel = useCallback(() => {
    const s = R.current;
    clearInterval(s.timer);
    if (s.mr) {
      s.mr.onstop = null;
      try { s.mr.stop(); } catch {}
    }
    s.mr = null;
    Object.assign(s, { blobs: [], texts: [], queue: [] });
    release();
    setParts([]);
    setStatus("idle");
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { status, elapsed, level, parts, start, stop, cancel };
}
