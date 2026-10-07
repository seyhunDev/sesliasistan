"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Empty, Hero, HeroLabel, Label, Seg, Stat, card } from "@/components/ui/Page";
import { todayStr } from "@/lib/utils/format";
import { rangeText } from "./raceDocs";
import { stepsOf } from "./races";

const MON = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
const day = (s) => new Date(`${s}T12:00:00`);
const diff = (s) => Math.round((day(s) - day(todayStr())) / 864e5);

// "12 gün kaldı", "Yarın", "Sürüyor", "Bitti"
export function leftText(r) {
  if (!r.startDate) return "Tarih yok";
  const a = diff(r.startDate);
  const b = diff(r.endDate || r.startDate);
  if (a > 1) return `${a} gün kaldı`;
  if (a === 1) return "Yarın";
  if (a === 0) return "Bugün başlıyor";
  return b >= 0 ? "Sürüyor" : "Bitti";
}
export const isPast = (r) => !!r.startDate && diff(r.endDate || r.startDate) < 0;
export const placeText = (r) => [r.district, r.city].filter(Boolean).join(", ");
export const initials = (n = "") => n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr-TR");

// Takvim yaprağı: ay + gün aralığı
export function DateBadge({ r, light }) {
  const s = r.startDate && day(r.startDate);
  const e = r.endDate && r.endDate !== r.startDate ? day(r.endDate) : null;
  return (
    <span className={`flex w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-2xl py-2 ${light ? "bg-white/10 text-white" : "bg-rose-500/10 text-rose-700"}`}>
      <span className="text-[0.625rem] font-bold tracking-[.1em]">{s ? MON[s.getMonth()] : "—"}</span>
      <b className="text-[1.0625rem] font-semibold leading-tight tabular-nums">
        {s ? s.getDate() : "?"}
        {e && <span className="text-[0.8125rem] font-medium">–{e.getDate()}</span>}
      </b>
    </span>
  );
}

// Üst üste küçük ad baş harfleri
export function Faces({ ids, names, max = 3 }) {
  if (!ids.length) return <span className="text-[0.75rem] text-mut">Sporcu seçilmedi</span>;
  return (
    <span className="flex items-center">
      {ids.slice(0, max).map((id, i) => (
        <span key={id} className={`grid size-8 place-items-center rounded-full bg-acc/10 text-[0.6875rem] font-bold text-acc ring-2 ring-card ${i ? "-ml-1.5" : ""}`}>
          {initials(names[id]).slice(0, 1) || "?"}
        </span>
      ))}
      {ids.length > max && <span className="-ml-1.5 grid size-8 place-items-center rounded-full bg-bg text-[0.625rem] font-bold text-mut ring-2 ring-card">+{ids.length - max}</span>}
      <span className="ml-2 whitespace-nowrap text-[0.75rem] text-mut tabular-nums">{ids.length} sporcu</span>
    </span>
  );
}

const nextStep = (r) => stepsOf(r)[0]?.label;
// Talimattaki en yakın son tarih
const nextDeadline = (r) => (r.notice?.deadlines || []).find((d) => diff(d.date) >= 0);

// Yarış listesi: üstte sıradaki yarış, altta yaklaşan/geçmiş yarış kartları
export function RaceList({ races, names = {}, onOpen }) {
  const [tab, setTab] = useState("up");
  const up = races.filter((r) => !isPast(r)).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past = races.filter(isPast);
  const next = up.find((r) => r.startDate);
  const list = tab === "up" ? up : past;

  return (
    <>
      {next && (
        <Hero className="mt-2">
          <button type="button" onClick={() => onOpen(next)} className="block w-full text-left">
            <div className="flex items-center justify-between gap-3">
              <HeroLabel>SIRADAKİ YARIŞ</HeroLabel>
              {next.planAdded && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.75rem] font-semibold">Planda</span>}
            </div>
            <b className="mt-2 block text-[1.375rem] font-semibold leading-tight tracking-tight">{next.name}</b>
            <span className="mt-0.5 block text-[0.8125rem] text-white/75">{[rangeText(next.startDate, next.endDate), placeText(next)].filter(Boolean).join(" · ")}</span>
            <div className="mt-3 flex gap-2">
              <Stat n={next.athleteIds.length} label="Sporcu" />
              <Stat n={stepsOf(next).length} label="Yapılacak" />
              <Stat n={Math.max(0, diff(next.startDate))} label="Gün kaldı" />
            </div>
            {nextDeadline(next) && (
              <span className="mt-3 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
                <span className="text-[0.6875rem] font-bold tracking-[.08em] text-white/70">SON TARİH</span>
                <b className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{nextDeadline(next).title}</b>
                <span className="shrink-0 text-[0.8125rem] tabular-nums text-white/85">{diff(nextDeadline(next).date) ? `${diff(nextDeadline(next).date)} gün` : "Bugün"}</span>
              </span>
            )}
            {nextStep(next) && (
              <span className="mt-3 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
                <span className="text-[0.6875rem] font-bold tracking-[.08em] text-white/70">SIRADAKİ İŞ</span>
                <b className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{nextStep(next)}</b>
                <Icon name="chev" className="size-4 text-white/70" />
              </span>
            )}
          </button>
        </Hero>
      )}

      {races.length > 0 && (
        <Seg value={tab} onChange={setTab} options={[["up", "Yaklaşan", up.length], ["past", "Geçmiş", past.length]]} className="mt-4" />
      )}

      {races.length === 0 ? (
        <Empty icon="flag" title="Henüz yarış yok" sub="Yarışı ekle ya da yarış talimatını yükle; sporcuları seç, izin yazıları ve veli belgeleri hazır olsun. Asistana “yarış ekle” de diyebilirsin." />
      ) : list.length === 0 ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">{tab === "up" ? "Yaklaşan yarış yok" : "Geçmiş yarış yok"}</p>
      ) : (
        <>
          <Label right={list.length}>{tab === "up" ? "YAKLAŞAN YARIŞLAR" : "GEÇMİŞ YARIŞLAR"}</Label>
          <ul className="space-y-2.5">
            {list.map((r) => {
              const todo = stepsOf(r).length;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => onOpen(r)} className={`${card} flex w-full gap-3 p-3.5 text-left transition active:scale-[.99] ${tab === "past" ? "opacity-75" : ""}`}>
                    <DateBadge r={r} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{r.name || "Adsız yarış"}</b>
                        {r.abroad && <span className="shrink-0 rounded-full bg-acc/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-acc">Yurt dışı</span>}
                        {r.notice && !r.noticeFile && <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-700">Talimat dosyası yok</span>}
                        {(r.note || r.notice) && <Icon name={r.notice ? "paperclip" : "note"} className="mt-0.5 size-4 shrink-0 text-mut" />}
                      </span>
                      <span className="block truncate text-[0.8125rem] text-mut">{[placeText(r), leftText(r), tab === "up" && todo && `${todo} iş`].filter(Boolean).join(" · ")}</span>
                      <span className="mt-2.5 flex items-center justify-between gap-2">
                        <Faces ids={r.athleteIds} names={names} />
                        {r.planAdded && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700">
                            <Icon name="cal" className="size-3" />
                            Planda
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
