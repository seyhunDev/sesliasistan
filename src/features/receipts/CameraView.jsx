"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { openCamera } from "@/lib/permissions";
import { Loader } from "@/components/ui/Loader";

// Uygulama içi canlı kamera: sesli komutla ("fiş yükle") ve bilgisayarda kullanılır.
// Dokunma gerektirmediği için yapay zeka beklemeden hemen açılabilir.
export function CameraView({ onShot, onError, onGallery, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cb = useRef({});
  cb.current = { onError };
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let dead = false;
    openCamera()
      .then((s) => {
        if (dead) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        const v = videoRef.current;
        v.srcObject = s;
        v.play().catch(() => {});
      })
      .catch((e) => !dead && cb.current.onError?.(e));
    return () => {
      dead = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function shoot() {
    const v = videoRef.current;
    if (!ready || !v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    setFlash(true);
    navigator.vibrate?.(12);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (blob) onShot(blob);
    else cb.current.onError?.(new Error("Fotoğraf alınamadı"));
  }

  return (
    <div className="fade-in flex min-h-full flex-col items-center py-2">
      <div className="relative w-full overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => setReady(true)}
          className="h-[62vh] max-h-[40rem] w-full object-contain"
        />
        {/* Fişi hizalama çerçevesi */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] inset-y-[6%] rounded-xl border-2 border-dashed border-white/60" />
        {!ready && (
          <span className="absolute inset-0 grid place-items-center text-white/80">
            <Loader size="lg" className="text-white/80" />
          </span>
        )}
        {flash && <span aria-hidden="true" className="absolute inset-0 bg-white/70" />}
      </div>
      <p className="mt-3 text-[0.875rem] text-mut">Fişi çerçeveye sığdır, düz tut</p>

      <div className="mt-4 flex w-full max-w-[20rem] items-center justify-between">
        <button onClick={onGallery} aria-label="Galeriden seç" className="grid size-12 place-items-center rounded-full border border-line bg-card text-mut active:scale-90">
          <Icon name="image" className="size-5" />
        </button>
        <button
          onClick={shoot}
          disabled={!ready}
          aria-label="Fotoğraf çek"
          className="grid size-[4.5rem] place-items-center rounded-full bg-acc text-white shadow-lg ring-4 ring-acc/25 transition active:scale-90 disabled:opacity-50"
        >
          <Icon name="camera" className="size-7" />
        </button>
        <button onClick={onCancel} aria-label="Vazgeç" className="grid size-12 place-items-center rounded-full border border-line bg-card text-mut active:scale-90">
          <Icon name="x" className="size-5" />
        </button>
      </div>
    </div>
  );
}
