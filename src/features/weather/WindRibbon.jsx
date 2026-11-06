"use client";

import { colorOf } from "@/lib/windMap";

// Rüzgâr şeridi: günün rüzgârı tek dalga (Seyhun 2026-11-06 "o üst hava durumu süper, farklı bir tasarım", örnek ana-sayfa/hava-serit.html).
// Ana sayfa, hava sayfası, yarış havası ve canlı ekran hep bu bileşeni kullanır; yalnız konumun satırları (rows: dayHours / loadRaceDay) farklıdır.
// Dalganın altı saat saat rüzgâr haritasının renginde (colorOf; tablodaki sağanak kutularıyla aynı), noktalı çizgi hamle, 17 kn üstü amber "sert" bölge,
// zirvede balon, bugünse "şimdi" çizgisi. Yağmur: tahminde burada ≥%50 ve ≥0,3 mm olan saatler dolu damla, radar yakında yağış gösterip burada yoksa
// ("çevreden geçecek") içi boş halka (yağmur kuralı #1210). Altında her saat: yön oku, saat, sıcaklık.
// tone "sky": gökyüzü üstünde beyaz yazı; "light": açık sayfada koyu yazı. win: [saat, saat] yarışın saatleri (mavi altı çizgili).
const HARD = 17;
const MIN_MAX = 22;

