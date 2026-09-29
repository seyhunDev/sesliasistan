"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useSpeech } from "@/hooks/useSpeech";
import { PERM_LABEL, PERM_NAMES, appAllowed, dismissPrompt, permissionHelp, promptDismissed, setAppAllowed } from "@/lib/permissions";

const ICON = { camera: "camera", microphone: "mic" };
const USE = { camera: "Fiş fotoğrafı çekmek için", microphone: "Konuşarak kullanmak için" };
const BADGE = {
  granted: ["İzin verildi", "bg-emerald-100 text-emerald-800"],
  denied: ["Engelli", "bg-amber-100 text-amber-800"],
  prompt: ["Sorulmadı", "bg-bg text-mut"],
  missing: ["Cihaz yok", "bg-bg text-mut"],
  unsupported: ["Desteklenmiyor", "bg-bg text-mut"],
  error: ["Hata", "bg-amber-100 text-amber-800"],
};

// Açma/kapama anahtarı
function Switch({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-acc" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

// Mikrofon testi: uygulamanın gerçek ses yolunu çalıştırır; yöntemi, seviyeyi, metni ya da hatayı gösterir
function MicTest() {
  const [res, setRes] = useState(null); // { ok, text }
  const sp = useSpeech({ onFinal: (t) => setRes({ ok: true, text: t }), onFail: (m) => setRes({ ok: false, text: m }) });
  const on = sp.status === "listening";
  const how = sp.provider === "webspeech" ? "Tarayıcının ses tanıması (canlı yazı)" : sp.provider === "server" ? "Kayıt + sunucuda çeviri" : "Desteklenmiyor";
  return (
    <div className="mt-2 rounded-lg bg-bg p-2.5 text-[13px]">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (on ? sp.stop("send") : (setRes(null), sp.start({ autoStop: 0 })))}
          disabled={sp.status === "transcribing"}
          className={`rounded-full px-3 py-1.5 text-[13px] font-semibold active:scale-95 disabled:opacity-50 ${on ? "bg-rec text-white" : "border border-line bg-card"}`}
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

// Hesap ekranında: her izin için uygulama içi aç/kapat, tarayıcı izninin durumu,
// engelliyse nasıl açılacağı, kapalıysa tarayıcı iznini tamamen nasıl kaldıracağı
export function PermissionsCard() {
  const toast = useToast();
  const { perms, request } = usePermissions();
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState(() => Object.fromEntries(PERM_NAMES.map((n) => [n, appAllowed(n)])));

  async function ask(names) {
    setBusy(true);
    const r = await request(names);
    setBusy(false);
    const ok = names.every((n) => r[n] === "granted");
    toast(ok ? "İzin verildi, kaydedildi" : "Bazı izinler verilmedi");
  }

  async function toggle(n, on) {
    setAppAllowed(n, on);
    setAllowed((a) => ({ ...a, [n]: on }));
    if (on && perms[n] === "prompt") await ask([n]); // açarken tarayıcı izni hiç sorulmadıysa şimdi sor
    else toast(on ? `${PERM_LABEL[n]} açıldı` : `${PERM_LABEL[n]} uygulamada kapatıldı`);
  }

  return (
    <div className="mt-4 rounded-xl bg-bg p-3.5">
      <b className="text-[15px] font-medium">İzinler</b>
      <ul className="mt-2 space-y-2">
        {PERM_NAMES.map((n) => {
          const st = perms[n];
          const on = allowed[n];
          const [label, cls] = on ? BADGE[st] || ["…", "bg-bg text-mut"] : ["Uygulamada kapalı", "bg-bg text-mut"];
          return (
            <li key={n} className="rounded-xl bg-card px-3 py-2.5 ring-1 ring-line">
              <div className="flex items-center gap-2.5">
                <Icon name={ICON[n]} className={`size-5 ${on ? "text-acc" : "text-mut"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{PERM_LABEL[n]}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-mut">
                    {USE[n]}
                    <span className={`rounded-full px-2 py-px text-[11px] font-semibold ${cls}`}>{label}</span>
                  </p>
                </div>
                <Switch on={on} onChange={(v) => toggle(n, v)} label={`${PERM_LABEL[n]} kullanımı`} />
              </div>
              {on && (st === "prompt" || st === "error") && (
                <button onClick={() => ask([n])} disabled={busy} className="mt-2 rounded-full border border-line px-3 py-1 text-[13px] font-semibold active:scale-95 disabled:opacity-50">
                  Tarayıcıdan izin iste
                </button>
              )}
              {on && st === "denied" && <p className="mt-2 text-[13px] leading-snug text-amber-800">Tarayıcıda engelli. {permissionHelp(n)}</p>}
              {n === "microphone" && on && <MicTest />}
              {!on && st === "granted" && <p className="mt-2 text-[13px] leading-snug text-mut">Uygulama kullanmıyor. Tarayıcı iznini de tamamen kaldırmak için: {permissionHelp(n, true)}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Ana sayfada ilk açılışta bir kez: izinleri baştan alır, kaydeder
export function PermissionPrompt() {
  const { perms, request } = usePermissions();
  const [hidden, setHidden] = useState(() => typeof window === "undefined" || promptDismissed());
  const need = PERM_NAMES.filter((n) => perms[n] === "prompt" && appAllowed(n));
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
    <div className="fade-in relative mt-5 flex w-full max-w-[340px] items-center gap-3 rounded-2xl border border-line bg-card/90 px-4 py-3 text-left backdrop-blur">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-acc">
        <Icon name={need.includes("camera") ? "camera" : "mic"} className="size-[18px]" />
      </span>
      <p className="min-w-0 flex-1 text-[14px] leading-snug">
        {need.length > 1 ? "Fiş için kamera, konuşmak için mikrofon izni ver." : need[0] === "camera" ? "Fiş fotoğrafı için kamera izni ver." : "Konuşmak için mikrofon izni ver."}
      </p>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button onClick={allow} className="rounded-full bg-acc px-3 py-1.5 text-[13px] font-semibold text-white active:scale-95">İzin ver</button>
        <button onClick={close} className="px-1 text-[12px] font-medium text-mut">Sonra</button>
      </div>
    </div>
  );
}
