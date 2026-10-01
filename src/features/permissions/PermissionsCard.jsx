"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { usePermissions } from "@/hooks/usePermissions";
import { useSpeech } from "@/hooks/useSpeech";
import { PERM_NAMES, appAllowed, dismissPrompt, promptDismissed } from "@/lib/permissions";

// Mikrofon testi: uygulamanın gerçek ses yolunu çalıştırır; yöntemi, seviyeyi, metni ya da hatayı gösterir
export function MicTest() {
  const [res, setRes] = useState(null); // { ok, text }
  const sp = useSpeech({ onFinal: (t) => setRes({ ok: true, text: t }), onFail: (m) => setRes({ ok: false, text: m }) });
  const on = sp.status === "listening";
  const how = sp.provider === "webspeech" ? "Tarayıcının ses tanıması (canlı yazı)" : sp.provider === "server" ? "Kayıt + sunucuda çeviri" : "Desteklenmiyor";
  return (
    <div className="mt-2 rounded-lg bg-bg p-2.5 text-[0.8125rem]">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (on ? sp.stop("send") : (setRes(null), sp.start({ autoStop: 0 })))}
          disabled={sp.status === "transcribing"}
          className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold active:scale-95 disabled:opacity-50 ${on ? "bg-rec text-white" : "border border-line bg-card"}`}
        >
          {on ? "Durdur ve çevir" : sp.status === "transcribing" ? "Çevriliyor…" : "Mikrofonu test et"}
        </button>
        {on && (
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-acc transition-[width] duration-100" style={{ width: `${Math.min(100, sp.level * 140)}%` }} />
          </span>
        )}
      </div>
      <p className="mt-1.5 text-mut">Yöntem: {how}{on && sp.provider === "webspeech" && sp.finalText + sp.interim ? ` · “${sp.finalText}${sp.interim}”` : ""}</p>
      {res && <p className={`mt-1 font-medium ${res.ok ? "text-emerald-700" : "text-amber-800"}`}>{res.ok ? `Duyulan: “${res.text}”` : `Hata: ${res.text}`}</p>}
    </div>
  );
}

// Ana sayfada ilk açılışta bir kez: izinleri baştan alır, kaydeder
export function PermissionPrompt() {
  const { perms, request } = usePermissions();
  const [hidden, setHidden] = useState(() => typeof window === "undefined" || promptDismissed());
  const need = PERM_NAMES.filter((n) => (perms[n] === "prompt" || perms[n] === "ask") && appAllowed(n));
  if (hidden || !need.length) return null;

  const close = () => {
    dismissPrompt();
    setHidden(true);
  };
  async function allow() {
    await request(need);
    close();
  }

  return (
    <div className="fade-in relative mt-5 flex w-full max-w-[21.25rem] items-center gap-3 rounded-2xl border border-line bg-card/90 px-4 py-3 text-left backdrop-blur">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-acc">
        <Icon name={need.includes("camera") ? "camera" : "mic"} className="size-[1.125rem]" />
      </span>
      <p className="min-w-0 flex-1 text-[0.875rem] leading-snug">
        {need.length > 1 ? "Fiş için kamera, konuşmak için mikrofon izni ver." : need[0] === "camera" ? "Fiş fotoğrafı için kamera izni ver." : "Konuşmak için mikrofon izni ver."}
      </p>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button onClick={allow} className="rounded-full bg-acc px-3 py-1.5 text-[0.8125rem] font-semibold text-white active:scale-95">İzin ver</button>
        <button onClick={close} className="px-1 text-[0.75rem] font-medium text-mut">Sonra</button>
      </div>
    </div>
  );
}
