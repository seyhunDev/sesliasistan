"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EQUIP } from "@/lib/fitness/exercises";
import { DOWS, DOW_LONG, GOALS, LEVELS, PLACES, labelOf } from "@/lib/fitness/model";
import { todayStr } from "@/lib/utils/format";

// Seçenek kartlarının simgesi ve kısa açıklaması (yazı model.js'teki listelerden)
const GOAL_UI = {
  kilo: ["flame", "Yağ yak, hafifle"],
  kas: ["dumbbell", "Kas kütlesi kazan"],
  guc: ["zap", "Daha ağır kaldır"],
  kondisyon: ["trend", "Nefes ve dayanıklılık"],
  saglik: ["sun", "Formda ve zinde kal"],
};
const LEVEL_UI = { yeni: [1, "Yeni ya da uzun aradan sonra"], orta: [2, "Düzenli spor yapıyorum"], ileri: [3, "Yıllardır antrenman"] };
const PLACE_UI = { salon: "dumbbell", ev: "home", dis: "sun" };
const SLOTS = [
  ["sabah", "Sabah", "sun", "07:00"],
  ["ogle", "Öğle", "clock", "12:30"],
  ["aksam", "Akşam", "moon", "19:00"],
];

const Q = ({ title, sub }) => (
  <div className="pb-3 pt-1">
    <h3 className="text-[1.375rem] font-bold leading-tight tracking-tight">{title}</h3>
    {sub && <p className="mt-1 text-[0.875rem] text-mut">{sub}</p>}
  </div>
);
const H = ({ children }) => <p className="mb-2 mt-5 text-[0.75rem] font-bold tracking-[.08em] text-mut">{children}</p>;
const pill = (on) => `h-10 rounded-full px-4 text-[0.875rem] font-semibold transition active:scale-95 ${on ? "bg-acc text-white" : "bg-bg"}`;

// Büyük seçenek kartı: simge + başlık + açıklama, seçilince yeşil çerçeve ve tik
function Option({ on, icon, title, sub, onClick, tall }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 rounded-2xl border-2 px-3 text-left transition active:scale-[.98] ${tall ? "flex-col justify-center gap-2 py-4 text-center" : "py-3"} ${on ? "border-acc bg-acc/[.07]" : "border-transparent bg-bg"}`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${on ? "bg-acc text-white" : "bg-card text-acc"}`}>
        {typeof icon === "number" ? <Bars n={icon} /> : <Icon name={icon} className="size-5" />}
      </span>
      <span className={`min-w-0 ${tall ? "w-full text-center" : "flex-1"}`}>
        <b className="block text-[0.9375rem] font-semibold leading-tight">{title}</b>
        {sub && <small className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{sub}</small>}
      </span>
      {on && !tall && (
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-acc text-white">
          <Icon name="check" className="size-3.5" />
        </span>
      )}
    </button>
  );
}
// Seviye simgesi: 1-3 yükselen çubuk
const Bars = ({ n }) => (
  <span className="flex h-5 items-end gap-[3px]">
    {[1, 2, 3].map((k) => (
      <span key={k} className={`w-[5px] rounded-sm bg-current ${k > n ? "opacity-25" : ""}`} style={{ height: `${k * 6 + 2}px` }} />
    ))}
  </span>
);
// Seçmeli şerit (30/45/60/90 dk, 4/6/8/12 hafta)
function Segment({ list, value, onChange, unit }) {
  return (
    <div className="grid rounded-2xl bg-bg p-1" style={{ gridTemplateColumns: `repeat(${list.length}, 1fr)` }}>
      {list.map((v) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`h-11 rounded-xl text-[0.9375rem] font-semibold transition ${value === v ? "bg-card text-acc shadow-[0_2px_8px_-4px_rgba(0,0,0,.25)]" : "text-mut"}`}>
          {v}
          <small className="ml-0.5 text-[0.75rem] font-medium">{unit}</small>
        </button>
      ))}
    </div>
  );
}

