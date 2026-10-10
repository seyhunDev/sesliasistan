"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card, Label } from "@/components/ui/Page";
import { exById } from "@/lib/fitness/exercises";
import { DOW_LONG, cleanItem, itemLine, programLine } from "@/lib/fitness/model";
import { ExercisePicker } from "./ExercisePicker";

// Program düzenleme (yapay zekanın hazırladığı önizleme ya da kayıtlı program): ad, hafta, başlangıç; her gün: gün adı, saat,
// süre, hareketler (set, tekrar/süre, kilo, dinlenme; sırala, sil, ekle). Değişiklik sesle de söylenir (alttaki asistan).
const inp = "h-10 w-full min-w-0 rounded-xl bg-bg px-3 text-[0.9375rem] outline-none appearance-none";
const small = "h-9 w-full min-w-0 rounded-lg bg-bg px-2 text-center text-[0.9375rem] tabular-nums outline-none";
const numIn = (v) => (v === "" ? "" : String(v).replace(",", "."));

function Num({ label, value, onChange, step }) {
  return (
    <label className="block min-w-0">
      <small className="block pb-1 text-center text-[0.6875rem] text-mut">{label}</small>
      <input inputMode={step ? "decimal" : "numeric"} value={value ?? ""} onChange={(e) => onChange(numIn(e.target.value))} className={small} />
    </label>
  );
}

