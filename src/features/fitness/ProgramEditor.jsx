"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { exById } from "@/lib/fitness/exercises";
import { DOWS, DOW_LONG, cleanItem, itemLine } from "@/lib/fitness/model";
import { ExercisePicker } from "./ExercisePicker";

// Program düzenleme (yapay zekanın hazırladığı önizleme ya da kayıtlı program). Üstte özet (ad, gün/hafta, dakika, hafta,
// başlangıç), altında haftanın günleri şeridi: antrenman günü dokununca açılır, boş güne dokununca o güne antrenman eklenir.
// Seçili günün hareketleri kart kart; dokununca − / + ile set, tekrar/süre, kilo, dinlenme, sıralama, çıkarma.
// Değişiklik sesle de söylenir (alttaki asistan).
const n = (v) => (v === "" || v == null ? 0 : +String(v).replace(",", ".") || 0);
const GROUP_ICON = { Kardiyo: "flame", Esneme: "wind", Karın: "zap", "Tüm vücut": "spark", Bacak: "trend", Kalça: "trend" };
const iconOf = (it) => (it.kind === "cardio" ? "flame" : GROUP_ICON[exById(it.ex)?.group] || "dumbbell");
const setsOf = (items = []) => items.reduce((s, it) => s + (it.kind === "cardio" ? 0 : n(it.sets)), 0);
const groupsOf = (items = []) => [...new Set(items.map((it) => exById(it.ex)?.group).filter((g) => g && g !== "Esneme"))];

function Step({ label, value, onChange, step = 1, min = 0, max = 999, unit, dec }) {
  const v = n(value);
  const put = (x) => onChange(Math.min(max, Math.max(min, Math.round(x * 10) / 10)));
  return (
    <div className="min-w-0 rounded-2xl bg-bg p-1.5">
      <small className="block pb-1 text-center text-[0.6875rem] font-semibold text-mut">{label}</small>
      <div className="flex items-center">
        <button type="button" aria-label={`${label} azalt`} onClick={() => put(v - step)} className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-fg shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
          <Icon name="minus" className="size-4" />
        </button>
        <span className="flex min-w-0 flex-1 items-baseline justify-center">
          <input
            inputMode={dec ? "decimal" : "numeric"}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value.replace(",", "."))}
            aria-label={label}
            className="w-full min-w-0 bg-transparent text-center text-[1.0625rem] font-bold tabular-nums outline-none"
          />
          {unit && <small className="-ml-1 pr-1 text-[0.6875rem] text-mut">{unit}</small>}
        </span>
        <button type="button" aria-label={`${label} artır`} onClick={() => put(v + step)} className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-fg shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
          <Icon name="plus" className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Chip({ children, tone }) {
  return <span className={`rounded-full px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums ${tone || "bg-bg text-fg"}`}>{children}</span>;
}

