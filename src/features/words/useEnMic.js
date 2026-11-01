"use client";

import { useEffect, useRef, useState } from "react";
import { micClosed, micOpening } from "@/lib/speech/audioSession";

// Konuş ekranının mikrofonu: İngilizce cevabı kaydeder (yazıya döküm sunucuda, cevapla aynı yapay zeka çağrısında; asistanın
// mikrofonu Türkçe yazar). start() → kayıt; stop() → Blob (çok kısaysa null); cancel() → atılır. En çok 30 sn.
const MAX_MS = 30000;
const typeOf = () => ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) || "";

// onLong: 30 sn dolunca çağrılır (sayfa kaydı gönderir)
export function useEnMic({ onFail, onLong } = {}) {
  const [on, setOn] = useState(false);
  const R = useRef({});
  const cb = useRef({});
  useEffect(() => {
    cb.current = { onFail, onLong };
  });

  const close = () => {
    const s = R.current;
    clearTimeout(s.timer);
    s.stream?.getTracks().forEach((t) => t.stop());
    if (s.stream) micClosed();
    R.current = {};
    setOn(false);
  };

  const start = async () => {
    if (R.current.mr) return;
    window.dispatchEvent(new Event("sa-stop-tts"));
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* yok */
    }
    const s = (R.current = { chunks: [], t0: Date.now() });
    setOn(true);
    try {
      micOpening();
      s.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (R.current !== s) return s.stream.getTracks().forEach((t) => t.stop());
      const type = typeOf();
      s.mr = new MediaRecorder(s.stream, type ? { mimeType: type } : undefined);
      s.mr.ondataavailable = (e) => e.data?.size && s.chunks.push(e.data);
      s.mr.start(250);
      s.timer = setTimeout(() => cb.current.onLong?.(), MAX_MS);
    } catch {
      close();
      cb.current.onFail?.("Mikrofon açılamadı. iPhone: Ayarlar › Velora (ya da Safari) › Mikrofon.");
    }
  };

  const stop = () =>
    new Promise((ok) => {
      const s = R.current;
      const mr = s.mr;
      if (!mr || mr.state === "inactive") {
        close();
        return ok(null);
      }
      const long = Date.now() - s.t0 > 600;
      mr.onstop = () => {
        const blob = new Blob(s.chunks, { type: mr.mimeType || "audio/webm" });
        close();
        ok(long && blob.size > 1500 ? blob : null);
      };
      try {
        mr.requestData?.();
        mr.stop();
      } catch {
        close();
        ok(null);
      }
    });

  const cancel = () => {
    const mr = R.current.mr;
    if (mr) mr.onstop = null;
    try {
      if (mr && mr.state !== "inactive") mr.stop();
    } catch {
      /* kapalı */
    }
    close();
  };

  return { on, start, stop, cancel };
}
