"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { recType } from "@/features/fitness/fitMedia";
import { useTimerRun } from "@/features/training/Countdown";
import { upSec } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";

// Uygulama içi kamera (Seyhun 2026-10-18: telefonun kamerası açılınca uygulama arkaya geçiyor, start bipleri susuyordu).
// Sayfa önde kaldığı için sayaç ve bipleri sürer; üstte sayaç görünür. Fotoğraf 1600 px JPEG; video sessiz, 960 px, ~1,6 Mbit/sn,
// en çok 2 dakika (doğrudan küçük kaydedilir, sonradan küçültme yok). Görüntünün üstüne yazı basılmaz (Seyhun 2026-10-20: "çok yazı olmasın").
// Kamera açılamazsa onFail: çağıran telefonun kendi kamerasına düşer. Çekilen her kare onShot ile hemen verilir, kamera açık kalır;
// last: köşedeki son çekilen ve yükleme durumu (yükleniyor / yüklenemedi: telefonda saklandı, dokununca sebebi).
// Sayaç yalnız görünür (Seyhun 2026-10-21: "çekerken süreyi durdurma ve bitirme gösterilmemeli"); yönetimi Süre ekranında.
const MAX_SEC = 120;

export function CameraSheet({ open, ...props }) {
  if (!open) return null;
  return createPortal(<Cam {...props} />, document.body);
}

// Video kalitesi (Seyhun 2026-10-22: "çok kalitesiz çekiyormuş gibi"): Yüksek 1080p (varsayılan), Normal 720p. 2 dakikalık video
// Yüksek'te ≈ 50 MB, Normal'de ≈ 30 MB (Storage 60 MB sınırı ve 5 GB kota). Seçim bu telefonda hatırlanır.
const QUAL = { hi: { px: 1920, bps: 3_400_000, label: "Yüksek" }, lo: { px: 1280, bps: 2_000_000, label: "Normal" } };
const QKEY = "sa-cam-q";
const readQ = () => {
  try {
    return localStorage.getItem(QKEY) === "lo" ? "lo" : "hi";
  } catch {
    return "hi";
  }
};

