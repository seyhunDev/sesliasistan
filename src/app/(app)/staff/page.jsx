"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { useData } from "@/features/data/DataProvider";
import { PersonSheet } from "@/features/people/PersonSheet";
import { seenText } from "@/features/staff/StaffCard";
import { PEOPLE_GROUPS, kindOf, missingOf } from "@/lib/kinds";
import { initials } from "@/lib/utils/format";

// Kişiler (yalnızca ana hesap): Çalışanlar, Aile, Sporcular ayrı sayfalar. Her satırda kişi/hesap sayısı, çevrimiçi, eksik bilgi.
// Yeni tasarım (2026-11-03): lacivert üstte ad, kişi · hesap sayısı ve "+ Kişi"; altta Gruplar listesi.
export default function PeopleHub() {
  const { isStaff, members } = useData();
  const router = useRouter();
  const [add, setAdd] = useState(false);
  useEffect(() => {
    if (isStaff) router.replace("/");
  }, [isStaff, router]);
  if (isStaff) return null;

  const groups = Object.entries(PEOPLE_GROUPS).filter(([g, def]) => g !== "other" || members.some((m) => def.kinds.includes(kindOf(m))));
  const accounts = members.filter((m) => m.account !== false).length;

  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Kişiler">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Kişiler</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{members.length ? `${members.length} kişi · ${accounts} hesap` : "Henüz kişi yok"}</p>
          </div>
          <button type="button" onClick={() => setAdd(true)} data-press className="raised act-main flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3.5 text-[0.875rem] font-semibold">
            <Icon name="plus" className="size-4" />
            Kişi
          </button>
        </header>
      </section>

      <div className="split-cols relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <section>
          <ListHead title="Gruplar" count={groups.length} />
          <RowList>
            {groups.map(([g, def]) => {
              const list = members.filter((m) => def.kinds.includes(kindOf(m)));
              const acc = list.filter((m) => m.account !== false);
              const online = acc.filter((m) => seenText(m.lastSeen) === "Çevrimiçi").length;
              const miss = list.filter((m) => missingOf(m).length).length;
              const sub = list.length ? (
                <>
                  {`${acc.length} hesap${online ? ` · ${online} çevrimiçi` : ""}`}
                  {miss > 0 && <span className="text-warn">{` · ${miss} eksik bilgi`}</span>}
                </>
              ) : (
                "Kimse yok"
              );
              // Solda ilk üç kişinin baş harfleri üst üste
              const lead = (
                <span className="flex w-[3.25rem] shrink-0 items-center">
                  {list.slice(0, 3).map((m, i) => (
                    <span key={m.uid} className={`grid size-8 place-items-center rounded-full bg-card ring-2 ring-card ${i ? "-ml-3" : ""}`} style={{ zIndex: 3 - i }}>
                      <span className="grid size-full place-items-center rounded-full bg-accbg text-[0.6875rem] font-bold text-acc">{initials(m.name)}</span>
                    </span>
                  ))}
                </span>
              );
              return <Row key={g} href={`/people/${g}`} lead={lead} title={def.title} sub={sub} right={list.length} />;
            })}
          </RowList>
        </section>
      </div>
      {add && <PersonSheet key="new" open onClose={() => setAdd(false)} person={null} />}
    </main>
  );
}
