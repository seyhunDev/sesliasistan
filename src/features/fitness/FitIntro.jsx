"use client";

import { useEffect, useRef, useState } from "react";
import { bmiOf, bmiText, hasBody, introCards, introKey } from "@/lib/fitness/forecast";
import { askIntro } from "./fitnessData";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";

// İlk kez gelen (hiç programı ve fitness antrenmanı olmayan) kullanıcıya tanıtım: kısa mesaj, boy/kilo yoksa sorulur,
// hedef başına kaydırmalı kartlar (düzenli çalışınca haftalar içinde ne değişir; boy ve kilo varsa kişiye göre tahmin),
// 3 adımda nasıl işler, "Programımı oluştur".
const GOAL_CARDS = [
  { key: "kilo", icon: "flame", color: "#f97316", title: "Yağ yakmak" },
  { key: "kas", icon: "dumbbell", color: "var(--acc)", title: "Kas kütlesi" },
  { key: "guc", icon: "zap", color: "#8b5cf6", title: "Güç" },
  { key: "kondisyon", icon: "trend", color: "#3b82f6", title: "Kondisyon" },
  { key: "saglik", icon: "sun", color: "#10b981", title: "Sağlık ve zindelik" },
];

const HOW = [
  ["flag", "Seç", "Hedef ve günler"],
  ["spark", "Hazırla", "Programın hazır"],
  ["check", "İşaretle", "Gelişimini gör"],
];

// Boy ve kilo yoksa: kısa form (yaş ve cinsiyet isteğe bağlı). Tanıtımda ve Fitness sayfasında.
export function BodyAsk({ fit, onSave, onLater, laterText = "Şimdi değil", className = "" }) {
  const [f, setF] = useState({ height: fit?.height || "", weight: fit?.weight || "", age: fit?.age || "", sex: fit?.sex || "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const ok = Number(f.height) >= 100 && Number(f.weight) >= 30;
  const box = "h-12 w-full min-w-0 rounded-xl bg-bg px-3 text-[1rem] font-semibold outline-none placeholder:font-normal placeholder:text-mut";
  const field = (k, label, unit) => (
    <label className="min-w-0">
      <small className="mb-1 block text-[0.75rem] font-semibold text-mut">{label}</small>
      <span className="relative block">
        <input inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))} className={box} />
        {unit && <small className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.8125rem] text-mut">{unit}</small>}
      </span>
    </label>
  );
  return (
    <section data-body-ask className={`${card} p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
          <Icon name="user" className="size-5" />
        </span>
        <span className="min-w-0">
          <b className="block text-[1rem] font-semibold leading-snug">Boy ve kilonu girer misin?</b>
          <small className="block text-[0.8125rem] leading-snug text-mut">Sana uygun antrenmanı buna göre hazırlarım.</small>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {field("height", "Boy", "cm")}
        {field("weight", "Kilo", "kg")}
        {field("age", "Yaş (isteğe bağlı)", "")}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[
          ["k", "Kadın"],
          ["e", "Erkek"],
        ].map(([k, l]) => (
          <button key={k} type="button" onClick={() => set("sex", f.sex === k ? "" : k)} className={`h-10 rounded-xl text-[0.875rem] font-semibold ${f.sex === k ? "bg-acc text-white" : "bg-bg text-mut"}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {onLater && (
          <button type="button" onClick={onLater} className="h-11 px-3 text-[0.875rem] font-semibold text-mut">
            {laterText}
          </button>
        )}
        <Button
          className="flex-1"
          disabled={!ok}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave({ ...fit, height: Number(f.height), weight: Number(f.weight), age: Number(f.age) || "", sex: f.sex });
            } finally {
              setBusy(false);
            }
          }}
        >
          Kaydet
        </Button>
      </div>
    </section>
  );
}

// Tanıtımdaki boy-kilo adımı: tam ekran, cinsiyet kutuları, büyük sayılar ve − / + (basılı tutunca hızlanır),
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

function BodyStep({ fit, onSave, onLater }) {
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
      <button type="button" onClick={onLater} className="mt-1 h-11 w-full text-[0.875rem] font-semibold text-mut">
        Şimdi değil
      </button>
    </div>
  );
}

