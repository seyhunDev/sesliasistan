"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canSeeAthletes } from "@/features/athletes/access";
import { DayChart, Wait } from "@/features/athletes/RaceWx";
import { lastForecastDay, loadRaceDay } from "@/features/athletes/raceWeather";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { dayHours, getPlace, kn, nowOf, sky, windName } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { isTraining } from "@/lib/trainingLog";
import { attHref, dayPlans, dayWeather, nextPlan, planTag, planTone } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
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
// büyük hava ve rüzgâr grafiği yarışın yerinin (raceWeather.loadRaceDay, yarış sayfasıyla aynı DayChart); üstte yerin adı, altta tek satır ev yeri
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

  return (
    <section className="ck ck-top -mx-4 px-4 pb-4 pt-[calc(0.875rem+env(safe-area-inset-top))]" aria-label="Bugün">
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
        <>
          <p className="mt-4 truncate text-[0.8125rem] font-semibold text-[#67e8f9]">{(ar.place || away.place || away.name || "").split(",")[0]}</p>
          {ar.rows ? (
            <button type="button" onClick={() => router.push(`/athletes/races/${away.id}`)} aria-label="Yarış yerinin havası" className="mt-1 block w-full text-left">
              <DayChart rows={ar.rows} day={date} at={ar.at} />
            </button>
          ) : (
            <div className="mt-1">
              <Wait />
            </div>
          )}
          <button type="button" onClick={goWeather} aria-label={`${home.name} havası`} data-press className="mt-2.5 flex w-full items-center gap-2 rounded-xl bg-white/6 px-3 py-2.5 text-left text-[0.8125rem]">
            <span className="min-w-0 flex-1 truncate text-white/75">
              <b className="font-semibold text-white">{home.name}</b>
              {n ? ` · ${n.t}° · ${windName(n.dir)[0]}` : ""}
            </span>
            {n && <b className="shrink-0 font-semibold tabular-nums">{kn(n.wind, n.gust)} kn</b>}
            <span className="shrink-0 text-white/45">›</span>
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={goWeather} aria-label="Hava ayrıntısı" className="mt-4 block w-full text-left">
            {n ? (
              <span className="flex items-center gap-3">
                <span className="shrink-0 text-[2.5rem] font-bold leading-none tracking-[-.04em] tabular-nums">{n.t}°</span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[0.9375rem] font-semibold">{isToday ? "" : `${dname} · `}{sky(n.code, n.day).label}</b>
                  <small className="block truncate text-[0.8125rem] text-white/65 tabular-nums">
                    {dw ? `${dw.min}° / ${dw.max}°` : ""}
                  </small>
                </span>
                <span className="shrink-0 text-right leading-tight">
                  <small className="block text-[0.75rem] text-white/65">{windName(n.dir)[0]} · {isToday ? "şimdi" : "gün içi"}</small>
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
            <button type="button" onClick={goWeather} aria-label="Rüzgâr, ayrıntı" className="mt-2 block w-full text-left">
              <CockpitWind key={date} rows={rows} date={date} />
            </button>
          )}
        </>
      )}
      {isToday ? <NextPlan now={now} /> : <DayPlans date={date} onOpen={onOpenDay} />}
      {children}
    </section>
  );
}

// Sıradaki iş (nextPlan, lib/homeTiles.js): bugün süren ya da sıradaki plan, yoksa 7 gün içindeki ilk plan. Kokpitin en belirgin parçası
// (Seyhun 2026-10-22 "A · Mor kart"): logo morunda dolu kart; üstte solda gün ve tür, aynı satırın sonunda kalan süre (Seyhun: "biri başta,
// biri sonda", altta boş satır kalmasın); büyük saat + tam başlık (2 satıra kadar), altta yalnız yer.
// Antrenmansa kartın içinde Yoklama ve Süre (widget'taki gibi). Karta dokununca plan açılır.
function NextPlan({ now }) {
  const { plans } = useData();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const today = todayStr();
  const p = nextPlan(plans, now, today);
  if (!p) return null;
  const mins = p.date === today && p.time ? Math.round((new Date(`${p.date}T${p.time}`) - now) / 60000) : null;
  // Gün bir kez yazılır: üstte "Bugün" / "Yarın" / "Pazartesi 26 Eki"; altta kalan süre (Seyhun 2026-10-21: tekrar olmasın)
  const days = Math.round((Date.parse(`${p.date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 864e5);
  const d = new Date(`${p.date}T12:00`);
  const day = days === 0 ? "Bugün" : days === 1 ? "Yarın" : `${cap(d.toLocaleDateString("tr-TR", { weekday: "long" }))} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", "")}`;
  const left =
    days > 1
      ? `${days} gün sonra`
      : days === 1
        ? ""
        : mins == null
          ? "Gün boyu"
          : mins <= 0
            ? "Şimdi"
            : mins < 60
              ? `${mins} dk sonra`
              : `${Math.floor(mins / 60)} sa ${mins % 60 ? `${mins % 60} dk ` : ""}sonra`;
  const sail = isTraining(p);
  const tag = planTag(p);
  // Antrenmansa Süre'nin yanında Yoklama (Seyhun 2026-10-22). Bugün ya da geçmişse o günün yoklaması, sonraki günde yoklama sayfası
  const att = sail && canSeeAthletes(profile?.email);
  return (
    <div className="ck-plan mt-3 rounded-[1.375rem] p-3.5 pb-3 text-white">
      <button type="button" data-press onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className="block w-full min-w-0 text-left">
        <span className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[.04em] text-white/85">
          <span className="size-[7px] shrink-0 rounded-full bg-white" />
          <span className="min-w-0 flex-1 truncate uppercase">{[day, tag].filter(Boolean).join(" · ")}</span>
          {left && <span className="shrink-0 text-[0.8125rem] font-semibold tracking-normal text-white">{left}</span>}
        </span>
        <span className="mt-1 flex items-baseline gap-2.5">
          {p.time && <b className="shrink-0 text-[1.75rem] font-bold leading-tight tracking-[-.03em] tabular-nums">{p.time}</b>}
          <span className="line-clamp-2 min-w-0 text-[1.0625rem] font-semibold leading-snug">{p.title || "Plan"}</span>
        </span>
        {p.place && <small className="mt-0.5 block truncate text-[0.8125rem] text-white/80">{p.place}</small>}
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
