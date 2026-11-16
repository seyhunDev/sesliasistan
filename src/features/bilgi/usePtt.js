"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { holdMic } from "@/features/training/Countdown";
import { micReset } from "@/lib/speech/audioSession";
import { voiceType } from "@/lib/chatFile";
import { haptic } from "@/lib/haptic";
import { SES_MAX_SEC } from "@/lib/bilgi";

// Bas konuş: basılı tutunca kaydeder, bırakınca gönderir (en çok 20 sn). Yönet (sporcuya) ve sporcu ekranı (Yönet'e) aynı kancayı kullanır;
// send(blob, sn, hedef) gönderimi yapar ve { ok } döner.
export function usePtt({ send, onSent }) {
  const toast = useToast();
  const [rec, setRec] = useState(null); // { key, t0 } basılı tutulan hedef
  const [done, setDone] = useState(null); // { key, at } son giden ses (düğmede kısa ✓)
  const st = useRef(null);
  const stop = () => {
    const s = st.current;
    if (!s) return;
    st.current = null;
    clearTimeout(s.timer);
    if (s.mr.state !== "inactive") s.mr.stop();
    setRec(null);
  };
  const begin = async (e, key, to) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    if (st.current) return;
    haptic("select");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return toast("Bu cihazda ses kaydı yapılamıyor.");
    const s = { mr: null, timer: 0, up: false };
    st.current = s;
    // Kısa dokunuş yalnız hedef seçer: 0,3 sn basılı kalmadıysa mikrofon hiç açılmaz
    await new Promise((r) => setTimeout(r, 300));
    if (s.up) {
      st.current = null;
      return;
    }
    // Geri sayım sürerken sayaç iPhone ses oturumunu "playback"e alır (bipler sessizde de çalsın); o kipte mikrofon açılmaz.
    // Kayıt boyunca sayaç kipi değiştirmez, mikrofon açılmadan önce kip "auto"ya döner (asistan mikrofonu gibi).
    holdMic(true);
    micReset();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      st.current = null;
      holdMic(false);
      return toast(err?.name === "NotAllowedError" ? "Mikrofon izni gerekli." : "Mikrofon açılamadı, tekrar dene.");
    }
    const type = voiceType();
    const mr = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
    const parts = [];
    const t0 = Date.now();
    mr.ondataavailable = (ev) => ev.data?.size && parts.push(ev.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      holdMic(false);
      const dur = (Date.now() - t0) / 1000;
      if (dur < 0.6) return; // kısa dokunuş: yalnız hedef seçildi
      const blob = new Blob(parts, { type: mr.mimeType || type || "audio/mp4" });
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, at: Date.now(), ok: null });
      haptic("light");
      const r = await send(blob, dur, to).catch(() => ({ ok: false }));
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, ...r, ok: !!r.ok });
      if (r.ok) {
        haptic("success");
        setDone({ key, at: Date.now() });
      } else haptic("error");
    };
    s.mr = mr;
    mr.start();
    haptic("medium"); // kayıt başladı: parmağın altında hissedilir
    setRec({ key, t0 });
    s.timer = setTimeout(stop, SES_MAX_SEC * 1000);
    if (s.up) stop(); // izin sorulurken parmak kalktıysa
  };
  const end = () => (st.current && !st.current.mr ? (st.current.up = true) : stop());
  useEffect(() => () => stop(), []);
  return { rec, done, begin, end };
}
