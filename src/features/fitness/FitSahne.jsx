"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { MEDIA_MAX, prepMedia, saveMedia } from "./fitMedia";
import { useFitLib } from "./useFitLib";

// "Sahne" görünümü (Seyhun 2026-11-25, örnek /mnt/project-files/fitness-giris/ornek.html "A · Sahne"): adım adım antrenman
// spor reklamı gibi koyu, görüntü tam ekran, yazılar dev ve dar (Barlow Condensed, liveScreen/fonts), tek vurgu limon sarısı.
// Giriş (SahneIntro): bugünkü antrenmanın adı, süre/hareket/set, hareket şeridi; açılınca sesli okunur (FitGuided söyler).
// Fotoğrafı olmayan hareket: sporcu dev sıra numarasını görür; ana hesap ortada "+" görür (SahneAdd), eklenen dosya hareket
// kütüphanesine yazılır ve bütün programlara/sporculara taşınır (useFitLib.setMedia).
export const LIME = "#d4ff3a";
export const head = "font-[family-name:var(--lv-font-c)] font-extrabold uppercase leading-[.9]";

// Ses ve Otomatik/Elle düğmeleri (Seyhun 2026-11-25): sporcu da her ekranda görür; yazılı, büyük; seçim cihazda hatırlanır
export function SahneToggles({ auto, onMode, quiet, onQuiet }) {
  const pill = "flex h-11 shrink-0 items-center gap-1.5 rounded-full border bg-black/45 px-3 text-[0.9375rem] font-bold backdrop-blur";
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onMode(!auto)} aria-pressed={auto} className={`${pill} ${auto ? "" : "border-white/30 text-white"}`} style={auto ? { borderColor: LIME, color: LIME } : undefined}>
        {auto ? "Otomatik" : "Elle"}
      </button>
      <button type="button" onClick={onQuiet} aria-pressed={!quiet} className={`${pill} ${quiet ? "border-white/30 text-white/80" : "border-white/30 text-white"}`}>
        <Icon name={quiet ? "mute" : "volume"} className="size-5" />
        {quiet ? "Sessiz" : "Ses açık"}
      </button>
    </div>
  );
}

