"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useData } from "@/features/data/DataProvider";
import { dayHours, dirDeg, getPlace, nowOf, sky, windName } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { isTraining } from "@/lib/trainingLog";
import { attHref, dayPlans, dayWeather, planTone } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";
import { useWide as useSide } from "./SideNav";

// iPad ana sayfa (Seyhun 2026-11-11 "A · Zaman şeridi", örnek ana-sayfa/sade-2026-11/ipad.html; "minimal ama teknolojik, fütüristik"):
// baştan sona lacivert (.navy), ince çizgili paneller, rakamlar Space Grotesk (--font-num).
// Üstte tarih, saat, + Ekle, zil, Ayarlar. Hava paneli: solda pusula (şimdiki rüzgâr, sağanak, yön), sağda seçili günün saat saat rüzgâr eğrisi
// ve her 3 saatin rüzgârı, göğü, sıcaklığı. Takvim paneli (hava ile ayrı; Seyhun "iç içe girmesin"): seçili günün planları kendi saat çizgisinde,
// altında 7 gün; her günde gök, en düşük/en yüksek, gün içi rüzgâr eğrisi, rüzgâr aralığı + yön, yağış (mm · %), planlar.
// Bir güne dokununca hava eğrisi ve plan çizgisi o güne geçer. Sağ sütun (side): yarış şeridi, Bekleyen, Kulüp ve hesaba göre kartlar.
// Hava, Hava sayfasında seçilen yerin (getPlace) verisi; telefon düzeni değişmedi (OwnerHome HomeFeed).
const H0 = 6;
const H1 = 24;
// Rüzgâr rengi (kn): hafif mavi, iyi yeşil, sert sarı, çok sert kırmızı
export const windColor = (k) => (k == null ? "#4f6389" : k < 6 ? "#5f86c4" : k < 12 ? "#35b48a" : k < 18 ? "#d9a93a" : "#e0675e");
const SKY_TONE = { sun: "#f3c45b", cloudSun: "#e9c46a", moon: "#a9b8d6", cloud: "#b9c8e4", fog: "#b9c8e4", rain: "#7fb0ff", storm: "#a99cf0", snow: "#cfe3ff" };
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);
const hOf = (t) => (t && /^\d{1,2}:\d{2}/.test(t) ? +t.slice(0, t.indexOf(":")) + +t.slice(t.indexOf(":") + 1, t.indexOf(":") + 3) / 60 : null);

function SkyIcon({ code, day = true, size = "size-5" }) {
  const s = sky(code, day);
  return <Icon name={s.icon} className={`${size} shrink-0`} style={{ color: SKY_TONE[s.icon] || "#b9c8e4" }} aria-label={s.label} />;
}