// Profil alanları (Program hazırla 2. adım ve Profil penceresi): seviye, yer, ekipman, boy, kilo, yaş, kaçınılacaklar.
// withGoal: hedef de gösterilir (Profil penceresi; Program hazırla'da hedef ayrı adım).
export function ProfileFields({ f, set, withGoal = true }) {
  const eq = f.equip || [];
  const num = (k, label, unit) => (
    <label className="block min-w-0 rounded-2xl bg-bg px-3 pb-2 pt-1.5">
      <small className="block text-[0.6875rem] font-semibold text-mut">{label}</small>
      <span className="flex items-baseline gap-1">
        <input inputMode="decimal" value={f[k] || ""} onChange={(e) => set(k, e.target.value.replace(",", "."))} placeholder="–" className="h-7 w-full min-w-0 bg-transparent text-[1.125rem] font-semibold outline-none" />
        <span className="text-[0.8125rem] text-mut">{unit}</span>
      </span>
    </label>
  );
  return (
    <>
      {withGoal && (
        <>
          <H>HEDEF</H>
          <div className="space-y-2">
            {GOALS.map(([k, l]) => (
              <Option key={k} on={f.goal === k} icon={GOAL_UI[k][0]} title={l} sub={GOAL_UI[k][1]} onClick={() => set("goal", k)} />
            ))}
          </div>
        </>
      )}
      <H>SEVİYE</H>
      <div className="space-y-2">
        {LEVELS.map(([k, l]) => (
          <Option key={k} on={f.level === k} icon={LEVEL_UI[k][0]} title={l} sub={LEVEL_UI[k][1]} onClick={() => set("level", k)} />
        ))}
      </div>
      <H>NEREDE ÇALIŞACAKSIN</H>
      <div className="grid grid-cols-3 gap-2">
        {PLACES.map(([k, l]) => (
          <Option key={k} tall on={f.place === k} icon={PLACE_UI[k]} title={l} onClick={() => set("place", k)} />
        ))}
      </div>
      {f.place !== "salon" && (
        <>
          <H>ELİNDEKİ EKİPMAN</H>
          <div className="flex flex-wrap gap-2">
            {["dumbbell", "band", "kettlebell", "bar", "bench", "barbell"].map((k) => (
              <button key={k} type="button" aria-pressed={eq.includes(k)} onClick={() => set("equip", eq.includes(k) ? eq.filter((x) => x !== k) : [...eq, k])} className={pill(eq.includes(k))}>
                {eq.includes(k) && <Icon name="check" className="-ml-1 mr-1 inline size-3.5" />}
                {EQUIP[k]}
              </button>
            ))}
          </div>
          {!eq.length && <p className="mt-2 text-[0.8125rem] text-mut">Seçmezsen yalnız vücut ağırlığıyla hazırlanır.</p>}
        </>
      )}
      <H>SEN</H>
      <div className="grid grid-cols-3 gap-2">
        {num("height", "Boy", "cm")}
        {num("weight", "Kilo", "kg")}
        {num("age", "Yaş", "")}
      </div>
      <input value={f.avoid || ""} onChange={(e) => set("avoid", e.target.value)} placeholder="Sakatlık, kaçınılacak hareket (isteğe bağlı)" className="mt-2 h-12 w-full min-w-0 rounded-2xl bg-bg px-4 text-[0.9375rem] outline-none" />
    </>
  );
}

