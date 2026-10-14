"use client";

import { useRouter } from "next/navigation";
import { useRaceHome } from "@/features/athletes/raceHome";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dayHours } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { raceForPlan, trainingWeek, upcoming } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { WeekStrip } from "./HomeSummary";
import { CARD } from "./ui";

// Ana sayfanın en üstü (Seyhun: "şu an değil, sırada ne var önemli; antrenman takvimini en üste al, isim bile koymaya gerek yok").
// Tek kart: üstte başlıksız hafta şeridi (antrenman takvimi; güne dokununca o günün penceresi, WeekStrip), altında SIRADA:
// bugünden sonraki 4 plan (ŞİMDİ / BUGÜN / YARIN / gün adı, saat, başlık; yalnız ilk satırda yer ve rüzgâr). Satıra dokununca plan
// açılır (Yarış planında yarışın sayfası). En altta "N şey seni bekliyor" şeridi (zil ile aynı pencere). Bellekteki planlardan, ek okuma yok.
// weather: useWeather(), inbox: useInbox(), onInbox: pencereyi açar; fit: fitDays(), att: yoklama yetkisi (OwnerHome).
export function SiradaCard({ weather, inbox, onInbox, fit, att, training }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const router = useRouter();
  const races = useRaceHome();
  if (!profile) return null;
  const today = todayStr();
  const week = training ? trainingWeek(plans, today, fit || []) : null;
  const rows = upcoming(plans, today, now, 4);
  const open = (p) => {
    const race = raceForPlan(p, races.open, today);
    if (race) router.push(`/athletes/races/${race}`);
    else openAdd({ edit: { kind: "plan", id: p.id } });
  };
  const hours = dayHours(weather?.w, today)?.map(({ hh, wind, gust }) => ({ hh, wind, gust })) || [];
  // İlk satırın alt yazısı: yer ve (bugünkü antrenman/yarışta) o saatlerin rüzgârı; eşik geçilirse kırmızımsı
  const first = rows[0];
  const wx = first && first.day === today && WIND_CATS.includes(first.p.cat || first.p.category) ? planWind(hours, first.p) : null;
  const windy = overWind(wx, profile.windKn || WIND_KN);
  const sub = first && [first.p.place, wx && `rüzgâr ${wx.wind} kn${windy ? `, sağanak ${wx.gust} kn` : ""}`].filter(Boolean).join(" · ");

  return (
    <section aria-label="Sırada" className={`overflow-hidden ${CARD}`}>
      {week && <WeekStrip w={week} att={att} today={today} />}
      {rows.length ? (
        <ul>
          {rows.map(({ p, label, now: live }, i) => (
            <li key={p.id} className={i || week ? "border-t border-line" : ""}>
              <button type="button" onClick={() => open(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                <span className={`flex w-[3.75rem] shrink-0 items-center gap-1 text-[0.6875rem] font-bold tracking-[.04em] ${live ? "text-acc" : "text-mut"}`}>
                  {live && <span className="size-1.5 shrink-0 rounded-full bg-acc" aria-hidden="true" />}
                  <span className="truncate">{label}</span>
                </span>
                <span className="w-[2.75rem] shrink-0 text-[0.8125rem] font-semibold tabular-nums">{p.time || "—"}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{p.title}</b>
                  {i === 0 && sub && <small className={`block truncate text-[0.75rem] ${windy ? "font-semibold text-rose-600 dark:text-rose-400" : "text-mut"}`}>{sub}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${week ? "border-t border-line" : ""}`}>
          <b className="text-[0.9375rem] font-semibold text-mut">Plan yok</b>
          <button type="button" data-press onClick={() => openAdd({ type: "plan" })} className="raised flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">
            <Icon name="plus" className="size-4" />
            Plan ekle
          </button>
        </div>
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
    <button type="button" onClick={onAll} aria-label={`${list.length} şey seni bekliyor`} className="flex w-full items-center gap-2 border-t border-line bg-line/30 px-4 py-3 text-left text-[0.875rem]">
      <span className="min-w-0 flex-1 truncate">
        <b className={`font-semibold ${"text-amber-700 dark:text-amber-300"}`}>{list.length} şey seni bekliyor</b>
        {names.length > 0 && <span className="text-mut"> · {names.join(", ")}</span>}
      </span>
      <Icon name="chev" className="size-4 shrink-0 text-mut" />
    </button>
  );
}
