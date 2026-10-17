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
import { dayHead, dayInfo, planTag, planTone, raceForPlan, trainingWeek, twoDays } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { DayPick, WeekStrip } from "./HomeSummary";
import { CALM } from "./ui";

// Ana sayfanın en üstü (Seyhun: "takvimde bugün ve yarın gösterilsin, en fazla iki gün; yarın yoksa en yakın gün; altında sırada seni bekleyenler").
// Tek kart: üstte hafta şeridi (gün daireleri ve noktalar, WeekStrip; üç hafta kaydırılır, sonunda Tümü › Takvim), iki gün (Bugün ve planı olan en yakın gün; saat ya da "Tüm gün", başlık), altında "Sırada seni bekleyenler":
// sonraki 4 plan ve "N şey seni bekliyor" şeridi (zil ile aynı pencere). Gün başlığına dokununca o günün penceresi (yoklama, fitness; DayPick).
// Canlı satırlar (Seyhun: "buraları daha canlı yapalım"): solda plan türünün renginde çizgi (planTone), Bugün/Yarın'da sağda tür etiketi,
// süren plan yeşil zeminli; gün başlığının yanında plan sayısı. Satıra dokununca plan açılır (Yarış planında yarışın sayfası). Bellekteki planlardan, ek okuma yok.
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
  const week = training ? trainingWeek(plans, today, fit || [], 3) : null;
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
  // Sıradakilerin tarihi: bu aydaysa "Sal 20", değilse "Pzt 3 Kas"
  const short = (day) => (day.slice(0, 7) === today.slice(0, 7) ? dayHead(day, today).replace(/ \S+$/, "") : dayHead(day, today));
  const count = (n) => n > 0 && <span className="ml-1.5 rounded-full bg-accbg px-2 py-px text-[0.75rem] font-semibold tabular-nums text-acc">{n}</span>;

  return (
    <section aria-label="Takvim" className={`overflow-hidden ${CALM}`}>
      {week && <WeekStrip w={week} att={att} today={today} />}
      {days.map(({ day, label, rows }, k) => {
        const d = wd(day);
        const tap = d && dayInfo(d, att, today).tap;
        return (
          <div key={day} className={k || week ? "border-t border-line" : ""}>
            <div className="flex items-center justify-between gap-3 px-3.5 pt-2.5">
              {tap ? (
                <button type="button" onClick={() => setPick(d)} className="flex items-center text-[0.875rem] font-semibold text-fg">
                  {label}
                  {count(rows.length)}
                  <span aria-hidden="true" className="ml-1.5 font-normal text-mut">›</span>
                </button>
              ) : (
                <span className="flex items-center text-[0.875rem] font-semibold text-fg">
                  {label}
                  {count(rows.length)}
                </span>
              )}
              {k === 0 && !week && <Link href="/calendar" className="text-[0.8125rem] font-semibold text-acc">Takvim ›</Link>}
            </div>
            {rows.length ? (
              <ul className="space-y-0.5 px-2.5 pb-2 pt-1">
                {rows.map(({ p, now: live }, i) => {
                  const tag = planTag(p);
                  return (
                    <li key={p.id}>
                      <button type="button" onClick={() => open(p)} className={`tone-${planTone(p)} flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left ${live ? "bg-accbg" : ""}`}>
                        <span aria-hidden="true" className="tone-bar w-1 self-stretch rounded-full" />
                        <span className={`w-[3.5rem] shrink-0 whitespace-nowrap text-[0.875rem] leading-snug tabular-nums ${live ? "font-semibold text-acc" : "text-fg2"}`}>
                          {live ? "Şimdi" : p.time || "Tüm gün"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate font-medium">{p.title}</b>
                          {k === 0 && i === 0 && sub && <small className={`block truncate text-[0.8125rem] ${windy ? "font-medium text-rose-600 dark:text-rose-400" : "text-mut"}`}>{sub}</small>}
                        </span>
                        {tag && <span className="tone-chip shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-medium">{tag}</span>}
                      </button>
                    </li>
                  );
                })}
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
            <ul className="space-y-0.5 px-2.5 pb-2 pt-1">
              {rest.map(({ p, day }) => (
                <li key={p.id}>
                  <button type="button" onClick={() => open(p)} className={`tone-${planTone(p)} flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left`}>
                    <span aria-hidden="true" className="tone-bar w-1 self-stretch rounded-full" />
                    <span className="w-[3.5rem] shrink-0 whitespace-nowrap text-[0.875rem] leading-snug tabular-nums text-fg2">
                      {p.time || "Tüm gün"}
                      <small className="block text-[0.75rem] font-normal text-mut">{short(day)}</small>
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
