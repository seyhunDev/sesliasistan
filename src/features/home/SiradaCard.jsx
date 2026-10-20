"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { useRaceHome } from "@/features/athletes/raceHome";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dayHours } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { leftTag, shortDay, planTag, planTone, raceForPlan, homeList, raceKey, trainingWeek, twoDays, untilText } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { WeekStrip } from "./HomeSummary";
import { RacePlanSheet } from "./RacePlanSheet";
import { GROUP } from "./ui";

// Ana sayfanın takvim bölümü (Seyhun 2026-10-17: "2'deki gibi, bugün kısmı 3'teki gibi, Bugün yazısına gerek yok"). Ayrı gruplu kartlar:
// 1) gün şeridi (WeekStrip; dünden başlar, bugün kırmızı daire, üç hafta kaydırılır, sonunda Tümü › Takvim; güne dokununca o günün penceresi),
// 2) bugünün planları saat çizgisinde (başlıksız): solda saat, ortada dikey çizgi ve plan türünün renginde halka (planTone), süren plan kırmızı dolu
//    nokta ve alt satırda "yer · 12:00'ye kadar · şimdi"; ilk satırda antrenman/yarışın rüzgârı (eşik geçilirse kırmızımsı); sağda tür adı,
// 3) aynı kartta ince başlıkla "YARIN · PAZAR" (ya da planı olan en yakın gün) ve "SIRADA" (sonraki en çok 4 plan, saatin altında gün; Seyhun 2026-10-20:
//    "tek bir listemiz olsun"), her plan bir kez: yarışın planları yalnız yarışın satırında, 4) "Seni bekleyenler" satırı (sayı, ilk işler; zil ile aynı pencere).
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
  // Yarın ve Sırada tek listede (homeList): aynı yarışın planları tek satırda, yarışın yarınki işi de orada; Sırada en çok 4 satır
  const { days, rest: all } = twoDays(plans, today, now, 200);
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
  const { next: nextRows, later: rest } = homeList(next, all);
  const empty = !td.rows.length && !next;
  // Sıradakilerin tarihi: bu aydaysa "Sal 20", değilse "Pzt 3 Kas"
  // ("Yarın" yazılmaz, o kalan gün işaretinde; Seyhun 2026-10-20: "tekrarlardan kaçınalım, tarih saat başlık düzgün yazılsın")
  const short = (day) => shortDay(day, today);
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

        {nextRows.length > 0 && (
          <>
            <DayHead title={next.label === "Yarın" ? `Yarın · ${weekday(next.day)}` : next.label} />
            <ul>
              {nextRows.map(({ p }) => (
                <TimeRow key={p.id} p={p} sub={p.place} left={next.label === "Yarın" ? null : leftTag(next.day, today)} onOpen={() => open(p)} />
              ))}
            </ul>
          </>
        )}

        {rest.length > 0 && (
          <>
            <DayHead title="Sırada" />
            <ul>
              {rest.map((x) =>
                x.race ? (
                  <RaceGroupRow key={`r:${x.race}`} g={x} race={raceOf(x.race)} date={short} today={today} onRace={(href) => router.push(href)} onOpen={open} />
                ) : (
                  <TimeRow key={x.p.id} p={x.p} date={short(x.day)} sub={[x.start && "Başlangıç", x.p.place].filter(Boolean).join(" · ")} left={leftTag(x.day, today)} onOpen={() => open(x.p)} />
                ),
              )}
            </ul>
          </>
        )}
      </div>

      <WaitRow inbox={inbox} onAll={onInbox} />
      <RacePlanSheet plan={pick} today={today} onClose={() => setPick(null)} />
    </section>
  );
}

// Tek listede gün başlığı (Yarın · Çarşamba, Sırada): ince çizginin altında küçük gri ad
const DayHead = ({ title }) => <h2 className="mt-1 border-t border-line pb-0.5 pt-2.5 text-[0.75rem] uppercase tracking-[.02em] text-mut">{title}</h2>;