function ItemRow({ it, i, n, onChange, onMove, onDrop }) {
  const [open, setOpen] = useState(false);
  const set = (k, v) => onChange({ ...it, [k]: v });
  const ex = exById(it.ex);
  return (
    <li className="py-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left active:opacity-70">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bg text-[0.75rem] font-semibold tabular-nums text-mut">{i + 1}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-medium">{it.name}</b>
          <small className="block truncate text-[0.8125rem] text-mut">
            {itemLine(it)}
            {it.rest ? ` · ${it.rest} sn dinlen` : ""}
          </small>
        </span>
        <Icon name="chev" className={`size-4 text-mut transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-line p-3">
          <div className="grid grid-cols-4 gap-2">
            <Num label="Set" value={it.sets} onChange={(v) => set("sets", v)} />
            {it.kind === "reps" && <Num label="Tekrar" value={it.reps} onChange={(v) => set("reps", v)} />}
            {it.kind === "time" && <Num label="Saniye" value={it.sec} onChange={(v) => set("sec", v)} />}
            {it.kind === "cardio" && <Num label="Dakika" value={it.min} onChange={(v) => set("min", v)} />}
            {it.kind === "reps" ? <Num label="Kilo" step value={it.kg} onChange={(v) => set("kg", v)} /> : <span />}
            <Num label="Dinlenme sn" value={it.rest} onChange={(v) => set("rest", v)} />
          </div>
          {ex?.how && <p className="mt-2 text-[0.8125rem] leading-snug text-mut">{ex.how}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button type="button" aria-label="Yukarı" disabled={i === 0} onClick={() => onMove(-1)} className="grid size-9 place-items-center rounded-full bg-bg disabled:opacity-30">
              <Icon name="up" className="size-4" />
            </button>
            <button type="button" aria-label="Aşağı" disabled={i === n - 1} onClick={() => onMove(1)} className="grid size-9 place-items-center rounded-full bg-bg disabled:opacity-30">
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

function DayCard({ d, used, onChange, onDrop }) {
  const [pick, setPick] = useState(false);
  const set = (k, v) => onChange({ ...d, [k]: v });
  const items = d.items || [];
  const setItem = (i, v) => set("items", items.map((x, k) => (k === i ? v : x)));
  const move = (i, dir) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("items", next);
  };
  return (
    <section className={`${card} mt-3 p-4`}>
      <div className="flex items-center gap-2">
        <input value={d.name} onChange={(e) => set("name", e.target.value)} aria-label="Günün adı" className="h-10 min-w-0 flex-1 rounded-xl bg-bg px-3 text-[1rem] font-semibold outline-none" />
        <button type="button" aria-label="Günü sil" onClick={onDrop} className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-mut">
          <Icon name="trash" className="size-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-[1.4fr_1fr_0.9fr] gap-2">
        <select value={d.dow} onChange={(e) => set("dow", +e.target.value)} aria-label="Gün" className={inp}>
          {DOW_LONG.slice(1).map((x, k) => (
            <option key={x} value={k + 1} disabled={k + 1 !== d.dow && used.includes(k + 1)}>
              {x}
            </option>
          ))}
        </select>
        <input type="time" value={d.time} onChange={(e) => set("time", e.target.value)} aria-label="Saat" className={inp} />
        <label className="flex items-center gap-1 rounded-xl bg-bg pr-3">
          <input inputMode="numeric" value={d.min} onChange={(e) => set("min", numIn(e.target.value))} aria-label="Süre" className="h-10 w-full min-w-0 bg-transparent px-3 text-[0.9375rem] outline-none" />
          <span className="text-[0.8125rem] text-mut">dk</span>
        </label>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {items.map((it, i) => (
          <ItemRow key={`${it.ex || it.name}-${i}`} it={it} i={i} n={items.length} onChange={(v) => setItem(i, v)} onMove={(dir) => move(i, dir)} onDrop={() => set("items", items.filter((_, k) => k !== i))} />
        ))}
      </ul>
      <button type="button" onClick={() => setPick(true)} className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-[0.875rem] font-semibold text-acc">
        <Icon name="plus" className="size-4" />
        Hareket ekle
      </button>
      <ExercisePicker open={pick} onClose={() => setPick(false)} onPick={(e) => set("items", [...items, cleanItem({ ex: e.id })])} />
    </section>
  );
}

// prog: { id?, title, weeks, start, days, note, plansAt }. onSave(prog, addPlans)
export function ProgramEditor({ prog, onSave, onCancel, busy, fresh }) {
  const [p, setP] = useState(prog);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const used = p.days.map((d) => d.dow);
  const addDay = () => {
    const dow = [1, 3, 5, 2, 4, 6, 7].find((x) => !used.includes(x));
    if (dow) set("days", [...p.days, { dow, time: p.days[0]?.time || "", min: p.days[0]?.min || 45, name: "Yeni gün", items: [cleanItem({ ex: "warmup", min: 5 })] }].sort((a, b) => a.dow - b.dow));
  };
  const onCal = !!p.plansAt;
  return (
    <div>
      <section className="mt-2 rounded-[1.5rem] bg-deep px-5 py-4 text-white">
        <span className="text-[0.75rem] font-bold tracking-[.08em] text-white/70">{fresh ? "ÖNİZLEME · KAYDEDİLMEDİ" : "PROGRAMI DÜZENLE"}</span>
        <input value={p.title} onChange={(e) => set("title", e.target.value)} aria-label="Program adı" className="mt-1 block w-full bg-transparent text-[1.5rem] font-bold leading-tight tracking-tight outline-none" />
        <span className="mt-1 block text-[0.875rem] text-white/80">{programLine(p) || "Gün ekle"}</span>
        {p.note && <p className="mt-2 text-[0.8125rem] leading-snug text-white/75">{p.note}</p>}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className={`${card} block px-3 py-2`}>
          <small className="block text-[0.6875rem] font-semibold text-mut">BAŞLANGIÇ</small>
          <input type="date" value={p.start} onChange={(e) => set("start", e.target.value)} className="h-8 w-full min-w-0 appearance-none bg-transparent text-[0.9375rem] outline-none" />
        </label>
        <label className={`${card} flex items-end gap-1 px-3 py-2`}>
          <span className="min-w-0 flex-1">
            <small className="block text-[0.6875rem] font-semibold text-mut">SÜRE</small>
            <input inputMode="numeric" value={p.weeks} onChange={(e) => set("weeks", numIn(e.target.value))} className="h-8 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none" />
          </span>
          <span className="pb-1.5 text-[0.8125rem] text-mut">hafta</span>
        </label>
      </div>

      <Label right={`${p.days.length} gün`}>GÜNLER</Label>
      {p.days.map((d, i) => (
        <DayCard
          key={`${d.dow}-${i}`}
          d={d}
          used={used}
          onChange={(v) => set("days", p.days.map((x, k) => (k === i ? v : x)).sort((a, b) => a.dow - b.dow))}
          onDrop={() => set("days", p.days.filter((_, k) => k !== i))}
        />
      ))}
      {p.days.length < 7 && (
        <button type="button" onClick={addDay} className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-[0.875rem] font-semibold text-acc">
          <Icon name="plus" className="size-4" />
          Gün ekle
        </button>
      )}

      <p className="mt-4 px-1 text-[0.8125rem] leading-snug text-mut">
        Değişikliği alttaki asistana da söyleyebilirsin: “çarşambayı bacak günü yap”, “plank ekle”, “45 dakikaya indir”.
        {onCal && " Kaydedince takvimdeki gelecek antrenmanlar da güncellenir."}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {!onCal && (
          <Button loading={busy === "plans"} disabled={!!busy || !p.days.length} onClick={() => onSave(p, true)}>
            <Icon name="cal" className="size-5" />
            Kaydet ve planlara ekle
          </Button>
        )}
        <Button variant={onCal ? "primary" : "ghost"} loading={busy === "save"} disabled={!!busy || !p.days.length} onClick={() => onSave(p, onCal)}>
          Kaydet
        </Button>
        <button type="button" onClick={onCancel} disabled={!!busy} className="h-11 text-[0.9375rem] font-semibold text-mut">
          Vazgeç
        </button>
      </div>
    </div>
  );
}
