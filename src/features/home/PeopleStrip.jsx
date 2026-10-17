"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeImg } from "@/components/ui/FadeImg";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useData } from "@/features/data/DataProvider";
import { birthdaysOn } from "@/lib/agenda";
import { personHref, storyPeople } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { SectionHead } from "./ui";

// Bugün doğum günü olanlar; kişiye bağlı kayıtta kişinin sayfası, bağsızda Doğum günleri
function useBirthdaysToday() {
  const { birthdays, members } = useData();
  return birthdaysOn(birthdays, todayStr()).map((b) => {
    const m = b.memberUid && members.find((x) => x.uid === b.memberUid);
    return { id: b.id, name: b.name, href: m ? personHref(m) : "/birthdays" };
  });
}

// Zilin yanındaki rozet (Seyhun: "doğum günü varsa yuvarlak içinde pasta, sayıyla"): yalnız bugün doğum günü varken görünür.
// Tek kişide dokununca o kişinin sayfası, birden çokta alttan liste.
export function BirthdayBadge() {
  const list = useBirthdaysToday();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  const tap = () => (list.length === 1 ? router.push(list[0].href) : setOpen(true));
  return (
    <>
      <button
        type="button"
        onClick={tap}
        aria-label={`Bugün ${list.length} doğum günü`}
        className="relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-card text-fg ring-1 ring-line/70 active:scale-90"
      >
        <Icon name="cake" className="size-5" />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-acc px-1 text-[0.6875rem] font-semibold tabular-nums text-white ring-2 ring-bg">{list.length}</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Bugün doğum günü">
        <ul className="divide-y divide-line">
          {list.map((b) => (
            <li key={b.id}>
              <Link href={b.href} onClick={() => setOpen(false)} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accbg text-[0.8125rem] font-semibold text-acc">{initials(b.name)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                <span aria-hidden="true" className="text-mut">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

// Instagram hikâyeleri gibi yuvarlak kişi şeridi (Seyhun: "ana sayfada yuvarlak kişiler, sporcular"): baş harf, altında ilk ad;
// bugün doğum günü olan önde ve yeşil halkalı. Fotoğraf varsa baş harflerin üstünde, inince yumuşakça belirir (FadeImg). Zemin kişi türüne göre (Seyhun: "sporcular, çalışanlar, veliler farklı renk"): çalışan yeşil, sporcu mavi, veli lila, aile kahve. Dokununca kişinin sayfası. Kişi listesi yoksa (çalışan hesabı) çizilmez.
export function PeopleStrip() {
  const { birthdays, members } = useData();
  const list = storyPeople(members, birthdaysOn(birthdays, todayStr()));
  if (!list.length) return null;
  return (
    <section aria-labelledby="home-people">
      <SectionHead id="home-people" title="Kişiler" />
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-3.5">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={p.href} className="flex w-14 flex-col items-center gap-1">
                <span className={`grid size-14 place-items-center rounded-full text-[0.9375rem] font-semibold ${p.tone ? `tone-${p.tone} tone-chip` : "bg-card text-fg2 ring-1 ring-line"} ${p.bday ? "ring-2 ring-acc ring-offset-2 ring-offset-bg" : ""} relative overflow-hidden`}>
                  {initials(p.name)}
                  {p.photo && <FadeImg src={p.photo} className="size-full rounded-full object-cover" />}
                </span>
                <small className="w-full truncate text-center text-[0.75rem] text-fg2">{p.name.split(" ")[0]}</small>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