export function SahneIntro({ name, items, sets, min, bg, speaking, onSay, onGo, onClose, toggles }) {
  const total = sets.reduce((t, s) => t + s.length, 0);
  const d = new Date();
  const day = d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div role="dialog" aria-label="Bugünkü antrenman" className="fixed inset-0 z-[54] flex flex-col overflow-hidden bg-[#0c0d0f] text-[#f4f4f2]">
      {bg && <div className="absolute inset-x-0 top-0 h-[62dvh]">{bg}</div>}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,15,.35)_0%,rgba(12,13,15,0)_20%,rgba(12,13,15,.6)_42%,#0c0d0f_62%)]" />
      <button type="button" onClick={onClose} aria-label="Kapat" className="absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
        <Icon name="x" className="size-5" />
      </button>
      {toggles && <div className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10">{toggles}</div>}
      <div className="relative mt-auto flex min-h-0 flex-col px-5">
        <small className="text-[0.75rem] font-bold uppercase tracking-[.14em] text-white/75">{`Bugün · ${day}`}</small>
        <h2 className={`${head} mt-2 text-[3.5rem] [overflow-wrap:anywhere]`}>{name}</h2>
        <div className="mt-4 flex gap-6">
          {[
            [min, "dakika"],
            [items.length, "hareket"],
            [total, "set"],
          ]
            .filter(([v]) => v)
            .map(([v, l]) => (
              <span key={l}>
                <b className={`${head} block text-[2.25rem] tabular-nums`}>{v}</b>
                <small className="text-[0.75rem] font-semibold uppercase tracking-[.06em] text-white/60">{l}</small>
              </span>
            ))}
        </div>
        <button type="button" onClick={onSay} className={`mt-4 flex items-center gap-2.5 self-start rounded-full bg-white/10 py-2 pl-2 pr-4 backdrop-blur ${speaking ? "fit-speak" : ""}`} style={{ color: LIME }}>
          <span className="grid size-8 place-items-center rounded-full text-[#0c0d0f]" style={{ background: LIME }}>
            <Icon name={speaking ? "pause" : "play"} className="size-4" />
          </span>
          <Wave />
          <span className="text-[0.875rem] font-semibold text-white">{speaking ? "Durdur" : "Dinle"}</span>
        </button>
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((it, i) => (
            <span key={i} className="flex w-28 shrink-0 flex-col gap-1.5 rounded-2xl bg-[#1a1c20] p-2.5">
              <i className={`${head} not-italic text-[1.25rem] text-white/35`}>{String(i + 1).padStart(2, "0")}</i>
              <b className="line-clamp-2 min-h-[2.5em] text-[0.875rem] font-semibold leading-tight">{it.name}</b>
              <small className="text-[0.8125rem] font-bold" style={{ color: LIME }}>{lineOf(it, sets[i])}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="relative px-5 pb-[calc(var(--rec-h,0px)+1rem)] pt-4">
        <SahneBtn onClick={onGo}>Devam et</SahneBtn>
      </div>
    </div>
  );
}

// "3 × 10", "3 × 40 sn", "20 dk"
export function lineOf(it, s = []) {
  const n = s.length || +it.sets || 1;
  if (it.kind === "cardio") return `${it.min || ""} dk`;
  if (it.kind === "time") return `${n} × ${it.sec || ""} sn`;
  return `${n} × ${it.reps || ""}${it.repsTo ? `–${it.repsTo}` : ""}`;
}

export function SahneBtn({ children, onClick, ghost = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[3.625rem] w-full items-center justify-center gap-2 rounded-[1.125rem] font-[family-name:var(--lv-font-c)] text-[1.3rem] font-extrabold uppercase tracking-[.03em] transition-transform active:scale-[.98] ${ghost ? "bg-white/12 text-white" : "text-[#0c0d0f]"} ${className}`}
      style={ghost ? undefined : { background: LIME }}
    >
      {children}
    </button>
  );
}

export function Wave() {
  return (
    <span className="fit-wave inline-flex h-[18px] items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className="h-1.5 w-[3px] rounded-full bg-current" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

// Ana hesap: fotoğrafı/videosu olmayan harekette ortada büyük "+" (sporcuya görünmez)
export function SahneAdd({ it, onAdded }) {
  const { profile } = useAuth();
  const { setMedia } = useFitLib();
  const toast = useToast();
  const ref = useRef(null);
  const [busy, setBusy] = useState("");
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile?.orgId) return;
    setBusy("Hazırlanıyor…");
    try {
      const m = await prepMedia(file, (p) => setBusy(`Video küçültülüyor %${Math.round(p * 100)}`));
      setBusy("Yükleniyor…");
      const meta = await saveMedia(profile.orgId, m, (p) => setBusy(`Yükleniyor %${Math.round(p * 100)}`));
      onAdded(meta);
      await setMedia(it, (cur) => ({ yt: cur.yt, media: [...(cur.media || []).filter((x) => x.id !== meta.id), meta].slice(0, MEDIA_MAX) }));
    } catch (x) {
      toast(/storage\//.test(x?.code || "") ? "Yüklenemedi: Firebase Storage açık değil" : x?.message || "Eklenemedi");
    } finally {
      setBusy("");
    }
  };
  return (
    <button
      type="button"
      onClick={() => !busy && ref.current?.click()}
      className="absolute inset-x-4 bottom-28 top-[calc(env(safe-area-inset-top)+4.5rem)] flex flex-col items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-white/30 text-[1rem] font-bold text-white"
    >
      <span className="grid size-[4.75rem] place-items-center rounded-full text-[#0c0d0f]" style={{ background: LIME }}>
        {busy ? <span className="size-7 animate-spin rounded-full border-[3px] border-[#0c0d0f]/25 border-t-[#0c0d0f]" /> : <Icon name="plus" className="size-9 [stroke-width:2.8]" />}
      </span>
      {busy || "Fotoğraf veya video ekle"}
      <input ref={ref} type="file" accept="image/*,video/*" className="hidden" onChange={pick} />
    </button>
  );
}
