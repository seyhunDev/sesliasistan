"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EQUIP } from "@/lib/fitness/exercises";
import { DOWS, DOW_LONG, GOALS, LEVELS, PLACES, labelOf } from "@/lib/fitness/model";
import { bmiOf, bmiText } from "@/lib/fitness/forecast";
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
const Bars = ({ n, big }) => (
  <span className={`flex items-end gap-[3px] ${big ? "h-7" : "h-5"}`}>
    {[1, 2, 3].map((k) => (
      <span key={k} className={`rounded-sm bg-current ${big ? "w-[7px]" : "w-[5px]"} ${k > n ? "opacity-25" : ""}`} style={{ height: `${k * (big ? 8 : 6) + 2}px` }} />
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

// Sakatlık bölgeleri: seçilenler kaçınılacaklar yazısının başına "Diz, Bel" diye yazılır, kalan serbest not "·" ile ayrılır
const AREAS = ["Diz", "Bel", "Omuz", "Bilek", "Boyun", "Dirsek"];
const avoidOf = (s) => {
  const parts = String(s || "").split(/[,·]/).map((x) => x.trim()).filter(Boolean);
  const areas = AREAS.filter((a) => parts.some((p) => p.toLocaleLowerCase("tr") === a.toLocaleLowerCase("tr")));
  const rest = parts.filter((p) => !areas.some((a) => a.toLocaleLowerCase("tr") === p.toLocaleLowerCase("tr"))).join(", ");
  return { areas, rest };
};
const avoidText = (areas, rest) => [areas.join(", "), rest.trim()].filter(Boolean).join(" · ");
const PLACE_BG = { salon: "linear-gradient(135deg,#2f8f76,#174d40)", ev: "linear-gradient(135deg,#d98a4e,#a4512a)", dis: "linear-gradient(135deg,#4f9bd1,#22618f)" };
const EQUIP_KEYS = ["dumbbell", "band", "kettlebell", "bar", "bench", "barbell"];

// Bölüm kartı: başlık + sağda kısa durum, içerik altında
const Box = ({ title, note, children }) => (
  <section className="mt-3 rounded-[1.25rem] border border-line bg-card p-3.5">
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h4 className="text-[0.9375rem] font-bold">{title}</h4>
      {note && <small className="truncate text-[0.75rem] font-medium text-mut">{note}</small>}
    </div>
    {children}
  </section>
);
// Profil alanları (Program hazırla 2. adım ve Profil penceresi): seviye, yer, ekipman, ölçüler, sakatlık.
// withPlace: yer kutusu (Program hazırla'da ayrı soru). withGoal: hedef de gösterilir (Profil penceresi; Program hazırla'da hedef ayrı adım).
export function ProfileFields({ f, set, withGoal = true, withPlace = true }) {
  const eq = f.equip || [];
  const hasBody = Number(f.height) > 0 && Number(f.weight) > 0;
  const [bodyOpen, setBodyOpen] = useState(!hasBody);
  const { areas, rest } = avoidOf(f.avoid);
  const lvl = LEVELS.find(([k]) => k === f.level);
  const b = hasBody ? bmiOf({ height: Number(f.height), weight: Number(f.weight) }) : 0;
  const num = (k, label, unit) => (
    <label className="block min-w-0 rounded-xl bg-bg px-3 pb-2 pt-1.5">
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
        <Box title="Hedef">
          <div className="space-y-2">
            {GOALS.map(([k, l]) => (
              <Option key={k} on={f.goal === k} icon={GOAL_UI[k][0]} title={l} sub={GOAL_UI[k][1]} onClick={() => set("goal", k)} />
            ))}
          </div>
        </Box>
      )}

      <Box title="Seviyen" note={lvl ? LEVEL_UI[lvl[0]][1] : "Birini seç"}>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map(([k, l]) => {
            const on = f.level === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => set("level", k)} className={`relative flex h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 transition active:scale-[.97] ${on ? "border-acc bg-acc text-white" : "border-transparent bg-bg text-acc"}`}>
                <Bars n={LEVEL_UI[k][0]} big />
                <b className={`text-[0.8125rem] font-semibold leading-tight ${on ? "text-white" : "text-fg"}`}>{l}</b>
              </button>
            );
          })}
        </div>
      </Box>

      {withPlace && (
      <Box title="Nerede çalışacaksın">
        <div className="grid grid-cols-3 gap-2">
          {PLACES.map(([k, l]) => {
            const on = f.place === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => set("place", k)} className={`relative overflow-hidden rounded-2xl text-left text-white transition active:scale-[.97] ${on ? "ring-[3px] ring-acc ring-offset-2 ring-offset-card" : "opacity-80"}`} style={{ background: PLACE_BG[k] }}>
                <Icon name={PLACE_UI[k]} className="absolute -bottom-4 -right-4 size-14 opacity-[.12]" />
                <span className="flex h-[5.5rem] flex-col justify-between p-2.5">
                  <Icon name={PLACE_UI[k]} className="size-5" />
                  <b className="text-[0.8125rem] font-semibold leading-tight">{l}</b>
                </span>
                {on && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-white text-acc"><Icon name="check" className="size-3" /></span>}
              </button>
            );
          })}
        </div>
      </Box>
      )}

      {f.place && f.place !== "salon" && (
        <Box title="Ekipman" note={eq.length ? `${eq.length} seçili` : "Vücut ağırlığı"}>
          <div className="grid grid-cols-2 gap-2">
            {[["", "Hiçbiri"], ...EQUIP_KEYS.map((k) => [k, EQUIP[k]])].map(([k, l]) => {
              const on = k ? eq.includes(k) : !eq.length;
              return (
                <button key={k || "yok"} type="button" aria-pressed={on} onClick={() => set("equip", !k ? [] : on ? eq.filter((x) => x !== k) : [...eq, k])} className={`flex h-12 items-center gap-2.5 rounded-xl border-2 px-3 text-left text-[0.875rem] font-semibold transition active:scale-[.98] ${on ? "border-acc bg-acc/[.07]" : "border-transparent bg-bg"}`}>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${on ? "border-acc bg-acc text-white" : "border-line"}`}>{on && <Icon name="check" className="size-3" />}</span>
                  <span className="min-w-0 truncate">{l}</span>
                </button>
              );
            })}
          </div>
        </Box>
      )}

      <Box title="Ölçülerin" note={hasBody && !bodyOpen ? "" : "Kalori ve yükler buna göre"}>
        {hasBody && !bodyOpen ? (
          <button type="button" onClick={() => setBodyOpen(true)} className="flex w-full items-center gap-2 text-left">
            {[
              [f.height, "cm", "Boy"],
              [f.weight, "kg", "Kilo"],
              [f.age || "–", "", "Yaş"],
            ].map(([v, u, l]) => (
              <span key={l} className="flex-1 rounded-xl bg-bg px-3 py-2">
                <small className="block text-[0.6875rem] font-semibold text-mut">{l}</small>
                <b className="text-[1.0625rem] font-semibold">{v}</b>
                <small className="ml-0.5 text-[0.75rem] text-mut">{u}</small>
              </span>
            ))}
            <Icon name="edit" className="ml-1 size-4 shrink-0 text-mut" />
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 rounded-xl bg-bg p-1">
              {[["k", "Kadın"], ["e", "Erkek"]].map(([k, l]) => (
                <button key={k} type="button" aria-pressed={f.sex === k} onClick={() => set("sex", k)} className={`h-9 rounded-lg text-[0.875rem] font-semibold ${f.sex === k ? "bg-card text-acc shadow-[0_2px_8px_-4px_rgba(0,0,0,.25)]" : "text-mut"}`}>{l}</button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {num("height", "Boy", "cm")}
              {num("weight", "Kilo", "kg")}
              {num("age", "Yaş", "")}
            </div>
          </>
        )}
        {b > 0 && <p className="mt-2 text-[0.75rem] text-mut">VKİ {String(Math.round(b * 10) / 10).replace(".", ",")} · {bmiText(b)}</p>}
      </Box>

      <Box title="Sakatlık ya da ağrı" note="İsteğe bağlı">
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => {
            const on = areas.includes(a);
            return (
              <button key={a} type="button" aria-pressed={on} onClick={() => set("avoid", avoidText(on ? areas.filter((x) => x !== a) : [...areas, a], rest))} className={pill(on)}>
                {on && <Icon name="check" className="-ml-1 mr-1 inline size-3.5" />}
                {a}
              </button>
            );
          })}
        </div>
        <input value={rest} onChange={(e) => set("avoid", avoidText(areas, e.target.value))} placeholder="Başka bir not: ör. sırt üstü yatamıyorum" className="mt-2 h-11 w-full min-w-0 rounded-xl bg-bg px-3 text-[0.875rem] outline-none" />
      </Box>
    </>
  );
}
// Program hazırla: 2 kısa soru (Hedef › Haftan). Gün sayısı, saat dilimi ve yer seçilir; gerisi varsayılanla
// (günler gün sayısına göre, 45 dk, 4 hafta, bugün başlar, seviye profilden). Ayrıntılar kapalı "Ayrıntıları ayarla"da.
// Sonunda yapay zekaya giden cümle ya da boş program. Serbest yazı kutusu yok (tek asistan kuralı).
const STEPS = ["Hedef", "Haftan"];
const DAY_SETS = { 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
export function NewProgram({ open, onClose, profile, onAsk, onBlank, busy, goal }) {
  // Tanıtımda hedef kartından gelindiyse hedef seçili, doğrudan 2. soru
  const [step, setStep] = useState(goal ? 1 : 0);
  const [days, setDays] = useState([1, 3, 5]);
  const [slot, setSlot] = useState("sabah");
  const [time, setTime] = useState("07:00");
  const [weeks, setWeeks] = useState(4);
  const [min, setMin] = useState(45);
  const [start, setStart] = useState(todayStr());
  const [more, setMore] = useState(false);
  const [f, setF] = useState(() => ({ goal: "saglik", level: "yeni", place: "salon", equip: [], ...profile, ...(goal ? { goal } : {}) }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const pickSlot = ([k, , , t]) => {
    setSlot(k);
    setTime(t);
  };
  const sorted = [...days].sort((a, b) => a - b);
  // Yapay zekaya giden cümle: seçilenler (ve varsayılanlar) açıkça yazılır
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
  const startText = start === todayStr() ? "bugün" : new Date(`${start}T12:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });

  return (
    <Sheet open={open} onClose={onClose} title="Program hazırla">
      {!goal && (
        <div className="sticky top-0 z-10 -mx-5 bg-card px-5 pb-3">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <button key={s} type="button" aria-label={s} onClick={() => i < step && setStep(i)} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-acc" : "bg-line"}`} />
            ))}
          </div>
        </div>
      )}

      {step === 0 && (
        <>
          <Q title="Hedefin ne?" sub="Program buna göre kurulur." />
          <div className="space-y-2">
            {GOALS.map(([k, l]) => (
              <Option key={k} on={f.goal === k} icon={GOAL_UI[k][0]} title={l} sub={GOAL_UI[k][1]} onClick={() => set("goal", k)} />
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Q title="Haftan nasıl?" sub="Üç kısa seçim yeter, gerisini biz ayarlarız." />
          <Box title="Haftada kaç gün">
            <Segment list={[2, 3, 4, 5]} value={sorted.length} onChange={(n) => setDays(DAY_SETS[n])} unit="gün" />
            <small className="mt-2 block text-[0.75rem] text-mut">{sorted.map((d) => DOWS[d]).join(", ")}</small>
          </Box>
          <Box title="Ne zaman">
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map(([k, l, ic, t]) => {
                const on = slot === k;
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => pickSlot([k, l, ic, t])} className={`flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 transition active:scale-[.97] ${on ? "border-acc bg-acc text-white" : "border-transparent bg-bg"}`}>
                    <Icon name={ic} className={`size-5 ${on ? "" : "text-acc"}`} />
                    <b className="text-[0.8125rem] font-semibold leading-tight">{l}</b>
                  </button>
                );
              })}
            </div>
          </Box>
          <Box title="Nerede">
            <div className="grid grid-cols-3 gap-2">
              {PLACES.map(([k, l]) => {
                const on = f.place === k;
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => set("place", k)} className={`flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 transition active:scale-[.97] ${on ? "border-acc bg-acc text-white" : "border-transparent bg-bg"}`}>
                    <Icon name={PLACE_UI[k]} className={`size-5 ${on ? "" : "text-acc"}`} />
                    <b className="text-[0.8125rem] font-semibold leading-tight">{l}</b>
                  </button>
                );
              })}
            </div>
          </Box>

          {/* Ayrıntılar: varsayılanlar yazılı, istenirse açılır */}
          <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="mt-3 flex w-full items-center gap-2 rounded-2xl px-1 py-2 text-left">
            <span className="min-w-0 flex-1">
              <b className="block text-[0.875rem] font-semibold text-acc">Ayrıntıları ayarla</b>
              {!more && <small className="block truncate text-[0.75rem] text-mut">{`${min} dk · ${weeks} hafta · ${startText} başlar · ${labelOf(LEVELS, f.level)}`}</small>}
            </span>
            <Icon name="chev" className={`size-4 shrink-0 text-acc transition-transform ${more ? "-rotate-90" : "rotate-90"}`} />
          </button>
          {more && (
            <>
              <Box title="Günler" note={sorted.length ? `Haftada ${sorted.length} gün` : "En az bir gün seç"}>
                <div className="grid grid-cols-7 gap-1.5">
                  {DOWS.slice(1).map((d, i) => {
                    const on = days.includes(i + 1);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i + 1) : [...days, i + 1])} className={`aspect-square rounded-full text-[0.8125rem] font-bold transition active:scale-90 ${on ? "bg-acc text-white" : "bg-bg text-mut"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-2 flex h-11 items-center justify-between rounded-xl bg-bg px-3">
                  <span className="text-[0.875rem] text-mut">Saat</span>
                  <input type="time" value={time} onChange={(e) => (setTime(e.target.value), setSlot(""))} className="appearance-none bg-transparent text-right text-[0.9375rem] font-semibold outline-none" />
                </label>
              </Box>
              <Box title="Süre">
                <small className="mb-1.5 block text-[0.75rem] font-semibold text-mut">Her antrenman</small>
                <Segment list={[30, 45, 60, 90]} value={min} onChange={setMin} unit="dk" />
                <small className="mb-1.5 mt-3 block text-[0.75rem] font-semibold text-mut">Program</small>
                <Segment list={[4, 6, 8, 12]} value={weeks} onChange={setWeeks} unit="hafta" />
                <label className="mt-3 flex h-11 items-center justify-between rounded-xl bg-bg px-3">
                  <span className="text-[0.875rem] text-mut">Başlangıç</span>
                  <input type="date" value={start} min={todayStr()} onChange={(e) => setStart(e.target.value)} className="appearance-none bg-transparent text-right text-[0.9375rem] font-semibold outline-none" />
                </label>
              </Box>
              <ProfileFields f={f} set={set} withGoal={!!goal} withPlace={false} />
            </>
          )}
        </>
      )}

      {/* Alt düğmeler */}
      <div className="sticky bottom-0 -mx-5 mt-5 bg-card px-5 pt-3">
        {last ? (
          <div className="flex flex-col gap-1">
            <Button loading={busy} disabled={!sorted.length} onClick={() => onAsk(text(), f, pre)}>
              <Icon name="spark" className="size-5" />
              Programımı hazırla
            </Button>
            <div className="flex items-center justify-between">
              {!goal ? (
                <button type="button" disabled={busy} onClick={() => setStep(0)} className="h-10 px-2 text-[0.875rem] font-semibold text-mut">
                  Geri
                </button>
              ) : <span />}
              <button type="button" disabled={busy || !sorted.length} onClick={() => onBlank(pre, f)} className="h-10 px-2 text-[0.875rem] font-semibold text-mut">
                Kendim hazırlayacağım
              </button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setStep(1)}>
            Devam
            <Icon name="chev" className="size-4" />
          </Button>
        )}
      </div>
    </Sheet>
  );
}
