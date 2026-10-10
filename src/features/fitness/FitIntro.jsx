"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";

// İlk kez gelen (hiç programı ve fitness antrenmanı olmayan) kullanıcıya tanıtım: kısa mesaj, hedef başına
// kaydırmalı kartlar (düzenli çalışınca haftalar içinde ne değişir), 3 adımda nasıl işler, "Programımı oluştur".
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

function GoalCard({ g }) {
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

export function FitIntro({ name, onStart }) {
  const first = (name || "").trim().split(/\s+/)[0];
  const rail = useRef(null);
  const [at, setAt] = useState(0);
  const onScroll = () => {
    const el = rail.current;
    if (!el) return;
    const w = el.firstElementChild?.getBoundingClientRect().width || 1;
    setAt(Math.min(GOAL_CARDS.length - 1, Math.max(0, Math.round(el.scrollLeft / (w + 12)))));
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

      <h3 className="mb-2 mt-5 px-1 text-[0.8125rem] font-bold tracking-[.06em] text-mut">DÜZENLİ ÇALIŞINCA NE DEĞİŞİR?</h3>
      <div ref={rail} onScroll={onScroll} className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9%] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GOAL_CARDS.map((g) => (
          <GoalCard key={g.key} g={g} />
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {GOAL_CARDS.map((g, i) => (
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
