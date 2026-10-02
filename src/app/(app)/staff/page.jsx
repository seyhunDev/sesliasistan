"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData } from "@/features/data/DataProvider";
import { PersonSheet } from "@/features/people/PersonSheet";
import { seenText } from "@/features/staff/StaffCard";
import { PEOPLE_GROUPS, kindOf, missingOf } from "@/lib/kinds";
import { initials } from "@/lib/utils/format";

// Kişiler (yalnızca ana hesap): Çalışanlar, Aile, Sporcular ayrı sayfalar. Her kutuda kişi/hesap sayısı, çevrimiçi, eksik bilgi.
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
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Kişiler" sub={members.length ? `${members.length} kişi · ${accounts} hesap` : "Henüz kişi yok"} />
      <div className="mt-2 space-y-3">
        {groups.map(([g, def]) => {
          const list = members.filter((m) => def.kinds.includes(kindOf(m)));
          const acc = list.filter((m) => m.account !== false);
          const online = acc.filter((m) => seenText(m.lastSeen) === "Çevrimiçi").length;
          const miss = list.filter((m) => missingOf(m).length).length;
          return (
            <Link
              key={g}
              href={`/people/${g}`}
              className="flex items-center gap-3.5 rounded-[1.25rem] bg-card p-4 shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)] transition active:scale-[.99]"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-deep text-white">
                <Icon name={def.icon} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <b className="text-[1.0625rem] font-semibold">{def.title}</b>
                  <span className="text-[0.9375rem] font-semibold tabular-nums text-mut">{list.length}</span>
                </span>
                <small className="block truncate text-[0.8125rem] text-mut">
                  {list.length ? `${acc.length} hesap${online ? ` · ${online} çevrimiçi` : ""}` : "Henüz kimse yok"}
                </small>
                {miss > 0 && <small className="block text-[0.75rem] font-medium text-amber-700">{miss} kişide eksik bilgi</small>}
              </span>
              {list.length > 0 && (
                <span className="flex shrink-0 items-center">
                  {list.slice(0, 3).map((m, i) => (
                    <span key={m.uid} className={`grid size-8 place-items-center rounded-full bg-card ring-2 ring-card ${i ? "-ml-2" : ""}`} style={{ zIndex: 3 - i }}>
                      <span className="grid size-full place-items-center rounded-full bg-acc/10 text-[0.6875rem] font-bold text-acc">{initials(m.name)}</span>
                    </span>
                  ))}
                </span>
              )}
              <Icon name="chev" className="size-4 shrink-0 text-mut" />
            </Link>
          );
        })}
      </div>
      <p className="mt-4 px-1 text-[0.8125rem] leading-snug text-mut">
        Her sayfada kişinin giriş bilgisi ve yanında <b className="font-semibold">Gönder</b> var: yeni şifre oluşturup giriş bilgilerini WhatsApp ile iletir.
      </p>

      <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={() => setAdd(true)}
          className="mx-auto flex h-12 w-full max-w-[26rem] items-center justify-center gap-2 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(31,90,75,.8)] active:scale-[.98]"
        >
          <Icon name="plus" className="size-5" /> Kişi ekle
        </button>
      </div>
      {add && <PersonSheet key="new" open onClose={() => setAdd(false)} person={null} />}
    </main>
  );
}
