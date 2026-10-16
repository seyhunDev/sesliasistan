"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRaceHome } from "@/features/athletes/raceHome";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dayHours } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { dayHead, dayInfo, raceForPlan, trainingWeek, twoDays } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { DayPick } from "./HomeSummary";
import { CALM } from "./ui";

// Ana sayfanın en üstü (Seyhun: "takvimde bugün ve yarın gösterilsin, en fazla iki gün; yarın yoksa en yakın gün; altında sırada seni bekleyenler").
// Tek kart: sağ üstte "Takvim ›", iki gün (Bugün ve planı olan en yakın gün; saat ya da "Tüm gün", başlık), altında "Sırada seni bekleyenler":
// sonraki 4 plan ve "N şey seni bekliyor" şeridi (zil ile aynı pencere). Gün başlığına dokununca o günün penceresi (yoklama, fitness; DayPick).
// Satıra dokununca plan açılır (Yarış planında yarışın sayfası). Bellekteki planlardan, ek okuma yok.
// weather: useWeather(), inbox: useInbox(), onInbox: pencereyi açar; fit: fitDays(), att: yoklama yetkisi (OwnerHome).
export function SiradaCard({ weather, inbox, onInbox, fit, att, training }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const router = useRouter();
  const races = useRaceHome();
  const [pick, setPick] = useState(null);
  if (!profile) return null;
  const today = todayStr();
  const week = training ? trainingWeek(plans, today, fit || []) : null;
  const { days, rest } = twoDays(plans, today, now, 4);
  const open = (p) => {
    const race = raceForPlan(p, races.open, today);
    if (race) router.push(`/athletes/races/${race}`);
    else openAdd({ edit: { kind: "plan", id: p.id } });
  };
  const hours = dayHours(weather?.w, today)?.map(({ hh, wind, gust }) => ({ hh, wind, gust })) || [];
  // Bugünün ilk satırının alt yazısı: yer ve (antrenman/yarışta) o saatlerin rüzgârı; eşik geçilirse kırmızımsı
  const first = days[0].rows[0];
  const wx = first && WIND_CATS.includes(first.p.cat || first.p.category) ? planWind(hours, first.p) : null;
  const windy = overWind(wx, profile.windKn || WIND_KN);
  const sub = first && [first.p.place, wx && `rüzgâr ${wx.wind} kn${windy ? `, sağanak ${wx.gust} kn` : ""}`].filter(Boolean).join(" · ");
  const wd = (day) => week?.days.find((x) => x.date === day);
  const empty = !days[0].rows.length && days.length === 1;

  return (
    <section aria-label="Takvim" className={`overflow-hidden ${CALM}`}>
      {days.map(({ day, label, rows }, k) => {
        const d = wd(day);
        const tap = d && dayInfo(d, att, today).tap;
        return (
          <div key={day} className={k ? "border-t border-line" : ""}>
            <div className="flex items-center justify-between gap-3 px-3.5 pt-2.5">
              {tap ? (
                <button type="button" onClick={() => setPick(d)} className="text-[0.875rem] font-semibold text-fg">
                  {label} <span aria-hidden="true" className="font-normal text-mut">›</span>
                </button>
              ) : (
                <span className="text-[0.875rem] font-semibold text-fg">{label}</span>
              )}
              {k === 0 && <Link href="/calendar" className="text-[0.8125rem] font-semibold text-acc">Takvim ›</Link>}
            </div>
            {rows.length ? (
              <ul className="pb-1">
                {rows.map(({ p, now: live }, i) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => open(p)} className="flex w-full items-start gap-3 px-3.5 py-2 text-left">
                      <span className={`w-[3.875rem] shrink-0 whitespace-nowrap text-[0.875rem] leading-snug tabular-nums ${live ? "font-semibold text-acc" : "text-fg2"}`}>
                        {live ? "Şimdi" : p.time || "Tüm gün"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate font-medium">{p.title}</b>
                        {k === 0 && i === 0 && sub && <small className={`block truncate text-[0.875rem] ${windy ? "font-medium text-rose-600 dark:text-rose-400" : "text-mut"}`}>{sub}</small>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-between gap-3 px-3.5 pb-2.5 pt-1">
                <span className="text-[0.875rem] text-mut">{empty ? "Plan yok" : "Bugün plan kalmadı"}</span>
                {empty && (
                  <button type="button" data-press onClick={() => openAdd({ type: "plan" })} className="raised flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">
                    <Icon name="plus" className="size-4" />
                    Plan ekle
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {(rest.length > 0 || inbox?.list?.length > 0) && (
        <div className="border-t border-line">
          <h2 className="px-3.5 pt-2.5 text-[0.875rem] font-semibold text-fg">Sırada seni bekleyenler</h2>
          {rest.length > 0 && (
            <ul className="pb-1">
              {rest.map(({ p, day }) => (
                <li key={p.id}>
                  <button type="button" onClick={() => open(p)} className="flex w-full items-start gap-3 px-3.5 py-2 text-left">
                    <span className="w-[3.875rem] shrink-0 whitespace-nowrap text-[0.875rem] leading-snug tabular-nums text-fg2">
                      {p.time || "Tüm gün"}
                      <small className="block text-[0.78125rem] font-normal text-mut">{dayHead(day, today)}</small>
                    </span>
                    <b className="min-w-0 flex-1 truncate font-medium">{p.title}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <WaitBar inbox={inbox} onAll={onInbox} />
        </div>
      )}
      <DayPick day={pick} att={att} today={today} onClose={() => setPick(null)} />
    </section>
  );
}

// Kartın altındaki satır: "3 şey seni bekliyor ›" (bekleyen yoksa çizilmez; ayrıntı zil penceresinde)
function WaitBar({ inbox, onAll }) {
  const list = inbox?.list || [];
  if (!list.length) return null;
  return (
    <button type="button" onClick={onAll} className="flex w-full items-center gap-2 border-t border-line px-3.5 py-2.5 text-left text-[0.875rem] text-fg2">
      <span className="min-w-0 flex-1 truncate">{list.length} şey seni bekliyor</span>
      <span aria-hidden="true" className="text-mut">›</span>
    </button>
  );
}
