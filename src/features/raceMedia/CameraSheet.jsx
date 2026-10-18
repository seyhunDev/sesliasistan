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
// Kamera açılamazsa onFail: çağıran telefonun kendi kamerasına düşer. Çekilen her kare onShot ile hemen verilir, kamera açık kalır.
const MAX_SEC = 120;

export function CameraSheet({ open, mode, onMode, onClose, onShot, onFail, stampFor, pending = 0 }) {
  if (!open) return null;
  return createPortal(<Cam mode={mode} onMode={onMode} onClose={onClose} onShot={onShot} onFail={onFail} stampFor={stampFor} pending={pending} />, document.body);
}

function Cam({ mode, onMode, onClose, onShot, onFail, stampFor, pending }) {
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

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white">
      <video ref={vid} muted playsInline autoPlay className="absolute inset-0 size-full object-cover" />
      {flash && <div className="pointer-events-none absolute inset-0 bg-white/50" />}
      <div className="relative flex items-start justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button type="button" onClick={() => (stop(), onClose())} className="h-11 rounded-full bg-black/45 px-4 text-[1rem] font-semibold">
          Kapat
        </button>
        {t.running && (
          <div className={`rounded-2xl px-4 py-1.5 text-right ${hot ? "bg-rec" : "bg-black/45"}`}>
            <small className="block text-[0.75rem] opacity-80">{t.up ? "Startan beri" : "Start"}</small>
            <b className="text-[1.75rem] font-semibold leading-none tabular-nums">{mmss(left)}</b>
          </div>
        )}
      </div>
      <div className="relative mt-auto px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <p className="mb-3 h-5 text-center text-[0.875rem]">
          {recAt ? `${mmss(recSec)} / ${mmss(MAX_SEC)}` : !ready ? "Kamera açılıyor…" : pending ? `Kaydediliyor · ${pending}` : ""}
        </p>
        <div className="grid grid-cols-3 items-center">
          <span />
          <button
            type="button"
            disabled={!ready}
            onClick={shutter}
            aria-label={mode === "photo" ? "Fotoğraf çek" : recAt ? "Kaydı durdur" : "Video çek"}
            className="mx-auto grid size-[4.75rem] place-items-center rounded-full border-4 border-white active:scale-95 disabled:opacity-50"
          >
            <span className={`block transition-all ${mode === "photo" ? "size-[3.75rem] rounded-full bg-white" : recAt ? "size-7 rounded-md bg-rec" : "size-[3.75rem] rounded-full bg-rec"}`} />
          </button>
          <span />
        </div>
        {!recAt && (
          <div className="mx-auto mt-4 flex w-fit gap-1 rounded-full bg-black/45 p-1">
            {[["photo", "Fotoğraf"], ["video", "Video"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => onMode(k)} aria-pressed={mode === k} className={`h-9 rounded-full px-4 text-[0.9375rem] font-semibold ${mode === k ? "bg-white text-black" : ""}`}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
