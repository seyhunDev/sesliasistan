"use client";

import { useRef, useState } from "react";
import { forecast, hasBody } from "@/lib/fitness/forecast";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";

// İlk kez gelen (hiç programı ve fitness antrenmanı olmayan) kullanıcıya tanıtım: kısa mesaj, boy/kilo yoksa sorulur,
// hedef başına kaydırmalı kartlar (düzenli çalışınca haftalar içinde ne değişir; boy ve kilo varsa kişiye göre tahmin),
// 3 adımda nasıl işler, "Programımı oluştur".
const GOAL_CARDS = [
  {
    key: "kilo",
    icon: "flame",
    color: "#f97316",
    title: "Yağ yakmak",
    weeks: [
      ["2. hafta", "Enerjin artar, uykun düzelir."],
      ["4. hafta", "Kıyafetlerin daha rahat oturur."],
      ["8. hafta", "Bel çevren incelir, tartı da bunu gösterir."],
    ],
    tip: "Beslenmeyle birlikte etkisi katlanır.",
  },
  {
    key: "kas",
    icon: "dumbbell",
    color: "var(--acc)",
    title: "Kas kütlesi",
    weeks: [
      ["2. hafta", "Hareketleri doğru yapmayı öğrenirsin."],
      ["4. hafta", "Kaldırdığın kilolar artmaya başlar."],
      ["8. hafta", "Kasların belirginleşir, duruşun düzelir."],
    ],
    tip: "Yeterli protein ve uyku büyümeyi hızlandırır.",
  },
  {
    key: "guc",
    icon: "zap",
    color: "#8b5cf6",
    title: "Güç",
    weeks: [
      ["2. hafta", "Aynı ağırlık daha hafif gelir."],
      ["4. hafta", "Temel hareketlerde ilk rekorların gelir."],
      ["8. hafta", "Taşımak, kaldırmak günlük hayatta kolaylaşır."],
    ],
    tip: "Uygulama her hafta hedefini biraz artırır.",
  },
  {
    key: "kondisyon",
    icon: "trend",
    color: "#3b82f6",
    title: "Kondisyon",
    weeks: [
      ["2. hafta", "Merdivende daha az nefes nefese kalırsın."],
      ["4. hafta", "Daha uzun süre yorulmadan çalışırsın."],
      ["8. hafta", "Nabzın daha sakin, toparlanman daha hızlı."],
    ],
    tip: "Kısa ama düzenli antrenman en iyisidir.",
  },
  {
    key: "saglik",
    icon: "sun",
    color: "#10b981",
    title: "Sağlık ve zindelik",
    weeks: [
      ["2. hafta", "Daha dinç uyanır, daha iyi uyursun."],
      ["4. hafta", "Bel ve sırt tutulmaların azalır."],
      ["8. hafta", "Stresin azalır, hareket alışkanlığın olur."],
    ],
    tip: "Haftada 2-3 gün yeter.",
  },
];

const HOW = [
  ["flag", "Seç", "Hedef ve günler"],
  ["spark", "Hazırla", "Programın hazır"],
  ["check", "İşaretle", "Gelişimini gör"],
];

// Boy ve kilo yoksa: kısa form (yaş ve cinsiyet isteğe bağlı). Tanıtımda ve Fitness sayfasında.
export function BodyAsk({ fit, onSave, onLater, className = "" }) {
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
          <small className="block text-[0.8125rem] leading-snug text-mut">Sana gerçekçi sonuçlar gösteririm, programını da buna göre hazırlarım.</small>
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
            Şimdi değil
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

function GoalCard({ g, fit, onAsk }) {
  const fc = forecast(g.key, fit);
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
            <span>8 hafta sonra</span>
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
        {g.weeks.map(([w, t], i) => (
          <li key={w} className="relative flex gap-3 pb-3.5 last:pb-0">
            {i < g.weeks.length - 1 && <span className="absolute left-[0.4375rem] top-4 h-full w-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${g.color} 22%, transparent)` }} />}
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
      <p className="mt-4 rounded-xl bg-bg px-3 py-2 text-[0.8125rem] leading-snug text-mut">{g.tip}</p>
    </article>
  );
}

export function FitIntro({ name, fit, onStart, onSaveBody }) {
  const first = (name || "").trim().split(/\s+/)[0];
  const [later, setLater] = useState(false);
  const askRef = useRef(null);
  const need = !hasBody(fit) && !later;
  // Kullanıcının seçtiği hedef varsa onun kartı önde
  const cards = fit?.goal ? [...GOAL_CARDS].sort((a, b) => (b.key === fit.goal) - (a.key === fit.goal)) : GOAL_CARDS;
  const toAsk = () => {
    setLater(false);
    requestAnimationFrame(() => askRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const rail = useRef(null);
  const [at, setAt] = useState(0);
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
        <p className="mt-1.5 text-[0.9375rem] text-white/75">Düzenli çalış, farkı haftalar içinde gör.</p>
      </section>

      {need && (
        <div ref={askRef}>
          <BodyAsk fit={fit} onSave={onSaveBody} onLater={() => setLater(true)} className="mt-3" />
        </div>
      )}

      <h3 className="mb-2 mt-5 px-1 text-[0.8125rem] font-bold tracking-[.06em] text-mut">DÜZENLİ ÇALIŞINCA NE DEĞİŞİR?</h3>
      <div ref={rail} onScroll={onScroll} className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9%] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((g) => (
          <GoalCard key={g.key} g={g} fit={fit} onAsk={toAsk} />
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