function GoalCard({ g, c, onAsk }) {
  const fc = c.box;
  return (
    <article className={`${card} w-[82%] shrink-0 snap-center p-5`}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${g.color} 14%, transparent)`, color: g.color }}>
          <Icon name={g.icon} className="size-6" />
        </span>
        <span className="min-w-0">
          <small className="block text-[0.6875rem] font-bold tracking-[.06em] text-mut">HEDEFİN</small>
          <b className="block text-[1.25rem] font-bold leading-tight">{g.title}</b>
        </span>
      </div>
      {fc ? (
        <div className="mt-4 rounded-2xl px-3.5 py-3" style={{ background: `color-mix(in srgb, ${g.color} 9%, transparent)` }}>
          <div className="flex items-center gap-2 text-[0.8125rem] text-mut">
            <span className="truncate">{fc.now}</span>
            <Icon name="chev" className="size-3.5 shrink-0" />
            <span className="shrink-0">8 hafta sonra</span>
          </div>
          <b className="mt-0.5 block text-[1.375rem] font-bold leading-tight" style={{ color: g.color }}>
            {fc.then}
          </b>
          <small className="mt-0.5 block text-[0.75rem] leading-snug text-mut">{fc.sub}</small>
        </div>
      ) : (
        <button type="button" onClick={onAsk} className="mt-4 flex w-full items-center gap-2 rounded-2xl bg-bg px-3.5 py-3 text-left text-[0.8125rem] leading-snug text-mut">
          <span className="shrink-0" style={{ color: g.color }}>
            <Icon name="user" className="size-4" />
          </span>
          <span className="flex-1">Boy ve kilonu girersen sana özel sonucu gösteririm.</span>
          <Icon name="chev" className="size-4 shrink-0" />
        </button>
      )}
      <ol className="mt-4">
        {c.weeks.map(([w, t], i) => (
          <li key={w} className="relative flex gap-3 pb-3.5 last:pb-0">
            {i < c.weeks.length - 1 && <span className="absolute left-[0.4375rem] top-4 h-full w-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${g.color} 22%, transparent)` }} />}
            <span className="relative mt-1 size-4 shrink-0 rounded-full border-[3px] bg-card" style={{ borderColor: g.color, opacity: 0.55 + i * 0.22 }} />
            <span className="min-w-0">
              <small className="block text-[0.75rem] font-bold" style={{ color: g.color }}>
                {w}
              </small>
              <span className="block text-[0.9375rem] leading-snug">{t}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-xl bg-bg px-3 py-2 text-[0.8125rem] leading-snug text-mut">{c.tip}</p>
    </article>
  );
}

