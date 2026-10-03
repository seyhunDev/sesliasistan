"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Empty, Label, Seg, card } from "@/components/ui/Page";
import { todayStr } from "@/lib/utils/format";
import { kindOf, rangeText, tl, totals } from "./eventModel";

const day = (s) => new Date(`${s}T12:00:00`);
const diff = (s) => Math.round((day(s) - day(todayStr())) / 864e5);

// Tarihsiz etkinlik "yaklaşan"da kalır (henüz zamanı belli değil)
export const isPast = (e) => !!e.startDate && diff(e.endDate || e.startDate) < 0;
export function leftText(e) {
  if (!e.startDate) return "Tarih belli değil";
  const a = diff(e.startDate);
  const b = diff(e.endDate || e.startDate);
  if (a > 1) return `${a} gün kaldı`;
  if (a === 1) return "Yarın";
  if (a === 0) return "Bugün";
  return b >= 0 ? "Sürüyor" : "Bitti";
}

export function KindBadge({ kind, className = "size-12" }) {
  const [, , icon] = kindOf(kind);
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl bg-acc/10 text-acc ${className}`}>
      <Icon name={icon} className="size-6" />
    </span>
  );
}

export function EventList({ events, onOpen }) {
  const [tab, setTab] = useState("up");
  const up = events.filter((e) => !isPast(e)).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past = events.filter(isPast);
  const list = tab === "up" ? up : past;

  if (!events.length)
    return (
      <Empty
        icon="tent"
        title="Henüz etkinlik yok"
        sub="Kamp, balık, gezi, konser… Etkinlik ekle ya da asistana “kamp planı yapmak istiyorum” de; ihtiyaç listesi, bütçe ve yapılacaklar hazırlansın."
      />
    );

  return (
    <>
      <Seg value={tab} onChange={setTab} options={[["up", "Yaklaşan", up.length], ["past", "Geçmiş", past.length]]} className="mt-3" />
      {list.length === 0 ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">{tab === "up" ? "Yaklaşan etkinlik yok" : "Geçmiş etkinlik yok"}</p>
      ) : (
        <>
          <Label right={list.length}>{tab === "up" ? "YAKLAŞAN" : "GEÇMİŞ"}</Label>
          <ul className="space-y-2.5">
            {list.map((e) => {
              const done = e.needs.filter((n) => n.done).length;
              const t = totals(e);
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => onOpen(e)} className={`${card} flex w-full gap-3 p-3.5 text-left transition active:scale-[.99] ${tab === "past" ? "opacity-75" : ""}`}>
                    <KindBadge kind={e.kind} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{e.title || "Adsız etkinlik"}</b>
                      <span className="block truncate text-[0.8125rem] text-mut">{[rangeText(e.startDate, e.endDate), e.place, leftText(e)].filter(Boolean).join(" · ")}</span>
                      <span className="mt-1.5 flex flex-wrap gap-x-3 text-[0.75rem] tabular-nums text-mut">
                        {e.needs.length > 0 && (
                          <span className={done === e.needs.length ? "text-ok" : ""}>
                            İhtiyaç {done}/{e.needs.length}
                          </span>
                        )}
                        {t.total > 0 && <span>Bütçe {tl(t.total)}</span>}
                        {e.people > 0 && <span>{e.people} kişi</span>}
                      </span>
                    </span>
                    <Icon name="chev" className="mt-1 size-4 shrink-0 text-mut" />
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
