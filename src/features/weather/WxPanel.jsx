"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useWindObs } from "./useWindObs";
import { fmtRainMm, rainSpan } from "./WindRibbon";
import { dayHours, dirDeg, getPlace, nowOf, sky, windName } from "./weather";
import { dayPlans, dayWeather, planTone } from "@/lib/homeTiles";

// Ortak Hava kutusu (Seyhun 2026-11-12 "hava durumu sayfasını da ana sayfa hava durumuna göre yap… gerçekleşen değerleri de göster… birleştir";
// örnek ana-sayfa/sade-2026-11/hava.html). Ana sayfa (IpadHome) ve hava sayfası (WeatherTop) aynı parçaları kullanır:
// HavaPanel (üstte şimdiki rüzgâr: ok + derece, istasyon ölçümü varsa ondan; altta kenardan kenara saat saat rüzgâr, geçen saatler ölçülen beyaz çizgi),
// DayCell (bir gün: gök, sıcaklık, gün içi rüzgâr, yön, yağış; geçmiş gün ölçülenden, "ölçülen" etiketli; plans verilirse planlar).
export const H0 = 6;
export const H1 = 24;
// Rüzgâr rengi (kn): hafif mavi, iyi yeşil, sert sarı, çok sert kırmızı
// Renkler tema değişkeninden (--wc0…4, açık temada koyu gri, 18 kn ve üstü kehribar; globals.css .acik); tanımsızsa lacivertteki renkler
export const windColor = (k) => (k == null ? "var(--wc0, #4f6389)" : k < 6 ? "var(--wc1, #5f86c4)" : k < 12 ? "var(--wc2, #35b48a)" : k < 18 ? "var(--wc3, #d9a93a)" : "var(--wc4, #e0675e)");
const SKY_TONE = { sun: "var(--sky-sun, #f3c45b)", cloudSun: "var(--sky-sun2, #e9c46a)", moon: "var(--sky-cloud, #a9b8d6)", cloud: "var(--sky-cloud, #b9c8e4)", fog: "var(--sky-cloud, #b9c8e4)", rain: "var(--sky-rain, #7fb0ff)", storm: "var(--sky-storm, #a99cf0)", snow: "var(--sky-snow, #cfe3ff)" };
export const pad = (n) => String(n).padStart(2, "0");
export const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);

