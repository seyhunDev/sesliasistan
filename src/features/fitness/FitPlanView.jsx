"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { RemindChips } from "@/features/add/DraftCard";
import { addDays, dowOf } from "@/lib/fitness/model";
import { rel, todayStr } from "@/lib/utils/format";
import { FitWorkout } from "./FitWorkout";
import { DOW } from "./FitDark";

// Fitness antrenmanının kendi ekranı (Seyhun 2026-11-25, örnek project-files/fitness-sade/antrenman.html): Plan sayfası yerine açılır.
// Lacivert üstte zaman düğmesi ("Bugün · 19:00", dokununca Ne zaman penceresi), ad ve hareket · set · dakika; altında hareketler (FitWorkout bare).
// "Antrenmana başla" listenin altında sabit, hiçbir şeyin üstüne binmez. iPad yatayda solda lacivert sütun (Başla orada), sağda hareketler.
const LAND = "(min-width: 48rem) and (orientation: landscape)";
const sub = (cb) => {
  const m = window.matchMedia(LAND);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useLand = () => useSyncExternalStore(sub, () => window.matchMedia(LAND).matches, () => false);

export function FitPlanView({ rec, by, onClose, onDelete }) {
  const land = useLand();
  const router = useRouter();
  const [dockL, setDockL] = useState(null);
  const [dockB, setDockB] = useState(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [more, setMore] = useState(false);
  const fit = rec.fit || { items: [] };
  const items = fit.items || [];
  const sets = items.reduce((t, it) => t + (+it.sets || 1), 0);
  const name = fit.name || String(rec.title || "").replace(/^Fitness · /, "") || "Antrenman";
  const whenText = `${rel(rec.date)}${rec.time ? ` · ${rec.time}` : ""}`;
  const facts = [
    [items.length, "hareket"],
    [sets, "set"],
    rec.durationMin ? [`~${rec.durationMin}`, "dakika"] : null,
  ].filter(Boolean);

  const top = (
    <>
      <div className="flex items-center gap-2.5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Kapat" data-press className="btn btn-round size-10">
          <Icon name="back" className="size-5" />
        </button>
        <span className="flex-1" />
        <button type="button" onClick={() => setMore(true)} aria-label="Diğer" data-press className="btn btn-round size-10">
          <Icon name="more" className="size-5" />
        </button>
      </div>
      <button type="button" onClick={() => setWhenOpen(true)} data-press className="inline-flex h-9 items-center gap-2 rounded-full bg-white/12 px-3.5 text-[0.9375rem] font-semibold">
        <Icon name="clock" className="size-4 text-[#8fb3ff]" />
        {whenText}
      </button>
      <h1 className="mt-3 text-[2.125rem] font-bold leading-[1.08] tracking-[-.025em] [text-wrap:balance]">{name}</h1>
      {items.length > 0 && (
        <div className="mt-3.5 flex gap-6">
          {facts.map(([v, l]) => (
            <span key={l} className="grid">
              <b className="num text-[1.75rem] font-bold leading-none">{v}</b>
              <small className="mt-1 text-[0.875rem] font-medium text-white/70">{l}</small>
            </span>
          ))}
        </div>
      )}
    </>
  );

  const workout = <FitWorkout key={`fit-${rec.id}-${fit.res?.st || ""}-${items.length}`} rec={rec} by={by} bare dock={land ? dockL : dockB} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tek ağaç: döndürünce yalnız sınıflar değişir, FitWorkout (açık adım adım ekran, sayaç) yeniden kurulmaz */}
      <div data-scroll={land ? undefined : ""} className={land ? "grid min-h-0 flex-1 grid-cols-[22rem_minmax(0,1fr)]" : "min-h-0 flex-1 overflow-y-auto overscroll-contain"}>
        <div className={land ? "ck flex min-h-0 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]" : "ck px-5 pb-11"}>
          {top}
          {land && <div ref={setDockL} className="mt-auto pt-6" />}
        </div>
        <div data-scroll={land ? "" : undefined} className={land ? "min-h-0 overflow-y-auto overscroll-contain px-5 pb-8 pt-[calc(1rem+env(safe-area-inset-top))]" : "relative -mt-7 rounded-t-[1.75rem] bg-bg px-4 pb-6 pt-2"}>
          <div className={land ? "" : "mx-auto max-w-[40rem]"}>{workout}</div>
        </div>
      </div>
      {!land && <div ref={setDockB} className="shrink-0 bg-bg px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] empty:hidden" />}

      <WhenSheet open={whenOpen} rec={rec} by={by} onClose={() => setWhenOpen(false)} />
      <Sheet top open={more} onClose={() => setMore(false)} title={name}>
        <div className="grid gap-2">
          <button type="button" onClick={() => (setMore(false), onClose(), router.push(fit.for ? "/fitness" : "/fitness?tab=me"))} data-press className="btn btn-secondary w-full">
            {"Fitness'ta aç"}
          </button>
          <button type="button" onClick={() => (setMore(false), onDelete())} data-press className="btn btn-danger w-full">
            Antrenmanı sil
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// Ne zaman: haftanın günleri (önceki ve sonraki hafta oklarla), saat, hatırlatma. Kaydet planı günceller.
function WhenSheet({ open, rec, by, onClose }) {
  const { updateRecord } = useData();
  const toast = useToast();
  const [date, setDate] = useState(rec.date);
  const [time, setTime] = useState(rec.time || "");
  const [remind, setRemind] = useState(rec.remind ?? null);
  const [wk, setWk] = useState(() => addDays(rec.date || todayStr(), 1 - dowOf(rec.date || todayStr())));
  const today = todayStr();
  const reset = () => {
    setDate(rec.date);
    setTime(rec.time || "");
    setRemind(rec.remind ?? null);
    setWk(addDays(rec.date || today, 1 - dowOf(rec.date || today)));
  };
  const close = () => {
    reset();
    onClose();
  };
  const dirty = date !== rec.date || time !== (rec.time || "") || remind !== (rec.remind ?? null);
  const save = () => {
    updateRecord("plan", rec.id, { date, time, allDay: !time, remind }, by);
    toast("Kaydedildi");
    onClose();
  };
  return (
    <Sheet top open={open} onClose={close} title="Ne zaman" dirty={dirty} footer={<SheetActions onCancel={close} onYes={save} disabled={!dirty || !date} />}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setWk(addDays(wk, -7))} aria-label="Önceki hafta" data-press className="btn btn-round size-9 shrink-0">
          <Icon name="back" className="size-4" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {DOW.map((dn, i) => {
            const d = addDays(wk, i);
            const on = d === date;
            return (
              <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={on} className="flex flex-col items-center gap-1">
                <small className={`text-[0.75rem] ${d === today ? "font-bold text-acc" : "text-mut"}`}>{dn}</small>
                <span className={`num grid h-11 w-full place-items-center rounded-xl text-[1rem] font-semibold ${on ? "bg-acc text-white" : "bg-card ring-1 ring-line"}`}>{+d.slice(8)}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setWk(addDays(wk, 7))} aria-label="Sonraki hafta" data-press className="btn btn-round size-9 shrink-0">
          <Icon name="chev" className="size-4" />
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-line bg-card">
        <label className="flex min-h-[3.5rem] items-center justify-between gap-3 px-4">
          <span className="text-[1.0625rem] font-medium">Saat</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="num h-10 rounded-lg bg-bg px-2 text-[1.0625rem] font-semibold outline-none" />
        </label>
        <div className="border-t border-line px-4 py-3">
          <span className="mb-2 block text-[1.0625rem] font-medium">Hatırlat</span>
          <RemindChips value={remind} onPick={setRemind} />
        </div>
      </div>
    </Sheet>
  );
}
