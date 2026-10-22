"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { canSeeAthletes } from "@/features/athletes/access";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { dayHours, nowOf, sky, windName } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { isTraining } from "@/lib/trainingLog";
import { attHref, nextPlan, planTag } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { CockpitWind } from "./CockpitWind";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";

// Ana sayfanın lacivert üst kısmı ("kokpit"; Seyhun 2026-10-21 "C · Lacivert kokpit" seçti, örnek ana-sayfa/futuristik/c2-kokpit-ruzgar.png):
// logo + tarih + doğum günü + zil + Ayarlar; altında bugünün havası tek satırda (sıcaklık, gökyüzü, en düşük/en yüksek;
// günün en sert sağanağı grafikte soluk çizgiyle (CockpitWind); sağda şimdiki rüzgâr "rüzgâr–sağanak kn"), büyük rüzgâr grafiği (CockpitWind) ve sıradaki iş (nextPlan). Hava satırı ya da grafiğe dokununca
// hava sayfası açılır. Lacivert her iki temada aynı (logonun gecesi); altındaki açık zemin üstüne yuvarlak köşeyle biner (OwnerHome).
// children (iş düğmeleri, büyük günler) en altta, araya boşluk konmaz (Seyhun 2026-10-21: "çok boşluklar oldu"; tam ekran uzatma kaldırıldı).
export function Cockpit({ weather, inbox, onInbox, children }) {
  const { profile } = useAuth();
  const router = useRouter();
  const now = useNow();
  const { w, err, refresh } = weather;
  const today = todayStr();
  const n = nowOf(w);
  const rows = dayHours(w, today);
  const day = w?.today?.date === today ? w.today : w?.days?.find((d) => d.date === today);
  const dname = now.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  const goWeather = () => (w ? router.push("/weather") : refresh(true));

  return (
    <section className="ck -mx-4 px-4 pb-9 pt-[calc(0.875rem+env(safe-area-inset-top))]" aria-label="Bugün">
      <header className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold leading-tight tracking-[-.02em]">
          <span className="capitalize">{dname}</span> {date}
        </h1>
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={onInbox} />
        <Link href="/settings" aria-label="Ayarlar" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-[0.8125rem] font-semibold text-white active:scale-90">
          {initials(profile?.name)}
        </Link>
      </header>

      <button type="button" onClick={goWeather} aria-label="Bugünün hava ayrıntısı" className="mt-4 block w-full text-left">
        {n ? (
          <span className="flex items-center gap-3">
            <span className="shrink-0 text-[2.5rem] font-bold leading-none tracking-[-.04em] tabular-nums">{n.t}°</span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block truncate text-[0.9375rem] font-semibold">{sky(n.code, n.day).label}</b>
              <small className="block truncate text-[0.8125rem] text-white/65 tabular-nums">
                {day ? `${day.min}° / ${day.max}°` : ""}
              </small>
            </span>
            <span className="shrink-0 text-right leading-tight">
              <small className="block text-[0.75rem] text-white/65">{windName(n.dir)[0]} · şimdi</small>
              <b className="text-[1.375rem] font-bold tracking-[-.02em] tabular-nums">
                {n.wind}
                {n.gust > n.wind && <span className="font-medium text-white/60">–{n.gust}</span>}
                <span className="text-[0.8125rem] font-medium text-white/60"> kn</span>
              </b>
            </span>
          </span>
        ) : (
          <span className="block py-2 text-[0.875rem] text-white/70">{err ? "Hava durumu alınamadı · dokun, yenile" : "Hava yükleniyor…"}</span>
        )}
      </button>
      {rows?.length > 0 && (
        <button type="button" onClick={goWeather} aria-label="Bugünün rüzgârı, ayrıntı" className="mt-2 block w-full text-left">
          <CockpitWind rows={rows} />
        </button>
      )}
      <NextPlan now={now} />
      {children}
    </section>
  );
}

// Sıradaki iş (nextPlan, lib/homeTiles.js): bugün süren ya da sıradaki plan, yoksa 7 gün içindeki ilk plan. Kokpitin en belirgin parçası
// (Seyhun 2026-10-22 "A · Mor kart"): logo morunda dolu kart; üstte solda gün ve tür, aynı satırın sonunda kalan süre (Seyhun: "biri başta,
// biri sonda", altta boş satır kalmasın); büyük saat + tam başlık (2 satıra kadar), altta yalnız yer.
// Antrenmansa kartın içinde Yoklama ve Süre (widget'taki gibi). Karta dokununca plan açılır. Aynı plan aşağıdaki takvim listesinde tekrar yazmaz
// (OwnerHome kimliğini SiradaCard'a "skip" olarak verir).
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

const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);
