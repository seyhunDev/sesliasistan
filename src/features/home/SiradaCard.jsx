"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRaceHome } from "@/features/athletes/raceHome";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dayHours } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { dayHead, leftTag, planTag, planTone, raceForPlan, raceGroups, raceKey, trainingWeek, twoDays, untilText } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { WeekStrip } from "./HomeSummary";
import { RacePlanSheet } from "./RacePlanSheet";
import { GROUP, SectionHead } from "./ui";

// Ana sayfanın takvim bölümü (Seyhun 2026-10-17: "2'deki gibi, bugün kısmı 3'teki gibi, Bugün yazısına gerek yok"). Ayrı gruplu kartlar:
// 1) gün şeridi (WeekStrip; dünden başlar, bugün kırmızı daire, üç hafta kaydırılır, sonunda Tümü › Takvim; güne dokununca o günün penceresi),
// 2) bugünün planları saat çizgisinde (başlıksız): solda saat, ortada dikey çizgi ve plan türünün renginde halka (planTone), süren plan kırmızı dolu
//    nokta ve alt satırda "yer · 12:00'ye kadar · şimdi"; ilk satırda antrenman/yarışın rüzgârı (eşik geçilirse kırmızımsı); sağda tür adı,
// 3) "YARIN · PAZAR" (ya da planı olan en yakın gün) ve 4) "SIRADA" (sonraki en çok 4 plan, saatin altında gün): bugünkü gibi saat çizgisinde (Seyhun: "3. örnekteki gibi olmalıydı"), 5) "Seni bekleyenler" satırı (sayı, ilk işler; zil ile aynı pencere).
// Satıra dokununca plan açılır (Yarış planında yarışın sayfası). Bellekteki planlardan, ek okuma yok.
// weather: useWeather(), inbox: useInbox(), onInbox: pencereyi açar; fit: fitDays(), att: yoklama yetkisi (OwnerHome).
export function SiradaCard({ weather, inbox, onInbox, fit, att, training }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const router = useRouter();
  const races = useRaceHome();
  const [pick, setPick] = useState(null); // Yarış planı: Yapıldı / Yarışın sayfası / Planı aç penceresi
  if (!profile) return null;
  const today = todayStr();
  const week = training ? trainingWeek(plans, today, fit || [], 3, true) : null;
  // Sırada: aynı yarışın planları tek satırda (raceGroups); en çok 4 satır
  const { days, rest: all } = twoDays(plans, today, now, 200);
  const rest = raceGroups(all).slice(0, 4);
  const norm = (x) => String(x || "").trim().toLocaleLowerCase("tr-TR");
  const raceOf = (name) => races.open.find((r) => norm(r.name) && norm(r.name) === norm(name));
  // Yarış planı (Seyhun 2026-10-19: "plana mı yarışın sayfasına mı gideceğim, tercih edebilmeliyim; yapıldı diyebilmeliyim"): pencere açılır.
  // Yarışı görme yetkisi yoksa ya da başka plansa plan açılır
  // Yarışın kendi planı (başlangıç günü; Seyhun 2026-10-20: "tıklanınca yarışmanın sayfasına gidilmeli") doğrudan yarışın sayfasını açar
  const open = (p) => {
    const rk = raceKey(p);
    const own = rk?.whole && raceOf(rk.name);
    if (own) return router.push(`/athletes/races/${own.id}`);
    if (rk && races.on) return setPick(p);
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
  const weekday = (day) => new Date(`${day}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });

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
            {td.rows.map(({ p, now: live }, i) => (
              <TimeRow
                key={p.id}
                p={p}
                live={live}
                warn={i === 0 && windy}
                sub={[p.place, live && untilText(p.time, p.durationMin), i === 0 && wx && `rüzgâr ${wx.wind} kn${windy ? `, sağanak ${wx.gust} kn` : ""}`].filter(Boolean).join(" · ")}
                left={live ? null : leftTag(today, today)}
                onOpen={() => open(p)}
              />
            ))}
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
          <SectionHead title={next.label === "Yarın" ? `Yarın · ${weekday(next.day)}` : next.label} />
          <ul className={`px-3.5 py-1.5 ${GROUP}`}>
            {next.rows.map(({ p }) => (
              <TimeRow key={p.id} p={p} sub={p.place} left={leftTag(next.day, today)} onOpen={() => open(p)} />
            ))}
          </ul>
        </div>
      )}

      {rest.length > 0 && (
        <div className="pt-3">
          <SectionHead title="Sırada" />
          <ul className={`px-3.5 py-1.5 ${GROUP}`}>
            {rest.map((x) =>
              x.race ? (
                <RaceGroupRow key={`r:${x.race}`} g={x} race={raceOf(x.race)} date={short} today={today} onRace={(href) => router.push(href)} onOpen={open} />
              ) : (
                <TimeRow key={x.p.id} p={x.p} date={short(x.day)} sub={[x.start && `Başlangıç ${dayHead(x.p.date, today)}`, x.p.place].filter(Boolean).join(" · ")} left={leftTag(x.day, today)} onOpen={() => open(x.p)} />
              ),
            )}
          </ul>
        </div>
      )}

      <WaitRow inbox={inbox} onAll={onInbox} />
      <RacePlanSheet plan={pick} today={today} onClose={() => setPick(null)} />
    </section>
  );
}

// Saat çizgisi satırı (Bugün, Yarın, Sırada aynı; 3. örnek): solda saat (Sırada'da altında gün), dikey çizgi üstünde plan türünün renginde halka,
// süren planda kırmızı dolu nokta ve alt satırın sonunda "şimdi"; ad, alt satırda tür adı ve yer ("Yarış · Foça"; Seyhun 2026-10-19) (warn: rüzgâr eşiği geçti, kırmızımsı).
// Ad kısaltılmaz, alt satıra geçer (Seyhun 2026-10-19); sağda kalan gün (left: leftTag; bugün/yarın kırmızı, 2 gün sarı, sonrası gri)
const LEFT = { red: "bg-[var(--red)] text-white", warn: "bg-warnbg text-warn", mut: "bg-line/60 text-fg2" };
function TimeRow({ p, live, warn, sub, date, left, onOpen }) {
  const tag = planTag(p);
  return (
    <li>
      <button type="button" onClick={onOpen} className={`tone-${planTone(p)} grid w-full grid-cols-[3.875rem_1fr] text-left`}>
        <span className={`whitespace-nowrap py-2.5 tabular-nums ${p.time ? "text-[0.90625rem] font-bold" : "text-[0.75rem] font-semibold text-fg2"}`}>
          {p.time || "Tüm gün"}
          {date && <small className="block text-[0.75rem] font-normal text-mut">{date}</small>}
        </span>
        <span className="relative min-w-0 border-l-2 border-line py-2.5 pl-4">
          <span
            aria-hidden="true"
            className={`absolute -left-[7px] top-[0.9rem] size-3 rounded-full border-2 ${live ? "border-[var(--red)] bg-[var(--red)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--red)_18%,transparent)]" : "border-[var(--tfg)] bg-card"}`}
          />
          <span className="flex min-w-0 items-start gap-2">
            <b className={`min-w-0 flex-1 break-words ${live ? "font-semibold" : "font-normal"}`}>{p.title}</b>
            <LeftPill left={left} />
          </span>
          {(tag || sub || live) && (
            <small className={`block break-words text-[0.84375rem] ${warn ? "font-medium text-rose-600 dark:text-rose-400" : "text-mut"}`}>
              {tag && <span className="tone-fg font-semibold">{tag}</span>}
              {tag && sub ? " · " : ""}
              {sub}
              {live && (
                <span className="font-semibold text-[var(--red)]">
                  {sub || tag ? " · " : ""}şimdi
                </span>
              )}
            </small>
          )}
        </span>
      </button>
    </li>
  );
}

// Sırada'da bir yarışın planları (Seyhun 2026-10-20): üstte yarışın adı, "Yarış · Başlangıç Cmt 24 Eki · yer", sağda başlangıca kalan gün;
// dokununca yarışın sayfası. Altında yarışın işleri gün sırasıyla (gün, iş adı, kalan gün), dokununca Yapıldı / Yarışın sayfası / Planı aç
function RaceGroupRow({ g, race, date, today, onRace, onOpen }) {
  const head = g.start?.p || g.items[0].p;
  const startDay = g.start?.p.date || race?.startDate || "";
  const href = race ? `/athletes/races/${race.id}` : "";
  return (
    <li className={`tone-${planTone(head)} grid grid-cols-[3.875rem_1fr]`}>
      <span className={`whitespace-nowrap py-2.5 tabular-nums ${head.time ? "text-[0.90625rem] font-bold" : "text-[0.75rem] font-semibold text-fg2"}`}>
        {head.time || "Tüm gün"}
        <small className="block text-[0.75rem] font-normal text-mut">{date(g.start?.day || g.day)}</small>
      </span>
      <span className="relative min-w-0 border-l-2 border-line py-2.5 pl-4">
        <span aria-hidden="true" className="absolute -left-[7px] top-[0.9rem] size-3 rounded-full border-2 border-[var(--tfg)] bg-card" />
        <button type="button" onClick={() => (href ? onRace(href) : onOpen(head))} className="flex w-full min-w-0 items-start gap-2 text-left">
          <span className="min-w-0 flex-1">
            <b className="break-words font-semibold">
              {g.race}
              {href && <span className="ml-1 font-normal text-acc">›</span>}
            </b>
            <small className="block break-words text-[0.84375rem] text-mut">
              <span className="tone-fg font-semibold">Yarış</span>
              {[startDay && `Başlangıç ${dayHead(startDay, today)}`, head.place].filter(Boolean).map((x) => ` · ${x}`)}
            </small>
          </span>
          {startDay && <LeftPill left={leftTag(startDay, today)} />}
        </button>
        <ul className="mt-1.5 space-y-1.5">
          {g.items.map(({ p, day, label }) => (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(p)} className="flex w-full items-center gap-2 rounded-xl bg-bg px-2.5 py-2 text-left">
                <span className="w-12 shrink-0 text-[0.78125rem] tabular-nums text-mut">{date(day)}</span>
                <span className="min-w-0 flex-1 break-words text-[0.90625rem]">{[label, p.time].filter(Boolean).join(" · ")}</span>
                <LeftPill left={leftTag(day, today)} />
              </button>
            </li>
          ))}
        </ul>
      </span>
    </li>
  );
}
const LeftPill = ({ left }) => (left ? <span className={`mt-0.5 shrink-0 whitespace-nowrap rounded-full px-2 py-px text-[0.75rem] font-semibold tabular-nums ${LEFT[left.tone]}`}>{left.text}</span> : null);

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