// Liste satırı (Bugün, Yarın, Sırada aynı; Seyhun 2026-10-20: "başlık üst satır yatayda full, altında diğer bilgiler yan yana"): solda ince dikey çizgi
// ve plan türünün renginde halka (süren planda kırmızı dolu nokta), üstte tam genişlikte ad, altında gün · saat · tür · yer · "şimdi" ve sağda
// kalan gün (left: leftTag; bugün/yarın kırmızı, 2 gün sarı, sonrası gri). warn: rüzgâr eşiği geçti, alt satır kırmızımsı
const LEFT = { red: "bg-[var(--red)] text-white", warn: "bg-warnbg text-warn", mut: "bg-line/60 text-fg2" };
function TimeRow({ p, live, warn, sub, date, left, onOpen }) {
  const tag = planTag(p);
  return (
    <li>
      <button type="button" onClick={onOpen} className={`tone-${planTone(p)} relative block w-full border-l-2 border-line py-2.5 pl-4 text-left`}>
        <Dot live={live} />
        <b className="block break-words font-normal">{p.title}</b>
        <Meta left={left} warn={warn} date={date} time={p.time || (date ? "" : "Tüm gün")} tag={tag} sub={sub} live={live} />
      </button>
    </li>
  );
}
const Dot = ({ live }) => (
  <span
    aria-hidden="true"
    className={`absolute -left-[7px] top-[0.9rem] size-3 rounded-full border-2 ${live ? "border-[var(--red)] bg-[var(--red)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--red)_18%,transparent)]" : "border-[var(--tfg)] bg-card"}`}
  />
);
// Satırın alt bilgisi, her satırda aynı sıra ve yazı (Seyhun 2026-10-20: "tarihler, saatler aynı formatta, aynı sıralamayla"):
// gün · saat · tür (renginde) · yer/ek · şimdi; gerekirse alt satıra geçer, gün ve saat bölünmez; sağda kalan gün
const Meta = ({ left, warn, date, time, tag, sub, live }) => {
  const parts = [date && <span className="whitespace-nowrap">{date}</span>, time && <span className="whitespace-nowrap tabular-nums">{time}</span>, tag && <span className="tone-fg">{tag}</span>, sub, live && <span className="text-[var(--red)]">şimdi</span>].filter(Boolean);
  return (
    <span className={`mt-0.5 flex items-start gap-2 text-[0.84375rem] ${warn ? "text-rose-600 dark:text-rose-400" : "text-mut"}`}>
      <span className="min-w-0 flex-1 break-words">
        {parts.map((x, i) => (
          <Fragment key={i}>
            {x}
            {i < parts.length - 1 && "\u00a0· "}
          </Fragment>
        ))}
      </span>
      <LeftPill left={left} />
    </span>
  );
};

// Sırada'da bir yarışın planları (Seyhun 2026-10-20): üstte tam genişlikte yarışın adı, altında başlangıç günü · Yarış · Başlangıç · yer ve sağda
// başlangıca kalan gün; dokununca yarışın sayfası. Altında yarışın işleri gün sırasıyla (üstte iş adı, altında gün · saat ve kalan gün),
// dokununca Yapıldı / Yarışın sayfası / Planı aç
function RaceGroupRow({ g, race, date, today, onRace, onOpen }) {
  const head = g.start?.p || g.items[0].p;
  const startDay = g.start?.p.date || race?.startDate || "";
  const href = race ? `/athletes/races/${race.id}` : "";
  return (
    <li className={`tone-${planTone(head)} relative border-l-2 border-line py-2.5 pl-4`}>
      <Dot />
      <button type="button" onClick={() => (href ? onRace(href) : onOpen(head))} className="block w-full text-left">
        <b className="block break-words font-normal">
          {g.race}
          {href && <span className="ml-1 font-normal text-acc">›</span>}
        </b>
        <Meta left={startDay ? leftTag(startDay, today) : null} date={date(startDay || g.day)} time={head.time} tag="Yarış" sub={[startDay && "Başlangıç", head.place].filter(Boolean).join(" · ")} />
      </button>
      <ul className="mt-1.5 space-y-1.5">
        {g.items.map(({ p, day, label }) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p)} className="block w-full rounded-xl bg-bg px-2.5 py-2 text-left">
              <span className="block break-words">{label}</span>
              <Meta left={leftTag(day, today)} date={date(day)} time={p.time} />
            </button>
          </li>
        ))}
      </ul>
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
