"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useWindObs } from "./useWindObs";
import { dayHours, dirDeg, getPlace, nowOf, sky, windName } from "./weather";
import { dayPlans, dayWeather, planTone } from "@/lib/homeTiles";

// Ortak Hava kutusu (Seyhun 2026-11-12 "hava durumu sayfasını da ana sayfa hava durumuna göre yap… gerçekleşen değerleri de göster… birleştir";
// örnek ana-sayfa/sade-2026-11/hava.html). Ana sayfa (IpadHome) ve hava sayfası (WeatherTop) aynı parçaları kullanır:
// HavaPanel (solda pusula: şimdi, istasyon ölçümü varsa ondan; sağda seçili günün saat saat rüzgârı, geçen saatler ölçülen beyaz çizgi),
// DayCell (bir gün: gök, sıcaklık, gün içi rüzgâr, yön, yağış; geçmiş gün ölçülenden, "ölçülen" etiketli; plans verilirse planlar).
export const H0 = 6;
export const H1 = 24;
// Rüzgâr rengi (kn): hafif mavi, iyi yeşil, sert sarı, çok sert kırmızı
export const windColor = (k) => (k == null ? "#4f6389" : k < 6 ? "#5f86c4" : k < 12 ? "#35b48a" : k < 18 ? "#d9a93a" : "#e0675e");
const SKY_TONE = { sun: "#f3c45b", cloudSun: "#e9c46a", moon: "#a9b8d6", cloud: "#b9c8e4", fog: "#b9c8e4", rain: "#7fb0ff", storm: "#a99cf0", snow: "#cfe3ff" };
export const pad = (n) => String(n).padStart(2, "0");
export const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);

export function SkyIcon({ code, day = true, size = "size-5" }) {
  const s = sky(code, day);
  return <Icon name={s.icon} className={`${size} shrink-0`} style={{ color: SKY_TONE[s.icon] || "#b9c8e4" }} aria-label={s.label} />;
}

// Kutunun genişliği (grafikler yazıyı bozmadan çizilsin diye piksel olarak)
export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Gerçekleşen rüzgâr: istasyonun bugünkü/geçmiş gün ölçümleri (yalnız geçen saatler)
export function useObsRows(date, today) {
  const ob = useWindObs(getPlace(), date, today);
  const nowH = new Date().getHours();
  return { station: ob?.station || null, rows: (ob?.rows || []).filter((o) => o.wind != null && (date < today || +o.hh <= nowH)) };
}

