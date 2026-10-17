"use client";

import { useRouter } from "next/navigation";
import { useRaceHome } from "@/features/athletes/raceHome";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dayHours } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { dayHead, planTag, planTone, raceForPlan, trainingWeek, twoDays, untilText } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { WeekStrip } from "./HomeSummary";
import { GROUP, SectionHead } from "./ui";

// Ana sayfanın takvim bölümü (Seyhun 2026-10-17: "2'deki gibi, bugün kısmı 3'teki gibi, Bugün yazısına gerek yok"). Ayrı gruplu kartlar:
// 1) gün şeridi (WeekStrip; dünden başlar, bugün kırmızı daire, üç hafta kaydırılır, sonunda Tümü › Takvim; güne dokununca o günün penceresi),
// 2) bugünün planları saat çizgisinde (başlıksız): solda saat, ortada dikey çizgi ve plan türünün renginde halka (planTone), süren plan kırmızı dolu
//    nokta ve alt satırda "yer · 12:00'ye kadar · şimdi"; ilk satırda antrenman/yarışın rüzgârı (eşik geçilirse kırmızımsı); sağda tür adı,
// 3) "YARIN" (ya da planı olan en yakın gün) başlığı ve satırları: solda türün renginde saat karesi, ad, "09:00 · yer",
// 4) "SIRADA": sonraki en çok 4 plan, 5) "Seni bekleyenler" satırı (sayı, ilk işler; zil ile aynı pencere).
// Satıra dokununca plan açılır (Yarış planında yarışın sayfası). Bellekteki planlardan, ek okuma yok.
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
  const week = training ? trainingWeek(plans, today, fit || [], 3, true) : null;
  const { days, rest } = twoDays(plans, today, now, 4);
  const open = (p) => {
    const race = raceForPlan(p, races.open, today);
    if (race) router.push(`/athletes/races/${race}`);
    else openAdd({ edit: { kind: "plan", id: p.id } });
  };
  const hours = dayHours(weather?.w, today)?.map(({ hh, wind, gust }) => ({ hh, wind, gust })) || [];
  // Bugünün ilk satırının rüzgârı (antrenman/yarış): o saatlerin rüzgârı; eşik geçilirse kırmızımsı
  const [td, next] = days;
  const first = td.rows[0];
  const wx = first && WIND_CATS.includes(first.p.cat || first.p.category) ? planWind(hours, first.p) : null;
  const windy = overWind(wx, profile.windKn || WIND_KN);
  const empty = !td.rows.length && !next;
  // Sıradakilerin tarihi: bu aydaysa "Sal 20", değilse "Pzt 3 Kas"
  const short = (day) => (day.slice(0, 7) === today.slice(0, 7) ? dayHead(day, today).replace(/ \S+$/, "") : dayHead(day, today));
  const full = (day) => {
    const d = new Date(`${day}T12:00:00`);
    return `${d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", "")}`;
  };

  return (
    <section aria-label="Takvim" className="space-y-2.5">
      {week && (
        <div className={`py-2.5 ${GROUP}`}>
          <WeekStrip w={week} att={att} today={today} />
        </div>
      )}

      <div className={`px-3.5 py-1.5 ${GROUP}`}>
        {td.rows.length ? (
          <ul>
            {td.rows.map(({ p, now: live }, i) => {
              const tag = planTag(p);
              const sub = [p.place, live && untilText(p.time, p.durationMin), i === 0 && wx && `rüzgâr ${wx.wind} kn${windy ? `, sağanak ${wx.gust} kn` : ""}`].filter(Boolean).join(" · ");
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => open(p)} className={`tone-${planTone(p)} grid w-full grid-cols-[3.25rem_1fr] text-left`}>
                    <span className={`whitespace-nowrap py-2.5 tabular-nums ${p.time ? "text-[0.90625rem] font-bold" : "text-[0.8125rem] font-semibold text-fg2"}`}>{p.time || "Tüm gün"}</span>
                    <span className="relative min-w-0 border-l-2 border-line py-2.5 pl-4">
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[7px] top-[0.9rem] size-3 rounded-full border-2 ${live ? "border-[var(--red)] bg-[var(--red)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--red)_18%,transparent)]" : "border-[var(--tfg)] bg-card"}`}
                      />
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <b className={`min-w-0 truncate ${live ? "font-semibold" : "font-normal"}`}>{p.title}</b>
                        {tag && <span className="tone-fg shrink-0 text-[0.75rem] font-semibold">{tag}</span>}
                      </span>
                      {(sub || live) && (
                        <small className={`block truncate text-[0.84375rem] ${i === 0 && windy ? "font-medium text-rose-600 dark:text-rose-400" : "text-mut"}`}>
                          {sub}
                          {live && (
                            <span className="font-semibold text-[var(--red)]">
                              {sub ? " · " : ""}şimdi
                            </span>
                          )}
                        </small>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-[0.9375rem] text-mut">{empty ? "Plan yok" : "Bugün plan kalmadı"}</span>
            {empty && (
              <button type="button" data-press onClick={() => openAdd({ type: "plan" })} className="raised flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">
                <Icon name="plus" className="size-4" />
                Plan ekle
              </button>
            )}
          </div>
        )}
      </div>

      {next && (
        <div className="pt-3">
          <SectionHead title={next.label}>{next.label === "Yarın" && <span className="font-normal uppercase text-mut">{full(next.day)}</span>}</SectionHead>
          <ul className={GROUP}>
            {next.rows.map(({ p }) => (
              <PlanRow key={p.id} p={p} sub={[p.time, p.place].filter(Boolean).join(" · ") || "Tüm gün"} onOpen={() => open(p)} />
            ))}
          </ul>
        </div>
      )}

      {rest.length > 0 && (
        <div className="pt-3">
          <SectionHead title="Sırada" />
          <ul className={GROUP}>
            {rest.map(({ p, day }) => (
              <PlanRow key={p.id} p={p} sub={[short(day), p.time, p.place].filter(Boolean).join(" · ")} onOpen={() => open(p)} />
            ))}
          </ul>
        </div>
      )}

      <WaitRow inbox={inbox} onAll={onInbox} />
    </section>
  );
}

// Gruplu kart satırı: solda plan türünün renginde kare içinde saat ("09"; saatsizde nokta), ad ve alt satır; satırlar arası çizgi kareden sonra başlar
function PlanRow({ p, sub, onOpen }) {
  return (
    <li className="relative not-first:before:absolute not-first:before:left-14 not-first:before:right-0 not-first:before:top-0 not-first:before:border-t not-first:before:border-line">
      <button type="button" onClick={onOpen} className={`tone-${planTone(p)} flex w-full items-center gap-3 px-3.5 py-2.5 text-left`}>
        <span aria-hidden="true" className="tone-bar grid size-[1.875rem] shrink-0 place-items-center rounded-lg text-[0.75rem] font-bold tabular-nums text-white dark:text-[#111214]">
          {p.time ? p.time.slice(0, 2) : "·"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{p.title}</span>
          {sub && <small className="block truncate text-[0.875rem] text-mut">{sub}</small>}
        </span>
      </button>
    </li>
  );
}

// "Seni bekleyenler" satırı: kırmızı karede sayı, sağda ilk işlerin adı (bekleyen yoksa çizilmez; ayrıntı zil penceresinde)
function WaitRow({ inbox, onAll }) {
  const list = inbox?.list || [];
  if (!list.length) return null;
  const peek = list.map((x) => x.title).filter((t) => typeof t === "string" && t).slice(0, 3).join(", ");
  return (
    <button type="button" onClick={onAll} className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${GROUP}`}>
      <span aria-hidden="true" className="grid size-[1.875rem] shrink-0 place-items-center rounded-lg bg-[var(--red)] text-[0.8125rem] font-bold tabular-nums text-white">
        {list.length}
      </span>
      <span className="shrink-0">Seni bekleyenler</span>
      <span className="min-w-0 flex-1 truncate text-right text-mut">{peek}</span>
      <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
    </button>
  );
}
