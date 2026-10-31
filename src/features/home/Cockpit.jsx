"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { canSeeAthletes } from "@/features/athletes/access";
import { lastForecastDay, loadRaceDay } from "@/features/athletes/raceWeather";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { dayHours, dirDeg, getPlace, kn, nowOf, sky, windName } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { isTraining } from "@/lib/trainingLog";
import { attHref, dayPlans, dayWeather, nextPlan, planTag, planTone } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { Icon } from "@/components/ui/Icon";
import { ActionGrid } from "@/components/ui/ActionGrid";
import { CockpitWind } from "./CockpitWind";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";

// Ana sayfanın lacivert üst kısmı ("kokpit"; Seyhun 2026-10-21 "C · Lacivert kokpit" seçti, örnek ana-sayfa/futuristik/c2-kokpit-ruzgar.png):
// logo + tarih + doğum günü + zil + Ayarlar; altında bugünün havası tek satırda (sıcaklık, gökyüzü, en düşük/en yüksek;
// günün en sert sağanağı grafikte soluk çizgiyle (CockpitWind); sağda şimdiki rüzgâr "rüzgâr–sağanak kn"), büyük rüzgâr grafiği (CockpitWind) ve sıradaki iş (nextPlan). Hava satırı ya da grafiğe dokununca
// hava sayfası açılır. Lacivert her iki temada aynı (logonun gecesi); altındaki açık zemin üstüne yuvarlak köşeyle biner (OwnerHome).
// children (iş düğmeleri, büyük günler) en altta, araya boşluk konmaz (Seyhun 2026-10-21: "çok boşluklar oldu"; tam ekran uzatma kaldırıldı).
// Alt boşluk küçük ve sol alttaki mor ışık yok (ck-top; Seyhun 2026-10-23 "niye notların arka planı farklı"): altındaki lacivert notlar kesintisiz devam eder.
// 2026-10-23 (Seyhun "günler en üstte", örnek gunler.html): üstte tarih başlığı yok (tarih yalnız gün şeridinde); sağ üstte doğum günü, zil, Ayarlar;
// altında gün şeridi (days, HomeDays), sonra seçilen günün (sel) havası ve rüzgâr grafiği. Bugün seçiliyse şimdiki rüzgâr ve sıradaki plan;
// başka gün seçiliyse o günün gündüz rüzgârı ve o günün planları (DayPlans; "Günü aç" o günün penceresini açar, onOpenDay).
// Yarış günü (Seyhun 2026-10-27 "A · Yarışın yeri büyük", örnek yaris-yeri-hava): seçilen gün bir yarışın günleri içindeyse (away, OwnerHome awayRace)
// büyük hava ve rüzgâr grafiği yarışın yerinin (raceWeather.loadRaceDay); 2026-10-28 "A · Alt alta ince": büyük grafik yerine iki ince şerit (WindStrip), üstte yarış yeri, altta ev yeri
// (hava yeri, ör. Dikili: sıcaklık · yön · kn), ona dokununca hava sayfası. Yarışın yeri ev yerine 10 km'den yakınsa ya da hava alınamazsa her şey eskisi gibi.
export function Cockpit({ weather, inbox, onInbox, days, live, sel, away, onOpenDay, children }) {
  const { profile } = useAuth();
  const router = useRouter();
  const now = useNow();
  const { w, err, refresh } = weather;
  const today = todayStr();
  const date = sel || today;
  const isToday = date === today;
  const rows = dayHours(w, date);
  const dw = dayWeather(w, rows, date);
  const n = isToday ? nowOf(w) : dw && { t: dw.max, code: dw.code, day: true, wind: dw.wind, gust: dw.gust, dir: dw.dir };
  const dname = cap(new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""));
  const goWeather = () => (w ? router.push("/weather") : refresh(true));
  const ar = useAway(away, date);
  const home = getPlace();
  const far = ar && !ar.err && !(ar.at && km(ar.at, home) < 10);
  const [fitRef, fitH] = useFit();
  const fill = fitH > 0;

  return (
    <section className="ck ck-top -mx-4 px-4 pb-4 pt-[calc(0.875rem+env(safe-area-inset-top))]" aria-label="Bugün">
      {/* İlk ekran (Seyhun 2026-10-28 "A · Yalnız saydıkların"): günler, yarış sayacı, hava ve grafik (yarış başka yerdeyse altta ev yeri)
          telefonda ekrana tam oturur; boşluk açılmaz, büyüklükler ekran boyuna göre (--u), kalan yeri grafik doldurur (useFit).
          Sıradaki plan ve iş düğmeleri kaydırınca gelir. */}
      <div ref={fitRef} style={fill ? { minHeight: fitH, "--u": `${(fitH / 100).toFixed(2)}px` } : undefined} className="flex flex-col">
      <header className="-mb-1 flex items-center justify-end gap-2">
        <h1 className="sr-only">{now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</h1>
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={onInbox} />
        <Link href="/settings" aria-label="Ayarlar" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-[0.8125rem] font-semibold text-white active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>

      <div className="mt-3">{days}</div>
      {live}

      {far ? (
        // Yarış başka yerde (Seyhun 2026-10-28 "A · Alt alta ince"): iki ince şerit üst üste, yarış yeri ve ev yeri; dokununca ayrıntı
        // İki şerit aynı ölçekte (7 kn ile 15 kn aynı boyda görünmesin)
        <div className={`mt-3.5 flex flex-col gap-2 ${fill ? "min-h-0 flex-1" : ""}`}>
          <WindStrip
            label="Yarış yerinin havası"
            name={(ar.place || away.place || away.name || "").split(",")[0]}
            race
            rows={ar.rows}
            date={date}
            max={stripMax(ar.rows, rows)}
            fill={fill}
            onClick={() => router.push(`/athletes/races/${away.id}`)}
          />
          <WindStrip label={`${home.name} havası`} name={home.name} rows={rows} date={date} max={stripMax(ar.rows, rows)} fill={fill} onClick={goWeather} />
        </div>
      ) : (
        <>
          <button type="button" onClick={goWeather} aria-label="Hava ayrıntısı" className="mt-4 block w-full text-left">
            {n ? (
              <span className="flex items-center gap-3">
                <span className="shrink-0 text-[clamp(1.875rem,calc(var(--u,7px)*5.8),3rem)] font-bold leading-none tracking-[-.04em] tabular-nums">{n.t}°</span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[0.9375rem] font-semibold">{isToday ? "" : `${dname} · `}{sky(n.code, n.day).label}</b>
                  <small className="block truncate text-[0.8125rem] text-white/65 tabular-nums">
                    {dw ? `${dw.min}° / ${dw.max}°` : ""}
                  </small>
                </span>
                <span className="shrink-0 text-right leading-tight">
                  <small className="block text-[0.75rem] text-white/65">{windName(n.dir)[0]} {dirDeg(n.dir)} · {isToday ? "şimdi" : "gün içi"}</small>
                  <b className="text-[1.375rem] font-bold tracking-[-.02em] tabular-nums">
                    {kn(n.wind, n.gust)}
                    <span className="text-[0.8125rem] font-medium text-white/60"> kn</span>
                  </b>
                </span>
              </span>
            ) : (
              <span className="block py-2 text-[0.875rem] text-white/70">{err ? "Hava durumu alınamadı · dokun, yenile" : w ? "Bu gün için hava tahmini yok" : "Hava yükleniyor…"}</span>
            )}
          </button>
          {rows?.length > 0 && (
            <button type="button" onClick={goWeather} aria-label="Rüzgâr, ayrıntı" className={`mt-2 w-full text-left ${fill ? "flex min-h-0 flex-1 flex-col" : "block"}`}>
              <CockpitWind key={date} rows={rows} date={date} fill={fill} />
            </button>
          )}
        </>
      )}
      </div>
      {isToday ? <NextPlan now={now} /> : <DayPlans date={date} onOpen={onOpenDay} />}
      {children}
    </section>
  );
}

