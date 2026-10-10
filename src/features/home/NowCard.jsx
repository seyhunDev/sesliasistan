"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRaceHome } from "@/features/athletes/raceHome";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dayHours } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { nowPlans, raceForPlan } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { addDay } from "@/lib/summary";
import { todayStr } from "@/lib/utils/format";

// Ana sayfa › ŞU AN: tek büyük koyu yeşil kart. Bugünün süren ya da sıradaki planı (saat, yer; antrenman/yarışta o saatlerin
// en sert rüzgârı, eşik geçilirse kırmızımsı), altında "Sonra" ile bir sonraki plan. Bugün kalan plan yoksa yarının ilki.
// Hiç plan yoksa "Plan yok · Plan ekle". Karta dokununca plan açılır (Yarış planında o yarışın sayfası, raceForPlan); sağ üstte Planlar sayfası. Görevler bu kartta değil,
// kartın altındaki "N şey seni bekliyor" şeridinde (dokununca zil ile aynı pencere; yalnız bekleyen varsa).
// weather: useWeather() sonucu, inbox: useInbox(), onInbox: pencereyi açar (OwnerHome).
export function NowCard({ weather, inbox, onInbox }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const router = useRouter();
  const races = useRaceHome();
  if (!profile) return null;
  const today = todayStr();
  const tomorrow = addDay(today);
  const { main, after } = nowPlans(plans, today, tomorrow, now);
  // Yarış planı (süren ya da adı aynı yarış) yarışın sayfasını açar, diğer planlar plan ekranını
  const open = (p) => {
    const race = raceForPlan(p, races.open, today);
    if (race) router.push(`/athletes/races/${race}`);
    else openAdd({ edit: { kind: "plan", id: p.id } });
  };
  const hours = dayHours(weather?.w, today)?.map(({ hh, wind, gust }) => ({ hh, wind, gust })) || [];
  const p = main?.p;
  const wx = p && main.when !== "tomorrow" && WIND_CATS.includes(p.cat || p.category) ? planWind(hours, p) : null;
  const windy = overWind(wx, profile.windKn || WIND_KN);
  const label = !main ? "BUGÜN" : main.when === "now" ? `ŞU AN${p.time ? ` · ${p.time}` : ""}` : main.when === "next" ? `SIRADAKİ${p.time ? ` · ${p.time}` : ""}` : `YARIN${p.time ? ` · ${p.time}` : ""}`;
  const sub = p && [p.place, wx && `rüzgâr ${wx.wind} kn${windy ? `, sağanak ${wx.gust} kn` : ""}`].filter(Boolean).join(" · ");

  return (
    <section aria-label="Şu an" className="overflow-hidden rounded-[1.5rem] bg-deep text-white shadow-[0_14px_30px_-18px_rgba(31,90,75,.85)]">
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[.08em] text-white/70">
          {main?.when === "now" && <span className="size-2 rounded-full bg-[#7ee2b8]" aria-hidden="true" />}
          {label}
        </span>
        <Link href="/plans" className="-mr-1 flex items-center gap-0.5 rounded-full px-1 text-[0.8125rem] font-semibold text-white/75 active:opacity-70">
          Planlar
          <Icon name="chev" className="size-3.5" />
        </Link>
      </div>
      {p ? (
        <button type="button" onClick={() => open(p)} className="block w-full px-5 pb-4 pt-1 text-left active:opacity-80">
          <b className="block truncate text-[1.625rem] font-bold leading-tight tracking-tight">{p.title}</b>
          <span className={`mt-1 block truncate text-[0.9375rem] ${windy ? "font-semibold text-[#ffb3a8]" : "text-white/80"}`}>{sub || (p.time ? p.time : "Gün boyu")}</span>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-1">
          <b className="text-[1.375rem] font-bold leading-tight tracking-tight">Plan yok</b>
          <button type="button" onClick={() => openAdd({ type: "plan" })} className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3.5 py-2 text-[0.875rem] font-semibold active:scale-95">
            <Icon name="plus" className="size-4" />
            Plan ekle
          </button>
        </div>
      )}
      {after && (
        <button type="button" onClick={() => open(after.p)} className="flex w-full items-center gap-3 border-t border-white/15 px-5 py-3 text-left text-[0.875rem] active:bg-white/5">
          <span className="shrink-0 text-white/70">{after.tomorrow && main?.when !== "tomorrow" ? "Yarın" : "Sonra"}</span>
          <b className="min-w-0 flex-1 truncate text-right font-semibold">
            {after.p.time ? `${after.p.time} ` : ""}
            {after.p.title}
          </b>
        </button>
      )}
      <WaitBar inbox={inbox} onAll={onInbox} />
    </section>
  );
}

// Kartın altındaki şerit: "3 şey seni bekliyor · Motor yağı, Turkcell…" (bekleyen yoksa çizilmez)
function WaitBar({ inbox, onAll }) {
  const list = inbox?.list || [];
  if (!list.length) return null;
  const names = list
    .slice(0, 3)
    .map((x) => (typeof x.title === "string" ? x.title : x.short))
    .filter(Boolean);
  return (
    <button type="button" onClick={onAll} aria-label={`${list.length} şey seni bekliyor`} className="flex w-full items-center gap-2 bg-white/[.08] px-5 py-3 text-left text-[0.9375rem]">
      <span className="min-w-0 flex-1 truncate">
        <b className="font-semibold">{list.length} şey seni bekliyor</b>
        {names.length > 0 && <span className="text-white/80"> · {names.join(", ")}</span>}
      </span>
      <Icon name="chev" className="size-4 shrink-0 text-white/75" />
    </button>
  );
}
