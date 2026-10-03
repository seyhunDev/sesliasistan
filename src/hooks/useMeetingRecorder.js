"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appAllowed, errorState, offMessage, permissionHelp } from "@/lib/permissions";
import { toWav16k } from "@/lib/speech/wav";
import { transcribeChunk } from "@/services/meetingService";

const CHUNK_MS = 60 * 1000; // 1 dakikalık parçalar: küçük yükleme, sunucu süre sınırına takılmaz

// Toplantı kaydı: kullanıcı bitirene kadar sürer (süre sınırı yok). Ses 1 dakikalık bağımsız parçalar halinde
// kaydedilir, her parça kayıt sürerken sırayla yazıya çevrilir; çevrilen parçanın sesi atılır (bellek dolmaz).
// iPhone'da mikrofon kesilebilir (ekran kilidi, uygulamadan çıkma, arama): kayıt bunu fark edip mikrofonu yeniden açar;
// açamazsa "paused" olur ve "Devam et" (resume) beklenir. Kesilene kadarki parçalar kaybolmaz.
// status: idle | rec | paused | finishing
// parts: [{ state: "wait" | "ok" | "fail", text }]
// onFail(metin): hata; onNotice(metin): bilgi ("dinleme yeniden başladı")
export function useMeetingRecorder({ onFail, onNotice } = {}) {
  const [status, setStatus] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [parts, setParts] = useState([]);
  const R = useRef({ blobs: [], texts: [], queue: [], busy: false, waiters: [] });
  const cb = useRef({});
  useEffect(() => {
    cb.current = { onFail, onNotice };
  });
  const recoverRef = useRef(null);

  const setPart = (i, patch) => setParts((p) => p.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  // Sıradaki parçayı yazıya çevir (tek tek, kota ve sıra korunur)
  const pump = useCallback(async () => {
    const s = R.current;
    if (s.busy) return;
    s.busy = true;
    while (s.queue.length) {
      const i = s.queue.shift();
      if (!s.blobs[i]) continue; // vazgeçildi
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
      if (s.recStops) return s.recStops();
      if (s.mr === mr && !s.stopping) recoverRef.current?.(); // beklenmeden durdu (iPhone mikrofonu kesti)
    };
    mr.onerror = () => {
      if (s.mr === mr && !s.stopping) recoverRef.current?.();
    };
    mr.start();
    s.mr = mr;
    s.chunkT0 = Date.now();
  }, [addPart]);

  // Mikrofonu açar, ses seviyesi ölçerini kurar
  const openMic = useCallback(async () => {
    const s = R.current;
    s.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    s.stream.getAudioTracks().forEach((t) => (t.onended = () => !s.stopping && recoverRef.current?.()));
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      s.ctx = s.ctx && s.ctx.state !== "closed" ? s.ctx : new AC();
      s.ctx.resume?.().catch(() => {});
      const an = s.ctx.createAnalyser();
      an.fftSize = 256;
      s.ctx.createMediaStreamSource(s.stream).connect(an);
      s.an = an;
      s.buf = new Uint8Array(an.fftSize);
    } catch {
      s.an = null;
    }
  }, []);

  const keepAwake = async () => {
    const s = R.current;
    if (document.visibilityState !== "visible" || (s.wake && !s.wake.released)) return;
    try {
      s.wake = await navigator.wakeLock?.request("screen"); // kayıt sürerken ekran kapanmasın
    } catch {}
  };

  const dropMic = () => {
    const s = R.current;
    s.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    s.stream = null;
    s.an = null;
  };

  const release = () => {
    const s = R.current;
    clearInterval(s.timer);
    dropMic();
    try { s.ctx?.close(); } catch {}
    s.ctx = null;
    s.wake?.release?.().catch(() => {});
    s.wake = null;
    setLevel(0);
  };

  // Kesilen dinlemeyi yeniden başlatır: eldeki parça kaydedilir, mikrofon yeniden açılır
  const recover = useCallback(async () => {
    const s = R.current;
    if (s.recovering || s.stopping || !s.t0) return;
    s.recovering = true;
    const old = s.mr;
    s.mr = null;
    if (old && old.state !== "inactive") {
      try { old.stop(); } catch {}
    }
    dropMic();
    try {
      await openMic();
      if (s.stopping || !s.t0) {
        dropMic();
        s.recovering = false;
        return;
      }
      newRecorder();
      setStatus("rec");
      keepAwake();
      cb.current.onNotice?.("Dinleme kesilmişti, yeniden başladı");
    } catch {
      setStatus("paused"); // kullanıcı "Devam et"e basınca yeniden denenir
      setLevel(0);
    }
    s.recovering = false;
  }, [openMic, newRecorder]);
  useEffect(() => {
    recoverRef.current = recover;
  }, [recover]);

  // Sağlık kontrolü: mikrofon bitti ya da kayıt durduysa yeniden başlat
  const check = useCallback(() => {
    const s = R.current;
    if (!s.t0 || s.stopping || s.recovering) return;
    if (!s.mr) return recover(); // duraklamıştı: yeniden dene
    const dead = !s.stream || s.stream.getAudioTracks().every((t) => t.readyState === "ended") || s.mr.state === "inactive";
    if (dead) recover();
  }, [recover]);

  const start = useCallback(async () => {
    const s = R.current;
    if (status !== "idle") return false;
    if (!appAllowed("microphone")) {
      cb.current.onFail?.(offMessage("microphone"));
      return false;
    }
    try {
      await openMic();
    } catch (e) {
      cb.current.onFail?.(errorState(e) === "denied" ? `Mikrofon izni verilmedi. ${permissionHelp("microphone")}` : "Mikrofon açılamadı.");
      return false;
    }
    Object.assign(s, { blobs: [], texts: [], queue: [], t0: Date.now(), stopping: false, recovering: false });
    setParts([]);
    setElapsed(0);
    keepAwake();
    newRecorder();
    setStatus("rec");
    let lvl = 0;
    s.timer = setInterval(() => {
      setElapsed(Date.now() - s.t0);
      if (s.an) {
        s.an.getByteTimeDomainData(s.buf);
        let sum = 0;
        for (let i = 0; i < s.buf.length; i++) sum += ((s.buf[i] - 128) / 128) ** 2;
        lvl = lvl * 0.6 + Math.min(1, Math.sqrt(sum / s.buf.length) * 4) * 0.4;
        setLevel(lvl);
      }
      if (!s.mr) return;
      if (s.mr.state === "inactive" || s.stream?.getAudioTracks().every((t) => t.readyState === "ended")) return check();
      if (Date.now() - s.chunkT0 >= CHUNK_MS) {
        const old = s.mr;
        newRecorder(); // yeni parça başlasın, eskisi kapanıp sıraya girsin
        old.stop();
      }
    }, 250);
    return true;
  }, [status, newRecorder, openMic, check]);

  // Uygulamaya dönünce: ekran kilidini yeniden al, dinleme kesildiyse başlat
  useEffect(() => {
    if (status !== "rec" && status !== "paused") return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      keepAwake();
      R.current.ctx?.resume?.().catch(() => {});
      check();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
    };
  }, [status, check]);

  // Duraklayan (mikrofon açılamayan) kaydı kullanıcı dokunuşuyla sürdürür
  const resume = useCallback(() => recover(), [recover]);

  // Kaydı bitirir; tüm parçalar çevrilince { parts: [{ text, blob }], sec } döner
  const stop = useCallback(async () => {
    const s = R.current;
    if (!s.t0) return null;
    s.stopping = true;
    setStatus("finishing");
    const sec = Math.round((Date.now() - s.t0) / 1000);
    clearInterval(s.timer);
    if (s.mr && s.mr.state !== "inactive") {
      await new Promise((res) => {
        s.recStops = res;
        try { s.mr.stop(); } catch { res(); }
      });
    }
    s.recStops = null;
    s.mr = null;
    s.t0 = 0;
    release();
    if (s.busy || s.queue.length) await new Promise((res) => s.waiters.push(res));
    setStatus("idle");
    return { sec, parts: s.blobs.map((b, i) => ({ text: s.texts[i] ?? null, blob: b })) };
  }, []);

  // Kayıt sürerken anlık durum (cihaza ara kayıt için): çevrilmiş metin + çevrilmemiş ses
  const snapshot = useCallback(() => {
    const s = R.current;
    if (!s.t0) return null;
    return { sec: Math.round((Date.now() - s.t0) / 1000), parts: s.blobs.map((b, i) => ({ text: s.texts[i] ?? null, blob: b })) };
  }, []);

  // Vazgeç: kaydı at
  const cancel = useCallback(() => {
    const s = R.current;
    s.stopping = true;
    clearInterval(s.timer);
    if (s.mr) {
      s.mr.onstop = null;
      s.mr.onerror = null;
      try { s.mr.stop(); } catch {}
    }
    s.mr = null;
    s.t0 = 0;
    Object.assign(s, { blobs: [], texts: [], queue: [] });
    release();
    setParts([]);
    setStatus("idle");
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { status, elapsed, level, parts, start, stop, cancel, resume, snapshot };
}