// Sıradaki iş (nextPlan, lib/homeTiles.js): bugün süren ya da sıradaki plan, yoksa 7 gün içindeki ilk plan.
// Görünüm iş düğmeleriyle aynı (Seyhun 2026-10-31 "yazılar alta kayıyor… butonlara benzer olsun"): kabarık kart, solda kartın kenarından
// giren soluk camgöbeği ikon (türüne göre), üstte tek satır gün · saat · yer, altında tek satır başlık, sağda kalan süre camgöbeği. Hiçbir yazı
// alt satıra kaymaz (hepsi tek satır, uzunsa "…"). Antrenmansa altında aynı biçimde Yoklama · Süre. Karta dokununca plan açılır.
const PLAN_ICON = { Yarış: "flag", Antrenman: "wind", Fitness: "dumbbell", Toplantı: "users", Kamp: "tent" };
export function planWhen(p, now, today) {
  const days = Math.round((Date.parse(`${p.date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 864e5);
  const d = new Date(`${p.date}T12:00`);
  const day = days === 0 ? "Bugün" : days === 1 ? "Yarın" : `${cap(d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""))} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", "")}`;
  const mins = days === 0 && p.time ? Math.round((new Date(`${p.date}T${p.time}`) - now) / 60000) : null;
  const left = days > 1 ? `${days} gün` : days === 1 ? "" : mins == null ? "" : mins <= 0 ? "Şimdi" : mins < 60 ? `${mins} dk` : `${Math.floor(mins / 60)} sa${mins % 60 ? ` ${mins % 60} dk` : ""}`;
  return { day, left };
}
function NextPlan({ now }) {
  const { plans } = useData();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const today = todayStr();
  const p = nextPlan(plans, now, today);
  if (!p) return null;
  const { day, left } = planWhen(p, now, today);
  const sail = isTraining(p);
  const tag = planTag(p) || p.cat || p.category || "";
  // Antrenmansa Süre'nin yanında Yoklama (Seyhun 2026-10-22). Bugün ya da geçmişse o günün yoklaması, sonraki günde yoklama sayfası
  const att = sail && canSeeAthletes(profile?.email);
  const acts = [
    att && { key: "att", icon: "checks", label: "Yoklama", href: attHref(p.date, today) || "/athletes/attendance" },
    sail && { key: "sure", icon: "clock", label: "Süre", href: `/training/day?id=${p.id}` },
  ].filter(Boolean);
  return (
    <div className="mt-3">
      <button type="button" data-press onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} aria-label="Sıradaki plan" className="raised ck-ibtn ck-next flex w-full min-w-0 items-center gap-2 pr-3.5 text-left">
        <Icon name={PLAN_ICON[tag] || (sail ? "wind" : "cal")} className="ck-icon" />
        <span className="relative min-w-0 flex-1">
          <small className="block truncate text-[0.78rem] font-medium tabular-nums text-white/65">{[day, p.time, p.place].filter(Boolean).join(" · ")}</small>
          <b className="block truncate text-[1rem] font-semibold leading-snug">{p.title || "Plan"}</b>
        </span>
        {left && <span className="relative shrink-0 text-[0.84375rem] font-semibold tabular-nums text-[#67e8f9]">{left}</span>}
      </button>
      {acts.length > 0 && (
        <div className="mt-2">
          <ActionGrid icons items={acts} label="Plan işleri" />
        </div>
      )}
    </div>
  );
}

// Seçilen (bugün olmayan) günün planları: başlıkta gün ve sayı, sağda "Günü aç"; satır = renk çizgisi, saat, ad, yer; dokununca plan
function DayPlans({ date, onOpen }) {
  const { plans } = useData();
  const { openAdd } = useAdd();
  const list = dayPlans(plans, date);
  const d = new Date(`${date}T12:00`);
  const title = `${cap(d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""))} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "long" })}`;
  return (
    <div className="mt-3 overflow-hidden rounded-[1.375rem] border border-white/10 bg-[#182a48]">
      <div className="flex items-center gap-2 px-3.5 pb-1.5 pt-3 text-[0.75rem] font-bold tracking-[.05em] text-[#9fb0cc]">
        <span className="min-w-0 flex-1 truncate">{title.toLocaleUpperCase("tr-TR")}{list.length ? ` · ${list.length} PLAN` : ""}</span>
        <button type="button" data-press onClick={onOpen} className="shrink-0 text-[0.8125rem] font-semibold tracking-normal text-[#67e8f9]">Günü aç ›</button>
      </div>
      {list.length ? (
        list.map((p) => (
          <button key={p.id} type="button" data-press="row" onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className="flex w-full items-center gap-2.5 border-t border-[#26395c] px-3.5 py-2.5 text-left">
            <span className={`tone-${planTone(p)} tone-bar w-1 self-stretch rounded-full`} />
            <b className="w-11 shrink-0 text-[0.9375rem] font-semibold tabular-nums">{p.time || "Gün"}</b>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[0.9375rem]">{p.title || "Plan"}</span>
              {p.place && <small className="block truncate text-[0.78rem] text-[#9fb0cc]">{p.place}</small>}
            </span>
          </button>
        ))
      ) : (
        <p className="border-t border-[#26395c] px-3.5 py-3 text-[0.875rem] text-[#9fb0cc]">Bu gün plan yok</p>
      )}
    </div>
  );
}

const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);

