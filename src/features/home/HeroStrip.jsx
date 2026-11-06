"use client";

// Hava üst alanının altındaki saatlik sayılar ve altında bugünün eğrisi (Seyhun 2026-11-06 "altta sayılar ve grafik, sayıların altında"; örnek ana-sayfa/ana-tum.html).
// ins: insight.js sonucu (chart.vals: { hh, v }). Sakin günde sıcaklık eğrisi, rüzgâr artışında rüzgâr eğrisi ve "sert" bölge (17 kn üstü, kehribar),
// yağmurda yağış ihtimali sütunları. Sayılar: şimdi + sonraki saatlerden en çok 6 (iki saat arayla). Zirve sayı kehribar. Ayrı kart, çerçeve yok.
const HARD = 17; // kn: "sert" rüzgâr eşiği (windLevel)
const W = 320;

export function pickVals(vals, n = 7) {
  if (!vals?.length) return [];
  const step = vals.length <= n ? 1 : Math.ceil((vals.length - 1) / (n - 1));
  const out = [];
  for (let i = 0; i < vals.length && out.length < n; i += step) out.push(vals[i]);
  return out;
}

export function HeroStrip({ ins, now, wide = false }) {
  const c = ins?.chart;
  if (!c || c.vals.length < 3) return null;
  const nums = pickVals(c.vals, wide ? 9 : 7);
  const peak = nums.reduce((m, p) => (p.v > m.v ? p : m), nums[0]);
  const rain = c.kind === "rain";
  const wind = c.kind === "wind";
  const H = wide ? 64 : 76;
  const lo = rain ? 0 : Math.min(...c.vals.map((p) => p.v)), hi = rain ? 100 : Math.max(...c.vals.map((p) => p.v), wind ? HARD + 2 : 0);
  const rng = hi - lo || 1;
  const P = 8;
  const y = (v) => P + (1 - (v - lo) / rng) * (H - P - 6);
  const x = (i) => (i / (c.vals.length - 1)) * W;
  const pts = c.vals.map((p, i) => [x(i), y(p.v)]);
  // Yumuşak eğri: noktalar arasında orta noktalardan geçen ikinci derece yaylar
  const f = (n) => n.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f((pts[i][0] + pts[i + 1][0]) / 2)} ${f((pts[i][1] + pts[i + 1][1]) / 2)}`;
  d += ` L${f(pts.at(-1)[0])} ${f(pts.at(-1)[1])}`;
  const pi = c.vals.findIndex((p) => p.v === c.peak.v);
  const bw = (W / c.vals.length) * 0.62;
  return (
    <div className="mt-3" aria-label={c.label}>
      <div className="grid text-center text-[0.75rem] tabular-nums" style={{ gridTemplateColumns: `repeat(${nums.length}, minmax(0, 1fr))` }}>
        {nums.map((p, i) => (
          <span key={p.hh} className="grid">
            <i className="not-italic text-white/75">{i === 0 && now ? "şimdi" : p.hh}</i>
            <b className={`text-[0.9375rem] ${i === 0 ? "mx-auto rounded-lg bg-white/20 px-1.5" : p === peak ? "text-[#ffe0b3]" : ""}`}>
              {p.v}
              {c.unit}
            </b>
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`mt-0.5 block ${wide ? "w-full" : "-mx-4 w-[calc(100%+2rem)]"}`} style={{ height: H }} aria-hidden="true">
        {rain ? (
          <g fill="#cfe0ff">
            {c.vals.map((p, i) => (
              <rect key={p.hh} x={((i + 0.5) / c.vals.length) * W - bw / 2} y={y(p.v)} width={bw} height={Math.max(2, H - y(p.v))} rx="3" fillOpacity={0.35 + (p.v / 100) * 0.6} />
            ))}
          </g>
        ) : (
          <>
            {wind && <rect x="0" y={y(hi)} width={W} height={Math.max(0, y(HARD) - y(hi))} fill="#ffa94d" fillOpacity=".22" />}
            {wind && <line x1="0" x2={W} y1={y(HARD)} y2={y(HARD)} stroke="#ffd9a3" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />}
            <path d={`${d} L${W} ${H} L0 ${H} Z`} fill="#fff" fillOpacity=".2" />
            <path d={d} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <circle cx={pts[0][0] + 6} cy={pts[0][1]} r="4.5" fill="#fff" />
            <circle cx={pts[pi][0]} cy={pts[pi][1]} r="4" fill={wind ? "#ffc47a" : "#fff"} />
          </>
        )}
      </svg>
    </div>
  );
}