// Kutunun genişliği (grafikler yazıyı bozmadan çizilsin diye piksel olarak)
function useWidth() {
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

export function IpadHome({ weather, inbox, onInbox, side }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const router = useRouter();
  const now = useNow(30000);
  const sideNav = useSide();
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const { w, err, refresh } = weather;
  const home = getPlace();
  const days = useMemo(() => {
    const base = new Date(`${today}T12:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return ymd(d);
    });
  }, [today]);
  const date = days.includes(sel) ? sel : today;
  const isToday = date === today;
  const rows = dayHours(w, date);
  const n = nowOf(w);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const dw = dayWeather(w, rows, date);
  const goWeather = () => (w ? router.push("/weather") : refresh(true));
  const dname = isToday ? "Bugün" : cap(new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" }));

  return (
    <main className="iph navy" data-home-ipad>
      <header className="iph-hd">
        <h1 className="iph-date">
          <b>{new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</b>
          <small>{cap(new Date().toLocaleDateString("tr-TR", { weekday: "long" }))}</small>
        </h1>
        <span className="iph-clock num" aria-label="Saat">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
        <button type="button" data-press onClick={() => openAdd()} className="iph-add">
          + Ekle
        </button>
        {!sideNav && side.all}
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={onInbox} />
        <Link href="/settings" aria-label="Ayarlar" className="iph-me">
          {initials(profile?.name)}
        </Link>
      </header>

      <section className="iph-pn iph-wx" aria-label="Hava">
        <button type="button" onClick={goWeather} className="iph-now" aria-label="Hava ayrıntısı">
          <span className="iph-pt">
            Hava<span className="flex-1" />
            <em>{home.name}</em>
          </span>
          {n ? (
            <>
              <Compass wind={n.wind} gust={n.gust} dir={n.dir} />
              <span className="mt-1 flex items-center gap-2.5">
                <SkyIcon code={n.code} day={n.day} size="size-7" />
                <span className="num text-[1.5rem] leading-none">{n.t}°</span>
                <small className="text-[0.75rem] font-semibold leading-tight text-mut">
                  {windName(n.dir)?.[0]}
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
                rüzgâr
              </span>
              <span>
                <i className="iph-dash" />
                sağanak
              </span>
            </span>
          </span>
          <WindChart rows={rows} nowH={isToday ? nowH : null} onOpen={goWeather} />
        </div>
      </section>

      <section className="iph-pn iph-cal" aria-label="Takvim">
        <DayLane date={date} today={today} nowH={isToday ? nowH : null} dname={dname} />
        <div className="iph-wk">
          {days.map((d) => (
            <WeekDay key={d} date={d} today={today} w={w} plans={plans} on={d === date} nowH={d === today ? nowH : null} onSel={() => setSel(d)} />
          ))}
        </div>
      </section>

      <aside className="iph-side">{side.body}</aside>
    </main>
  );
}

// Pusula: dış halkada yön çizgileri, beyaz üçgen rüzgârın geldiği yön, yanında sağanak yayı (renk = kn); ortada şimdiki rüzgâr
function Compass({ wind, gust, dir }) {
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

// Seçili günün rüzgâr eğrisi (06–24): dolgu rüzgâr, kesik çizgi sağanak; altında 3 saatlik bloklarda rüzgâr aralığı, gök, sıcaklık; bugünse kırmızı çizgi şimdi
function WindChart({ rows, nowH, onOpen }) {
  const [ref, W] = useWidth();
  const H = 196;
  const pts = (rows || []).filter((h) => +h.hh >= H0).map((h) => ({ ...h, x: +h.hh }));
  const X = (h) => 30 + ((h - H0) / (H1 - H0)) * (W - 42);
  const wy0 = 10;
  const wy1 = H - 64;
  const top = Math.max(20, ...pts.map((p) => p.gust ?? p.wind ?? 0)) + 3;
  const Y = (k) => wy1 - (k / top) * (wy1 - wy0);
  const blocks = [];
  for (let h = H0; h < H1; h += 3) {
    const b = pts.filter((p) => p.x >= h && p.x < h + 3);
    if (!b.length) continue;
    const mid = b[Math.floor(b.length / 2)];
    blocks.push({ h, wind: Math.max(...b.map((p) => p.wind)), gust: Math.max(...b.map((p) => p.gust ?? p.wind)), code: mid.code, day: mid.day, t: mid.t });
  }
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
              <b className="num text-[0.8125rem] font-semibold" style={{ color: windColor((b.wind + b.gust) / 2) }}>
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

// Seçili günün planları kendi saat çizgisinde (havadan ayrı): blok = saat aralığı, renk = plan türü; saatsiz plan solda "Gün boyu"
function DayLane({ date, today, nowH, dname }) {
  const { plans } = useData();
  const { profile } = useAuth();
  const { open } = usePlanOpen();
  const list = dayPlans(plans, date);
  const timed = list.filter((p) => hOf(p.time) != null);
  const allDay = list.filter((p) => hOf(p.time) == null);
  const pct = (h) => `${((Math.min(Math.max(h, H0), H1) - H0) / (H1 - H0)) * 100}%`;
  const sail = list.find(isTraining);
  const att = sail && canSeeAthletes(profile?.email);
  // Üst üste binen bloklar alt alta (iki sıra)
  const lanes = [];
  const placed = timed.map((p) => {
    const s = hOf(p.time);
    const e = Math.max(hOf(p.endTime) ?? s + (p.durationMin ? p.durationMin / 60 : isTraining(p) ? 2 : 1), s + 0.75);
    let lane = lanes.findIndex((end) => end <= s);
    if (lane < 0) lane = lanes.push(0) - 1;
    lanes[lane] = e;
    return { p, s, e, lane: Math.min(lane, 1) };
  });
  return (
    <div>
      <div className="iph-pt">
        Takvim · {dname}
        <span className="flex-1" />
        {allDay.map((p) => (
          <button key={p.id} type="button" onClick={() => open(p)} className={`iph-chip tone-${planTone(p)}`}>
            {p.title || "Plan"}
          </button>
        ))}
        {att && (
          <Link href={attHref(date, today) || "/athletes/attendance"} data-press className="iph-mini">
            Yoklama
          </Link>
        )}
        {sail && (
          <Link href={`/training/day?id=${sail.id}`} data-press className="iph-mini iph-mini-on">
            Süre
          </Link>
        )}
      </div>
      <div className="iph-lane">
        {placed.map(({ p, s, e, lane }) => (
          <button
            key={p.id}
            type="button"
            data-press
            onClick={() => open(p)}
            className={`iph-blk tone-${planTone(p)}`}
            style={{ left: pct(s), width: `max(4.5rem, calc(${pct(e)} - ${pct(s)}))`, top: lane ? "2.6rem" : 0 }}
          >
            <b className="truncate">{p.title || "Plan"}</b>
            <small className="num">
              {p.time}
              {p.endTime ? `–${p.endTime}` : ""}
            </small>
          </button>
        ))}
        {!list.length && <span className="absolute inset-x-0 top-5 text-center text-[0.8125rem] font-semibold text-[#4f6389]">Plan yok</span>}
        <div className="iph-axis">
          {[6, 9, 12, 15, 18, 21, 24].map((h) => (
            <span key={h} style={{ left: pct(h) }}>
              {pad(h % 24)}
            </span>
          ))}
          {nowH != null && nowH >= H0 && <i className="iph-nowl" style={{ left: pct(nowH) }} />}
        </div>
      </div>
    </div>
  );
}

// Haftanın bir günü: gün adı + tarih, gök + en düşük/en yüksek, gün içi rüzgâr eğrisi (12 ve 18 çizgili), rüzgâr aralığı + yön, yağış, planlar
function WeekDay({ date, today, w, plans, on, nowH, onSel }) {
  const rows = dayHours(w, date);
  const dw = dayWeather(w, rows, date);
  const dayRows = (rows || []).filter((h) => h.hh >= "08" && h.hh <= "20");
  const lo = dayRows.length ? Math.round(Math.min(...dayRows.map((h) => h.wind))) : null;
  const hi = dayRows.length ? Math.round(Math.max(...dayRows.map((h) => h.gust ?? h.wind))) : null;
  const mm = (rows || []).reduce((a, h) => a + (h.mm || 0), 0);
  const prob = Math.max(0, ...(rows || []).map((h) => h.rain || 0));
  const noon = (rows || []).find((h) => h.hh === "13");
  const ps = dayPlans(plans, date);
  const d = new Date(`${date}T12:00`);
  return (
    <button type="button" onClick={onSel} aria-pressed={on} className="iph-day" aria-label={d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}>
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
          <Spark rows={rows} nowH={nowH} color={windColor(((lo ?? 0) + (hi ?? 0)) / 2)} />
          <span className="flex items-center justify-between">
            <span className="num text-[0.75rem] font-semibold" style={{ color: windColor(((lo ?? 0) + (hi ?? 0)) / 2) }}>
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
                <span>%{prob}</span>
              </>
            ) : (
              "Kuru"
            )}
          </span>
        </>
      ) : (
        <span className="py-6 text-center text-[0.6875rem] text-[#4f6389]">Tahmin yok</span>
      )}
      <span className="flex min-w-0 items-center gap-1 border-t border-line pt-1.5">
        {ps.slice(0, 4).map((p) => (
          <i key={p.id} className={`tone-${planTone(p)} tone-bar size-1.5 shrink-0 rounded-full`} />
        ))}
        <span className="min-w-0 truncate text-[0.6875rem] font-semibold text-[#cfdcf5]">{ps[0]?.title || "Plan yok"}</span>
      </span>
    </button>
  );
}

function Spark({ rows, nowH, color }) {
  const pts = (rows || []).filter((h) => +h.hh >= H0);
  if (pts.length < 2) return <span className="h-[2.125rem]" />;
  const W = 100;
  const H = 34;
  const top = Math.max(20, ...pts.map((p) => p.gust ?? p.wind)) + 2;
  const X = (h) => ((h - H0) / (H1 - H0)) * W;
  const Y = (k) => H - 2 - (k / top) * (H - 4);
  const l = (k) => pts.map((p, i) => `${i ? "L" : "M"}${X(+p.hh).toFixed(1)} ${Y(p[k] ?? p.wind).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[2.125rem] w-full" aria-hidden="true">
      <path d={`M${X(+pts[0].hh)} ${H} ${l("wind").replace(/^M/, "L")} L${X(+pts.at(-1).hh)} ${H}Z`} fill="#3d7bff" fillOpacity=".22" />
      <path d={l("gust")} stroke="#8fb3ff" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity=".6" vectorEffect="non-scaling-stroke" />
      <path d={l("wind")} stroke={color} strokeWidth="1.8" fill="none" vectorEffect="non-scaling-stroke" />
      {[12, 18].map((h) => (
        <line key={h} x1={X(h)} x2={X(h)} y1="0" y2={H} stroke="#1d3256" vectorEffect="non-scaling-stroke" />
      ))}
      {nowH != null && nowH >= H0 && <line x1={X(nowH)} x2={X(nowH)} y1="0" y2={H} stroke="var(--rec)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

// Sağ sütundaki "Bekleyen" (zil penceresindeki "Senin için" listesinin ilk satırları)
export function Waiting({ inbox, onAll }) {
  const list = inbox.list || [];
  if (!list.length) return null;
  return (
    <section className="iph-pn" aria-label="Bekleyen">
      <span className="iph-pt">
        Bekleyen<span className="flex-1" />
        <button type="button" onClick={onAll} className="num">
          {list.length}
        </button>
      </span>
      {list.slice(0, 4).map((x) => (
        <button key={x.id} type="button" data-press onClick={x.onOpen} className="iph-row">
          <span className="min-w-0 flex-1">
            <b className="block truncate">{x.title}</b>
            {x.sub && <small className="block truncate">{x.sub}</small>}
          </span>
          {x.time && <span className="shrink-0 text-[0.75rem] text-mut">{x.time}</span>}
        </button>
      ))}
    </section>
  );
}
