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
import Link from "next/link";
import { isTraining } from "@/lib/trainingLog";
import { HideSheet } from "./HideSheet";
import { attHref, findRace, homeHidden, leftTag, shortDay, planTag, planTone, raceForPlan, homeList, raceKey, twoDays, untilText } from "@/lib/homeTiles";
import { WIND_CATS, WIND_KN, overWind, planWind } from "@/lib/notifyExtra";
import { todayStr } from "@/lib/utils/format";
import { RacePlanSheet } from "./RacePlanSheet";
import { ListHead } from "@/components/ui/Row";
import { SwipeRow } from "@/components/ui/SwipeRow";

// Ana sayfanın takvim bölümü (yeni tasarım, Seyhun 2026-10-21 örneği): "TAKVİM" başlığı (Tümü › takvim) ve tek kart. Kartta gün başlıklarıyla
// 1) Bugün: solda saat, ad, altında tür (renginde) · yer · ilk satırda rüzgâr (eşik geçilirse kırmızımsı); süren planda sağda "Şimdi" ve bitiş,
// 2) Yarın (ya da planı olan en yakın gün): aynı satır, 3) Sırada (en çok 4): solda tarih kutusu (23 EKİ, türün renginde), ad, altında
//    tür · gün saat · yer, sağda kalan gün (2 gün sarı); bir yarışın işleri yarışın altında ince satırlarda. Yarın ve Sırada satırı sola
//    kaydırınca "Gizle" (HideSheet); altta "N plan gizli" ve "Gizleme ayarı" (toplu). Sonra "Seni bekleyenler" satırı (zil ile aynı pencere).
// Satıra dokununca plan açılır (Yarış planında yarışın sayfası). Bellekteki planlardan, ek okuma yok.
// weather: useWeather(), inbox: useInbox(), onInbox: pencereyi açar; att: yoklama yetkisi, skip: kokpitte gösterilen plan (OwnerHome).
export function SiradaCard({ weather, inbox, onInbox, att, skip }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const router = useRouter();
  const races = useRaceHome();
  const [pick, setPick] = useState(null);
  const [hide, setHide] = useState(null); // listede gizle penceresi // Yarış planı: Yapıldı / Yarışın sayfası / Planı aç penceresi
  if (!profile) return null;
  const today = todayStr();
  // Yarın ve Sırada tek listede (homeList): aynı yarışın planları tek satırda, yarışın yarınki işi de orada; Sırada en çok 4 satır
  // Listede gizlenen planlar (homeHidden; gizle düğmesi HideSheet) günü yaklaşana dek çıkmaz, altta "N plan gizli · Takvim ›"
  // skip: kokpitteki "sıradaki iş" (Cockpit) burada tekrar yazmaz
  const base = skip ? plans.filter((p) => p.id !== skip) : plans;
  const shownPlans = base.filter((p) => !homeHidden(p, today, profile.homeDays));
  const { days, rest: all } = twoDays(shownPlans, today, now, 200);
  const rows = (d) => d.days.reduce((n, x) => n + x.rows.length, 0) + d.rest.length; // listede çıkacak plan sayısı (60 gün)
  const hiddenN = shownPlans.length < base.length ? rows(twoDays(base, today, now, 200)) - rows({ days, rest: all }) : 0;
  // Yarışın bütün planları birlikte gizlenir (Seyhun 2026-10-20: "o yarışın son tarihlerini şimdilik görmek istemiyorum"); her iş kendi gününe göre görünür
  const raceHide = (name) => {
    const list = plans.filter((p) => raceKey(p)?.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"));
    return { id: `race:${name}`, title: name, homeDays: list.find((p) => Number.isFinite(p.homeDays))?.homeDays, list };
  };
  const raceOf = (name) => findRace(name, races.open);
  // Yarış satırı (Seyhun 2026-10-20: "yarışa tıklayınca yarışa gidilebilmeli"): yarışın kendisi (adı yalnız yarışın adı) yarışın sayfasını açar;
  // yarışın işi ("Ad: iş") Yapıldı / Yarışın sayfası / Planı aç penceresini açar. Yarış kaydı bulunamazsa (adı farklı ya da kayıt yok) pencere ya da plan açılır
  const open = (p) => {
    const rk = raceKey(p);
    const own = rk?.whole && raceOf(rk.name);
    if (own) return router.push(`/athletes/races/${own.id}`);
    if (rk && races.on) return setPick({ p, race: raceOf(rk.name)?.id || "" });
    const race = raceForPlan(p, races.open, today);
    if (race) router.push(`/athletes/races/${race}`);
    else openAdd({ edit: { kind: "plan", id: p.id } });
  };
  // Yarışın multimedyası (Seyhun 2026-10-20: "Sıradaki yarış kartı gitti, multimedyaya nereden ulaşacağız"): yarış bugün ya da yarınsa
  // yarışın satırında "Multimedya" düğmesi (yarış kaydı bulunursa)
  const mediaOf = (p, day = p?.date) => {
    const rk = raceKey(p);
    const race = rk?.whole && raceOf(rk.name);
    const n = leftTag(day, today);
    return race && (!n || n.tone === "red") ? `/athletes/races/${race.id}/media` : "";
  };
  const hours = dayHours(weather?.w, today)?.map(({ hh, wind, gust }) => ({ hh, wind, gust })) || [];
  // Bugünün ilk satırının rüzgârı (antrenman/yarış): o saatlerin rüzgârı; eşik geçilirse kırmızımsı
  const [td, next] = days;
  const first = td.rows[0];
  const wx = first && WIND_CATS.includes(first.p.cat || first.p.category) ? planWind(hours, first.p) : null;
  const windy = overWind(wx, profile.windKn || WIND_KN);
  const { next: nextRows, later: rest } = homeList(next, all);
  const empty = !td.rows.length && !next;
  // Bugünün tek planı kokpitte gösteriliyorsa (skip) "Bugün plan kalmadı" yazmaz
  const skipToday = !!skip && plans.some((p) => p.id === skip && p.date === today);
  const weekday = (day) => new Date(`${day}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });

  const dayHead = (day, label) => `${label} · ${shortDay(day, "")}`;
  const hideAct = (x) => [{ label: "Gizle", icon: "eyeOff", tone: "neutral", onAction: () => setHide(x) }];

  return (
    <section aria-label="Takvim">
      <ListHead title="Takvim" href="/calendar" />
      <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
        {td.rows.length ? (
          <>
            <DayHead title={dayHead(today, "Bugün")} today />
            {td.rows.map(({ p, now: live }, i) => (
              <TimeRow
                key={p.id}
                p={p}
                live={live}
                warn={i === 0 && windy}
                roll={att && isTraining(p) && p.status !== "cancelled" ? { href: attHref(today, today), taken: profile.attLast === today } : null}
                sub={[p.place, i === 0 && wx && `rüzgâr ${wx.wind} kn${windy ? `, sağanak ${wx.gust} kn` : ""}`].filter(Boolean).join(" · ")}
                media={mediaOf(p, today)}
                onOpen={() => open(p)}
              />
            ))}
          </>
        ) : skipToday && !empty ? null : (
          <div className="flex min-h-[3.5rem] items-center justify-between gap-3 px-3.5 py-2">
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
            <DayHead title={dayHead(next.day, next.label === "Yarın" ? "Yarın" : weekday(next.day))} line />
            {nextRows.map(({ p }) => (
              <SwipeRow key={p.id} actions={hideAct(p)}>
                <TimeRow p={p} sub={p.place} left={next.label === "Yarın" ? null : next.day} today={today} media={mediaOf(p, next.day)} onOpen={() => open(p)} />
              </SwipeRow>
            ))}
          </>
        )}

        {rest.length > 0 && (
          <>
            <DayHead title="Sırada" line />
            {rest.map((x) =>
              x.race ? (
                <RaceGroupRow key={`r:${x.race}`} g={x} race={raceOf(x.race)} media={x.start ? mediaOf(x.start.p, x.start.day) : ""} today={today} onRace={(href) => router.push(href)} onOpen={open} actions={hideAct(raceHide(x.race))} />
              ) : (
                <SwipeRow key={x.p.id} actions={hideAct(x.p)}>
                  <DateRow p={x.p} day={x.day} today={today} sub={[x.start && "Başlangıç", x.p.place].filter(Boolean).join(" · ")} media={mediaOf(x.p, x.day)} onOpen={() => open(x.p)} />
                </SwipeRow>
              ),
            )}
          </>
        )}
        {(hiddenN > 0 || rest.length > 0) && (
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 text-[0.84375rem] font-semibold text-mut">
            <span>{hiddenN > 0 ? `${hiddenN} plan gizli` : Number.isFinite(profile.homeDays) ? `${profile.homeDays} gün kalanlar görünür` : ""}</span>
            <button type="button" onClick={() => setHide("all")} className="shrink-0 text-acc">
              Gizleme ayarı
            </button>
          </div>
        )}
      </div>

      <WaitRow inbox={inbox} onAll={onInbox} />
      <RacePlanSheet plan={pick?.p} raceId={pick?.race} today={today} onClose={() => setPick(null)} />
      <HideSheet plan={hide === "all" ? null : hide} all={hide === "all"} onClose={() => setHide(null)} />
    </section>
  );
}

// Gün başlığı (Bugün · Çar 21 Eki mor, Yarın · Per 22 Eki, Sırada); line: üstünde ince çizgi
const DayHead = ({ title, today, line }) => (
  <h2 className={`px-3.5 pb-0.5 pt-3 text-[0.78125rem] font-bold ${today ? "text-acc" : "text-mut"} ${line ? "mx-3.5 mt-1 border-t border-line !px-0" : ""}`}>{title}</h2>
);

// Kalan gün (sağda): bugün/yarın kırmızı söz, 2 gün sarı, sonrası büyük sayı + "gün"
const daysTo = (day, today) => Math.round((Date.parse(`${day}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 864e5);
function Left({ day, today }) {
  const n = daysTo(day, today);
  if (!(n >= 0)) return null;
  if (n < 2) return <span className="shrink-0 text-[0.875rem] font-bold text-[var(--red)]">{n ? "Yarın" : "Bugün"}</span>;
  return (
    <span className={`min-w-[2.75rem] shrink-0 text-right leading-none ${n === 2 ? "text-warn" : ""}`}>
      <b className="block text-[1.1875rem] font-bold tabular-nums">{n}</b>
      <small className={`mt-0.5 block text-[0.71875rem] font-semibold ${n === 2 ? "" : "text-mut"}`}>gün</small>
    </span>
  );
}
const Tag = ({ p }) => {
  const t = planTag(p);
  return t ? <span className="tone-fg">{t}</span> : null;
};
const join = (parts) =>
  parts.filter(Boolean).map((x, i, all) => (
    <Fragment key={i}>
      {x}
      {i < all.length - 1 && "\u00a0· "}
    </Fragment>
  ));

// Bugün ve Yarın satırı: solda saat (gün boyu planda "Gün"), ad, altında tür · yer; süren planda sağda "Şimdi" ve bitiş.
// left: Yarın değilse planın günü (sağda kalan gün). roll: bugünün antrenmanında yoklama ({ href, taken }); media: yarışın multimedyası
function TimeRow({ p, live, warn, sub, left, today, roll, media, onOpen }) {
  return (
    <div className={`tone-${planTone(p)} bg-card`}>
      <button type="button" onClick={onOpen} data-press="row" className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <b className="w-[2.875rem] shrink-0 text-center text-[0.9375rem] font-bold tabular-nums">{p.time || "Gün"}</b>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{p.title}</b>
          <small className={`block truncate text-[0.8125rem] ${warn ? "text-rose-600 dark:text-rose-400" : "text-mut"}`}>{join([<Tag key="t" p={p} />, sub])}</small>
        </span>
        {live ? (
          <span className="shrink-0 text-right leading-tight">
            <b className="block text-[0.875rem] font-bold text-[var(--red)]">Şimdi</b>
            {p.time && <small className="block text-[0.75rem] font-semibold text-mut">{untilText(p.time, p.durationMin).slice(0, 5)} bitiş</small>}
          </span>
        ) : (
          left && <Left day={left} today={today} />
        )}
      </button>
      {(roll || media) && (
        <div className="flex gap-2 pb-2.5 pl-[4.625rem] pr-3.5">
          {roll && (
            <Link href={roll.href} data-press className={`raised inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-xl bg-card px-3 text-[0.84375rem] font-semibold ${roll.taken ? "text-[var(--ok)]" : "text-acc"}`}>
              {roll.taken && <Icon name="check" className="size-4 shrink-0" />}
              {roll.taken ? "Yoklama alındı" : "Yoklama al"}
            </Link>
          )}
          <MediaBtn href={media} />
        </div>
      )}
    </div>
  );
}
// Yarışın multimedya sayfası (yarış bugün/yarın)
const MediaBtn = ({ href }) =>
  href ? (
    <Link href={href} data-press className="raised inline-flex h-9 items-center whitespace-nowrap rounded-xl bg-card px-3 text-[0.84375rem] font-semibold text-acc">
      Multimedya
    </Link>
  ) : null;

// Tarih kutusu (Sırada): gün ve ay her satırda aynı (23 EKİ, 2 KAS), plan türünün renginde
function DateBox({ day }) {
  const d = new Date(`${day}T12:00:00`);
  return (
    <span className="tone-chip flex h-[3.125rem] w-[2.875rem] shrink-0 flex-col items-center justify-center rounded-[0.8rem] leading-none">
      <b className="text-[1.1875rem] font-bold tabular-nums">{d.getDate()}</b>
      <small className="mt-1 text-[0.625rem] font-bold tracking-[.08em]">{d.toLocaleDateString("tr-TR", { month: "short" }).replace(".", "").toLocaleUpperCase("tr-TR")}</small>
    </span>
  );
}
const wdOf = (day) => new Date(`${day}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");

// Sırada satırı (Seyhun 2026-10-21 örneği): tarih kutusu, ad, altında tür · gün saat · yer, sağda kalan gün
function DateRow({ p, day, today, sub, media, onOpen, title }) {
  return (
    <div className={`tone-${planTone(p)} bg-card`}>
      <button type="button" onClick={onOpen} data-press="row" className="flex w-full items-center gap-3 px-3.5 py-2 text-left">
        <DateBox day={day} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{title || p.title}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{join([<Tag key="t" p={p} />, `${wdOf(day)} ${p.time || "· gün boyu"}`, sub])}</small>
        </span>
        <Left day={day} today={today} />
      </button>
      {media && (
        <div className="pb-2.5 pl-[4.625rem] pr-3.5">
          <MediaBtn href={media} />
        </div>
      )}
    </div>
  );
}

// Sırada'da bir yarış: yarışın satırı (dokununca yarışın sayfası), altında işleri ince satırlarda ("Kayıt son günü · Cum 23 Eki · 2 gün"),
// dokununca Yapıldı / Yarışın sayfası / Planı aç. Sola kaydırınca yarışın bütün planları gizlenir.
function RaceGroupRow({ g, race, media, today, onRace, onOpen, actions }) {
  const head = g.start?.p || g.items[0].p;
  const startDay = g.start?.p.date || race?.startDate || g.day;
  const href = race ? `/athletes/races/${race.id}` : "";
  return (
    <SwipeRow actions={actions}>
      <div className="bg-card">
        <DateRow p={{ ...head, cat: "Yarış" }} title={g.race} day={startDay} today={today} sub={[g.start && "Başlangıç", head.place].filter(Boolean).join(" · ")} media={media} onOpen={() => (href ? onRace(href) : onOpen(head))} />
        <ul className="mb-2 ml-[4.625rem] mr-3.5 border-l-2 border-line pl-2.5">
          {g.items.map(({ p, day, label }) => {
            const n = daysTo(day, today);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => onOpen(p)} className="flex w-full items-baseline justify-between gap-2 py-1 text-left text-[0.84375rem]">
                  <span className="min-w-0 truncate font-semibold">{label || p.title}</span>
                  <span className={`shrink-0 tabular-nums ${n <= 2 ? "font-semibold text-warn" : "text-mut"}`}>
                    {shortDay(day, "")}
                    {p.time ? ` ${p.time}` : ""} · {n === 0 ? "Bugün" : n === 1 ? "Yarın" : `${n} gün`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </SwipeRow>
  );
}

// "Seni bekleyenler" satırı: kırmızı karede sayı, sağda ilk işlerin adı (bekleyen yoksa çizilmez; ayrıntı zil penceresinde)
function WaitRow({ inbox, onAll }) {
  const list = inbox?.list || [];
  if (!list.length) return null;
  const peek = list.map((x) => x.title).filter((t) => typeof t === "string" && t).slice(0, 3).join(", ");
  return (
    <button type="button" onClick={onAll} className="mt-2.5 flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-card px-3.5 py-2.5 text-left">
      <span aria-hidden="true" className="grid size-[1.875rem] shrink-0 place-items-center rounded-lg bg-[var(--red)] text-[0.8125rem] font-bold tabular-nums text-white">
        {list.length}
      </span>
      <span className="shrink-0">Seni bekleyenler</span>
      <span className="min-w-0 flex-1 truncate text-right text-mut">{peek}</span>
      <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
    </button>
  );
}