// Hava kutusu. date: seçili gün; rows: o günün saatleri (hava sayfasında bugün radarla düzeltilmiş); onOpen: kutuya dokununca
export function HavaPanel({ w, err, refresh, date, today, rows, nowH, title = "Hava", onOpen }) {
  const isToday = date === today;
  const place = getPlace();
  const n = nowOf(w);
  const dw = dayWeather(w, rows, date);
  const now = useObsRows(today, today);
  const day = useObsRows(date, today);
  // Pusula: son 2 saatte istasyon ölçümü varsa o (gerçek), yoksa tahminin şimdisi
  const last = now.rows.at(-1);
  const real = last && new Date().getHours() - +last.hh <= 2 ? last : null;
  const cur = n && (real ? { ...n, wind: Math.round(real.wind), gust: real.gust != null ? Math.round(real.gust) : n.gust, dir: real.dir ?? n.dir } : n);
  const dname = isToday ? "Bugün" : cap(new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" }));
  const open = onOpen || (() => refresh?.(true));
  return (
    <section className="iph-pn iph-wx" aria-label="Hava">
      <button type="button" onClick={w ? open : () => refresh?.(true)} className="iph-now" aria-label="Hava ayrıntısı">
        <span className="iph-pt">
          {title}
          <span className="flex-1" />
          <em className="truncate">{real ? `ölçülen ${real.hh}:00` : place.name}</em>
        </span>
        {cur ? (
          <>
            <Compass wind={cur.wind} gust={cur.gust} dir={cur.dir} />
            <span className="mt-1 flex items-center gap-2.5">
              <SkyIcon code={cur.code} day={cur.day} size="size-7" />
              <span className="num text-[1.5rem] leading-none">{cur.t}°</span>
              <small className="text-[0.75rem] font-semibold leading-tight text-mut">
                {windName(cur.dir)?.[0]}
                {dw && <span className="num block">{dw.min}°/{dw.max}°</span>}
              </small>
            </span>
          </>
        ) : (
          <span className="grid flex-1 place-items-center text-[0.875rem] text-mut">{err ? "Hava alınamadı · dokun, yenile" : "Hava yükleniyor…"}</span>
        )}
      </button>
      <div className="min-w-0">
        <span className="iph-pt">
          {dname} · saat saat<span className="flex-1" />
          <span className="iph-lg">
            <span>
              <i className="bg-[#8fb3ff]" />
              tahmin
            </span>
            <span>
              <i className="iph-dash" />
              sağanak
            </span>
            {day.rows.length > 0 && (
              <span className="text-white">
                <i className="bg-white" />
                ölçülen
              </span>
            )}
          </span>
        </span>
        <WindChart rows={rows} nowH={isToday ? nowH : null} onOpen={open} obs={day.rows} />
      </div>
    </section>
  );
}

// Pusula: dış halkada yön çizgileri, beyaz üçgen rüzgârın geldiği yön, yanında sağanak yayı (renk = kn); ortada şimdiki rüzgâr
export function Compass({ wind, gust, dir }) {
  const S = 196;
  const c = S / 2;
  const R = c - 14;
  const P = (r, a) => [c + r * Math.cos(((a - 90) * Math.PI) / 180), c + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const ticks = [];
  for (let a = 0; a < 360; a += 10) {
    const [x1, y1] = P(R, a);
    const [x2, y2] = P(R - (a % 90 ? 6 : 12), a);
    ticks.push(<line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a % 90 ? "#2a4472" : "#8fb3ff"} strokeWidth={a % 90 ? 1 : 2} />);
  }
  const has = dir != null && Number.isFinite(+dir);
  const span = Math.min(40, Math.max(8, ((gust ?? wind) - wind) * 3));
  const [ax, ay] = P(R + 8, (dir || 0) - span);
  const [bx, by] = P(R + 8, (dir || 0) + span);
  const tri = [P(R + 2, dir || 0), P(R - 18, (dir || 0) - 7), P(R - 18, (dir || 0) + 7)];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="iph-compass" role="img" aria-label={`Rüzgâr ${wind} knot, sağanak ${gust ?? wind}, ${windName(dir)?.[0] || ""} ${dirDeg(dir)}`}>
      <circle cx={c} cy={c} r={R} fill="rgba(255,255,255,.02)" stroke="#1d3256" />
      {ticks}
      {[
        ["K", 0],
        ["D", 90],
        ["G", 180],
        ["B", 270],
      ].map(([t, a]) => {
        const [x, y] = P(R - 26, a);
        return (
          <text key={t} x={x} y={y + 4} fill="#7d90b5" fontSize="12" fontWeight="700" textAnchor="middle">
            {t}
          </text>
        );
      })}
      {has && (
        <>
          <path d={`M${ax} ${ay} A${R + 8} ${R + 8} 0 0 1 ${bx} ${by}`} stroke={windColor(gust ?? wind)} strokeWidth="4" fill="none" strokeLinecap="round" />
          <polygon points={tri.map((p) => p.join(",")).join(" ")} fill="#fff" />
        </>
      )}
      <text x={c} y={c + 8} fill="#fff" fontSize="58" textAnchor="middle" className="num" fontWeight="500">
        {Math.round(wind ?? 0)}
      </text>
      <text x={c} y={c + 32} fill="#7d90b5" fontSize="12.5" textAnchor="middle" fontWeight="600">
        kn · sağanak {Math.round(gust ?? wind ?? 0)}
      </text>
    </svg>
  );
}


