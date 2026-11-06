"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { canSeeAthletes } from "@/features/athletes/access";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useData } from "@/features/data/DataProvider";
import { dayHours, dirDeg, getPlace, kn, nowOf, sky, windName } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { isTraining } from "@/lib/trainingLog";
import { attHref, dayPlans, dayWeather, nextPlan, planTag, planTone } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { insightFacts, weatherInsight } from "@/features/weather/insight";
import { useWeatherBrief } from "@/features/weather/WeatherInsight";
import { WindRibbon } from "@/features/weather/WindRibbon";
import { useRainRadar } from "@/features/weather/useRainRadar";
import { radarNow, radarRows } from "@/features/weather/rainLine";
import { CalendarView } from "@/features/calendar/CalendarView";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";

// Ana sayfanın lacivert üst kısmı ("kokpit"; Seyhun 2026-10-21 "C · Lacivert kokpit" seçti, örnek ana-sayfa/futuristik/c2-kokpit-ruzgar.png):
// logo + tarih + doğum günü + zil + Ayarlar; altında bugünün havası tek satırda (sıcaklık, gökyüzü, en düşük/en yüksek;
// sağda şimdiki rüzgâr "rüzgâr–sağanak kn"), saat saat hava tablosu (HourTable) ve sıradaki iş (nextPlan). Hava satırı ya da grafiğe dokununca
// hava sayfası açılır. Lacivert her iki temada aynı (logonun gecesi); altındaki açık zemin üstüne yuvarlak köşeyle biner (OwnerHome).
// children (iş düğmeleri, büyük günler) en altta, araya boşluk konmaz (Seyhun 2026-10-21: "çok boşluklar oldu"; tam ekran uzatma kaldırıldı).
// Alt boşluk küçük ve sol alttaki mor ışık yok (ck-top; Seyhun 2026-10-23 "niye notların arka planı farklı"): altındaki lacivert notlar kesintisiz devam eder.
// 2026-10-23 (Seyhun "günler en üstte", örnek gunler.html): üstte tarih başlığı yok (tarih yalnız gün şeridinde); sağ üstte doğum günü, zil, Ayarlar;
// altında gün şeridi (days, HomeDays), sonra seçilen günün (sel) havası ve rüzgâr grafiği. Bugün seçiliyse şimdiki rüzgâr ve sıradaki plan;
// başka gün seçiliyse o günün gündüz rüzgârı ve o günün planları (DayPlans; "Günü aç" o günün penceresini açar, onOpenDay).
// Yarış günü (Seyhun 2026-10-27 "A · Yarışın yeri büyük", örnek yaris-yeri-hava): seçilen gün bir yarışın günleri içindeyse (away, OwnerHome awayRace)
// büyük hava ve rüzgâr grafiği yarışın yerinin (raceWeather.loadRaceDay); 2026-10-28 "A · Alt alta ince": büyük grafik yerine iki ince şerit (WindStrip), üstte yarış yeri, altta ev yeri
// (hava yeri, ör. Dikili: sıcaklık · yön · kn), ona dokununca hava sayfası. Yarışın yeri ev yerine 10 km'den yakınsa ya da hava alınamazsa her şey eskisi gibi.
export function Cockpit({ weather, inbox, onInbox, live, grid, sel, onSel, wide = false, children }) {
  const { profile } = useAuth();
  const router = useRouter();
  const now = useNow();
  const { w, err, refresh } = weather;
  const today = todayStr();
  const date = sel || today;
  const isToday = date === today;
  const home = getPlace();
  // Radar burada yağış görmüyorsa şu anki yağmur simgesi, arka plan ve son saatlerin yağmuru gösterilmez (radarNow / radarRows); "Şu an" satırı durumu yazar
  const radar = useRainRadar(isToday ? home : null);
  const fcRows = dayHours(w, date);
  const rows = isToday ? radarRows(fcRows, radar) : fcRows;
  const dw = dayWeather(w, rows, date);
  const n = isToday ? radarNow(nowOf(w), radar) : dw && { t: dw.max, code: dw.code, day: true, wind: dw.wind, gust: dw.gust, dir: dw.dir };
  const dname = cap(new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""));
  const goWeather = () => (w ? router.push("/weather") : refresh(true));
  // Hissedilen ve günün yağışı: seçili günün saatlik satırlarından (bugünse şimdiki saat, değilse öğle)
  const cur = rows?.find((h) => h.hh === (isToday ? String(now.getHours()).padStart(2, "0") : "13"));
  const mmDay = rows ? rows.reduce((a, h) => a + (h.mm || 0), 0) : 0;
  // Önemli kart + küçük gidiş grafiği + yapay zeka cümlesi (insight.js; Seyhun 2026-11-06 "önemli bir şey varsa göster, sakinse küçük grafik")
  const ins = weatherInsight({ rows, nowH: isToday ? now.getHours() : -1, radar: isToday ? radar : null, hm: (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) });
  const brief = useWeatherBrief(isToday ? insightFacts(ins, home.name) : null);
  const line = isToday ? brief : ins?.line;
  const dateLabel = cap(new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }));

  return (
    <section className={wide ? "home-ck hs" : "home-ck -mx-4 px-4"} aria-label="Bugün">
      {/* Hava manzarası (Seyhun 2026-11-04 "A · Hava manzarası", örnek yeni-ana-tam): üstte havanın kendisi, gökyüzü rengi o günün havasına göre
          (yağmurda çizgiler akar); sıcaklık, rüzgâr, Grafik / Tablo sekmesi. Altında açık zeminde günler, yarış şeridi, plan, çizelge, düğmeler. */}
      {wide && <div className="hs-sky ck-hero" data-sky={skyKey(n)} aria-hidden="true" />}
      <div className={wide ? "ck-a hs-w" : "ck-a"}>
      {/* Geniş ekranda gökyüzü kart değil: sayfanın üstünde kenardan kenara (hs-sky), altı soluklaşır; yer adı sıcaklığın yanında, tarih Takvim'de (Seyhun 2026-11-05 "A") */}
      <div className={wide ? "ck hs-top pb-3 pt-1" : "ck ck-hero ck-fade -mx-4 px-4 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]"} data-sky={skyKey(n)}>
      <header className="flex items-center gap-2">
        <h1 className="sr-only">{now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</h1>
        {wide ? (
          <span className="flex-1" />
        ) : (
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block truncate text-[0.8125rem] font-semibold">{home.name}</b>
            <small className="block truncate text-[0.75rem] text-white/75">{dateLabel}</small>
          </span>
        )}
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={onInbox} />
        <Link href="/settings" aria-label="Ayarlar" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-[0.8125rem] font-semibold text-white active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>

      <>
          <button type="button" onClick={goWeather} aria-label="Hava ayrıntısı" className="mt-2 block w-full text-left">
            {n ? (
              <span className={`flex gap-3 ${wide ? "items-center" : "items-end"}`}>
                <span className={`shrink-0 font-semibold leading-[.9] tracking-[-.05em] tabular-nums ${wide ? "text-[3.25rem]" : "text-[4.25rem]"}`}>{n.t}°</span>
                <span className={`min-w-0 pb-1 leading-tight ${wide ? "shrink-0" : "flex-1"}`}>
                  <b className="block truncate text-[0.9375rem] font-semibold">{isToday ? "" : `${dname} · `}{sky(n.code, n.day).label}{wide ? ` · ${home.name}` : ""}</b>
                  {cur?.feel != null && <small className="block truncate text-[0.8125rem] text-white/80 tabular-nums">Hissedilen {cur.feel}°</small>}
                  <small className="block truncate text-[0.8125rem] text-white/80 tabular-nums">
                    {dw ? `${dw.min}° / ${dw.max}°` : ""}
                    {mmDay >= 0.1 ? `${dw ? " · " : ""}${fmtMm(mmDay)} mm` : ""}
                  </small>
                </span>
                {wide ? (
                  <span className="flex shrink-0 items-center gap-2.5 border-l border-white/25 pl-4" data-wind-now>
                    <span className="grid size-12 shrink-0 place-items-center rounded-full border border-white/40 bg-white/10" aria-hidden="true">
                      {n.dir != null && (
                        <svg viewBox="0 0 16 16" className="size-6 text-white" style={{ transform: `rotate(${n.dir + 180}deg)` }}>
                          <path d="M8 1l5 13-5-3-5 3z" fill="currentColor" />
                        </svg>
                      )}
                    </span>
                    <span className="leading-tight">
                      <b className="block text-[1.625rem] font-bold tracking-[-.02em] tabular-nums">
                        {kn(n.wind, n.gust)}
                        <span className="text-[0.8125rem] font-medium text-white/70"> kn</span>
                      </b>
                      <small className="block text-[0.75rem] text-white/80">{windName(n.dir)[0]} {dirDeg(n.dir)} · {isToday ? "şimdi" : "gün içi"}</small>
                    </span>
                  </span>
                ) : (
                  <span className="shrink-0 pb-1 text-right leading-tight">
                    <small className="block text-[0.75rem] text-white/75">{windName(n.dir)[0]} {dirDeg(n.dir)} · {isToday ? "şimdi" : "gün içi"}</small>
                    <b className="text-[1.625rem] font-bold tracking-[-.02em] tabular-nums">
                      {kn(n.wind, n.gust)}
                      <span className="text-[0.8125rem] font-medium text-white/70"> kn</span>
                    </b>
                  </span>
                )}
                {wide && line && <span className="line-clamp-4 min-w-0 flex-1 border-l border-white/25 pl-3 text-[0.8125rem] leading-snug text-white/90" aria-label="Hava özeti">{line}</span>}
              </span>
            ) : (
              <span className={`grid place-items-center text-[0.875rem] text-white/80 ${wide ? "min-h-[3.5rem]" : "min-h-[4.5rem]"}`}>{err ? "Hava durumu alınamadı · dokun, yenile" : w ? "Bu gün için hava tahmini yok" : "Hava yükleniyor…"}</span>
            )}
          </button>
          {!wide && <p className="mt-2 min-h-[2.5rem] text-[0.9375rem] leading-snug text-white/90" aria-label="Hava özeti">{n && line}</p>}
          <WindRibbon rows={rows} nowH={isToday ? now.getHours() : -1} radar={isToday ? radar : null} h={wide ? 84 : 92} className="mt-3" />
      </>
      </div>

      </div>
      {wide ? (
        <div className="hs-cal">
          <CalendarView embedded sel={date} onSel={onSel} />
        </div>
      ) : (
        <div className="ck-b -mt-5 space-y-2.5">
          {live}
          {isToday && <NextPlan now={now} />}
        </div>
      )}
      {wide ? (
        <div className="hs-r">
          {live}
          {isToday && <NextPlan now={now} />}
          {grid}
          {children}
        </div>
      ) : (
        <>
          <div className="ck-c mt-3">{grid}</div>
          <div className="cal-flat -mx-4 mt-4">
            <CalendarView embedded flat sel={date} onSel={onSel} />
          </div>
          {children}
        </>
      )}
    </section>
  );
}

