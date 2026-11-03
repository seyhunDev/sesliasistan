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
import { HourTable } from "@/features/weather/HourTable";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";

// Ana sayfanın lacivert üst kısmı ("kokpit"; Seyhun 2026-10-21 "C · Lacivert kokpit" seçti, örnek ana-sayfa/futuristik/c2-kokpit-ruzgar.png):
// logo + tarih + doğum günü + zil + Ayarlar; altında bugünün havası tek satırda (sıcaklık, gökyüzü, en düşük/en yüksek;
// sağda şimdiki rüzgâr "rüzgâr–sağanak kn"), saat saat hava tablosu (HourTable; 2026-11-03 rüzgâr grafiği CockpitWind yerine) ve sıradaki iş (nextPlan). Hava satırı ya da grafiğe dokununca
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
    <section className="ck ck-top home-ck -mx-4 px-4 pb-4 pt-[calc(0.875rem+env(safe-area-inset-top))]" aria-label="Bugün">
      {/* İlk ekran (Seyhun 2026-10-28 "A · Yalnız saydıkların"): günler, yarış sayacı, hava ve grafik (yarış başka yerdeyse altta ev yeri)
          telefonda ekrana tam oturur; boşluk açılmaz, büyüklükler ekran boyuna göre (--u), kalan yeri grafik doldurur (useFit).
          Sıradaki plan ve iş düğmeleri kaydırınca gelir. */}
      <div ref={fitRef} style={fill ? { minHeight: far ? fitH : undefined, "--u": `${(fitH / 100).toFixed(2)}px` } : undefined} className="ck-a flex flex-col">
      <header className="-mb-1 flex items-center justify-end gap-2">
        <h1 className="sr-only">{now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</h1>
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={onInbox} />
        <Link href="/settings" aria-label="Ayarlar" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-[0.8125rem] font-semibold text-white active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>

      {/* Sıra (Seyhun 2026-11-03 "A · Günlerin altında"): hava ve saat tablosu en üstte, altında günler, sonra canlı yarış şeridi, sonra plan */}
      {far ? (
        // Yarış başka yerde (Seyhun 2026-11-03 "iki grafiği de yeni hava tarzına çevir"): üst üste iki saat saat tablo, yarış yeri ve ev yeri;
        // başlıkta yerin adı, dokununca ayrıntı (yarış sayfası / hava sayfası)
        <div className="mt-3.5 flex flex-col gap-3">
          <PlaceTable
            label="Yarış yerinin havası"
            name={(ar.place || away.place || away.name || "").split(",")[0]}
            race
            rows={ar.rows}
            next={dayHours(w, nextDay(date))}
            date={date}
            place={ar.at}
            onClick={() => router.push(`/athletes/races/${away.id}`)}
          />
          <PlaceTable label={`${home.name} havası`} name={home.name} rows={rows} next={dayHours(w, nextDay(date))} date={date} onClick={goWeather} />
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
          {/* Saat saat tablo (Seyhun 2026-11-03 Windy görseli, HourTable): kaydırılır, dokununca hava sayfası */}
          {rows?.length > 0 && <HourTable key={date} rows={rows} next={dayHours(w, nextDay(date))} date={date} onClick={goWeather} className="mt-2.5" />}
        </>
      )}

      <div className="mt-3">{days}</div>
      {live}
      </div>
      {isToday ? <NextPlan now={now} /> : <DayPlans date={date} onOpen={onOpenDay} />}
      {children}
    </section>
  );
}

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
  const { openAdd } = useAdd();
  const today = todayStr();
  const p = nextPlan(plans, now, today);
  if (!p) return null;
  const w = planWhen(p, now, today);
  const sail = isTraining(p);
  const sub = [planTag(p), p.time, p.place].filter(Boolean).join(" · ");
  // Antrenmansa Süre'nin yanında Yoklama (Seyhun 2026-10-22). Bugün ya da geçmişse o günün yoklaması, sonraki günde yoklama sayfası
  const att = sail && canSeeAthletes(profile?.email);
  return (
    <div className="ck-plan ck-b mt-3 rounded-[1.375rem] p-3.5 text-white">
      <button type="button" data-press onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} aria-label="Sıradaki plan" className="flex w-full min-w-0 items-center gap-3.5 text-left">
        <span className="min-w-[3.375rem] shrink-0 border-r border-white/30 pr-3.5 text-center leading-tight">
          <small className="block text-[0.75rem] font-semibold text-white/85">{w.top}</small>
          <b className="block text-[1.75rem] font-bold leading-none tracking-[-.03em] tabular-nums">{w.day}</b>
          <small className="block text-[0.75rem] font-semibold text-white/85">{w.mon}</small>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[1.0625rem] font-semibold leading-snug">{p.title || "Plan"}</b>
          {sub && <small className="mt-0.5 block truncate text-[0.8125rem] tabular-nums text-white/80">{sub}</small>}
        </span>
        <span className="shrink-0 text-right leading-tight">
          <b className="block text-[1.375rem] font-bold tabular-nums">{w.left[0]}</b>
          {w.left[1] && <small className="block text-[0.75rem] text-white/85">{w.left[1]}</small>}
        </span>
      </button>
      {(att || sail) && (
        <div className={`mt-3 grid gap-2 ${att && sail ? "grid-cols-2" : "grid-cols-1"}`}>
          {att && (
            <Link href={attHref(p.date, today) || "/athletes/attendance"} data-press className="ck-pbtn ck-pbtn2">
              Yoklama
            </Link>
          )}
          {sail && (
            <Link href={`/training/day?id=${p.id}`} data-press className="ck-pbtn">
              Süre
            </Link>
          )}
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
    <div className="ck-b mt-3 overflow-hidden rounded-[1.375rem] border border-white/10 bg-[#13243f]">
      <div className="flex items-center gap-2 px-3.5 pb-1.5 pt-3 text-[0.75rem] font-bold tracking-[.05em] text-[#9fadc6]">
        <span className="min-w-0 flex-1 truncate">{title.toLocaleUpperCase("tr-TR")}{list.length ? ` · ${list.length} PLAN` : ""}</span>
        <button type="button" data-press onClick={onOpen} className="shrink-0 text-[0.8125rem] font-semibold tracking-normal text-[#8fb3ff]">Günü aç ›</button>
      </div>
      {list.length ? (
        list.map((p) => (
          <button key={p.id} type="button" data-press="row" onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className="flex w-full items-center gap-2.5 border-t border-[#24375a] px-3.5 py-2.5 text-left">
            <span className={`tone-${planTone(p)} tone-bar w-1 self-stretch rounded-full`} />
            <b className="w-11 shrink-0 text-[0.9375rem] font-semibold tabular-nums">{p.time || "Gün"}</b>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[0.9375rem]">{p.title || "Plan"}</span>
              {p.place && <small className="block truncate text-[0.78rem] text-[#9fadc6]">{p.place}</small>}
            </span>
          </button>
        ))
      ) : (
        <p className="border-t border-[#24375a] px-3.5 py-3 text-[0.875rem] text-[#9fadc6]">Bu gün plan yok</p>
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


// Yarış günü, iki yer alt alta (Seyhun 2026-11-03): yerin adı ve ortak saat saat tablo (HourTable). rows yoksa yanıp sönen yer tutucu.
// Yarış yerinde (race) ölçüm o yerin en yakın istasyonundan (place, far).
function PlaceTable({ label, name, race = false, rows, next, date, place = null, onClick }) {
  if (!rows?.length) return <div className="h-[15rem] animate-pulse rounded-[1.125rem] border border-white/10 bg-white/5" role="status" aria-label={`${label} yükleniyor`} />;
  return (
    <section aria-label={label}>
      <button type="button" data-press onClick={onClick} className="mb-1.5 flex w-full items-center gap-1 px-1 text-left">
        <b className={`min-w-0 truncate text-[0.8125rem] font-bold ${race ? "text-[#8fb3ff]" : "text-white"}`}>{name}</b>
        <span className="shrink-0 text-white/45">›</span>
      </button>
      <HourTable key={date} rows={rows} next={race ? null : next} date={date} place={place} far={race} onClick={onClick} />
    </section>
  );
}

// "YYYY-AA-GG" → ertesi gün (öğlen üzerinden, saat dilimi kaymasın)
function nextDay(date) {
  const d = new Date(`${date}T12:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
