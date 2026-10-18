"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { recType } from "@/features/fitness/fitMedia";
import { useTimerRun } from "@/features/training/Countdown";
import { mmss } from "@/lib/raceScore";
import { drawStamp } from "./stamp";

// Uygulama içi kamera (Seyhun 2026-10-18: telefonun kamerası açılınca uygulama arkaya geçiyor, start bipleri susuyordu).
// Sayfa önde kaldığı için sayaç ve bipleri sürer; üstte sayaç görünür. Fotoğraf 1600 px JPEG; video sessiz, 960 px, ~1,6 Mbit/sn,
// en çok 2 dakika (doğrudan küçük kaydedilir, sonradan küçültme yok). Sayaç sürerken çekilenin üstüne an yazılır (stampFor).
// Kamera açılamazsa onFail: çağıran telefonun kendi kamerasına düşer. Çekilen her kare onShot ile hemen verilir, kamera açık kalır;
// last: köşedeki son çekilen ve yükleme durumu (yükleniyor / yüklenemedi: telefonda saklandı, dokununca sebebi).
const MAX_SEC = 120;

export function CameraSheet({ open, mode, onMode, onClose, onShot, onFail, stampFor, pending = 0, last = null }) {
  if (!open) return null;
  return createPortal(<Cam mode={mode} onMode={onMode} onClose={onClose} onShot={onShot} onFail={onFail} stampFor={stampFor} pending={pending} last={last} />, document.body);
}

function Cam({ mode, onMode, onClose, onShot, onFail, stampFor, pending, last }) {
  const vid = useRef(null);
  const stream = useRef(null);
  const rec = useRef(null); // { r, raf, stop }
  const fns = useRef({ onShot, onFail, stampFor });
  const [ready, setReady] = useState(false);
  const [recAt, setRecAt] = useState(0);
  const [recNow, setRecNow] = useState(0);
  const [flash, setFlash] = useState(false);
  const timer = useTimerRun();
  useEffect(() => {
    fns.current = { onShot, onFail, stampFor };
  }, [onShot, onFail, stampFor]);

  useEffect(() => {
    let off = false;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      fns.current.onFail(new Error("Kamera açılamadı"));
      return;
    }
    md.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }).then(
      (s) => {
        if (off) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
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
    const [w, h] = size(1600);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, w, h);
    const at = new Date().toISOString();
    drawStamp(ctx, w, h, fns.current.stampFor(at));
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    c.toBlob((b) => b && fns.current.onShot({ blob: b, type: "image/jpeg", kind: "photo", at }), "image/jpeg", 0.8);
  };
  const start = () => {
    const v = vid.current;
    const type = recType();
    const c = document.createElement("canvas");
    if (!v?.videoWidth || !type || !c.captureStream) return fns.current.onFail(new Error("Bu telefonda uygulama içinde video çekilemiyor"));
    const [w, h] = size(960);
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const at = new Date().toISOString();
    let raf = 0;
    const draw = () => {
      ctx.drawImage(v, 0, 0, w, h);
      drawStamp(ctx, w, h, fns.current.stampFor(new Date().toISOString()));
      raf = requestAnimationFrame(draw);
    };
    draw();
    const r = new MediaRecorder(c.captureStream(30), { mimeType: type, videoBitsPerSecond: 1_600_000 });
    const parts = [];
    r.ondataavailable = (e) => e.data?.size && parts.push(e.data);
    r.onstop = () => {
      cancelAnimationFrame(raf);
      const blob = new Blob(parts, { type: type.split(";")[0] });
      if (blob.size) fns.current.onShot({ blob, type: blob.type, kind: "video", at });
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
  const left = t.up ? Math.floor((t.now - t.t.end) / 1000) : Math.max(0, t.rem);
  const hot = t.running && !t.up && t.rem <= 10;
  const recSec = recAt ? Math.floor((recNow - recAt) / 1000) : 0;

  const close = () => (stop(), onClose());
  const info = (t.running || recAt) && (
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
  const status = last?.state === "err" ? `Yüklenemedi, telefonda saklandı. ${last.err || ""}` : !ready ? "Kamera açılıyor…" : pending ? `Kaydediliyor · ${pending}` : "";
  const modes = !recAt && (
    <div className="flex justify-center gap-6 text-[0.8125rem] font-semibold tracking-wide landscape:flex-col landscape:gap-4">
      {[["video", "VİDEO"], ["photo", "FOTOĞRAF"]].map(([k, l]) => (
        <button key={k} type="button" onClick={() => onMode(k)} aria-pressed={mode === k} className={`py-1 ${mode === k ? "text-[#FFD60A]" : "text-white"}`}>
          {l}
        </button>
      ))}
    </div>
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

  // iPhone kamerası gibi: dikte üst ve alt siyah şerit, altta solda Bitti, ortada deklanşör, sağda son çekilen; üstünde VİDEO · FOTOĞRAF.
  // Yan çevrilince şerit sağa geçer (deklanşör ortada), sayaç görüntünün sol üstünde.
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white landscape:flex-row">
      <div className="flex h-[calc(3.25rem+env(safe-area-inset-top))] shrink-0 items-end justify-center pb-2 landscape:hidden">{info}</div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={vid} muted playsInline autoPlay className="absolute inset-0 size-full object-cover" />
        {flash && <div className="pointer-events-none absolute inset-0 bg-black/60" />}
        <div className="absolute left-[calc(0.75rem+env(safe-area-inset-left))] top-3 portrait:hidden">{info}</div>
        {status && <p className={`absolute inset-x-3 bottom-3 mx-auto w-fit max-w-full rounded-lg px-3 py-1.5 text-center text-[0.8125rem] ${last?.state === "err" ? "bg-[#FF3B30]" : "bg-black/50"}`}>{status}</p>}
      </div>
      <div className="shrink-0 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 landscape:flex landscape:w-[7.5rem] landscape:flex-col landscape:items-center landscape:justify-between landscape:px-2 landscape:py-[calc(1rem+env(safe-area-inset-top))] landscape:pr-[calc(0.5rem+env(safe-area-inset-right))]">
        <div className="portrait:hidden">{thumb}</div>
        <div className="landscape:flex landscape:flex-col landscape:items-center landscape:gap-4">
          {modes}
          <div className="mt-3 grid grid-cols-3 items-center landscape:mt-0 landscape:block">
            <div className="landscape:hidden">{done}</div>
            <div className="flex justify-center">{shut}</div>
            <div className="flex justify-end landscape:hidden">{thumb}</div>
          </div>
        </div>
        <div className="portrait:hidden">{done}</div>
      </div>
    </div>
  );
}