// Yarışın yerinin o günkü saatleri (loadRaceDay 1 saat saklar); tahmin ufku dışındaki günlerde istenmez
function useAway(r, day) {
  const key = r && day <= lastForecastDay(todayStr()) ? `${r.id}|${day}|${r.spot?.lat ?? ""}` : "";
  const [got, setGot] = useState({ key: "" });
  useEffect(() => {
    if (!key) return;
    let on = true;
    loadRaceDay(r, day).then(
      (d) => on && setGot({ key, rows: d.rows, place: d.place, at: d.lat != null ? { lat: d.lat, lon: d.lon } : null }),
      () => on && setGot({ key, err: true }),
    );
    return () => {
      on = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!key) return null;
  return got.key === key ? got : { loading: true };
}

// İki nokta arası km (yaklaşık)
function km(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// İlk ekranın yüksekliği: telefonda (genişlik < 768) pencere yüksekliğinden kutunun sayfadaki yeri ve alttaki sekme çubuğunun kapladığı yer
// çıkar; kalan en az yükseklik olur (içerik sığmazsa uzar). --u bu yüksekliğin yüzde biri: gün rakamları, sayaç ve sıcaklık onunla büyür.
// Masaüstünde ya da ölçülemezse eski görünüm (yükseklik yok, --u 7px).
function useFit() {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (window.innerWidth >= 768) return setH(0);
      const vh = window.visualViewport?.height || window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const bar = document.querySelector("nav[aria-label='Sekmeler']");
      const cover = bar ? Math.max(0, window.innerHeight - bar.getBoundingClientRect().top) : 0;
      const v = Math.round(vh - top - cover - 8);
      setH(v > 360 ? v : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const t = setTimeout(measure, 400); // sekme çubuğu geç yerleşirse
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      clearTimeout(t);
    };
  }, []);
  return [ref, h];
}


// İnce hava şeridi (yarış günü, iki yer alt alta): solda yerin adı, şimdiki (başka günde en sert saatin) "rüzgâr–sağanak kn", sıcaklık ve gök;
// sağda günün rüzgârı dolu eğri, sağanak kesik çizgi, bugünse kırmızı "şimdi" çizgisi; altında 00 · 06 · 12 · 18 · 24. rows yoksa yanıp sönen yer tutucu.
// fill: ilk ekranda iki şerit kalan yüksekliği paylaşır.
const stripMax = (...l) => Math.max(10, ...l.flatMap((r) => (r || []).map((h) => h.gust || h.wind || 0))) * 1.1;
function WindStrip({ label, name, race = false, rows, date, max, fill, onClick }) {
  const now = useNow();
  const shell = `flex w-full items-stretch gap-3 rounded-[1.125rem] border border-white/10 bg-white/5 px-3 py-2 text-left ${fill ? "min-h-[4.75rem] flex-1" : "h-[5.5rem]"}`;
  if (!rows?.length) return <div className={`${shell} animate-pulse`} role="status" aria-label={`${label} yükleniyor`} />;
  const isToday = date === todayStr();
  const hh = String(now.getHours()).padStart(2, "0");
  const top = rows.reduce((a, h) => (h.wind > a.wind ? h : a), rows[0]);
  const v = (isToday && rows.find((h) => h.hh === hh)) || top;
  const X = (i) => (i / Math.max(1, rows.length - 1)) * 100;
  const Y = (w) => 40 - ((w || 0) / max) * 38;
  const line = (k) => rows.map((h, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(h[k]).toFixed(1)}`).join("");
  const at = isToday ? rows.findIndex((h) => h.hh === hh) : -1;
  const nx = at >= 0 ? X(at + now.getMinutes() / 60) : null;
  return (
    <button type="button" data-press onClick={onClick} aria-label={label} className={shell}>
      <span className="flex w-[34%] min-w-0 shrink-0 flex-col justify-center leading-tight">
        <span className="flex items-center gap-1">
          <b className={`min-w-0 truncate text-[0.8125rem] font-bold ${race ? "text-[#67e8f9]" : "text-white"}`}>{name}</b>
          <span className="shrink-0 text-white/45">›</span>
        </span>
        <b className="mt-0.5 whitespace-nowrap text-[clamp(1.375rem,calc(var(--u,7px)*4.2),2rem)] font-extrabold leading-none tracking-[-.03em] tabular-nums">
          {kn(Math.round(v.wind), Math.round(v.gust))}
          <span className="ml-0.5 text-[0.75rem] font-medium text-white/60">kn</span>
        </b>
        <small className="mt-1 truncate text-[0.75rem] text-white/65">
          {[v.t != null && `${Math.round(v.t)}°`, v.code != null && sky(v.code, v.day).label, !isToday && `en sert ${top.hh}:00`].filter(Boolean).join(" · ")}
        </small>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="relative min-h-0 flex-1">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
            <path d={`${line("wind")}L100,40L0,40Z`} fill="#67e8f9" fillOpacity=".85" />
            <path d={line("gust")} fill="none" stroke="#c4b5fd" strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            {nx != null && <line x1={nx} x2={nx} y1="0" y2="40" stroke="#ff6b6b" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
          </svg>
        </span>
        <span className="mt-0.5 flex justify-between text-[0.625rem] tabular-nums text-white/50">
          {["00", "06", "12", "18", "24"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </span>
      </span>
    </button>
  );
}
