"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";

// Kare kod okutma (Kurye ekranı): arka kamera açılır, kod görülünce kamera kapanır ve onCode(yazı) çağrılır.
// Okuyucu (jsQR) yalnız burada, ilk açılışta yüklenir.
export function ScanSheet({ open, onClose, onCode, children }) {
  return (
    <Sheet open={open} onClose={onClose} title="Kare kod okut">
      {open && (children || <Camera onCode={onCode} />)}
    </Sheet>
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
        const [{ default: jsQR }, s] = await Promise.all([
          import("@/lib/vendor/jsQR.cjs"),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
        ]);
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

  if (err) return <p className="py-10 text-center text-[0.9375rem] text-mut">Kamera açılamadı</p>;
  return (
    <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-[1.25rem] bg-[#11203a]">
      <video ref={video} playsInline muted className="size-full object-cover" />
      <span className="pointer-events-none absolute inset-[18%] rounded-3xl border-[3px] border-white/85" aria-hidden="true" />
    </div>
  );
}
