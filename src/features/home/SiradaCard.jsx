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
import { raceForPlan, trainingWeek, upcoming } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { WeekStrip } from "./HomeSummary";
import { CALM } from "./ui";

// Ana sayfanın en üstü (Seyhun: "şu an değil, sırada ne var önemli; antrenman takvimini en üste al, isim bile koymaya gerek yok").
// Tek kart: başlıksız hafta şeridi (antrenman takvimi; güne dokununca o günün penceresi, WeekStrip), altında sıradaki 3 plan,
// her biri tek satır (Seyhun: "çok yer kaplıyor, yazıların gösterilme şekli"): solda "bugün 17:00", ortada başlık, ilk satırda sağda
// yer/rüzgâr. Satıra dokununca plan açılır (Yarış planında yarışın sayfası). En altta tek satır: "N şey seni bekliyor" (zil ile aynı
// pencere) ve "Takvim ›" (Seyhun: "takvim butonu olsun"). Bellekteki planlardan, ek okuma yok.
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
  const rows = upcoming(plans, today, now, 3);
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
  const sub = first && [first.p.place, wx && `${wx.wind} kn${windy ? ` · sağanak ${wx.gust}` : ""}`].filter(Boolean).join(" · ");

  return (
    <section aria-label="Sırada" className={`overflow-hidden ${CALM}`}>
      {week && <WeekStrip w={week} att={att} today={today} />}
      {rows.length ? (
        <ul>
          {rows.map(({ p, label, day, now: live }, i) => (
            <li key={p.id} className={i || week ? "border-t border-line" : ""}>
              <button type="button" onClick={() => open(p)} className="flex w-full items-baseline gap-2.5 px-3.5 py-2 text-left">
                <span className={`w-[5.75rem] shrink-0 whitespace-nowrap text-[0.8125rem] tabular-nums ${live ? "font-semibold text-acc" : "text-fg2"}`}>
                  <span className={live ? "" : "text-mut"}>{shortLabel(label, day)}</span> {p.time || "tüm gün"}
                </span>
                <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{p.title}</b>
                {i === 0 && sub && <small className={`max-w-[40%] shrink-0 truncate text-[0.75rem] ${windy ? "font-medium text-rose-600 dark:text-rose-400" : "text-mut"}`}>{sub}</small>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${week ? "border-t border-line" : ""}`}>
          <span className="text-mut">Plan yok</span>
          <button type="button" data-press onClick={() => openAdd({ type: "plan" })} className="raised flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">
            <Icon name="plus" className="size-4" />
            Plan ekle
          </button>
        </div>
      )}
      <Foot inbox={inbox} onAll={onInbox} />
    </section>
  );
}

// "ŞİMDİ / BUGÜN / YARIN / CUMA" yerine sade küçük yazı: "şimdi", "bugün", "yarın", "Cum"
function shortLabel(label, day) {
  if (["ŞİMDİ", "BUGÜN", "YARIN"].includes(label)) return label.toLocaleLowerCase("tr-TR");
  if (!day) return label;
  return new Date(`${day}T12:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
}

// Kartın altındaki tek satır: solda "3 şey seni bekliyor ›" (yoksa boş; ayrıntı zil penceresinde), sağda "Takvim ›"
function Foot({ inbox, onAll }) {
  const n = inbox?.list?.length || 0;
  return (
    <div className="flex items-center gap-2 border-t border-line px-3.5 py-2 text-[0.8125rem]">
      {n ? (
        <button type="button" onClick={onAll} className="min-w-0 flex-1 truncate text-left font-medium text-fg2">
          {n} şey seni bekliyor <span aria-hidden="true" className="text-mut">›</span>
        </button>
      ) : (
        <span className="flex-1" />
      )}
      <Link href="/calendar" className="shrink-0 font-semibold text-acc">Takvim ›</Link>
    </div>
  );
}
