"use client";

import { useEffect, useRef, useState } from "react";
import { bmiOf, bmiText } from "@/lib/fitness/forecast";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";

// İlk kez gelen (hiç programı ve fitness antrenmanı olmayan) kullanıcıya tek ekran: kısa karşılama ve "Programımı hazırla".
// Hedef ve hafta Program hazırla penceresinde sorulur; boy, kilo ve diğer ayrıntılar sonra (profil) eklenir.

// Boy-kilo adımı (tanıtımda tam ekran, Fitness sayfasında pencerede): tam ekran, cinsiyet kutuları, büyük sayılar ve − / + (basılı tutunca hızlanır),
// altta canlı VKİ. Sayıya dokununca klavyeyle de yazılır. Yaş isteğe bağlı (boşken "—").
const START = { e: [176, 78], k: [163, 62], "": [170, 70] };
// Basılı tutunca hızlanan − / + düğmesi
function HoldBtn({ label, onStep, children }) {
  const timer = useRef(0);
  const stop = () => {
    clearTimeout(timer.current);
    clearInterval(timer.current);
  };
  useEffect(() => () => {
    clearTimeout(timer.current);
    clearInterval(timer.current);
  }, []);
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-12 shrink-0 select-none place-items-center rounded-full bg-bg text-[1.5rem] font-medium text-fg touch-manipulation"
      onPointerDown={(e) => {
        e.preventDefault();
        onStep();
        timer.current = setTimeout(() => {
          timer.current = setInterval(onStep, 70);
        }, 380);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {children}
    </button>
  );
}

function Stepper({ label, value, unit, min, max, onChange, empty }) {
  const bump = (d) => onChange((v) => Math.min(max, Math.max(min, (Number(v) || (d > 0 ? empty - 1 : empty + 1)) + d)));
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <b className="w-12 shrink-0 text-[0.9375rem] font-semibold text-mut">{label}</b>
      <HoldBtn label={`${label} azalt`} onStep={() => bump(-1)}>
        −
      </HoldBtn>
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <input
          inputMode="numeric"
          aria-label={label}
          value={value}
          placeholder="—"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
          style={{ width: `${Math.max(String(value).length, 1) + 0.2}ch` }}
          className="bg-transparent text-center text-[2.25rem] font-bold leading-none tabular-nums outline-none placeholder:text-mut/50"
        />
        <small className="text-[0.9375rem] font-semibold text-mut">{unit}</small>
      </label>
      <HoldBtn label={`${label} artır`} onStep={() => bump(1)}>
        +
      </HoldBtn>
    </div>
  );
}

export function BodyStep({ fit, onSave, onLater, laterText = "Şimdi değil" }) {
  const sex0 = fit?.sex || "";
  const [sex, setSex] = useState(sex0);
  const [h, setH] = useState(fit?.height || START[sex0][0]);
  const [w, setW] = useState(fit?.weight || START[sex0][1]);
  const [age, setAge] = useState(fit?.age || "");
  const [touched, setTouched] = useState(!!(fit?.height || fit?.weight));
  const [busy, setBusy] = useState(false);
  const pickSex = (k) => {
    setSex(k);
    if (!touched) {
      setH(START[k][0]);
      setW(START[k][1]);
    }
  };
  const t = (set) => (v) => {
    setTouched(true);
    set(v);
  };
  const ok = Number(h) >= 100 && Number(h) <= 230 && Number(w) >= 30 && Number(w) <= 250;
  const b = ok ? bmiOf({ height: Number(h), weight: Number(w) }) : 0;
  return (
    <div data-body-ask className="pb-4 pt-3">
      <small className="block px-1 text-[0.75rem] font-bold tracking-[.08em] text-acc">SANA ÖZEL PROGRAM</small>
      <h2 className="mt-1 px-1 text-[1.75rem] font-bold leading-[1.15] tracking-tight">Seni tanıyalım</h2>
      <p className="mt-1 px-1 text-[0.9375rem] text-mut">Antrenmanını boyuna ve kilona göre hazırlayacağım.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          ["k", "Kadın"],
          ["e", "Erkek"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => pickSex(k)}
            className={`flex h-16 items-center justify-center gap-2 rounded-2xl text-[1rem] font-semibold transition-colors ${sex === k ? "bg-acc text-white" : "bg-card text-fg shadow-sm"}`}
          >
            <Icon name="user" className="size-5" />
            {l}
          </button>
        ))}
      </div>

      <div className={`${card} mt-3 divide-y divide-line`}>
        <Stepper label="Boy" unit="cm" value={h} min={100} max={230} empty={170} onChange={t(setH)} />
        <Stepper label="Kilo" unit="kg" value={w} min={30} max={250} empty={70} onChange={t(setW)} />
        <Stepper label="Yaş" unit="" value={age} min={12} max={90} empty={30} onChange={setAge} />
      </div>
      <p className="mt-2 px-1 text-[0.8125rem] text-mut">Yaş isteğe bağlı.</p>

      <div className={`mt-3 flex items-center gap-3 rounded-2xl bg-acc/10 px-4 py-3 transition-opacity ${b ? "opacity-100" : "opacity-0"}`}>
        <span className="text-[1.25rem] font-bold tabular-nums text-acc">{String(b).replace(".", ",")}</span>
        <span className="text-[0.875rem] leading-snug">
          <b className="font-semibold">Vücut kitle indeksi</b>
          <small className="block text-[0.8125rem] text-mut">{bmiText(b)}</small>
        </span>
      </div>

      <Button
        className="mt-5 w-full"
        disabled={!ok}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onSave({ ...fit, height: Number(h), weight: Number(w), age: Number(age) || "", sex });
          } finally {
            setBusy(false);
          }
        }}
      >
        Devam
      </Button>
      {onLater && (
        <button type="button" onClick={onLater} className="mt-1 h-11 w-full text-[0.875rem] font-semibold text-mut">
          {laterText}
        </button>
      )}
    </div>
  );
}

const STEPS = ["Hedefini seç", "Haftada kaç gün çalışacağını söyle", "Programın hazır, ilk antrenmanına başla"];

export function FitIntro({ name, onStart }) {
  const first = (name || "").trim().split(/\s+/)[0];
  return (
    <div className="pb-4">
      <section className="mt-2 flex min-h-[18rem] flex-col items-center justify-center rounded-[1.75rem] bg-deep px-6 py-8 text-center text-white">
        <span className="grid size-16 place-items-center rounded-full bg-white/10">
          <Icon name="dumbbell" className="size-8" />
        </span>
        <h2 className="mt-5 text-[1.75rem] font-bold leading-[1.15] tracking-tight">{first ? `${first}, hoş geldin.` : "Hoş geldin."}</h2>
        <p className="mt-2 text-[1rem] text-white/75">Programını birlikte hazırlayalım. Bir dakika sürer.</p>
      </section>
      <ol className="mt-4 space-y-2 px-1">
        {STEPS.map((t, i) => (
          <li key={t} className="flex items-center gap-3 text-[0.9375rem]">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-bold text-acc">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <Button onClick={() => onStart("")} className="mt-5 w-full">
        Programımı hazırla
      </Button>
    </div>
  );
}