// Program hazırla: 4 adım (Hedef › Sen › Haftan › Özet). Sonunda yapay zekaya giden cümle ya da boş program.
// Serbest yazı kutusu yok (tek asistan kuralı): özel istekler alttaki asistana söylenir.
const STEPS = ["Hedef", "Sen", "Haftan", "Özet"];
export function NewProgram({ open, onClose, profile, onAsk, onBlank, busy, goal }) {
  // Tanıtımda hedef kartından gelindiyse hedef seçili, sihirbaz 2. adımdan başlar
  const [step, setStep] = useState(goal ? 1 : 0);
  const [days, setDays] = useState([1, 3, 5]);
  const [slot, setSlot] = useState("sabah");
  const [time, setTime] = useState("07:00");
  const [weeks, setWeeks] = useState(4);
  const [min, setMin] = useState(45);
  const [start, setStart] = useState(todayStr());
  const [f, setF] = useState(() => ({ goal: "saglik", level: "yeni", place: "salon", equip: [], ...profile, ...(goal ? { goal } : {}) }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const pickSlot = ([k, , , t]) => {
    setSlot(k);
    setTime(t);
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
  const last = step === STEPS.length - 1;
  const canNext = step !== 2 || sorted.length > 0;
  const startText = start === todayStr() ? "Bugün" : new Date(`${start}T12:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  const row = (label, value, to) => (
    <button type="button" onClick={() => setStep(to)} className="flex w-full items-center gap-3 py-3 text-left active:opacity-70">
      <span className="w-20 shrink-0 text-[0.8125rem] text-mut">{label}</span>
      <b className="min-w-0 flex-1 text-[0.9375rem] font-semibold">{value}</b>
      <Icon name="edit" className="size-4 text-mut" />
    </button>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Program hazırla">
      {/* İlerleme: 4 parça */}
      <div className="sticky top-0 z-10 -mx-5 bg-card px-5 pb-3">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button key={s} type="button" aria-label={s} onClick={() => i < step && setStep(i)} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-acc" : "bg-line"}`} />
          ))}
        </div>
        <p className="mt-2 text-[0.75rem] font-semibold text-mut">
          Adım {step + 1}/{STEPS.length} · {STEPS[step]}
        </p>
      </div>

      {step === 0 && (
        <>
          <Q title="Hedefin ne?" sub="Program buna göre kurulur; set ve tekrarlar değişir." />
          <div className="space-y-2">
            {GOALS.map(([k, l]) => (
              <Option key={k} on={f.goal === k} icon={GOAL_UI[k][0]} title={l} sub={GOAL_UI[k][1]} onClick={() => set("goal", k)} />
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Q title="Seni tanıyalım" sub="Hareketler seviyene, yerine ve ekipmanına göre seçilir." />
          <ProfileFields f={f} set={set} withGoal={false} />
        </>
      )}

      {step === 2 && (
        <>
          <Q title="Haftan nasıl?" sub="Seçtiğin günler ve saat takvimine plan olarak eklenir." />
          <div className="flex items-baseline justify-between">
            <H>HANGİ GÜNLER</H>
            <span className="text-[0.8125rem] font-semibold text-acc">{sorted.length ? `Haftada ${sorted.length} gün` : "Gün seç"}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DOWS.slice(1).map((d, i) => {
              const on = days.includes(i + 1);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i + 1) : [...days, i + 1])} className={`aspect-square rounded-full text-[0.8125rem] font-bold transition active:scale-90 ${on ? "bg-acc text-white shadow-[0_6px_14px_-8px_rgba(47,125,107,.9)]" : "bg-bg text-mut"}`}>
                  {d}
                </button>
              );
            })}
          </div>
          <H>SAAT</H>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map((s) => (
              <Option key={s[0]} tall on={slot === s[0]} icon={s[2]} title={s[1]} sub={s[3]} onClick={() => pickSlot(s)} />
            ))}
          </div>
          <label className="mt-2 flex h-12 items-center justify-between rounded-2xl bg-bg px-4">
            <span className="text-[0.875rem] text-mut">Başka saat</span>
            <input type="time" value={time} onChange={(e) => (setTime(e.target.value), setSlot(""))} className="appearance-none bg-transparent text-right text-[1rem] font-semibold outline-none" />
          </label>
          <H>HER ANTRENMAN</H>
          <Segment list={[30, 45, 60, 90]} value={min} onChange={setMin} unit="dk" />
          <H>PROGRAM SÜRESİ</H>
          <Segment list={[4, 6, 8, 12]} value={weeks} onChange={setWeeks} unit="hafta" />
          <label className="mt-2 flex h-12 items-center justify-between rounded-2xl bg-bg px-4">
            <span className="text-[0.875rem] text-mut">Başlangıç</span>
            <input type="date" value={start} min={todayStr()} onChange={(e) => setStart(e.target.value)} className="appearance-none bg-transparent text-right text-[1rem] font-semibold outline-none" />
          </label>
        </>
      )}

      {step === 3 && (
        <>
          <Q title="Hazır" sub="Kontrol et; yapay zeka programını birkaç saniyede hazırlar, sonra istediğin gibi düzenlersin." />
          <section className="rounded-[1.5rem] bg-deep px-5 py-4 text-white">
            <span className="flex items-center gap-2 text-[0.75rem] font-bold tracking-[.08em] text-white/70">
              <Icon name={GOAL_UI[f.goal]?.[0] || "dumbbell"} className="size-4" />
              {labelOf(GOALS, f.goal).toLocaleUpperCase("tr")}
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                [sorted.length, "gün / hafta"],
                [min, "dakika"],
                [weeks, "hafta"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-xl bg-white/10 px-3 py-2">
                  <b className="block text-[1.5rem] font-bold leading-none">{n}</b>
                  <small className="mt-1 block text-[0.75rem] text-white/75">{l}</small>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[0.875rem] text-white/85">{sorted.map((d) => DOWS[d]).join(", ")} · {time}</p>
          </section>
          <div className="mt-3 divide-y divide-line rounded-2xl bg-bg px-4">
            {row("Hedef", labelOf(GOALS, f.goal), 0)}
            {row("Seviye", labelOf(LEVELS, f.level), 1)}
            {row("Yer", f.place !== "salon" && f.equip?.length ? `${labelOf(PLACES, f.place)} · ${f.equip.map((k) => EQUIP[k]).join(", ")}` : labelOf(PLACES, f.place), 1)}
            {row("Başlangıç", startText, 2)}
          </div>
        </>
      )}

      {/* Alt düğmeler */}
      <div className="sticky bottom-0 -mx-5 mt-5 bg-card px-5 pt-3">
        {last ? (
          <div className="flex flex-col gap-2">
            <Button loading={busy} disabled={!sorted.length} onClick={() => onAsk(text(), f, pre)}>
              <Icon name="spark" className="size-5" />
              Yapay zekayla hazırla
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={busy} onClick={() => setStep(step - 1)}>
                Geri
              </Button>
              <Button variant="ghost" className="flex-[2]" disabled={busy || !sorted.length} onClick={() => onBlank(pre, f)}>
                Kendim hazırlayacağım
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" className="flex-1" onClick={() => setStep(step - 1)}>
                Geri
              </Button>
            )}
            <Button className="flex-[2]" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Devam
              <Icon name="chev" className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
