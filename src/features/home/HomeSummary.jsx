"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { duesTile, postsTile, raceTile, readSum, trainingTile } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";
import { useMoney } from "./TeamMoney";
import { BRAND } from "./HomeActions";

// Ana sayfa › ÖZET: kısa bilgi kartları, hepsi aynı boyda ve biçimde (simge + ad, büyük sayı, tek satır açıklama).
// Dokununca ilgili sayfa açılır. Yalnız kişinin görebildiği kartlar çizilir; hiç kart yoksa bölüm görünmez.
// Firestore'a ek okuma yok: aidat ve gönderi özeti o sayfa açılınca bu cihazda saklanır (homeTiles.js), banka mailleri
// eskiden de okunuyordu (useMoney), yarış raceHome.js'in okumasından, antrenman bellekteki planlardan.
export function HomeSummary({ money, race, dues, posts, training, plans }) {
  const m = useMoney();
  const [sum] = useState(readSum);
  const today = todayStr();
  const cards = [
    money && m.bank && ["/mail", "chart", "Banka", m.bank],
    money && ["/receipts", "receipt", "Fişler", m.receipts],
    dues && ["/dues", "wallet", "Aidat", duesTile(sum.dues, today.slice(0, 7))],
    race && ["/athletes/races", "flag", "Sıradaki yarış", raceTile(race.next, race.up)],
    training && ["/training", "trend", "Antrenman", trainingTile(plans, today)],
    posts && ["/posts", "instagram", "Instagram", postsTile(sum.posts), "instagram"],
  ].filter(Boolean);
  if (!cards.length) return null;

  return (
    <section aria-labelledby="home-sum">
      <h2 id="home-sum" className="mb-2.5 px-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">
        ÖZET
      </h2>
      <ul className="grid grid-cols-2 gap-2.5">
        {cards.map(([href, icon, label, t, brand]) => (
          <li key={href}>
            <Link
              href={href}
              aria-label={`${label}: ${t.big}, ${t.sub}`}
              className="flex h-full min-h-[5.75rem] flex-col rounded-2xl bg-card p-3.5 shadow-[0_1px_3px_rgba(38,40,44,.05)] ring-1 ring-line transition active:scale-[.98]"
            >
              <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-mut">
                {brand ? (
                  <span className={`grid size-5 shrink-0 place-items-center rounded-md ${BRAND[brand]}`}>
                    <Icon name={icon} className="size-3.5" />
                  </span>
                ) : (
                  <Icon name={icon} className="size-4 shrink-0 text-acc" />
                )}
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <Icon name="chev" className="size-3.5 shrink-0" />
              </span>
              <b className="mt-auto truncate pt-2 text-[1.25rem] font-semibold leading-tight tabular-nums tracking-tight">{t.big}</b>
              <small className={`truncate text-[0.8125rem] leading-snug ${t.warn ? "font-semibold text-amber-700" : "text-mut"}`}>{t.sub}</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
