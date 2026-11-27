"use client";

import { useState } from "react";
import { liveHead } from "@/features/liveScreen/fonts";
import { useAuth } from "@/features/auth/AuthProvider";
import { dogrulamaGonder, logout } from "@/lib/auth";
import { isVeloraAdmin } from "@/lib/hesapGorunum";

// E-posta doğrulama (2026-11-27, kayıt herkese açılmadan önce): kayıtla açılan hesap (profile.dogrula) e-postasındaki bağlantıya
// dokunana kadar uygulama bu ekranda bekler. Sunucu da doğrulanmamış hesaptan sporcu ve paket isteği almaz (lib/server/dogrula.js).
// Eski hesaplar, sporcu ve çalışan hesapları etkilenmez. Tam ekran, koyu "Sahne" dili (ClubPick ile aynı).
export function DogrulaGate() {
  const { user, profile } = useAuth();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  // user.warm: anında açılış kopyası (doğrulama bilgisi yok); gerçek oturum gelince karar verilir
  if (ok || !user || user.warm || !profile?.dogrula || user.emailVerified || isVeloraAdmin(user.email)) return null;

  const is = async (k, f) => {
    if (busy) return;
    setBusy(k);
    setMsg("");
    try {
      await f();
    } catch {
      setMsg("Olmadı. Biraz sonra tekrar dene.");
    } finally {
      setBusy("");
    }
  };
  const kontrol = () =>
    is("kontrol", async () => {
      await user.reload();
      if (user.emailVerified) {
        await user.getIdToken(true); // sunucu doğrulanmış anahtarı görsün
        setOk(true);
      } else setMsg("Henüz doğrulanmadı. E-postadaki bağlantıya dokun.");
    });
  const gonder = () => is("gonder", async () => (await dogrulamaGonder(user), setMsg("Yeni bağlantı gönderildi.")));

  return (
    <div className={`${liveHead.variable} fixed inset-0 z-[80] flex flex-col bg-[#0b0b0c] text-white`} role="dialog" aria-modal="true" aria-label="E-posta doğrulama">
      <div className="mx-auto flex w-full max-w-[27.5rem] flex-1 flex-col px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
        <h1 className="sahne-t text-[2.5rem] leading-none">
          E-postanı <span className="text-[#d4ff3a]">doğrula</span>
        </h1>
        <p className="mt-4 text-[1rem] leading-relaxed text-[#a1a1aa]">
          <b className="font-semibold text-white">{user.email}</b> adresine bir bağlantı gönderdik. Bağlantıya dokun, sonra buraya dön.
        </p>
        {msg && (
          <p role="status" className="mt-4 text-[0.9375rem] text-[#d4ff3a]">
            {msg}
          </p>
        )}
        <div className="mt-auto space-y-2.5">
          <button type="button" data-press disabled={!!busy} onClick={kontrol} className="h-[3.25rem] w-full rounded-2xl bg-[#d4ff3a] text-[1rem] font-bold text-[#111] active:scale-[.98] disabled:opacity-60">
            {busy === "kontrol" ? "…" : "Doğruladım"}
          </button>
          <button type="button" data-press disabled={!!busy} onClick={gonder} className="h-12 w-full rounded-2xl bg-[#1f1f22] text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-60">
            {busy === "gonder" ? "…" : "Tekrar gönder"}
          </button>
          <button type="button" disabled={!!busy} onClick={() => logout()} className="h-11 w-full text-[0.9375rem] font-semibold text-[#a1a1aa]">
            Çıkış yap
          </button>
        </div>
      </div>
    </div>
  );
}
