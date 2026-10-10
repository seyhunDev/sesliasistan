"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";

// İlk kez gelen (hiç programı ve fitness antrenmanı olmayan) kullanıcıya tanıtım: adıyla motivasyon, dolan halkalar
// (antrenman, dakika, seri), adım adım ne olacağı, "Programımı oluştur" (Program hazırla açılır).
const RINGS = [
  { label: "Antrenman", to: 12, unit: "", color: "var(--acc)", r: 62 },
  { label: "Dakika", to: 540, unit: "", color: "#f59e0b", r: 46 },
  { label: "Hafta seri", to: 4, unit: "", color: "#3b82f6", r: 30 },
];
const FILL = 1.8; // halkaların dolma süresi (sn)
const LOOP = 7; // sonra baştan

// Apple Saat'teki gibi dolan halkalar: 4 haftalık programda seni bekleyenler (antrenman, dakika, seri); sayılar birlikte artar.
function Rings() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const arcs = [...el.querySelectorAll("[data-arc]")];
    const nums = [...el.querySelectorAll("[data-num]")];
    const draw = (k) => {
      const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
      arcs.forEach((a, i) => {
        const len = 2 * Math.PI * RINGS[i].r;
        a.setAttribute("stroke-dashoffset", String(len * (1 - e)));
      });
      nums.forEach((n, i) => (n.textContent = String(Math.round(RINGS[i].to * e))));
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      draw(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const loop = (now) => {
      const t = ((now - t0) / 1000) % LOOP;
      draw(t < LOOP - 0.6 ? (t - 0.3) / FILL : 1 - (t - (LOOP - 0.6)) / 0.6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={ref} className="flex items-center gap-4">
      <svg viewBox="0 0 150 150" className="size-36 shrink-0 -rotate-90" role="img" aria-label="4 haftada 12 antrenman, 540 dakika, 4 hafta seri">
        {RINGS.map((g) => (
          <g key={g.label}>
            <circle cx="75" cy="75" r={g.r} fill="none" stroke={g.color} strokeOpacity=".15" strokeWidth="13" />
            <circle data-arc cx="75" cy="75" r={g.r} fill="none" stroke={g.color} strokeWidth="13" strokeLinecap="round" strokeDasharray={2 * Math.PI * g.r} strokeDashoffset={2 * Math.PI * g.r} />
          </g>
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {RINGS.map((g) => (
          <li key={g.label}>
            <small className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-mut">
              <span className="size-2 rounded-full" style={{ background: g.color }} />
              {g.label}
            </small>
            <b data-num className="block text-[1.5rem] font-bold leading-none tabular-nums" style={{ color: g.color }}>
              0
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS = [
  ["flag", "Hedefini seç", "Yağ yakmak, kas, güç ya da kondisyon."],
  ["user", "Kendini anlat", "Seviyen, nerede çalışacağın, ekipmanın."],
  ["cal", "Haftanı planla", "Hangi günler, saat kaçta, kaç dakika."],
  ["spark", "Program hazır", "Yapay zeka hazırlar, sen düzenler, takvime eklersin."],
  ["check", "Yap ve işaretle", "Setleri işaretle, gelişimini gör."],
];

export function FitIntro({ name, onStart }) {
  const first = (name || "").trim().split(/\s+/)[0];
  return (
    <div className="pb-4">
      <section className="mt-2 overflow-hidden rounded-[1.75rem] bg-deep px-5 pb-5 pt-5 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[0.6875rem] font-bold tracking-[.06em] text-white/85">
          <Icon name="flame" className="size-3.5" />
          İLK ADIM
        </span>
        <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.15] tracking-tight">
          {first ? `${first}, ` : ""}her tekrar seni hedefine biraz daha yaklaştırır.
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-snug text-white/75">Bugün başla; programını birlikte hazırlayalım, her antrenmanı birlikte takip edelim.</p>
      </section>

      <section className={`${card} mt-3 p-4 text-fg`}>
        <small className="block pb-3 text-[0.75rem] font-bold tracking-[.06em] text-mut">4 HAFTADA SENİ BEKLEYENLER</small>
        <Rings />
        <p className="mt-3 text-[0.8125rem] leading-snug text-mut">Haftada 3 antrenmanla. Programına uydukça bu sayılar senin olur.</p>
      </section>

      <h3 className="mb-2 mt-5 px-1 text-[0.8125rem] font-bold tracking-[.06em] text-mut">NASIL İŞLER</h3>
      <ol className={`${card} px-4 py-2`}>
        {STEPS.map(([icon, title, sub], i) => (
          <li key={title} className="relative flex gap-3 py-2.5">
            {i < STEPS.length - 1 && <span className="absolute left-[1.0625rem] top-12 h-[calc(100%-2.5rem)] w-px bg-line" />}
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
              <Icon name={icon} className="size-4" />
              <b className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-acc text-[0.5625rem] font-bold text-white">{i + 1}</b>
            </span>
            <span className="min-w-0 pt-0.5">
              <b className="block text-[0.9375rem] font-semibold">{title}</b>
              <small className="block text-[0.8125rem] leading-snug text-mut">{sub}</small>
            </span>
          </li>
        ))}
      </ol>

      <Button onClick={onStart} className="mt-4 w-full">
        <Icon name="dumbbell" className="size-5" />
        Programımı oluştur
      </Button>
      <p className="mt-2 text-center text-[0.75rem] text-mut">Yaklaşık 1 dakika sürer. İstersen asistana da söyleyebilirsin.</p>
    </div>
  );
}
