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
// Tek kart: sağ üstte "Takvim ›" (Takvim sayfası; Seyhun: "takvim gibi oldu, takvim butonu olsun"), başlıksız hafta şeridi (antrenman takvimi; güne dokununca o günün penceresi, WeekStrip), altında SIRADA:
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
    <section aria-label="Sırada" className={`overflow-hidden ${CALM}`}>
      <div className="flex justify-end px-3.5 pt-2">
        <Link href="/calendar" className="text-[0.8125rem] font-semibold text-acc">Takvim ›</Link>
      </div>
      {week && <WeekStrip w={week} att={att} today={today} />}
      {rows.length ? (
        <ul>
          {rows.map(({ p, label, day, now: live }, i) => (
            <li key={p.id} className={i || week ? "border-t border-line" : ""}>
              <button type="button" onClick={() => open(p)} className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left">
                <span className={`w-[3.875rem] shrink-0 text-[0.875rem] leading-snug tabular-nums ${live ? "font-semibold text-acc" : "text-fg2"}`}>
                  {p.time || "—"}
                  <small className={`block text-[0.78125rem] ${live ? "text-acc" : "font-normal text-mut"}`}>{shortLabel(label, day)}</small>
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-medium">{p.title}</b>
                  {i === 0 && sub && <small className={`block truncate text-[0.875rem] ${windy ? "font-medium text-rose-600 dark:text-rose-400" : "text-mut"}`}>{sub}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${week ? "border-t border-line" : ""}`}>
          <span className="text-mut">Plan yok</span>
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

// "ŞİMDİ / BUGÜN / YARIN / CUMA" yerine sade küçük yazı: "şimdi", "bugün", "yarın", "Cum"
function shortLabel(label, day) {
  if (["ŞİMDİ", "BUGÜN", "YARIN"].includes(label)) return label.toLocaleLowerCase("tr-TR");
  if (!day) return label;
  return new Date(`${day}T12:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
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
