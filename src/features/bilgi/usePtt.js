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
// İptal (Seyhun 2026-11-18): kayıt sürerken parmak düğmeden uzağa (yukarıdaki "İptal"e) kaydırılıp bırakılırsa ses gönderilmez.
const CANCEL_PX = 60;
export function usePtt({ send, onSent }) {
  const toast = useToast();
  const [rec, setRec] = useState(null); // { key, t0 } basılı tutulan hedef
  const [done, setDone] = useState(null); // { key, at } son giden ses (düğmede kısa ✓)
  // Basıldı, mikrofon henüz açılmadı (Seyhun 2026-11-20 "basıyorum, bekliyorum, ne olup bittiğini anlamıyorum"): düğme hemen "Mikrofon açılıyor…" der
  const [arm, setArm] = useState(null); // { key }
  const [tap, setTap] = useState(null); // { key, at } kısa dokunuş (kayıt olmadı)
  const [lvl, setLvl] = useState(0); // kayıt sırasında sesin seviyesi 0–1
  const st = useRef(null);
  const stop = () => {
    const s = st.current;
    if (!s) return;
    st.current = null;
    clearTimeout(s.timer);
    s.meter?.();
    setLvl(0);
    if (s.mr.state !== "inactive") {
      haptic("medium"); // bırakınca telsiz gibi "tık" (basınca da medium)
      s.mr.stop();
    }
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
    const s = { mr: null, timer: 0, up: false, x0: e.clientX, y0: e.clientY, far: false };
    st.current = s;
    setArm({ key });
    setTap(null);
    // Kısa dokunuş yalnız hedef seçer: 0,3 sn basılı kalmadıysa mikrofon hiç açılmaz
    await new Promise((r) => setTimeout(r, 300));
    if (s.up) {
      st.current = null;
      setArm(null);
      setTap({ key, at: Date.now() });
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
      setArm(null);
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
      if (s.far) return toast("Ses iptal edildi");
      const blob = new Blob(parts, { type: mr.mimeType || type || "audio/mp4" });
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, at: Date.now(), ok: null });
      const r = await send(blob, dur, to).catch(() => ({ ok: false }));
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, ...r, ok: !!r.ok });
      if (r.ok) {
        haptic("success");
        setDone({ key, at: Date.now() });
      } else {
        haptic("error");
        toast("Ses gönderilemedi, tekrar dene.");
      }
    };
    s.mr = mr;
    mr.start();
    haptic("medium"); // kayıt başladı: parmağın altında hissedilir
    s.meter = meter(stream, setLvl);
    setArm(null);
    setRec({ key, t0 });
    s.timer = setTimeout(stop, SES_MAX_SEC * 1000);
    if (s.up) stop(); // izin sorulurken parmak kalktıysa
  };
  // Basılıyken parmak uzaklaşınca iptal kipine girer (düğme kırmızılaşır), geri gelince çıkar
  const move = (e) => {
    const s = st.current;
    if (!s?.mr) return;
    const far = Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > CANCEL_PX;
    if (far === s.far) return;
    s.far = far;
    haptic("select");
    setRec((r) => r && { ...r, cancel: far });
  };
  const end = () => (st.current && !st.current.mr ? (st.current.up = true) : stop());
  useEffect(() => () => stop(), []);
  return { rec, done, arm, tap, lvl, begin, end, move };
}

// Mikrofonun ses seviyesi (kayıt düğmesindeki çubuklar): saniyede ~12 kez 0–1 arası; durdurma işlevi döner. Açılamazsa çubuklar kendiliğinden oynar.
function meter(stream, set) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ac = new AC();
    ac.resume?.().catch(() => {});
    const an = ac.createAnalyser();
    an.fftSize = 256;
    ac.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const id = setInterval(() => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      set(Math.min(1, Math.sqrt(sum / buf.length) * 4));
    }, 80);
    return () => {
      clearInterval(id);
      ac.close?.().catch(() => {});
    };
  } catch {
    return null;
  }
}
