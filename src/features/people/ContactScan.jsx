"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

// Kişi kare kodunu canlı okutma (asistana "kare kod okut" denince; tam ekran asistanın üstünde açılır).
// Olaylar: "sa-contact-scan" açar; kod görülünce "sa-contact-code" (detail: yazı) gönderilir ve kamera kapanır.
// Okuyucu (jsQR) ilk açılışta yüklenir.
export const SCAN_OPEN = "sa-contact-scan";
export const SCAN_CODE = "sa-contact-code";

export function ContactScan() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(SCAN_OPEN, on);
    return () => window.removeEventListener(SCAN_OPEN, on);
  }, []);
  if (!open) return null;
  const done = (text) => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(SCAN_CODE, { detail: text }));
  };
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-[#0b1630] px-4 text-white" role="dialog" aria-label="Kare kod okut">
      <p className="text-[1.0625rem] font-semibold">Kişinin kare kodunu çerçeveye getir</p>
      <Camera onCode={done} />
      <Button variant="secondary" className="max-w-[24rem]" onClick={() => done("")}>Kapat</Button>
    </div>
  );
}

function Camera({ onCode }) {
  const video = useRef(null);
  const [err, setErr] = useState(false);
  const cb = useRef(onCode);
  useEffect(() => {
    cb.current = onCode;
  });
  useEffect(() => {
    let live = true, stream = null, raf = 0, last = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const stop = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    (async () => {
      try {
        const [{ default: jsQR }, s] = await Promise.all([import("@/lib/vendor/jsQR.cjs"), navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })]);
        stream = s;
        if (!live) return stop();
        const v = video.current;
        v.srcObject = s;
        await v.play().catch(() => {});
        const tick = (t) => {
          if (!live) return;
          raf = requestAnimationFrame(tick);
          if (t - last < 200 || v.readyState < 2 || !v.videoWidth) return;
          last = t;
          const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w);
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(v, 0, 0, w, h);
          const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
          if (hit?.data) {
            live = false;
            stop();
            navigator.vibrate?.(60);
            cb.current(hit.data);
          }
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (live) setErr(true);
      }
    })();
    return () => {
      live = false;
      stop();
    };
  }, []);
  if (err) return <p className="py-10 text-center text-[0.9375rem] text-white/70">Kamera açılamadı</p>;
  return (
    <div className="relative aspect-square w-full max-w-[24rem] overflow-hidden rounded-[1.25rem] bg-[#11203a]">
      <video ref={video} playsInline muted className="size-full object-cover" />
      <span className="pointer-events-none absolute inset-[18%] rounded-3xl border-[3px] border-white/85" aria-hidden="true" />
    </div>
  );
}