export function SkyIcon({ code, day = true, size = "size-5" }) {
  const s = sky(code, day);
  return <Icon name={s.icon} className={`${size} shrink-0`} style={{ color: SKY_TONE[s.icon] || "var(--sky-cloud, #b9c8e4)" }} aria-label={s.label} />;
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
// at: belli bir yer (Bilgi › Yönet › Hava: yarışın yeri); yoksa seçili hava konumu
export function useObsRows(date, today, at = null) {
  const ob = useWindObs(at || getPlace(), date, today);
  const nowH = new Date().getHours();
  return { station: ob?.station || null, rows: (ob?.rows || []).filter((o) => o.wind != null && (date < today || +o.hh <= nowH)) };
}

// Hava kutusu (Seyhun 2026-11-15, örnek ana-sayfa/sade-2026-11/hava-gomulu.html: "pusulaya gerek yok… rüzgârın şiddeti ve yönü, ok ve derece";
// "yağış tek satır"). Üstte büyük rakamla rüzgâr + estiği yönü gösteren ok, altında derece, adı, sağanak; sağda sıcaklık ve gök.
// Bulutluysa arkada yavaş kayan yumuşak gölgeler. Altta kenardan kenara saat saat rüzgâr (WindChart), en altta tek satır yağış.
// date: seçili gün; rows: o günün saatleri (hava sayfasında bugün radarla düzeltilmiş); onOpen: kutuya dokununca
const CLOUDY = new Set(["cloud", "cloudSun", "fog", "rain", "storm", "snow"]);
const AT = { kuzey: "kuzeyinde", kuzeydoğu: "kuzeydoğusunda", doğu: "doğusunda", güneydoğu: "güneydoğusunda", güney: "güneyinde", güneybatı: "güneybatısında", batı: "batısında", kuzeybatı: "kuzeybatısında" };

// Rüzgâr oku: rüzgârın estiği yön (derece geldiği yön; 315° karayel kuzeybatıdan eser, ok güneydoğuyu gösterir)
export function WindArrow({ dir, size = 16, color = "currentColor", className = "" }) {
  if (dir == null || !Number.isFinite(+dir)) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`} style={{ transform: `rotate(${+dir}deg)` }} aria-hidden="true">
      <path d="M12 3v15M6 12l6 7 6-7" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Tek satır yağış: burada bekleniyorsa saat aralığı + mm, yoksa radar yakında gösteriyorsa uzaklık ve yön
export function rainText(rows, nowH, radar) {
  const rs = rows?.length ? rainSpan(rows, nowH ?? -1, radar) : null;
  if (!rs) return "";
  if (rs.here) {
    if (nowH != null && nowH >= 0 && rs.to < nowH) return ""; // bugün yağış saatleri geçti: "bekleniyor" yazılmaz
    const when = rs.from === rs.to ? `${pad(rs.from)}:00` : `${pad(rs.from)}:00–${pad((rs.to + 1) % 24)}:00`;
    return rs.mm >= 0.1 ? `${when} · ${fmtRainMm(rs.mm)} mm bekleniyor` : `${when} arası bekleniyor`;
  }
  const n = radar?.near;
  return n ? `Burada yağmıyor · ${n.km} km ${AT[n.dir] || n.dir} yağış var` : "";
}

export function HavaPanel({ w, err, refresh, date, today, rows, nowH, title = "Hava", onOpen, radar = null, at = null }) {
  const isToday = date === today;
  const place = at || getPlace();
  const n = nowOf(w);
  const dw = dayWeather(w, rows, date);
  const now = useObsRows(today, today, at);
  const day = useObsRows(date, today, at);
  // Şimdi: son 2 saatte istasyon ölçümü varsa o (gerçek), yoksa tahminin şimdisi
  const last = now.rows.at(-1);
  const real = last && new Date().getHours() - +last.hh <= 2 ? last : null;
  const cur = n && (real ? { ...n, wind: Math.round(real.wind), gust: real.gust != null ? Math.round(real.gust) : n.gust, dir: real.dir ?? n.dir } : n);
  const dname = isToday ? "Bugün" : cap(new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" }));
  const open = onOpen || (() => refresh?.(true));
  const sk = cur ? sky(cur.code, cur.day) : null;
  const rain = rainText(rows, isToday ? nowH : -1, isToday ? radar : null);
  return (
    <section className="iph-pn iph-wx" aria-label="Hava">
      {sk && CLOUDY.has(sk.icon) && (
        <>
          <span className="iph-cl" aria-hidden="true" />
          <span className="iph-cl iph-cl-b" aria-hidden="true" />
        </>
      )}
      <button type="button" onClick={w ? open : () => refresh?.(true)} className="iph-now" aria-label="Hava ayrıntısı">
        {cur ? (
          <>
            <span className="min-w-0">
              <span className="iph-pt">
                {title} · {place.name}
                {real && (
                  <em className="iph-live">
                    <i />
                    ölçülen {real.hh}:00
                  </em>
                )}
              </span>
              <span className="iph-kn">
                <WindArrow dir={cur.dir} size={40} color="var(--wx-strong)" className="iph-kn-ar" />
                <b className="num">{Math.round(cur.wind ?? 0)}</b>
                <small>kn</small>
              </span>
              <span className="iph-kn-sub">
                <b>
                  {dirDeg(cur.dir)} {windName(cur.dir)?.[0]}
                </b>{" "}
                · sağanak {Math.round(cur.gust ?? cur.wind ?? 0)}
              </span>
            </span>
            <span className="iph-nowr">
              <span className="num text-[2rem] font-medium leading-none">{cur.t}°</span>
              <span className="flex items-center gap-1.5 text-[0.875rem] text-[var(--wx-t2)]">
                <SkyIcon code={cur.code} day={cur.day} />
                {sk.label}
              </span>
              {dw && <span className="num text-[0.8125rem] text-mut">{dw.min}° / {dw.max}°</span>}
            </span>
          </>
        ) : (
          <span className="grid min-h-[6rem] flex-1 place-items-center text-[0.875rem] text-mut">{err ? "Hava alınamadı · dokun, yenile" : "Hava yükleniyor…"}</span>
        )}
      </button>
      <span className="iph-lg iph-wxlg">
        <span className="text-[var(--wx-t2)]">{dname}</span>
        {day.rows.length > 0 && (
          <span className="text-[var(--wx-strong)]">
            <i className="bg-[var(--wx-obs)]" />
            ölçülen
          </span>
        )}
        <span>
          <i className="bg-[var(--wx-fc)]" />
          tahmin
        </span>
        <span>
          <i className="iph-dash" />
          sağanak
        </span>
      </span>
      <WindChart rows={rows} nowH={isToday ? nowH : null} onOpen={open} obs={day.rows} radar={isToday ? radar : null} />
      {rain && (
        <p className="iph-rain" aria-label="Yağış">
          <em>Yağış</em>
          <span>{rain}</span>
        </p>
      )}
    </section>
  );
}

// Yumuşak eğri (Catmull-Rom → Bezier)
function curve(p) {
  if (p.length < 2) return "";
  const f = (v) => v.toFixed(1);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// Seçili günün rüzgâr eğrisi (06–24), kutunun bir kenarından öbürüne, eksensiz: dolgu rüzgâr (tahmin), kesik çizgi sağanak, beyaz çizgi ölçülen (istasyon);
// yağış saatleri mavi bantta (WindRibbon.rainSpan, #1210, üstünde mm); bugünse kırmızı çizgi şimdi. Gök + sıcaklık grafiğin arkasında soluk (.iph-sky);
// altında 3 saatlik bloklar: ok + rüzgâr aralığı, derece
export function WindChart({ rows, nowH, onOpen, obs = [], radar = null }) {
  const [ref, W] = useWidth();
  const H = 208;
  const pts = (rows || []).filter((h) => +h.hh >= H0).map((h) => ({ ...h, x: +h.hh }));
  const X = (h) => ((h - H0) / (H1 - H0)) * W;
  const wy0 = 24;
  const wy1 = H - 70;
  const top = Math.max(20, ...pts.map((p) => p.gust ?? p.wind ?? 0), ...(obs || []).map((o) => o.gust ?? o.wind ?? 0)) + 3;
  const Y = (k) => wy1 - (k / top) * (wy1 - wy0);
  const blocks = [];
  for (let h = H0; h < H1; h += 3) {
    const b = pts.filter((p) => p.x >= h && p.x < h + 3);
    if (!b.length) continue;
    const mid = b[Math.floor(b.length / 2)];
    blocks.push({ h, wind: Math.max(...b.map((p) => p.wind)), gust: Math.max(...b.map((p) => p.gust ?? p.wind)), code: mid.code, day: mid.day, t: mid.t, dir: mid.dir });
  }
  // Ölçülen (istasyon): beyaz çizgi, sağanak beyaz kesik; bloğun saatleri ölçülmüşse rakamlar ve yön ölçülenden, beyaz
  const ob = (obs || []).filter((o) => o.wind != null && +o.hh >= H0).map((o) => ({ x: +o.hh, wind: o.wind, gust: o.gust ?? null, dir: o.dir }));
  blocks.forEach((b) => {
    const m = ob.filter((o) => o.x >= b.h && o.x < b.h + 3);
    if (m.length) Object.assign(b, { obs: true, wind: Math.max(...m.map((o) => o.wind)), gust: Math.max(...m.map((o) => o.gust ?? o.wind)), dir: m.at(-1).dir ?? b.dir });
  });
  // Kenardan kenara: ilk ve son değer kutunun iki ucuna uzar
  const edge = (p) => (p.length ? [[0, p[0][1]], ...p, [W, p.at(-1)[1]]] : p);
  const wl = edge(pts.map((p) => [X(p.x), Y(p.wind)]));
  const gl = edge(pts.map((p) => [X(p.x), Y(p.gust ?? p.wind)]));
  const oW = ob.map((o) => [X(o.x), Y(o.wind)]);
  const oG = ob.filter((o) => o.gust != null).map((o) => [X(o.x), Y(o.gust)]);
  const area = wl.length ? `${curve(wl)} L${W} ${wy1 + 8} L0 ${wy1 + 8}Z` : "";
  const rs = pts.length ? rainSpan(pts, nowH ?? -1, radar) : null;
  const nowWind = nowH != null && pts.length ? pts.reduce((a, p) => (Math.abs(p.x - nowH) < Math.abs(a.x - nowH) ? p : a), pts[0]).wind : null;
  const rx0 = rs ? X(rs.from - 0.5) : 0;
  const rx1 = rs ? X(rs.to + 0.5) : 0;
  return (
    <div ref={ref} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()} className="iph-wch relative cursor-pointer" style={{ height: H }} aria-label="Saat saat rüzgâr">
      {/* Gök ve sıcaklık (Seyhun 2026-11-23 "grafikte arka plana hafif soluk"): her 3 saatin üstünde, çizgilerin arkasında */}
      {W > 0 && pts.length > 1 && (
        <div className="iph-sky absolute inset-x-0 flex px-2" style={{ top: wy0 + 4 }} aria-hidden="true">
          {blocks.map((b) => (
            <span key={b.h} className="flex min-w-0 flex-1 items-center justify-center gap-1">
              <SkyIcon code={b.code} day={b.day} size="size-5" />
              <span className="num text-[0.8125rem] font-semibold">{b.t}°</span>
            </span>
          ))}
        </div>
      )}
      {W > 0 && pts.length > 1 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="relative block">
          <defs>
            <linearGradient id="iph-wz" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--wx-area)" }} />
              <stop offset="1" style={{ stopColor: "var(--wx-area)" }} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="iph-wl" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: "var(--wx-fc)" }} stopOpacity="0" />
              <stop offset=".05" style={{ stopColor: "var(--wx-fc)" }} />
              <stop offset=".95" style={{ stopColor: "var(--wx-fc)" }} />
              <stop offset="1" style={{ stopColor: "var(--wx-fc)" }} stopOpacity="0" />
            </linearGradient>
          </defs>
          {rs && (
            <g data-rain-span={rs.here ? "here" : "near"}>
              <rect x={rx0} y={wy0 - 18} width={Math.max(8, rx1 - rx0)} height={wy1 - wy0 + 18} rx="10" fill="var(--wx-rain)" fillOpacity=".1" stroke="var(--wx-rain)" strokeOpacity=".45" strokeDasharray="4 4" />
              {rs.here && rs.mm >= 0.1 ? (
                <text data-rain-mm x={(rx0 + rx1) / 2} y={wy0 - 4} fill="var(--wx-raint)" fontSize="11.5" fontWeight="700" textAnchor="middle">yağış · {fmtRainMm(rs.mm)} mm</text>
              ) : (
                <circle cx={(rx0 + rx1) / 2} cy={wy0 - 8} r="4.5" fill={rs.here ? "var(--wx-raindot)" : "none"} stroke="var(--wx-raindot)" strokeWidth="2" />
              )}
            </g>
          )}
          <path d={area} fill="url(#iph-wz)" />
          <path d={curve(gl)} stroke="var(--wx-gust)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
          <path d={curve(wl)} stroke="url(#iph-wl)" strokeWidth="2.4" fill="none" />
          {oG.length > 1 && <path d={curve(oG)} stroke="var(--wx-obs)" strokeWidth="1.1" strokeDasharray="2 3" fill="none" opacity=".75" />}
          {oW.length > 1 && <path d={curve(oW)} stroke="var(--wx-obs)" strokeWidth="2.4" fill="none" />}
          {[6, 9, 12, 15, 18, 21, 24].map((h) => (
            <text key={h} x={Math.min(Math.max(X(h), 12), W - 12)} y={wy1 + 22} fill="var(--wx-axis)" fontSize="11" textAnchor="middle" fontWeight="600">
              {pad(h % 24)}
            </text>
          ))}
          {nowH != null && nowH >= H0 && (
            <>
              <line x1={X(nowH)} x2={X(nowH)} y1={wy0 - 10} y2={wy1 + 8} stroke="var(--rec)" strokeWidth="1.5" />
              {nowWind != null && <circle cx={X(nowH)} cy={Y(nowWind)} r="5" fill="var(--rec)" stroke="#fff" strokeWidth="2" />}
            </>
          )}
        </svg>
      )}
      {W > 0 && (
        <div className="absolute inset-x-0 bottom-0 flex px-2 pb-2.5">
          {blocks.map((b) => {
            const col = b.obs ? "var(--wx-obs)" : windColor((b.wind + b.gust) / 2);
            return (
              <span key={b.h} className="flex min-w-0 flex-1 flex-col items-center">
                <b className="num flex items-center gap-1 text-[0.8125rem] font-semibold" style={{ color: col }}>
                  <WindArrow dir={b.dir} size={13} color={col} />
                  {Math.round(b.wind)}–{Math.round(b.gust)}
                </b>
                <small className="num text-[0.6875rem] text-mut">{dirDeg(b.dir)}</small>
              </span>
            );
          })}
        </div>
      )}
      {!pts.length && <p className="grid h-full place-items-center text-[0.875rem] text-mut">Bu gün için hava tahmini yok</p>}
    </div>
  );
}


// Bir gün: gün adı + tarih, gök + en düşük/en yüksek, gün içi rüzgâr eğrisi (12 ve 18 çizgili), rüzgâr aralığı + yön, yağış; plans verilirse planlar.
// Geçmiş gün (Seyhun 2026-11-12 "gerçekleşen"): rüzgâr aralığı ve beyaz eğri istasyon ölçümünden, altta "ölçülen"
export function DayCell({ date, today, w, plans = null, on, nowH, onSel, at = null }) {
  const rows = dayHours(w, date);
  const dw = dayWeather(w, rows, date);
  const past = date < today;
  const ob = useObsRows(date, today, at).rows;
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
  const col = real ? "var(--wx-obs)" : windColor(((lo ?? 0) + (hi ?? 0)) / 2);
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
            <span className="num text-[0.6875rem] text-[var(--wx-t2)]">
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
                <path d="M0 -6 L4 4 L0 2 L-4 4Z" fill="var(--wx-t2)" />
              </svg>
            )}
          </span>
          <span className={`num flex justify-between gap-1 text-[0.6875rem] font-semibold ${mm >= 0.1 ? "text-[var(--wx-mm)]" : "text-[var(--wx-faint)]"}`}>
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
        <span className="py-6 text-center text-[0.6875rem] text-[var(--wx-faint)]">Tahmin yok</span>
      )}
      {ps ? (
        <span className="flex min-w-0 items-center gap-1 border-t border-line pt-1.5">
          {ps.slice(0, 4).map((p) => (
            <i key={p.id} className={`tone-${planTone(p)} tone-bar size-1.5 shrink-0 rounded-full`} />
          ))}
          <span className="min-w-0 truncate text-[0.6875rem] font-semibold text-[var(--wx-t2)]">{ps[0]?.title || "Plan yok"}</span>
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
      <path d={`M${X(+pts[0].hh)} ${H} ${l("wind").replace(/^M/, "L")} L${X(+pts.at(-1).hh)} ${H}Z`} fill="var(--wx-area)" fillOpacity=".45" />
      <path d={l("gust")} stroke="var(--wx-gust)" strokeWidth="1" strokeDasharray="3 3" fill="none" vectorEffect="non-scaling-stroke" />
      <path d={l("wind")} stroke={dim ? "var(--wx-fc)" : color} strokeWidth={dim ? 1.2 : 1.8} opacity={dim ? 0.5 : 1} fill="none" vectorEffect="non-scaling-stroke" />
      {ob.length > 1 && <path d={ob.map((o, i) => `${i ? "L" : "M"}${X(+o.hh).toFixed(1)} ${Y(o.wind).toFixed(1)}`).join(" ")} stroke="var(--wx-obs)" strokeWidth="1.8" fill="none" vectorEffect="non-scaling-stroke" />}
      {[12, 18].map((h) => (
        <line key={h} x1={X(h)} x2={X(h)} y1="0" y2={H} stroke="var(--wx-grid)" vectorEffect="non-scaling-stroke" />
      ))}
      {nowH != null && nowH >= H0 && <line x1={X(nowH)} x2={X(nowH)} y1="0" y2={H} stroke="var(--rec)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
