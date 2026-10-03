"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { duesTile, postsTile, raceTile, readSum, trainingTile } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";

// Ana sayfada büyük kartlar: hem bilgi hem düğme (Seyhun'un isteği). Yalnız kişinin görebildiği kartlar çizilir;
// tek kart kalırsa tam genişlik. Yazılar homeTiles.js'te.
export function ClubTiles({ race, dues, posts, training, plans, onOpen }) {
  const [sum] = useState(readSum);
  const today = todayStr();
  const tiles = [
    dues && ["/dues", "wallet", "Aidatlar", duesTile(sum.dues, today.slice(0, 7))],
    race && ["/athletes/races", "flag", "Yarışlar", raceTile(race.next, race.up)],
    posts && ["/posts", "camera", "Instagram", postsTile(sum.posts)],
    training && ["/training", "trend", "Antrenman günlüğü", trainingTile(plans, today)],
  ].filter(Boolean);
  if (!tiles.length) return null;

  return (
    <nav aria-label="Kulüp" className="grid grid-cols-2 gap-2.5">
      {tiles.map(([href, icon, label, t], i) => (
        <Link
          key={href}
          href={href}
          onClick={() => onOpen?.(href)}
          className={`flex min-h-[7.5rem] flex-col rounded-2xl bg-card p-3.5 shadow-[0_1px_3px_rgba(38,40,44,.05)] ring-1 ring-line active:scale-[.98] ${tiles.length % 2 && i === tiles.length - 1 ? "col-span-2" : ""}`}
        >
          <span className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
              <Icon name={icon} className="size-[1.125rem]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-mut">{label}</span>
            <Icon name="chev" className="size-4 shrink-0 text-mut" />
          </span>
          <b className="mt-auto truncate pt-3 text-[1.375rem] font-semibold leading-tight tabular-nums tracking-tight">{t.big}</b>
          <small className={`mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug ${t.warn ? "font-medium text-amber-700" : "text-mut"}`}>{t.sub}</small>
        </Link>
      ))}
    </nav>
  );
}
