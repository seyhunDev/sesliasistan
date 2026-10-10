"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EQUIP } from "@/lib/fitness/exercises";
import { DOWS, DOW_LONG, GOALS, LEVELS, PLACES, labelOf } from "@/lib/fitness/model";
import { todayStr } from "@/lib/utils/format";

const chip = (on) => `rounded-full px-3 py-1.5 text-[0.8125rem] font-medium active:scale-95 ${on ? "bg-acc text-white" : "bg-bg"}`;
const H = ({ children }) => <p className="mb-2 mt-4 text-[0.75rem] font-bold tracking-[.08em] text-mut">{children}</p>;
const Chips = ({ list, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {list.map(([k, l]) => (
      <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)} className={chip(value === k)}>
        {l}
      </button>
    ))}
  </div>
);

// Profil alanları (Program hazırla ve Profil penceresi): hedef, seviye, yer, ekipman, boy, kilo, yaş, kaçınılacaklar
export function ProfileFields({ f, set }) {
  const eq = f.equip || [];
  const num = (k, label, unit) => (
    <label className="flex min-w-0 items-center gap-1 rounded-xl bg-bg pr-3">
      <input inputMode="decimal" value={f[k] || ""} onChange={(e) => set(k, e.target.value.replace(",", "."))} placeholder={label} className="h-10 w-full min-w-0 bg-transparent px-3 text-[0.9375rem] outline-none" />
      <span className="text-[0.8125rem] text-mut">{unit}</span>
    </label>
  );
  return (
    <>
      <H>HEDEF</H>
      <Chips list={GOALS} value={f.goal} onChange={(v) => set("goal", v)} />
      <H>SEVİYE</H>
      <Chips list={LEVELS} value={f.level} onChange={(v) => set("level", v)} />
      <H>NEREDE</H>
      <Chips list={PLACES} value={f.place} onChange={(v) => set("place", v)} />
      {f.place !== "salon" && (
        <>
          <H>EKİPMAN</H>
          <div className="flex flex-wrap gap-2">
            {["dumbbell", "band", "kettlebell", "bar", "bench", "barbell"].map((k) => (
              <button key={k} type="button" aria-pressed={eq.includes(k)} onClick={() => set("equip", eq.includes(k) ? eq.filter((x) => x !== k) : [...eq, k])} className={chip(eq.includes(k))}>
                {EQUIP[k]}
              </button>
            ))}
          </div>
        </>
      )}
      <H>SEN</H>
      <div className="grid grid-cols-3 gap-2">
        {num("height", "Boy", "cm")}
        {num("weight", "Kilo", "kg")}
        {num("age", "Yaş", "")}
      </div>
      <input value={f.avoid || ""} onChange={(e) => set("avoid", e.target.value)} placeholder="Sakatlık, kaçınılacak hareket (isteğe bağlı)" className="mt-2 h-10 w-full min-w-0 rounded-xl bg-bg px-3 text-[0.9375rem] outline-none" />
    </>
  );
}

// Program hazırla: günler, sabah/akşam (saat), hafta, süre, başlangıç + profil → yapay zekaya gidecek cümle.
// Serbest yazı kutusu yok (tek asistan kuralı): özel istekler alttaki asistana söylenir.
export function NewProgram({ open, onClose, profile, onAsk, onBlank, busy }) {
  const [days, setDays] = useState([1, 3, 5]);
  const [slot, setSlot] = useState("sabah");
  const [time, setTime] = useState("07:00");
  const [weeks, setWeeks] = useState(4);
  const [min, setMin] = useState(45);
  const [start, setStart] = useState(todayStr());
  const [f, setF] = useState(() => ({ goal: "saglik", level: "yeni", place: "salon", equip: [], ...profile }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const pickSlot = (s) => {
    setSlot(s);
    setTime(s === "sabah" ? "07:00" : s === "ogle" ? "12:30" : "19:00");
  };
  const sorted = [...days].sort((a, b) => a - b);
  // Yapay zekaya giden cümle: seçilenler açıkça yazılır
  const text = () =>
    [
      `Haftada ${sorted.length} gün fitness programı hazırla: ${sorted.map((d) => `${DOW_LONG[d]} ${time}`).join(", ")}.`,
      `${weeks} hafta, her antrenman ${min} dakika, başlangıç ${start}.`,
      `Hedef: ${labelOf(GOALS, f.goal)}. Seviye: ${labelOf(LEVELS, f.level)}. Yer: ${labelOf(PLACES, f.place)}.`,
      f.place !== "salon" && (f.equip?.length ? `Ekipman: ${f.equip.map((k) => EQUIP[k]).join(", ")}.` : "Ekipman yok, yalnız vücut ağırlığı."),
      f.avoid && `Kaçınılacak: ${f.avoid}.`,
    ]
      .filter(Boolean)
      .join(" ");
  const pre = { days: sorted, time, weeks, min, start };
  return (
    <Sheet open={open} onClose={onClose} title="Program hazırla">
      <H>HANGİ GÜNLER</H>
      <div className="grid grid-cols-7 gap-1.5">
        {DOWS.slice(1).map((d, i) => {
          const on = days.includes(i + 1);
          return (
            <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i + 1) : [...days, i + 1])} className={`h-11 rounded-xl text-[0.8125rem] font-semibold ${on ? "bg-acc text-white" : "bg-bg"}`}>
              {d}
            </button>
          );
        })}
      </div>
      <H>NE ZAMAN</H>
      <div className="flex items-center gap-2">
        {[
          ["sabah", "Sabah"],
          ["ogle", "Öğle"],
          ["aksam", "Akşam"],
        ].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={slot === k} onClick={() => pickSlot(k)} className={chip(slot === k)}>
            {l}
          </button>
        ))}
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Saat" className="h-9 min-w-0 flex-1 appearance-none rounded-full bg-bg px-3 text-center text-[0.875rem] outline-none" />
      </div>
      <H>KAÇ HAFTA · KAÇ DAKİKA</H>
      <div className="flex flex-wrap items-center gap-2">
        {[4, 6, 8, 12].map((w) => (
          <button key={w} type="button" onClick={() => setWeeks(w)} className={chip(weeks === w)}>
            {w} hafta
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[30, 45, 60, 90].map((m) => (
          <button key={m} type="button" onClick={() => setMin(m)} className={chip(min === m)}>
            {m} dk
          </button>
        ))}
      </div>
      <H>BAŞLANGIÇ</H>
      <input type="date" value={start} min={todayStr()} onChange={(e) => setStart(e.target.value)} className="h-10 w-full min-w-0 appearance-none rounded-xl bg-bg px-3 text-[0.9375rem] outline-none" />
      <ProfileFields f={f} set={set} />
      <div className="mt-5 flex flex-col gap-2 pb-2">
        <Button loading={busy} disabled={!sorted.length} onClick={() => onAsk(text(), f, pre)}>
          <Icon name="spark" className="size-5" />
          Yapay zekayla hazırla
        </Button>
        <Button variant="ghost" disabled={busy || !sorted.length} onClick={() => onBlank(pre, f)}>
          Kendim hazırlayacağım
        </Button>
      </div>
    </Sheet>
  );
}