function ItemCard({ it, i, count, open, onOpen, onChange, onMove, onDrop }) {
  const set = (k, v) => onChange({ ...it, [k]: v });
  const ex = exById(it.ex);
  return (
    <li className={`rounded-2xl border transition ${open ? "border-acc bg-acc/[.04]" : "border-line bg-card"}`}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3 text-left">
        <span className={`relative grid size-11 shrink-0 place-items-center rounded-xl ${open ? "bg-acc text-white" : "bg-acc/10 text-acc"}`}>
          <Icon name={iconOf(it)} className="size-5" />
          <b className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-deep text-[0.625rem] font-bold text-white">{i + 1}</b>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{it.name}</b>
          <span className="mt-1 flex flex-wrap gap-1">
            <Chip tone="bg-acc/10 text-acc">{itemLine(it).split(" · ")[0]}</Chip>
            {it.kg ? <Chip>{String(it.kg).replace(".", ",")} kg</Chip> : null}
            {it.rest ? <Chip tone="bg-bg text-mut">{it.rest} sn dinlen</Chip> : null}
          </span>
        </span>
        <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {it.kind !== "cardio" && <Step label="Set" value={it.sets} min={1} max={10} onChange={(v) => set("sets", v)} />}
            {it.kind === "reps" && <Step label="Tekrar" value={it.reps} min={1} max={100} onChange={(v) => set("reps", v)} />}
            {it.kind === "time" && <Step label="Süre" unit="sn" value={it.sec} step={5} min={5} max={600} onChange={(v) => set("sec", v)} />}
            {it.kind === "cardio" && <Step label="Süre" unit="dk" value={it.min} min={1} max={180} onChange={(v) => set("min", v)} />}
            {it.kind === "reps" && <Step label="Kilo" unit="kg" dec value={it.kg} step={2.5} max={500} onChange={(v) => set("kg", v)} />}
            <Step label="Dinlenme" unit="sn" value={it.rest} step={15} max={300} onChange={(v) => set("rest", v)} />
          </div>
          {ex?.how && (
            <p className="mt-2 flex gap-2 rounded-xl bg-bg px-3 py-2 text-[0.8125rem] leading-snug text-mut">
              <Icon name="spark" className="mt-0.5 size-3.5 shrink-0 text-acc" />
              {ex.how}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button type="button" aria-label="Yukarı taşı" disabled={i === 0} onClick={() => onMove(-1)} className="grid size-9 place-items-center rounded-full bg-bg disabled:opacity-30">
              <Icon name="up" className="size-4" />
            </button>
            <button type="button" aria-label="Aşağı taşı" disabled={i === count - 1} onClick={() => onMove(1)} className="grid size-9 place-items-center rounded-full bg-bg disabled:opacity-30">
              <Icon name="up" className="size-4 rotate-180" />
            </button>
            <span className="flex-1" />
            <button type="button" onClick={onDrop} className="flex h-9 items-center gap-1.5 rounded-full bg-rec/10 px-3 text-[0.8125rem] font-semibold text-rec">
              <Icon name="trash" className="size-4" />
              Çıkar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function DayPanel({ d, onChange, onDrop }) {
  const [pick, setPick] = useState(false);
  const [open, setOpen] = useState(-1);
  const set = (k, v) => onChange({ ...d, [k]: v });
  const items = d.items || [];
  const setItem = (i, v) => set("items", items.map((x, k) => (k === i ? v : x)));
  const move = (i, dir) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("items", next);
    setOpen(i + dir);
  };
  const groups = groupsOf(items);
  return (
    <section className={`${card} mt-3 p-4`}>
      <small className="block text-[0.75rem] font-bold tracking-[.06em] text-acc">{DOW_LONG[d.dow].toLocaleUpperCase("tr")}</small>
      <input value={d.name} onChange={(e) => set("name", e.target.value)} aria-label="Günün adı" placeholder="Günün adı" className="mt-0.5 block w-full bg-transparent text-[1.375rem] font-bold leading-tight tracking-tight outline-none" />
      {groups.length > 0 && <span className="mt-1 block text-[0.8125rem] text-mut">{groups.join(" · ")}</span>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-bg px-3">
          <Icon name="clock" className="size-4 shrink-0 text-mut" />
          <input type="time" value={d.time} onChange={(e) => set("time", e.target.value)} aria-label="Saat" className="h-full w-full min-w-0 appearance-none bg-transparent text-[0.9375rem] font-semibold outline-none" />
        </label>
        <div className="flex h-12 items-center rounded-2xl bg-bg px-1.5">
          <button type="button" aria-label="Süreyi azalt" onClick={() => set("min", Math.max(15, n(d.min) - 15))} className="grid size-9 place-items-center rounded-xl bg-card shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
            <Icon name="minus" className="size-4" />
          </button>
          <b className="flex-1 text-center text-[0.9375rem] tabular-nums">
            {n(d.min)} <small className="font-medium text-mut">dk</small>
          </b>
          <button type="button" aria-label="Süreyi artır" onClick={() => set("min", Math.min(180, n(d.min) + 15))} className="grid size-9 place-items-center rounded-xl bg-card shadow-[0_1px_4px_-2px_rgba(0,0,0,.25)]">
            <Icon name="plus" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 mt-4 flex items-baseline justify-between">
        <b className="text-[0.8125rem] font-bold tracking-[.06em] text-mut">HAREKETLER</b>
        <small className="text-[0.8125rem] text-mut">
          {items.length} hareket{setsOf(items) ? ` · ${setsOf(items)} set` : ""}
        </small>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((it, i) => (
          <ItemCard
            key={`${it.ex || it.name}-${i}`}
            it={it}
            i={i}
            count={items.length}
            open={open === i}
            onOpen={() => setOpen((o) => (o === i ? -1 : i))}
            onChange={(v) => setItem(i, v)}
            onMove={(dir) => move(i, dir)}
            onDrop={() => {
              set("items", items.filter((_, k) => k !== i));
              setOpen(-1);
            }}
          />
        ))}
      </ul>
      <button type="button" onClick={() => setPick(true)} className="mt-2 flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-acc/30 text-[0.9375rem] font-semibold text-acc">
        <Icon name="plus" className="size-4" />
        Hareket ekle
      </button>
      <button type="button" onClick={onDrop} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 text-[0.8125rem] font-semibold text-mut">
        <Icon name="trash" className="size-3.5" />
        {DOW_LONG[d.dow]} antrenmanını kaldır
      </button>
      <ExercisePicker
        open={pick}
        onClose={() => setPick(false)}
        onPick={(e) => {
          set("items", [...items, cleanItem({ ex: e.id })]);
          setOpen(items.length);
        }}
      />
    </section>
  );
}

// prog: { id?, title, weeks, start, days, note, plansAt }. onSave(prog, addPlans)
export function ProgramEditor({ prog, onSave, onCancel, busy, fresh }) {
  const [p, setP] = useState(prog);
  const [sel, setSel] = useState(prog.days[0]?.dow || 0);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const used = p.days.map((d) => d.dow);
  const day = p.days.find((d) => d.dow === sel) || p.days[0];
  const addDay = (dow) => {
    const base = day || p.days[0];
    set("days", [...p.days, { dow, time: base?.time || "", min: base?.min || 45, name: "Yeni gün", items: [cleanItem({ ex: "warmup", min: 5 })] }].sort((a, b) => a.dow - b.dow));
    setSel(dow);
  };
  const dropDay = (dow) => {
    const rest = p.days.filter((d) => d.dow !== dow);
    set("days", rest);
    setSel(rest[0]?.dow || 0);
  };
  const avgMin = p.days.length ? Math.round(p.days.reduce((s, d) => s + n(d.min), 0) / p.days.length) : 0;
  const total = p.days.length * n(p.weeks);
  const onCal = !!p.plansAt;
  return (
    <div>
      <section className="mt-2 overflow-hidden rounded-[1.75rem] bg-deep px-5 pb-5 pt-4 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.6875rem] font-bold tracking-[.06em] text-white/85">
          <Icon name={fresh ? "spark" : "edit"} className="size-3.5" />
          {fresh ? "HAZIR · HENÜZ KAYDEDİLMEDİ" : "PROGRAMI DÜZENLE"}
        </span>
        <label className="mt-2 flex items-start gap-2">
          <input value={p.title} onChange={(e) => set("title", e.target.value)} aria-label="Program adı" className="block min-w-0 flex-1 bg-transparent text-[1.625rem] font-bold leading-tight tracking-tight outline-none" />
          <Icon name="edit" className="mt-2 size-4 shrink-0 text-white/50" />
        </label>
        {p.note && <p className="mt-1.5 text-[0.8125rem] leading-snug text-white/75">{p.note}</p>}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [p.days.length, "gün / hafta"],
            [avgMin, "dk / antrenman"],
            [n(p.weeks), "hafta"],
          ].map(([v, l]) => (
            <span key={l} className="rounded-2xl bg-white/10 px-2 py-2.5 text-center">
              <b className="block text-[1.375rem] font-bold leading-none tabular-nums">{v}</b>
              <small className="mt-1 block text-[0.6875rem] text-white/70">{l}</small>
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block rounded-2xl bg-white/10 px-3 py-1.5">
            <small className="block text-[0.6875rem] text-white/70">Başlangıç</small>
            <input type="date" value={p.start} onChange={(e) => set("start", e.target.value)} className="h-7 w-full min-w-0 appearance-none bg-transparent text-[0.9375rem] font-semibold text-white outline-none [color-scheme:dark]" />
          </label>
          <div className="flex items-center gap-1 rounded-2xl bg-white/10 px-1.5">
            <button type="button" aria-label="Haftayı azalt" onClick={() => set("weeks", Math.max(1, n(p.weeks) - 1))} className="grid size-8 place-items-center rounded-xl bg-white/15">
              <Icon name="minus" className="size-4" />
            </button>
            <span className="flex-1 text-center">
              <small className="block text-[0.6875rem] text-white/70">Süre</small>
              <b className="text-[0.9375rem] tabular-nums">{n(p.weeks)} hafta</b>
            </span>
            <button type="button" aria-label="Haftayı artır" onClick={() => set("weeks", Math.min(26, n(p.weeks) + 1))} className="grid size-8 place-items-center rounded-xl bg-white/15">
              <Icon name="plus" className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section className={`${card} mt-3 px-3 py-3`}>
        <div className="grid grid-cols-7 gap-1">
          {DOWS.slice(1).map((x, k) => {
            const dow = k + 1;
            const d = p.days.find((y) => y.dow === dow);
            const on = d && dow === day?.dow;
            return (
              <button
                key={x}
                type="button"
                aria-pressed={!!on}
                aria-label={d ? `${DOW_LONG[dow]}: ${d.name}` : `${DOW_LONG[dow]} günü ekle`}
                onClick={() => (d ? setSel(dow) : addDay(dow))}
                className="flex flex-col items-center gap-1"
              >
                <small className={`text-[0.6875rem] font-semibold ${on ? "text-acc" : "text-mut"}`}>{x}</small>
                <span
                  className={`grid size-10 place-items-center rounded-full text-[0.75rem] font-bold transition ${
                    on ? "bg-acc text-white shadow-[0_6px_14px_-6px_var(--acc)]" : d ? "bg-acc/12 text-acc" : "border border-dashed border-line text-mut"
                  }`}
                >
                  {d ? <Icon name="dumbbell" className="size-4" /> : <Icon name="plus" className="size-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[0.75rem] text-mut">Güne dokun; boş güne dokunursan antrenman eklenir.</p>
      </section>

      {day ? (
        <DayPanel key={day.dow} d={day} onChange={(v) => set("days", p.days.map((x) => (x.dow === day.dow ? v : x)))} onDrop={() => dropDay(day.dow)} />
      ) : (
        <p className={`${card} mt-3 p-5 text-center text-[0.9375rem] text-mut`}>Henüz antrenman günü yok. Yukarıdan bir güne dokun.</p>
      )}

      <p className="mt-4 flex gap-2 px-1 text-[0.8125rem] leading-snug text-mut">
        <Icon name="mic" className="mt-0.5 size-4 shrink-0" />
        <span>
          Alttaki asistana da söyleyebilirsin: “çarşambayı bacak günü yap”, “plank ekle”, “45 dakikaya indir”.
          {onCal && " Kaydedince takvimdeki gelecek antrenmanlar da güncellenir."}
        </span>
      </p>

      <div className={`${card} mt-3 p-3`}>
        {!onCal && (
          <>
            <Button loading={busy === "plans"} disabled={!!busy || !p.days.length} onClick={() => onSave(p, true)} className="w-full">
              <Icon name="cal" className="size-5" />
              Kaydet ve planlara ekle
            </Button>
            {total > 0 && <small className="mt-1.5 block text-center text-[0.75rem] text-mut">{total} antrenman takvimine eklenecek</small>}
          </>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={!!busy} className="h-11 rounded-2xl bg-bg text-[0.9375rem] font-semibold text-mut">
            Vazgeç
          </button>
          <Button variant={onCal ? "primary" : "ghost"} loading={busy === "save"} disabled={!!busy || !p.days.length} onClick={() => onSave(p, onCal)}>
            {onCal ? "Kaydet" : "Yalnız kaydet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