// Seçili günün rüzgâr eğrisi (06–24): dolgu rüzgâr (tahmin), kesik çizgi sağanak, beyaz çizgi + noktalar ölçülen (istasyon); altında 3 saatlik bloklarda rüzgâr aralığı, gök, sıcaklık; bugünse kırmızı çizgi şimdi
export function WindChart({ rows, nowH, onOpen, obs = [] }) {
  const [ref, W] = useWidth();
  const H = 196;
  const pts = (rows || []).filter((h) => +h.hh >= H0).map((h) => ({ ...h, x: +h.hh }));
  const X = (h) => 30 + ((h - H0) / (H1 - H0)) * (W - 42);
  const wy0 = 10;
  const wy1 = H - 64;
  const top = Math.max(20, ...pts.map((p) => p.gust ?? p.wind ?? 0), ...(obs || []).map((o) => o.gust ?? o.wind ?? 0)) + 3;
  const Y = (k) => wy1 - (k / top) * (wy1 - wy0);
  const blocks = [];
  for (let h = H0; h < H1; h += 3) {
    const b = pts.filter((p) => p.x >= h && p.x < h + 3);
    if (!b.length) continue;
    const mid = b[Math.floor(b.length / 2)];
    blocks.push({ h, wind: Math.max(...b.map((p) => p.wind)), gust: Math.max(...b.map((p) => p.gust ?? p.wind)), code: mid.code, day: mid.day, t: mid.t });
  }
  // Ölçülen (istasyon): saat saat beyaz çizgi + noktalar, sağanak beyaz kesik; bloğun saatleri ölçülmüşse rakamlar ölçülenden, beyaz
  const ob = (obs || []).filter((o) => o.wind != null && +o.hh >= H0).map((o) => ({ x: +o.hh, wind: o.wind, gust: o.gust ?? null }));
  blocks.forEach((b) => {
    const m = ob.filter((o) => o.x >= b.h && o.x < b.h + 3);
    if (m.length) Object.assign(b, { obs: true, wind: Math.max(...m.map((o) => o.wind)), gust: Math.max(...m.map((o) => o.gust ?? o.wind)) });
  });
  const oLine = (k) => ob.filter((o) => o[k] != null).map((o, i) => `${i ? "L" : "M"}${X(o.x).toFixed(1)} ${Y(o[k]).toFixed(1)}`).join(" ");
  const line = (k) => pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p[k] ?? p.wind).toFixed(1)}`).join(" ");
  const area = pts.length ? `M${X(pts[0].x)} ${wy1} ${line("wind").replace(/^M/, "L")} L${X(pts.at(-1).x)} ${wy1}Z` : "";
  const nowWind = nowH != null && pts.length ? pts.reduce((a, p) => (Math.abs(p.x - nowH) < Math.abs(a.x - nowH) ? p : a), pts[0]).wind : null;
  return (
    <div ref={ref} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()} className="relative cursor-pointer" style={{ height: H }} aria-label="Saat saat rüzgâr">
      {W > 0 && pts.length > 1 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
          <defs>
            <linearGradient id="iph-wz" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3d7bff" stopOpacity=".45" />
              <stop offset="1" stopColor="#3d7bff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 10, 20, 30].filter((k) => k < top).map((k) => (
            <g key={k}>
              <line x1="30" x2={W - 10} y1={Y(k)} y2={Y(k)} stroke="#16294a" />
              <text x="24" y={Y(k) + 4} fill="#4f6389" fontSize="11" textAnchor="end">
                {k}
              </text>
            </g>
          ))}
          <path d={area} fill="url(#iph-wz)" />
          <path d={line("wind")} stroke="#8fb3ff" strokeWidth="2.2" fill="none" />
          <path d={line("gust")} stroke="#8fb3ff" strokeWidth="1.3" strokeDasharray="4 4" fill="none" opacity=".7" />
          {ob.length > 1 && <path d={oLine("gust")} stroke="#fff" strokeWidth="1.1" strokeDasharray="2 3" fill="none" opacity=".75" />}
          {ob.length > 1 && <path d={oLine("wind")} stroke="#fff" strokeWidth="2.2" fill="none" />}
          {ob.map((o) => (
            <circle key={o.x} cx={X(o.x)} cy={Y(o.wind)} r="2.6" fill="#fff" />
          ))}
          {[6, 9, 12, 15, 18, 21, 24].map((h) => (
            <text key={h} x={X(h)} y={wy1 + 14} fill="#4f6389" fontSize="10.5" textAnchor="middle" fontWeight="600">
              {pad(h % 24)}
            </text>
          ))}
          {nowH != null && nowH >= H0 && (
            <>
              <line x1={X(nowH)} x2={X(nowH)} y1={wy0} y2={wy1} stroke="var(--rec)" strokeWidth="1.6" />
              {nowWind != null && <circle cx={X(nowH)} cy={Y(nowWind)} r="5" fill="var(--rec)" stroke="#fff" strokeWidth="2" />}
            </>
          )}
        </svg>
      )}
      {W > 0 && (
        <div className="absolute inset-x-0 bottom-0 flex" style={{ paddingLeft: 30, paddingRight: 12 }}>
          {blocks.map((b) => (
            <span key={b.h} className="flex flex-1 flex-col items-center gap-0.5">
              <b className="num text-[0.8125rem] font-semibold" style={{ color: b.obs ? "#fff" : windColor((b.wind + b.gust) / 2) }}>
                {Math.round(b.wind)}–{Math.round(b.gust)}
              </b>
              <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-[#cfdcf5]">
                <SkyIcon code={b.code} day={b.day} size="size-4" />
                {b.t}°
              </span>
            </span>
          ))}
        </div>
      )}
      {!pts.length && <p className="grid h-full place-items-center text-[0.875rem] text-mut">Bu gün için hava tahmini yok</p>}
    </div>
  );
}


// Bir gün: gün adı + tarih, gök + en düşük/en yüksek, gün içi rüzgâr eğrisi (12 ve 18 çizgili), rüzgâr aralığı + yön, yağış; plans verilirse planlar.
// Geçmiş gün (Seyhun 2026-11-12 "gerçekleşen"): rüzgâr aralığı ve beyaz eğri istasyon ölçümünden, altta "ölçülen"
export function DayCell({ date, today, w, plans = null, on, nowH, onSel }) {
  const rows = dayHours(w, date);
  const dw = dayWeather(w, rows, date);
  const past = date < today;
  const ob = useObsRows(date, today).rows;
  const src = past && ob.length ? ob : rows || [];
  const dayRows = src.filter((h) => h.hh >= "08" && h.hh <= "20");
  const lo = dayRows.length ? Math.round(Math.min(...dayRows.map((h) => h.wind))) : null;
  const hi = dayRows.length ? Math.round(Math.max(...dayRows.map((h) => h.gust ?? h.wind))) : null;
  const mm = (rows || []).reduce((a, h) => a + (h.mm || 0), 0);
  const prob = Math.max(0, ...(rows || []).map((h) => h.rain || 0));
  const noon = (rows || []).find((h) => h.hh === "13");
  const ps = plans ? dayPlans(plans, date) : null;
  const d = new Date(`${date}T12:00`);
  const real = past && ob.length > 0;
  const col = real ? "#fff" : windColor(((lo ?? 0) + (hi ?? 0)) / 2);
  return (
    <button type="button" onClick={onSel} aria-pressed={on} data-past={past ? "" : undefined} className="iph-day" aria-label={d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}>
      <span className="flex items-baseline justify-between gap-1">
        <small className="truncate text-[0.6875rem]">{date === today ? "Bugün" : cap(d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""))}</small>
        <b className="num text-[1.125rem] font-medium leading-none">{d.getDate()}</b>
      </span>
      {dw ? (
        <>
          <span className="flex items-center justify-between">
            <SkyIcon code={dw.code} />
            <span className="num text-[0.6875rem] text-[#cfdcf5]">
              {dw.min}/{dw.max}°
            </span>
          </span>
          <Spark rows={rows} nowH={nowH} color={col} obs={date <= today ? ob : []} dim={real} />
          <span className="flex items-center justify-between">
            <span className="num text-[0.75rem] font-semibold" style={{ color: col }}>
              {lo}–{hi}
            </span>
            {noon?.dir != null && (
              <svg viewBox="-7 -7 14 14" className="size-3.5" style={{ transform: `rotate(${noon.dir + 180}deg)` }} aria-label={windName(noon.dir)?.[0]}>
                <path d="M0 -6 L4 4 L0 2 L-4 4Z" fill="#cfdcf5" />
              </svg>
            )}
          </span>
          <span className={`num flex justify-between gap-1 text-[0.6875rem] font-semibold ${mm >= 0.1 ? "text-[#7fb0ff]" : "text-[#4f6389]"}`}>
            {mm >= 0.1 ? (
              <>
                <span>{mm < 10 ? mm.toFixed(1).replace(".", ",") : Math.round(mm)} mm</span>
                {!past && <span>%{prob}</span>}
              </>
            ) : (
              "Kuru"
            )}
          </span>
        </>
      ) : (
        <span className="py-6 text-center text-[0.6875rem] text-[#4f6389]">Tahmin yok</span>
      )}
      {ps ? (
        <span className="flex min-w-0 items-center gap-1 border-t border-line pt-1.5">
          {ps.slice(0, 4).map((p) => (
            <i key={p.id} className={`tone-${planTone(p)} tone-bar size-1.5 shrink-0 rounded-full`} />
          ))}
          <span className="min-w-0 truncate text-[0.6875rem] font-semibold text-[#cfdcf5]">{ps[0]?.title || "Plan yok"}</span>
        </span>
      ) : (
        real && <span className="iph-tag">ölçülen</span>
      )}
    </button>
  );
}

function Spark({ rows, nowH, color, obs = [], dim = false }) {
  const pts = (rows || []).filter((h) => +h.hh >= H0);
  if (pts.length < 2) return <span className="h-[2.125rem]" />;
  const W = 100;
  const H = 34;
  const top = Math.max(20, ...pts.map((p) => p.gust ?? p.wind), ...obs.map((o) => o.gust ?? o.wind)) + 2;
  const X = (h) => ((h - H0) / (H1 - H0)) * W;
  const Y = (k) => H - 2 - (k / top) * (H - 4);
  const l = (k) => pts.map((p, i) => `${i ? "L" : "M"}${X(+p.hh).toFixed(1)} ${Y(p[k] ?? p.wind).toFixed(1)}`).join(" ");
  const ob = obs.filter((o) => +o.hh >= H0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[2.125rem] w-full" aria-hidden="true">
      <path d={`M${X(+pts[0].hh)} ${H} ${l("wind").replace(/^M/, "L")} L${X(+pts.at(-1).hh)} ${H}Z`} fill="#3d7bff" fillOpacity=".22" />
      <path d={l("gust")} stroke="#8fb3ff" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity=".6" vectorEffect="non-scaling-stroke" />
      <path d={l("wind")} stroke={dim ? "#8fb3ff" : color} strokeWidth={dim ? 1.2 : 1.8} opacity={dim ? 0.5 : 1} fill="none" vectorEffect="non-scaling-stroke" />
      {ob.length > 1 && <path d={ob.map((o, i) => `${i ? "L" : "M"}${X(+o.hh).toFixed(1)} ${Y(o.wind).toFixed(1)}`).join(" ")} stroke="#fff" strokeWidth="1.8" fill="none" vectorEffect="non-scaling-stroke" />}
      {[12, 18].map((h) => (
        <line key={h} x1={X(h)} x2={X(h)} y1="0" y2={H} stroke="#1d3256" vectorEffect="non-scaling-stroke" />
      ))}
      {nowH != null && nowH >= H0 && <line x1={X(nowH)} x2={X(nowH)} y1="0" y2={H} stroke="var(--rec)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