function smooth(pts) {
  if (pts.length < 2) return "";
  const f = (n) => n.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f((pts[i][0] + pts[i + 1][0]) / 2)} ${f((pts[i][1] + pts[i + 1][1]) / 2)}`;
  return `${d} L${f(pts.at(-1)[0])} ${f(pts.at(-1)[1])}`;
}

// Önemli yağmur saatleri: burada (tahmin) ya da çevrede (radar yakında, burada yok)
export function rainSpan(rows, nowH = -1, radar = null) {
  const wet = rows.filter((r) => (r.rain ?? 0) >= 50 && (r.mm ?? 0) >= 0.3).map((r) => +r.hh);
  if (wet.length) return { here: true, from: wet[0], to: wet.find((h, i) => wet[i + 1] !== h + 1) ?? wet.at(-1) };
  if (nowH >= 0 && radar?.near && radar.near.km <= 15) return { here: false, from: nowH, to: Math.min(23, nowH + 2) };
  return null;
}

export function WindRibbon({ rows, nowH = -1, radar = null, tone = "sky", win = null, h = 96, legend = true, className = "" }) {
  // Akşam geç saatte (kalan saat az) günün tamamı gösterilir (insight.js ile aynı)
  const from = nowH >= 0 && nowH <= 18 ? Math.max(6, nowH - 1) : 6;
  const hrs = (rows || []).filter((r) => +r.hh >= from && +r.hh <= 23 && r.wind != null);
  if (hrs.length < 4) return null;
  const n = hrs.length;
  const max = Math.max(MIN_MAX, ...hrs.map((r) => r.gust ?? r.wind)) * 1.08;
  const X = (i) => ((i + 0.5) / n) * 100;
  const Y = (v) => 100 - (v / max) * 92 - 2;
  const wp = hrs.map((r, i) => [X(i), Y(r.wind)]);
  const gp = hrs.map((r, i) => [X(i), Y(r.gust ?? r.wind)]);
  const edge = (p) => [[0, p[0][1]], ...p, [100, p.at(-1)[1]]];
  const dw = smooth(edge(wp));
  const dg = smooth(edge(gp));
  const stops = [0, ...hrs.map((_, i) => X(i)), 100].map((x, i, a) => {
    const r = hrs[Math.min(n - 1, Math.max(0, i - 1))];
    return <stop key={i} offset={`${x}%`} stopColor={colorOf(r.wind)} />;
  });
  const pk = hrs.reduce((m, r, i) => (r.wind > hrs[m].wind ? i : m), 0);
  const ni = nowH >= 0 ? hrs.findIndex((r) => +r.hh === nowH) : -1;
  const rain = rainSpan(hrs, nowH, radar);
  const ri0 = rain ? hrs.findIndex((r) => +r.hh >= rain.from) : -1;
  let ri1 = rain ? hrs.map((r) => +r.hh).lastIndexOf(Math.min(rain.to, +hrs.at(-1).hh)) : -1;
  if (ri1 < ri0) ri1 = ri0;
  const step = n <= 9 ? 1 : n <= 14 ? 2 : 3;
  const uid = `wr${hrs[0].hh}${n}`;
  const light = tone === "light";
  const vars = light
    ? { "--wr-fg": "var(--color-fg, #1d2433)", "--wr-mut": "var(--color-mut, #6b7385)", "--wr-line": "rgba(11,26,51,.45)", "--wr-chip": "#fff", "--wr-chipfg": "#b45309", "--wr-rain": "#2f6fc0" }
    : { "--wr-fg": "#fff", "--wr-mut": "rgba(255,255,255,.75)", "--wr-line": "#fff", "--wr-chip": "#fff", "--wr-chipfg": "#b45309", "--wr-rain": "#cfe3ff" };
  const inWin = (hh) => win && +hh >= win[0] && +hh < win[1];
  return (
    <div data-wind-ribbon className={`text-[color:var(--wr-fg)] ${className}`} style={vars}>
      <div className="relative" style={{ height: h + 18 }}>
        {rain && (
          <span
            data-rain-span={rain.here ? "here" : "near"}
            aria-label={rain.here ? "Burada yağmur bekleniyor" : "Yağmur çevreden geçecek"}
            className="absolute top-0 bottom-0 rounded-xl border border-dashed border-[#7db4ff]/70 bg-[#7db4ff]/25"
            style={{ left: `${(ri0 / n) * 100}%`, width: `${((ri1 - ri0 + 1) / n) * 100}%` }}
          >
            <i className={`absolute left-1/2 top-1 size-3 -translate-x-1/2 rounded-full border-2 border-[color:var(--wr-rain)] ${rain.here ? "bg-[color:var(--wr-rain)]" : ""}`} />
          </span>
        )}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 block w-full overflow-visible" style={{ height: h }} aria-hidden="true">
          <defs>
            <linearGradient id={uid} x1="0" x2="1">{stops}</linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height={Math.max(0, Y(HARD))} fill="#ffb54d" fillOpacity=".14" />
          <line x1="0" x2="100" y1={Y(HARD)} y2={Y(HARD)} stroke="#ffe0b3" strokeOpacity=".7" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          <path d={`${dw} L100 100 L0 100Z`} fill={`url(#${uid})`} fillOpacity=".95" />
          <path d={dg} fill="none" stroke="var(--wr-line)" strokeOpacity=".85" strokeWidth="1.6" strokeDasharray="2 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={dw} fill="none" stroke="var(--wr-line)" strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {ni >= 0 && <line x1={X(ni)} x2={X(ni)} y1="0" y2="100" stroke="var(--wr-line)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        </svg>
        <span
          className="absolute -translate-x-1/2 -translate-y-full rounded-full bg-[color:var(--wr-chip)] px-2 py-0.5 text-[0.75rem] font-bold tabular-nums text-[color:var(--wr-chipfg)] shadow-sm"
          style={{ left: `${X(pk)}%`, top: `${18 + (Y(hrs[pk].wind) / 100) * h - 6}px` }}
        >
          {hrs[pk].wind} kn
        </span>
        <i className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${X(pk)}%`, top: `${18 + (Y(hrs[pk].wind) / 100) * h}px` }} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {hrs.map((r, i) => {
          const show = i % step === 0 || i === ni;
          return (
            <span key={r.hh} className={`grid justify-items-center gap-0.5 pt-1 text-center text-[0.6875rem] tabular-nums ${show ? "" : "invisible"}`}>
              {r.dir != null ? (
                <svg viewBox="0 0 16 16" aria-label={`${Math.round(r.dir)}°`} className="size-3.5" style={{ transform: `rotate(${r.dir + 180}deg)` }}>
                  <path d="M8 1l5 13-5-3-5 3z" fill="currentColor" />
                </svg>
              ) : (
                <i className="size-3.5" />
              )}
              <b className={`font-semibold ${inWin(r.hh) ? "text-[#2f6fc0] underline decoration-2 underline-offset-2" : ""}`}>{i === ni ? "şimdi" : r.hh}</b>
              {r.t != null && <small className="text-[0.6875rem] text-[color:var(--wr-mut)]">{Math.round(r.t)}°</small>}
            </span>
          );
        })}
      </div>
      {legend && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[0.625rem] text-[color:var(--wr-mut)]" aria-hidden="true">
          sakin
          <i className="h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg,${[0, 5, 9, 13, 17, 22, 28, 34].map((k) => colorOf(k)).join(",")})` }} />
          çok sert
        </div>
      )}
    </div>
  );
}