// Kartlar hazırlanırken: ortada dönen ışık halkası, içinde hedeflerin simgeleri sırayla, altında değişen yazı
const LOAD_LINES = ["Boyun ve kilon inceleniyor", "Hedeflerine göre hesaplanıyor", "Sana özel kartlar hazırlanıyor"];
function Preparing({ first }) {
  const [i, setI] = useState(0);
  const [line, setLine] = useState(0);
  useEffect(() => {
    const a = setInterval(() => setI((x) => (x + 1) % GOAL_CARDS.length), 700);
    const b = setInterval(() => setLine((x) => Math.min(LOAD_LINES.length - 1, x + 1)), 1300);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);
  const g = GOAL_CARDS[i];
  return (
    <section className="mt-2 flex min-h-[28rem] flex-col items-center justify-center rounded-[1.75rem] bg-deep px-6 py-10 text-center text-white">
      <div className="relative grid size-40 place-items-center">
        <span className="absolute inset-0 rounded-full motion-safe:animate-spin" style={{ background: `conic-gradient(from 0deg, transparent 0 55%, ${g.color} 100%)`, animationDuration: "1.4s", transition: "background .5s" }} />
        <span className="absolute inset-[6px] rounded-full bg-deep" />
        <span className="absolute inset-6 rounded-full motion-safe:animate-ping" style={{ background: g.color, opacity: 0.12, animationDuration: "1.8s" }} />
        <span key={g.key} className="relative grid size-20 place-items-center rounded-full bg-white/10 motion-safe:animate-[fadein_.35s_ease-out]" style={{ color: g.color }}>
          <Icon name={g.icon} className="size-10" />
        </span>
      </div>
      <h2 className="mt-8 text-[1.5rem] font-bold leading-tight">{first ? `${first}, sana özel hazırlıyorum` : "Sana özel hazırlıyorum"}</h2>
      <p key={line} className="mt-2 text-[0.9375rem] text-white/70 motion-safe:animate-[fadein_.4s_ease-out]">
        {LOAD_LINES[line]}…
      </p>
      <div className="mt-5 flex gap-1.5">
        {LOAD_LINES.map((_, k) => (
          <span key={k} className={`h-1.5 rounded-full transition-all duration-500 ${k <= line ? "w-6 bg-white" : "w-1.5 bg-white/25"}`} />
        ))}
      </div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}

// Akış: boy/kilo yoksa önce yalnız onlar sorulur → kaydedince "hazırlıyorum" → yapay zekanın kişiye özel kartları.
// "Atla" denirse genel kartlar. Yapay zekaya ulaşılamazsa kartlar yerel hesapla (introCards).
export function FitIntro({ name, fit, onStart, onSaveBody }) {
  const first = (name || "").trim().split(/\s+/)[0];
  const [skip, setSkip] = useState(false);
  const [hi, setHi] = useState(true); // önce yalnız karşılama, "Devam" ile sonraki adım
  // res.key bugünkü profilden farklıysa hazırlanıyor; data null: yapay zekasız · {headline, cards}
  const [res, setRes] = useState({ key: "", data: null });
  const rail = useRef(null);
  const [at, setAt] = useState(0);
  const body = hasBody(fit);
  const key = body ? introKey(fit) : "";
  useEffect(() => {
    if (!key) return;
    let live = true;
    const t0 = Date.now();
    askIntro(fit).then(async (r) => {
      const took = Date.now() - t0;
      // Önbellekten geldiyse beklemeden; yoksa animasyon en az 2,4 sn görünür
      if (took > 200 && took < 2400) await new Promise((ok) => setTimeout(ok, 2400 - took));
      if (live) setRes({ key, data: r });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (hi) {
    return (
      <div className="pb-4">
        <section className="mt-2 flex min-h-[26rem] flex-col items-center justify-center rounded-[1.75rem] bg-deep px-6 py-8 text-center text-white">
          <span className="grid size-20 place-items-center rounded-full bg-white/10">
            <Icon name="dumbbell" className="size-9" />
          </span>
          <h2 className="mt-7 text-[1.875rem] font-bold leading-[1.15] tracking-tight">{first ? `${first}, hoş geldin.` : "Hoş geldin."}</h2>
          <p className="mt-2 text-[1.0625rem] text-white/75">Her antrenman seni hedefine biraz daha yaklaştırır.</p>
        </section>
        <Button onClick={() => setHi(false)} className="mt-4 w-full">
          Devam
        </Button>
      </div>
    );
  }
  if (!body && !skip) {
    return (
      <div className="pb-4">
        <BodyStep fit={fit} onSave={onSaveBody} onLater={() => setSkip(true)} />
      </div>
    );
  }
  if (body && res.key !== key) return <Preparing first={first} />;

  const data = introCards(body ? res.data : null, body ? fit : {});
  const byKey = new Map(data.cards.map((c) => [c.key, c]));
  // Kullanıcının seçtiği hedef varsa onun kartı önde
  const cards = fit?.goal ? [...GOAL_CARDS].sort((a, b) => (b.key === fit.goal) - (a.key === fit.goal)) : GOAL_CARDS;
  const toAsk = () => setSkip(false);
  const onScroll = () => {
    const el = rail.current;
    if (!el) return;
    const w = el.firstElementChild?.getBoundingClientRect().width || 1;
    setAt(Math.min(cards.length - 1, Math.max(0, Math.round(el.scrollLeft / (w + 12)))));
  };
  const go = (i) => {
    const el = rail.current;
    const c = el?.children[i];
    if (c) el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.clientWidth) / 2, behavior: "smooth" });
  };
  return (
    <div className="pb-4">
      <section className="mt-2 rounded-[1.75rem] bg-deep px-5 py-5 text-white">
        <h2 className="text-[1.75rem] font-bold leading-[1.15] tracking-tight">{first ? `${first}, hadi başlayalım.` : "Hadi başlayalım."}</h2>
        <p className="mt-1.5 text-[0.9375rem] text-white/75">{data.headline || "Düzenli çalış, farkı haftalar içinde gör."}</p>
      </section>

      <h3 className="mb-2 mt-5 px-1 text-[0.8125rem] font-bold tracking-[.06em] text-mut">DÜZENLİ ÇALIŞINCA NE DEĞİŞİR?</h3>
      <div ref={rail} onScroll={onScroll} className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9%] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((g) => (
          <GoalCard key={g.key} g={g} c={byKey.get(g.key)} onAsk={toAsk} />
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {cards.map((g, i) => (
          <button key={g.key} type="button" aria-label={g.title} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all ${i === at ? "w-5 bg-acc" : "w-1.5 bg-line"}`} />
        ))}
      </div>

      <h3 className="mb-2 mt-6 px-1 text-[0.8125rem] font-bold tracking-[.06em] text-mut">NASIL İŞLER</h3>
      <div className={`${card} flex items-start justify-between px-3 py-4`}>
        {HOW.map(([icon, title, sub], i) => (
          <div key={title} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center text-center">
              <span className="grid size-11 place-items-center rounded-full bg-acc/10 text-acc">
                <Icon name={icon} className="size-5" />
              </span>
              <b className="mt-2 text-[0.875rem] font-semibold">{title}</b>
              <small className="text-[0.75rem] leading-snug text-mut">{sub}</small>
            </div>
            {i < HOW.length - 1 && <Icon name="chev" className="mt-3.5 size-4 shrink-0 text-mut/60" />}
          </div>
        ))}
      </div>

      <Button onClick={onStart} className="mt-5 w-full">
        <Icon name="dumbbell" className="size-5" />
        Programımı oluştur
      </Button>
      <p className="mt-2 text-center text-[0.75rem] text-mut">Yaklaşık 1 dakika sürer.</p>
    </div>
  );
}
