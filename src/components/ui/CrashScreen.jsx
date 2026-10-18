"use client";

import { useEffect, useState } from "react";
import { canReload, handleCrash, isChunkError } from "@/lib/crash";

// Sayfa çökünce Next'in İngilizce "This page couldn't load" ekranı yerine çıkan sade Türkçe ekran.
// Girilen veri Firestore'da ve telefonda kayıtlı kalır; Tekrar dene sayfayı yeniden çizer, olmazsa Yenile.
export function CrashScreen({ error, retry, reset, where }) {
  const [reloading] = useState(() => isChunkError(error) && canReload());
  const [open, setOpen] = useState(false);
  useEffect(() => {
    console.error(error);
    handleCrash(error, where);
  }, [error, where]);

  const again = () => (retry || reset)?.();
  const msg = String(error?.message || "").slice(0, 300);

  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-[26.25rem] content-center gap-4 px-5 py-10">
      <h1 className="text-xl font-semibold">{reloading ? "Yeni sürüm yükleniyor…" : "Bu sayfa açılamadı"}</h1>
      {!reloading && (
        <>
          <p className="text-mut">Kayıtlı bilgilerin duruyor. Tekrar dene, düzelmezse sayfayı yenile.</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={again} className="h-12 rounded-xl bg-acc font-semibold text-white active:scale-[.98]">Tekrar dene</button>
            <button onClick={() => location.reload()} className="h-12 rounded-xl border border-line bg-card font-semibold active:scale-[.98]">Yenile</button>
          </div>
          <button onClick={() => (location.href = "/")} className="h-11 text-mut">Ana sayfaya dön</button>
          {msg && (
            <button onClick={() => setOpen((v) => !v)} className="text-left text-sm text-mut">
              Ayrıntı
              {open && <span className="mt-1 block break-words font-mono text-xs">{msg}{error?.digest ? ` · ${error.digest}` : ""}</span>}
            </button>
          )}
        </>
      )}
    </div>
  );
}
