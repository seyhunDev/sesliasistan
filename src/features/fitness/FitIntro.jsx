"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";

// İlk kez gelen (hiç programı ve fitness antrenmanı olmayan) kullanıcıya tanıtım: adıyla motivasyon, şınav çeken ve her
// tekrarda biraz kilo veren kişi animasyonu, adım adım ne olacağı, "Programımı oluştur" (Program hazırla açılır).
const FLOOR = 150;
const FEET = [262, 146];
const HAND = [118, FLOOR];
const BODY = 150; // ayaktan omza
const ARM = 31; // üst kol ve ön kol
const REP = 1.5; // bir şınav (sn)
const REPS = 10; // sonra baştan
const START_KG = 85;

// Dirsek: omuz ve el arasında iki parçalı kol (dirsek ayak tarafına bükülür)
function elbow(s, h) {
  const dx = h[0] - s[0];
  const dy = h[1] - s[1];
  const d = Math.min(Math.hypot(dx, dy), ARM * 2 - 0.01);
  const a = d / 2;
  const t = Math.sqrt(Math.max(0, ARM * ARM - a * a));
  const mx = s[0] + (dx * a) / d;
  const my = s[1] + (dy * a) / d;
  const ex = [mx - (dy * t) / d, my + (dx * t) / d];
  const ey = [mx + (dy * t) / d, my - (dx * t) / d];
  return ex[0] > ey[0] ? ex : ey;
}

// Tekrar ilerlemesi (0 yukarıda, 1 aşağıda) ve kaçıncı tekrar → çizim noktaları
export function pose(down, rep) {
  const y = FEET[1] - (54 - 38 * down); // omuz yüksekliği
  const sin = (FEET[1] - y) / BODY;
  const cos = Math.sqrt(1 - sin * sin);
  const s = [FEET[0] - BODY * cos, y];
  const hip = [FEET[0] - BODY * 0.55 * cos, FEET[1] - BODY * 0.55 * sin];
  const mid = [(s[0] + hip[0]) / 2, (s[1] + hip[1]) / 2];
  const belly = 15 - rep * 1.3; // her tekrarda göbek küçülür
  const n = [-sin, cos]; // gövdenin altı
  return {
    s,
    hip,
    e: elbow(s, HAND),
    head: [s[0] - 17 * cos, s[1] - 17 * sin - 3],
    belly: [mid[0] + n[0] * (belly * 0.55), mid[1] + n[1] * (belly * 0.55)],
    bellyR: Math.max(4, belly),
    kg: START_KG - rep * 0.1,
  };
}

function PushUp() {
  const ref = useRef(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const $ = (id) => svg.querySelector(`[data-p="${id}"]`);
    const torso = $("torso");
    const legs = $("legs");
    const upper = $("upper");
    const fore = $("fore");
    const head = $("head");
    const belly = $("belly");
    const kg = $("kg");
    const rep = $("rep");
    const minus = $("minus");
    const draw = (sec) => {
      const t = sec % (REP * REPS);
      const r = Math.floor(t / REP);
      const ph = (t % REP) / REP;
      const p = pose((1 - Math.cos(ph * Math.PI * 2)) / 2, r);
      torso.setAttribute("d", `M${p.s[0]} ${p.s[1]}L${p.hip[0]} ${p.hip[1]}`);
      legs.setAttribute("d", `M${p.hip[0]} ${p.hip[1]}L${FEET[0]} ${FEET[1]}`);
      upper.setAttribute("d", `M${p.s[0]} ${p.s[1]}L${p.e[0]} ${p.e[1]}`);
      fore.setAttribute("d", `M${p.e[0]} ${p.e[1]}L${HAND[0]} ${HAND[1]}`);
      head.setAttribute("cx", p.head[0]);
      head.setAttribute("cy", p.head[1]);
      belly.setAttribute("cx", p.belly[0]);
      belly.setAttribute("cy", p.belly[1]);
      belly.setAttribute("r", p.bellyR);
      kg.textContent = `${p.kg.toFixed(1).replace(".", ",")} kg`;
      rep.textContent = `${r + 1}. şınav`;
      // Her tekrarın sonunda "−0,1 kg" yukarı süzülür
      const f = ph > 0.6 ? (ph - 0.6) / 0.4 : -1;
      minus.setAttribute("opacity", f < 0 ? 0 : String(1 - f));
      minus.setAttribute("transform", `translate(0 ${f < 0 ? 0 : -12 * f})`);
    };
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      draw(REP * 0.25);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const loop = (now) => {
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg ref={ref} viewBox="0 0 320 172" className="block w-full" role="img" aria-label="Şınav çeken ve kilo veren kişi">
      <defs>
        <linearGradient id="fit-floor" x1="0" x2="1">
          <stop offset="0" stopColor="var(--acc)" stopOpacity="0" />
          <stop offset=".5" stopColor="var(--acc)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="20" y={FLOOR + 1} width="280" height="3" rx="1.5" fill="url(#fit-floor)" />
      <ellipse cx="190" cy={FLOOR + 6} rx="88" ry="4" fill="var(--acc)" opacity=".08" />
      <g stroke="var(--acc)" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path data-p="legs" strokeWidth="11" />
        <path data-p="fore" strokeWidth="8" />
        <path data-p="torso" strokeWidth="17" />
        <path data-p="upper" strokeWidth="9" />
      </g>
      <circle data-p="belly" fill="var(--acc)" />
      <circle data-p="head" r="11" fill="var(--acc)" />
      <g fontFamily="inherit" textAnchor="end">
        <text data-p="kg" x="300" y="34" fontSize="22" fontWeight="700" fill="currentColor" />
        <text data-p="rep" x="300" y="52" fontSize="11" fill="var(--mut)" />
      </g>
      <text data-p="minus" x="300" y="80" textAnchor="end" fontSize="13" fontWeight="700" fill="var(--acc)">
        −0,1 kg
      </text>
    </svg>
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

      <section className={`${card} mt-3 px-3 pb-2 pt-3 text-fg`}>
        <PushUp />
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