function Cam({ mode, onMode, onClose, onShot, onFail, last = null }) {
  const vid = useRef(null);
  const stream = useRef(null);
  const rec = useRef(null); // { r, raf, stop }
  const fns = useRef({ onShot, onFail });
  const [ready, setReady] = useState(false);
  const [recAt, setRecAt] = useState(0);
  const [recNow, setRecNow] = useState(0);
  const [flash, setFlash] = useState(false);
  const [q, setQ] = useState(readQ);
  const pickQ = () => {
    const n = q === "hi" ? "lo" : "hi";
    setQ(n);
    try {
      localStorage.setItem(QKEY, n);
    } catch {}
  };
  // Yakınlaştırma (Seyhun 2026-10-22): iki parmakla ya da "1×" düğmesiyle. Telefon destekliyorsa kameranın kendi zoom'u (tele lens dahil),
  // yoksa görüntünün ortası kırpılır (çekilen fotoğraf/video da aynı kırpılır)
  const [zoom, setZoom] = useState(1);
  const [hwZoom, setHwZoom] = useState(false);
  const zr = useRef({ z: 1, hw: null, pinch: null });
  const zMax = () => Math.min(5, zr.current.hw?.max || 5);
  const setZ = (z) => {
    const n = Math.round(Math.max(1, Math.min(zMax(), z)) * 10) / 10;
    zr.current.z = n;
    setZoom(n);
    const tr = stream.current?.getVideoTracks?.()[0];
    if (zr.current.hw && tr) tr.applyConstraints({ advanced: [{ zoom: Math.max(zr.current.hw.min || 1, n) }] }).catch(() => {});
  };
  // Videodan alınacak bölge: kendi zoom'u varsa bütün kare, yoksa ortadaki 1/z
  const crop = (v) => {
    const z = zr.current.hw ? 1 : zr.current.z;
    const sw = v.videoWidth / z;
    const sh = v.videoHeight / z;
    return [(v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh];
  };
  const touch = {
    onTouchStart: (e) => {
      if (e.touches.length !== 2) return;
      const [a, b] = e.touches;
      zr.current.pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zr.current.z };
    },
    onTouchMove: (e) => {
      const p = zr.current.pinch;
      if (!p || e.touches.length !== 2) return;
      const [a, b] = e.touches;
      setZ((p.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) / p.d);
    },
    onTouchEnd: (e) => e.touches.length < 2 && (zr.current.pinch = null),
  };
  const zStep = () => setZ(zoom < 1.95 ? 2 : zoom < 2.95 && zMax() >= 3 ? 3 : 1);
  const timer = useTimerRun();
  useEffect(() => {
    fns.current = { onShot, onFail };
  }, [onShot, onFail]);

  useEffect(() => {
    let off = false;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      fns.current.onFail(new Error("Kamera açılamadı"));
      return;
    }
    // Ses de kaydedilir (Seyhun 2026-10-22: çekilen videoda ses yoktu); mikrofon izni verilmezse yalnız görüntü
    const video = { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } };
    md.getUserMedia({ video, audio: true }).catch(() => md.getUserMedia({ video, audio: false })).then(
      (s) => {
        if (off) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        try {
          const cap = s.getVideoTracks()[0]?.getCapabilities?.().zoom;
          if (cap?.max > 1) (zr.current.hw = cap), setHwZoom(true);
        } catch {}
        const v = vid.current;
        v.srcObject = s;
        v.play().then(() => !off && setReady(true), () => !off && setReady(true));
      },
      (e) => !off && fns.current.onFail(e),
    );
    return () => {
      off = true;
      if (rec.current) rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Kayıt süresi (2 dakikada kendiliğinden durur)
  useEffect(() => {
    if (!recAt) return;
    const id = setInterval(() => setRecNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [recAt]);

  const size = (max) => {
    const v = vid.current;
    const sc = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    return [Math.round(v.videoWidth * sc), Math.round(v.videoHeight * sc)];
  };
  const photo = () => {
    const v = vid.current;
    if (!v?.videoWidth) return;
    const [w, h] = size(2048);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, ...crop(v), 0, 0, w, h);
    const at = new Date().toISOString(); // fotoğrafa yazı Kaydet'te basılır (yarışı ve anı değiştirilebilsin)
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    c.toBlob((b) => b && fns.current.onShot({ blob: b, type: "image/jpeg", kind: "photo", at }), "image/jpeg", 0.85);
  };
  const start = () => {
    if (rec.current) return; // hızlı çift dokunuş iki kayıt başlatmasın (Seyhun 2026-10-22: "aynı videodan iki kayıt")
    const v = vid.current;
    const type = recType();
    const c = document.createElement("canvas");
    if (!v?.videoWidth || !type || !c.captureStream) return fns.current.onFail(new Error("Bu telefonda uygulama içinde video çekilemiyor"));
    const [w, h] = size(QUAL[q].px);
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const at = new Date().toISOString();
    let raf = 0;
    // Kayıt sürerken telefon çevrilirse görüntü ezilmez: kareye sığdırılır, boşluk siyah
    const draw = () => {
      const [sx, sy, sw, sh] = crop(v);
      const sc = Math.min(w / (sw || w), h / (sh || h));
      const dw = Math.round((sw || w) * sc);
      const dh = Math.round((sh || h) * sc);
      if (dw !== w || dh !== h) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(v, sx, sy, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
      raf = requestAnimationFrame(draw);
    };
    draw();
    const out = new MediaStream([...c.captureStream(30).getVideoTracks(), ...(stream.current?.getAudioTracks() || [])]);
    const r = new MediaRecorder(out, { mimeType: type, videoBitsPerSecond: QUAL[q].bps, audioBitsPerSecond: 96_000 });
    const parts = [];
    r.ondataavailable = (e) => e.data?.size && parts.push(e.data);
    r.onstop = () => {
      cancelAnimationFrame(raf);
      const blob = new Blob(parts, { type: type.split(";")[0] });
      if (blob.size) fns.current.onShot({ blob, type: blob.type, kind: "video", at, dur: Math.round((Date.now() - Date.parse(at)) / 1000) });
    };
    const cut = setTimeout(() => stop(), MAX_SEC * 1000);
    rec.current = {
      stop: () => {
        clearTimeout(cut);
        rec.current = null;
        if (r.state !== "inactive") r.stop();
      },
    };
    r.start(1000);
    setRecAt(Date.parse(at));
    setRecNow(Date.parse(at));
  };
  const stop = () => {
    rec.current?.stop();
    setRecAt(0);
  };
  const shutter = () => (mode === "photo" ? photo() : recAt ? stop() : start());

  const t = timer;
  const left = t.up ? upSec(t.t.end, t.now) : Math.max(0, t.rem);
  const hot = t.running && !t.up && t.rem <= 10;
  const recSec = recAt ? Math.floor((recNow - recAt) / 1000) : 0;

  const close = () => (stop(), onClose());
  const info = (t.running || recAt > 0) && (
    <div className="flex items-center gap-2">
      {t.running && (
        <span className={`rounded-lg px-2.5 py-1 text-[1.0625rem] font-semibold tabular-nums ${hot ? "bg-rec" : "bg-black/50"}`}>
          {t.up ? "Startan beri " : "Start "}
          {mmss(left)}
        </span>
      )}
      {recAt > 0 && <span className="rounded-lg bg-rec px-2.5 py-1 text-[1.0625rem] font-semibold tabular-nums">{mmss(recSec)}</span>}
    </div>
  );
  // Yalnız hata yazılır (kaydediliyor bilgisi köşedeki son çekilende dönen çember)
  const status = last?.state === "err" ? "Yüklenemedi, telefonda saklandı" : "";
  const modes = !recAt && (
    <div className="flex justify-center gap-6 text-[0.8125rem] font-semibold tracking-wide landscape:flex-col landscape:gap-4">
      {[["video", "VİDEO"], ["photo", "FOTOĞRAF"]].map(([k, l]) => (
        <button key={k} type="button" onClick={() => onMode(k)} aria-pressed={mode === k} className={`py-1 ${mode === k ? "text-[#FFD60A]" : "text-white"}`}>
          {l}
        </button>
      ))}
    </div>
  );
  const zBtn = (
    <button type="button" onClick={zStep} aria-label="Yakınlaştır" className="grid size-9 place-items-center rounded-full bg-black/50 text-[0.75rem] font-semibold tabular-nums text-[#FFD60A]">
      {`${String(zoom).replace(".", ",")}×`}
    </button>
  );
  const shut = (
    <button
      type="button"
      disabled={!ready}
      onClick={shutter}
      aria-label={mode === "photo" ? "Fotoğraf çek" : recAt ? "Kaydı durdur" : "Video çek"}
      className="grid size-[4.5rem] shrink-0 place-items-center rounded-full border-[3px] border-white active:scale-95 disabled:opacity-50"
    >
      <span className={`block transition-all duration-200 ${mode === "photo" ? "size-[3.6rem] rounded-full bg-white active:bg-white/70" : recAt ? "size-7 rounded-md bg-[#FF3B30]" : "size-[3.6rem] rounded-full bg-[#FF3B30]"}`} />
    </button>
  );
  const thumb = (
    <button type="button" onClick={() => last?.state === "err" && alert(last.err)} aria-label="Son çekilen" className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-white/40 bg-white/10">
      {last?.url &&
        (last.kind === "video" ? (
          <video src={`${last.url}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={last.url} alt="" className="size-full object-cover" />
        ))}
      {last?.state === "up" && <span className="absolute inset-0 grid place-items-center bg-black/40"><span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" /></span>}
      {last?.state === "err" && <span className="absolute inset-0 grid place-items-center bg-black/50 text-[1.25rem] font-bold text-[#FF3B30]">!</span>}
    </button>
  );
  const done = (
    <button type="button" onClick={close} className="h-11 shrink-0 px-1 text-[1.0625rem] text-white">
      Bitti
    </button>
  );

  // iPhone kamerası gibi: görüntü her zaman bütün ekranı kaplar, düğmeler üstünde durur (Seyhun 2026-10-20: yan çevirince önce küçülüp
  // sonra büyüyordu; düğmeler kenara yapışıktı). Dikte altta Bitti · deklanşör · son çekilen, üstünde VİDEO · FOTOĞRAF; yan çevrilince
  // sağda dikey şerit (çentik payı kadar geniş, içi ortalı), sayaç sol üstte.
  const safeX = "pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]";
  return (
    <div data-cam {...touch} className="fixed inset-0 z-[80] touch-none overflow-hidden bg-black text-white">
      <video ref={vid} muted playsInline autoPlay style={hwZoom || zoom === 1 ? undefined : { transform: `scale(${zoom})` }} className="absolute inset-0 size-full object-cover" />
      {flash && <div className="pointer-events-none absolute inset-0 bg-black/60" />}
      <div className={`absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent pb-6 pt-[calc(0.5rem+env(safe-area-inset-top))] ${safeX} landscape:right-[calc(6.5rem+env(safe-area-inset-right))] landscape:justify-start`}>
        <div className="min-w-0">{info}</div>
        {mode === "video" && !recAt && (
          <button type="button" onClick={pickQ} aria-label={`Video kalitesi: ${QUAL[q].label}`} className="ml-auto h-8 shrink-0 rounded-full bg-black/50 px-3 text-[0.8125rem] font-semibold">
            {q === "hi" ? "1080p" : "720p"}
          </button>
        )}
      </div>
      {status && (
        <p className="absolute inset-x-3 bottom-[calc(10rem+env(safe-area-inset-bottom))] mx-auto w-fit max-w-full rounded-lg bg-[#FF3B30] px-3 py-1.5 text-center text-[0.8125rem] landscape:bottom-4 landscape:right-[calc(6.5rem+env(safe-area-inset-right))]">
          {status}
        </p>
      )}
      <div className={`absolute inset-x-0 bottom-0 bg-black/45 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 ${safeX} landscape:hidden`}>
        <div className="-mt-14 mb-5 flex justify-center">{zBtn}</div>
        {modes}
        <div className="mt-3 grid grid-cols-3 items-center">
          <div>{done}</div>
          <div className="flex justify-center">{shut}</div>
          <div className="flex justify-end">{thumb}</div>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 hidden w-[calc(6.5rem+env(safe-area-inset-right))] flex-col items-center justify-between bg-black/45 pr-[env(safe-area-inset-right)] py-[calc(1rem+env(safe-area-inset-bottom))] landscape:flex">
        {thumb}
        <div className="flex flex-col items-center gap-4">
          {zBtn}
          {modes}
          {shut}
        </div>
        {done}
      </div>
    </div>
  );
}
