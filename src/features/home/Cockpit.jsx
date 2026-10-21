"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/ui/AppLogo";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { dayHours, nowOf, sky, windName } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { isTraining } from "@/lib/trainingLog";
import { nextPlan } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { CockpitWind } from "./CockpitWind";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";

// Ana sayfanın lacivert üst kısmı ("kokpit"; Seyhun 2026-10-21 "C · Lacivert kokpit" seçti, örnek ana-sayfa/futuristik/c2-kokpit-ruzgar.png):
// logo + tarih + doğum günü + zil + Ayarlar; altında bugünün havası tek satırda (sıcaklık, gökyüzü, en düşük/en yüksek, günün en sert sağanağı;
// "14:00 23 kn" = günün en sert sağanağı ve saati; sağda şimdiki rüzgâr "rüzgâr–sağanak kn"), büyük rüzgâr grafiği (CockpitWind) ve sıradaki iş (nextPlan). Hava satırı ya da grafiğe dokununca
// hava sayfası açılır. Lacivert her iki temada aynı (logonun gecesi); altındaki açık zemin üstüne yuvarlak köşeyle biner (OwnerHome).
// İlk ekran tam bir sayfa (Seyhun 2026-10-21 "A · tam lacivert"): kokpit alt sekme çubuğuna kadar uzar, boşluk bölümler arasında eşit dağılır;
// children (iş düğmeleri, büyük günler) en altta.
export function Cockpit({ weather, inbox, onInbox, children }) {
  const { profile } = useAuth();
  const router = useRouter();
  const now = useNow();
  const { w, err, refresh } = weather;
  const today = todayStr();
  const n = nowOf(w);
  const rows = dayHours(w, today);
  const day = w?.today?.date === today ? w.today : w?.days?.find((d) => d.date === today);
  const peak = rows?.length ? rows.reduce((a, h) => (h.gust > a.gust ? h : a), rows[0]) : null;
  const dname = now.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  const goWeather = () => (w ? router.push("/weather") : refresh(true));

  return (
    <section className="ck -mx-4 flex min-h-[calc(100svh-var(--stage-h,5rem)+2.5rem)] flex-col px-4 pb-9 pt-[calc(0.875rem+env(safe-area-inset-top))]" aria-label="Bugün">
      <header className="flex items-center gap-3">
        <AppLogo size={28} className="-mr-1 flex shrink-0 lg:hidden" />
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
                {peak && peak.gust > n.gust ? `${day ? " · " : ""}${peak.hh}:00 ${peak.gust} kn` : ""}
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
      <div className="mt-auto">
        <NextPlan now={now} />
      </div>
      {children}
    </section>
  );
}

// Sıradaki iş (nextPlan, lib/homeTiles.js): bugün süren ya da sıradaki plan, yoksa 7 gün içindeki ilk plan. Antrenmansa sağda "Süre" (antrenman sayfası, sayaç).
// Satıra dokununca plan açılır. Aynı plan aşağıdaki takvim listesinde tekrar yazmaz (OwnerHome kimliğini SiradaCard'a "skip" olarak verir).
function NextPlan({ now }) {
  const { plans } = useData();
  const { openAdd } = useAdd();
  const today = todayStr();
  const p = nextPlan(plans, now, today);
  if (!p) return null;
  const mins = p.date === today && p.time ? Math.round((new Date(`${p.date}T${p.time}`) - now) / 60000) : null;
  const when =
    mins == null
      ? p.date === today
        ? "Bugün"
        : p.date === new Date(now.getTime() + 864e5).toLocaleDateString("sv-SE")
          ? "Yarın"
          : cap(new Date(`${p.date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long" }))
      : mins <= 0
        ? "Şimdi"
        : mins < 60
          ? `${mins} dk sonra`
          : `${Math.floor(mins / 60)} sa ${mins % 60 ? `${mins % 60} dk ` : ""}sonra`;
  const big = p.date === today ? p.time || "Bugün" : new Date(`${p.date}T12:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  const sail = isTraining(p);
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] border border-white/12 bg-white/[.07] py-2.5 pl-3.5 pr-2.5">
      <button type="button" data-press onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="shrink-0 text-[1.5rem] font-bold capitalize tracking-[-.02em] tabular-nums">{big}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[0.9375rem] font-semibold">{p.title || "Plan"}</b>
          <small className="block truncate text-[0.8125rem] text-white/65">{[when, p.date !== today && p.time, p.place].filter(Boolean).join(" · ")}</small>
        </span>
      </button>
      {sail && (
        <Link href={`/training/day?id=${p.id}`} data-press className="ck-btn shrink-0">
          Süre
        </Link>
      )}
    </div>
  );
}

const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);
