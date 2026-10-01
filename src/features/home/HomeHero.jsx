"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { dayLabel, nextPlan, soonLabel } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";
import { WeatherDetail } from "@/features/weather/DaySheet";
import { dayHours, getPlace, sky, windName } from "@/features/weather/weather";

const H0 = 8;
const H1 = 21;

// Rüzgâr göstergesi: 0–25 kn yayı; dolu kısım ortalama rüzgâr, halka sağanak
function Gauge({ kn, gust }) {
  const r = 42;
  const pt = (a) => [54 + r * Math.cos((a * Math.PI) / 180), 54 + r * Math.sin((a * Math.PI) / 180)];
  const arc = (a0, a1) => {
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const at = (v) => 135 + (270 * Math.min(Math.max(v, 0), 25)) / 25;
  const [gx, gy] = pt(at(gust));
  return (
    <svg viewBox="0 0 108 108" className="size-[6.25rem] shrink-0" aria-label={`Rüzgâr ${kn} knot, sağanak ${gust}`} role="img">
      <path d={arc(135, 405)} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="8" strokeLinecap="round" />
      {kn > 0 && <path d={arc(135, at(kn))} fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />}
      <circle cx={gx} cy={gy} r="5" fill="none" stroke="#fff" strokeWidth="2.5" />
      <text x="54" y="57" textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff">{kn}</text>
      <text x="54" y="74" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff" opacity=".8">knot</text>
    </svg>
  );
}

// Gün şeridi (08–21): saat saat rüzgâr çizgisi, planlar blok, şu an kesikli çizgi
function DayStrip({ rows, plans, now }) {
  const W = 320;
  const X = (t) => ((Math.min(Math.max(t, H0), H1) - H0) / (H1 - H0)) * W;
  const pts = rows.filter((h) => +h.hh >= H0 && +h.hh <= H1);
  const max = Math.max(20, ...pts.map((h) => h.wind));
  const line = pts.map((h) => `${X(+h.hh).toFixed(1)},${(40 - (h.wind / max) * 34).toFixed(1)}`).join(" ");
  const blocks = plans
    .filter((p) => p.time)
    .map((p) => {
      const s = +p.time.slice(0, 2) + +p.time.slice(3, 5) / 60;
      return [X(s), X(s + (p.durationMin || 60) / 60)];
    });
  const nh = now.getHours() + now.getMinutes() / 60;
  return (
    <svg viewBox={`0 0 ${W} 70`} className="w-full" aria-hidden="true">
      <rect x="0" y="46" width={W} height="7" rx="3.5" fill="rgba(255,255,255,.22)" />
      {blocks.map(([a, b], i) => (
        <rect key={i} x={a} y="46" width={Math.max(6, b - a)} height="7" rx="3.5" fill="#fff" />
      ))}
      {line && <polyline points={line} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity=".9" />}
      {nh >= H0 && nh <= H1 && (
        <>
          <line x1={X(nh)} y1="4" x2={X(nh)} y2="54" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={X(nh)} cy="4" r="3.5" fill="#fff" />
        </>
      )}
      {[9, 12, 15, 18, 21].map((t) => (
        <text key={t} x={X(t)} y="67" textAnchor={t === H1 ? "end" : "middle"} fontSize="10" fill="#fff" opacity=".7">
          {t}
        </text>
      ))}
    </svg>
  );
}

// Ana sayfanın üstü: seçili konumda şimdi (sıcaklık, rüzgâr göstergesi, gün şeridi) + üstüne binen "Sıradaki" plan.
// Hava kısmına dokununca bugünün saat saat ayrıntısı açılır.
export function HomeHero({ weather }) {
  const { w, err, refresh } = weather;
  const { plans } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const today = w?.today?.date || todayStr();
  const n = nextPlan(plans, now);
  const todays = plans.filter((p) => p.date <= today && (p.endDate || p.date) >= today);
  const rows = w ? dayHours(w, today) || [] : [];
  const s = w ? sky(w.now.code, w.now.day) : null;
  const place = getPlace();

  return (
    <div>
      <button
        type="button"
        onClick={() => (w ? setOpen(true) : refresh(true))}
        aria-label="Bugünün hava ayrıntısı"
        className={`block w-full rounded-[1.625rem] bg-[#2c5163] px-[1.125rem] pt-[1.125rem] text-left text-white transition active:scale-[.99] ${n ? "pb-12" : "pb-3"}`}
      >
        {w ? (
          <>
            <span className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[0.6875rem] font-semibold tracking-[.1em] text-white/70">{place.name.toLocaleUpperCase("tr-TR")} · ŞİMDİ</span>
                <span className="mt-1.5 flex items-center gap-2.5">
                  <Icon name={s.icon} className="size-8 [stroke-width:1.5]" />
                  <span className="text-[2.625rem] font-semibold leading-none tracking-tight tabular-nums">{w.now.t}°</span>
                </span>
                <span className="mt-1.5 block truncate text-[0.8125rem] text-white/85">
                  {s.label} · {windName(w.now.dir)[0]} yönünden
                </span>
              </span>
              <Gauge kn={w.now.wind} gust={w.now.gust} />
            </span>
            {rows.length > 0 && (
              <span className="mt-2 block">
                <DayStrip rows={rows} plans={todays} now={now} />
              </span>
            )}
          </>
        ) : (
          <span className="block py-3 text-[0.875rem] text-white/80">{err ? "Hava durumu alınamadı · tekrar dene" : `${place.name} hava durumu yükleniyor…`}</span>
        )}
      </button>

      {/* Sıradaki plan: hava kartının üstüne biner (akışta kalır; alttaki bölümler itilir) */}
      {n && (
        <button
          type="button"
          onClick={() => openAdd({ edit: { kind: "plan", id: n.plan.id } })}
          className="relative mx-3 -mt-10 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[1.25rem] bg-card px-4 py-3 text-left shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.35)] active:scale-[.99]"
        >
          <span className="w-16 shrink-0 whitespace-nowrap text-center">
            <b className="block text-[1.0625rem] font-bold tabular-nums">{n.plan.time || "Gün boyu"}</b>
            <small className="block truncate text-[0.6875rem] text-mut">
              {n.state === "now" ? "şu an" : n.plan.date === todayStr() && n.plan.time ? soonLabel(n.plan, now).replace(" sonra", "") : dayLabel(n.plan.date, todayStr())}
            </small>
          </span>
          <span className="h-9 w-px shrink-0 bg-line" />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6875rem] font-bold tracking-[.08em] text-acc">{n.state === "now" ? "ŞU AN" : "SIRADAKİ"}</span>
            <b className="block truncate text-[1rem] font-semibold">{n.plan.title}</b>
            <small className="block truncate text-[0.75rem] text-mut">{n.plan.place || n.when}</small>
          </span>
          <Icon name="chev" className="size-4 shrink-0 text-mut" />
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={`Hava durumu · ${place.name}`}>
        {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
      </Sheet>
    </div>
  );
}
