"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { holdMic } from "@/features/training/Countdown";
import { micReset } from "@/lib/speech/audioSession";
import { voiceType } from "@/lib/chatFile";
import { haptic } from "@/lib/haptic";
import { SES_MAX_SEC } from "@/lib/bilgi";
import { PTT, pttStart, pttTick } from "@/lib/pttCut";

// Bas konuş: basılı tutunca kaydeder, bırakınca gönderir (en çok 20 sn). Yönet (sporcuya) ve sporcu ekranı (Yönet'e) aynı kancayı kullanır;
// send(blob, sn, hedef) gönderimi yapar ve { ok } döner.
// İptal (Seyhun 2026-11-18): kayıt sürerken parmak düğmeden uzağa (yukarıdaki "İptal"e) kaydırılıp bırakılırsa ses gönderilmez.
const CANCEL_PX = 60;
// Parça parça (Seyhun 2026-11-25 "2-3 saniyede bir eklenenleri gönderip sporcuya sırayla"; 2026-11-28 "susma şeylerini hesaplayarak"):
// live verilirse konuşurken parça susmada kesilir (lib/pttCut; ses seviyesi ölçülemezse PART_MS'de bir) ve ayrı kayıt olarak gönderilir (her parça tek başına çalınabilir dosya; aynı mikrofondan ikinci kaydedici). Tam ses yine ayrıca kaydedilir
// (Kalıp yap, Tekrar). live = { part(blob, seq, end, id, to, sn) → Promise<bool>, finish(id, sn, to) → { id, ok, logId }, cancel(id) }
const PART_MS = 2500;
const talkId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
// Aç/kapa (Seyhun 2026-11-25 "bas konuş değil, tıklayınca başlasın, tekrar tıklayınca dursun"): flip(e, key, to) ilk dokunuşta kaydı
// hemen başlatır, ikinci dokunuşta bitirip gönderir. Açık unutulmasın diye max saniyede kendiliğinden biter.
export function usePtt({ send, onSent, live = null, max = SES_MAX_SEC }) {
  const toast = useToast();
  const [rec, setRec] = useState(null); // { key, t0 } basılı tutulan hedef
  const [done, setDone] = useState(null); // { key, at } son giden ses (düğmede kısa ✓)
  // Basıldı, mikrofon henüz açılmadı (Seyhun 2026-11-20 "basıyorum, bekliyorum, ne olup bittiğini anlamıyorum"): düğme hemen "Mikrofon açılıyor…" der
  const [arm, setArm] = useState(null); // { key }
  const [tap, setTap] = useState(null); // { key, at } kısa dokunuş (kayıt olmadı)
  const [lvl, setLvl] = useState(0); // kayıt sırasında sesin seviyesi 0–1
  const [sending, setSending] = useState(null); // { key } kayıt bitti, gidiyor (düğmede "Gönderiliyor")
  const st = useRef(null);
  const stop = () => {
    const s = st.current;
    if (!s) return;
    st.current = null;
    clearTimeout(s.timer);
    clearTimeout(s.segT);
    s.ending = true;
    s.segDone = new Promise((r) => (s.segRes = r));
    if (s.seg && s.seg.state !== "inactive") s.seg.stop();
    else s.segRes();
    s.meter?.();
    setLvl(0);
    if (s.mr.state !== "inactive") {
      haptic("medium"); // bırakınca telsiz gibi "tık" (basınca da medium)
      s.mr.stop();
    }
    setRec(null);
  };
  const begin = async (e, key, to, flip = false) => {
    e.preventDefault();
    try {
      if (!flip) e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    if (st.current) return;
    haptic("select");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return toast("Bu cihazda ses kaydı yapılamıyor.");
    const s = { mr: null, timer: 0, up: false, x0: e.clientX, y0: e.clientY, far: false };
    st.current = s;
    setArm({ key });
    setTap(null);
    // Kısa dokunuş yalnız hedef seçer: 0,3 sn basılı kalmadıysa mikrofon hiç açılmaz
    if (!flip) await new Promise((r) => setTimeout(r, 300));
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
      if (s.far) {
        if (s.live) s.live.cancel(s.id);
        return toast("Ses iptal edildi");
      }
      const blob = new Blob(parts, { type: mr.mimeType || type || "audio/mp4" });
      setSending({ key });
      onSent?.({ kind: "ses", dur: Math.round(dur), blob, to, at: Date.now(), ok: null });
      if (s.live) await Promise.race([s.segDone, new Promise((ok) => setTimeout(ok, 1500))]);
      // Parça gitmediyse (ikinci kaydedici açılmadı ya da bir parça yazılamadı) tam ses eski yolla bir kez gider
      const all = s.live ? await Promise.all(s.sent) : [];
      const r =
        s.live && all.length && all.every(Boolean)
          ? await s.live.finish(s.id, dur, to).catch(() => ({ ok: false }))
          : await send(blob, dur, to).catch(() => ({ ok: false }));
      setSending(null);
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
    // Seviye ölçer parçalardan önce açılır: her ölçümde (80 ms) parça kesilsin mi diye bakılır
    s.meter = meter(stream, setLvl, (v) => {
      const r = s.seg;
      if (!r || r.state !== "recording" || s.ending) return;
      const a = pttTick(s, v, Date.now());
      if (!a) return;
      r.skip = a === "skip";
      clearTimeout(s.segT);
      r.stop();
    });
    if (live) {
      s.live = live;
      s.id = talkId();
      s.seq = 0;
      s.sent = [];
      const seg = () => {
        if (s.ending) return;
        let r;
        try {
          r = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
        } catch {
          return;
        }
        const bits = [];
        r.ondataavailable = (ev) => ev.data?.size && bits.push(ev.data);
        r.onstop = () => {
          const dur = (Date.now() - t0) / 1000;
          // Yalnız sessizlik olan parça gönderilmez (son parça hariç: bitişi o bildirir)
          if (!s.far && bits.length && !(s.ending && dur < 0.6) && !(r.skip && !s.ending)) {
            const n = s.seq++;
            s.sent.push(live.part(new Blob(bits, { type: r.mimeType || type || "audio/mp4" }), n, !!s.ending, s.id, to, dur).catch(() => false));
          }
          if (s.ending) s.segRes?.();
          else seg();
        };
        s.seg = r;
        pttStart(s, Date.now());
        r.start();
        s.segT = setTimeout(() => r.state !== "inactive" && r.stop(), s.meter ? PTT.MAX_MS + 1500 : PART_MS);
      };
      seg();
    }
    haptic("medium"); // kayıt başladı: parmağın altında hissedilir
    setArm(null);
    setRec({ key, t0 });
    s.timer = setTimeout(stop, max * 1000);
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
  // Aç/kapa: kayıt yoksa başlat, varsa bitir ve gönder (mikrofon açılırken gelen dokunuş açılınca hemen bitirir)
  const flip = (e, key, to) => {
    const s = st.current;
    if (!s) return begin(e, key, to, true);
    e.preventDefault();
    if (s.mr) stop();
    else s.up = true;
  };
  // Vazgeç (Seyhun 2026-11-26): kayıt gönderilmeden kapanır
  const cancel = () => {
    const s = st.current;
    if (!s) return;
    s.far = true;
    if (s.mr) stop();
    else s.up = true;
  };
  useEffect(() => () => stop(), []);
  return { rec, done, arm, tap, lvl, sending, begin, end, move, flip, cancel, max };
}

// Mikrofonun ses seviyesi (kayıt düğmesindeki çubuklar): saniyede ~12 kez 0–1 arası; durdurma işlevi döner. Açılamazsa çubuklar kendiliğinden oynar.
function meter(stream, set, tick) {
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
      const v = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      set(v);
      tick?.(v);
    }, 80);
    return () => {
      clearInterval(id);
      ac.close?.().catch(() => {});
    };
  } catch {
    return null;
  }
}