// Gökyüzü rengi anahtarı (globals.css .ck-hero[data-sky]): açık gün mavi, gece lacivert, bulut gri, yağmur kurşun, fırtına koyu, kar açık
function skyKey(n) {
  if (!n) return "cloud";
  const i = sky(n.code, n.day).icon;
  return i === "sun" ? "clear" : i === "cloudSun" ? "part" : i === "moon" ? "night" : i === "rain" ? "rain" : i === "storm" ? "storm" : i === "snow" ? "snow" : "cloud";
}
const fmtMm = (v) => (v < 10 ? v.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : String(Math.round(v)));

// Sıradaki iş (nextPlan, lib/homeTiles.js): bugün süren ya da sıradaki plan, yoksa 7 gün içindeki ilk plan.
// Turkuaz kart (ck-plan, renk aynı; Seyhun 2026-11-01 "önemli olan tarih… kaç gün kaldı… yanında ne olduğu, altında küçük açıklaması"):
// solda saatin yerinde tarih (gün adı / Bugün, büyük gün, ay; sağında ince çizgi), ortada tek satır plan adı, altında tek satır küçük
// tür · saat · yer, sağda büyük kalan süre ("7 gün kaldı", "Yarın", "2 sa kaldı"). Hiçbir yazı alt satıra kaymaz.
// Antrenmansa kartın içinde Yoklama ve Süre (widget'taki gibi). Karta dokununca plan açılır.
export function planWhen(p, now, today) {
  const days = Math.round((Date.parse(`${p.date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 864e5);
  const d = new Date(`${p.date}T12:00`);
  const top = days === 0 ? "Bugün" : cap(d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""));
  const mon = cap(d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", ""));
  const mins = days === 0 && p.time ? Math.round((new Date(`${p.date}T${p.time}`) - now) / 60000) : null;
  // left: [büyük, küçük]
  const left =
    days > 1
      ? [String(days), "gün kaldı"]
      : days === 1
        ? ["Yarın", ""]
        : mins == null
          ? ["Bugün", ""]
          : mins <= 0
            ? ["Şimdi", ""]
            : mins < 60
              ? [`${mins} dk`, "kaldı"]
              : [`${Math.floor(mins / 60)} sa`, "kaldı"];
  return { top, day: d.getDate(), mon, left };
}
function NextPlan({ now }) {
  const { plans } = useData();
  const { profile } = useAuth();
  const { open } = usePlanOpen(); // yarışa bağlı plan yarış sayfasını açar (tek kural)
  const today = todayStr();
  const p = nextPlan(plans, now, today);
  if (!p) return null;
  const w = planWhen(p, now, today);
  const sail = isTraining(p);
  const sub = [planTag(p), p.time, p.place].filter(Boolean).join(" · ");
  // Antrenmansa Süre'nin yanında Yoklama (Seyhun 2026-10-22). Bugün ya da geçmişse o günün yoklaması, sonraki günde yoklama sayfası
  const att = sail && canSeeAthletes(profile?.email);
  return (
    <div className="hs-plan rounded-[1.125rem] border border-line bg-card p-3">
      <button type="button" data-press onClick={() => open(p)} aria-label="Sıradaki plan" className="flex w-full min-w-0 items-center gap-3 text-left">
        <span className="min-w-[3rem] shrink-0 border-r border-line pr-3 text-center leading-tight">
          <small className="block text-[0.6875rem] font-semibold text-mut">{w.top}</small>
          <b className="block text-[1.625rem] font-bold leading-none tracking-[-.03em] tabular-nums">{w.day}</b>
          <small className="block text-[0.6875rem] font-semibold text-mut">{w.mon}</small>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[1rem] font-semibold leading-snug">{p.title || "Plan"}</b>
          {sub && <small className="mt-0.5 block truncate text-[0.8125rem] tabular-nums text-mut">{sub}</small>}
        </span>
        <span className="shrink-0 text-right leading-tight text-acc">
          <b className="block text-[1.25rem] font-bold tabular-nums">{w.left[0]}</b>
          {w.left[1] && <small className="block text-[0.6875rem] text-mut">{w.left[1]}</small>}
        </span>
      </button>
      {(att || sail) && (
        <div className={`mt-2.5 grid gap-2 ${att && sail ? "grid-cols-2" : "grid-cols-1"}`}>
          {att && (
            <Link href={attHref(p.date, today) || "/athletes/attendance"} data-press className="btn btn-secondary btn-sm">
              Yoklama
            </Link>
          )}
          {sail && (
            <Link href={`/training/day?id=${p.id}`} data-press className="btn btn-primary btn-sm">
              Süre
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);

// "YYYY-AA-GG" → ertesi gün (öğlen üzerinden, saat dilimi kaymasın)
function nextDay(date) {
  const d = new Date(`${date}T12:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
