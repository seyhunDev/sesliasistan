"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { todayStr } from "@/lib/utils/format";
import { dayPlan, nextDay, ourPlaces, racePhase } from "@/lib/raceDay";
import { loadLive } from "./raceLiveStore";
import { RaceWx } from "./RaceWx";

// Yarış günü lacivert üst (Seyhun 2026-10-28, yaris-tasarim/harita "Yarış günü: saate göre değişen sayfa"):
//   A yarışlar sürerken: rüzgâr (RaceWx, şimdiki ölçüm/tahmin) üstte, altında Multimedya · Parkur
//   B bugünün sonucu gelince: bizimkilerin sırası ve dünden farkı (↑2), "Tüm sonuçlar" Multimedya › Sonuçlar; rüzgâr altta
//   C gün bitince (son yarış bitip 90 dk ya da 18:00): sonuç kısa, sonra yarın (talimat programından ilk start, toplanma; havası yarına açılır);
//     son günün akşamı yarın yerine dönüş.
// Evre raceDay.js racePhase: sayaçtaki yarışlar (raceLive starts) dakikada bir bakılır, belge iki dakikada bir okunur.
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const dm = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });

export function useRacePhase(r, orgId, rid, on) {
  const [now, setNow] = useState(() => new Date());
  const [starts, setStarts] = useState([]);
  useEffect(() => {
    if (!on || !rid) return;
    let live = true;
    let n = 0;
    const read = () => loadLive(orgId, rid).then((l) => live && setStarts(l.starts), () => {});
    read();
    const t = setInterval(() => {
      setNow(new Date());
      if (++n % 2 === 0) read();
    }, 60e3);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [on, orgId, rid]);
  const today = todayStr();
  const mine = starts.filter((x) => x.day === today && !x.void);
  return { phase: racePhase({ r, today, now, starts }), races: mine };
}

// "Optimist / 120 · Junior 4. · Kızlar 7."
const subOf = (x) => [x.n ? `${x.cls} / ${x.n}` : x.cls, x.cp && `${x.cat} ${x.cp}.`, x.gp && `Kızlar ${x.gp}.`].filter(Boolean).join(" · ");
const btn = "flex h-[3.25rem] items-center justify-center gap-2.5 rounded-2xl text-[1.0625rem] font-bold active:translate-y-px active:shadow-none";
const main = `${btn} bg-[#67e8f9] text-[#06283a] shadow-[0_3px_0_#2aa9bd]`;
const second = `${btn} raised border px-5 text-[1rem] font-semibold`;

function Places({ list, short = false }) {
  return (
    <ul className="ck-glass divide-y divide-white/10 overflow-hidden rounded-2xl">
      {list.map((x) => (
        <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
          <b className="w-8 shrink-0 text-[1.375rem] font-bold leading-none tabular-nums">{x.place}</b>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[0.9375rem] font-semibold">{x.name}</b>
            {!short && x.row?.cls && <small className="block truncate text-[0.78rem] text-white/60">{subOf(x.row)}</small>}
          </span>
          {x.move ? <span className={`shrink-0 text-[0.8125rem] font-semibold tabular-nums ${x.move > 0 ? "text-[#67e8f9]" : "text-[#ffd59a]"}`}>{x.move > 0 ? `↑${x.move}` : `↓${-x.move}`}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function RaceDayTop({ r, rid, chosen, phase, races, dayNo, dayAll }) {
  const today = todayStr();
  const media = `/athletes/races/${rid}/media`;
  const places = ourPlaces(r.results, chosen);
  const fleet = r.results?.fleet;
  const last = today >= (r.endDate || r.startDate);
  const tom = nextDay(today);
  const plan = dayPlan(r, tom);
  // "4. gün · Yarışta" gibi yazı yok (Seyhun 2026-10-29: "o yazıya hiç gerek yok, çok fazla yazı olmasın"); yarış sürerken başlık yok
  const title = phase === "done" ? (dayAll > 1 && !last ? "Gün bitti" : "Yarış bitti") : phase === "results" ? "Sonuçlar" : "";
  const fin = races.filter((x) => x.fin).length;
  const side =
    phase === "race"
      ? races.length
        ? fin === races.length
          ? `${races.length} yarış bitti`
          : `${races.at(-1).n}. yarış · ${hm(races.at(-1).at)}`
        : ""
      : [races.length && `${races.length} yarış`, fleet && `${fleet} tekne`].filter(Boolean).join(" · ");
  const wx = <RaceWx key={phase} mini r={{ ...r, id: rid }} day={phase === "done" && !last ? tom : ""} />;
  // tek ekran (Seyhun 2026-10-29): kalan yeri harita doldurur; Multimedya · Parkur alt çubukta sekme (aynı sayfa gibi)
  return (
    <div className="mt-3 flex flex-1 flex-col">
      {(title || side) && (
        <span className="flex items-baseline justify-between gap-3">
          {title && <b className="truncate text-[1.625rem] font-bold leading-none tracking-tight">{title}</b>}
          {side && <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-white/70">{side}</span>}
        </span>
      )}

      {phase === "race" && (
        <>
          {wx}
        </>
      )}

      {phase === "results" && (
        <>
          <div className="mt-4">
            <Places list={places} />
          </div>
          <Link href={`${media}?tab=res`} data-press className={`${main} mt-3`}>
            Tüm sonuçlar
          </Link>
          {wx}
        </>
      )}

      {phase === "done" && (
        <>
          {places.length > 0 && (
            <Link href={`${media}?tab=res`} className="mt-4 block active:opacity-80" aria-label="Tüm sonuçlar">
              <Places list={places.slice(0, 4)} short />
            </Link>
          )}
          {last ? (
            <div className="ck-glass mt-3 rounded-2xl px-4 py-3">
              <small className="block text-[0.8125rem] text-white/65">Dönüş</small>
              <b className="block truncate text-[1.25rem] font-bold">{[r.returnDate && dm(r.returnDate), r.returnTime].filter(Boolean).join(" · ") || "Dönüş saati yazılmadı"}</b>
              {r.departFrom && <small className="block truncate text-[0.8125rem] text-white/65">{r.departFrom}</small>}
            </div>
          ) : (
            <div className="ck-glass mt-3 rounded-2xl px-4 py-3">
              <small className="block text-[0.8125rem] text-white/65">Yarın · {dayNo + 1}. gün{dayNo + 1 === dayAll ? " (son)" : ""}</small>
              <b className="block truncate text-[1.25rem] font-bold">{plan.start ? `İlk start ${plan.start.time}` : plan.first ? `${plan.first.title} ${plan.first.time}` : dm(tom)}</b>
              {plan.first && plan.first !== plan.start && plan.start && <small className="block truncate text-[0.8125rem] text-white/65">{plan.first.title} {plan.first.time}</small>}
            </div>
          )}
          {wx}
        </>
      )}
    </div>
  );
}
