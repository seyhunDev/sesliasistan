"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData } from "@/features/data/DataProvider";
import { PersonSheet } from "@/features/people/PersonSheet";
import { seenText } from "@/features/staff/StaffCard";
import { KIND_LABEL, isAthleteSide, kindOf, missingOf, shownLogin } from "@/lib/kinds";
import { initials } from "@/lib/utils/format";

const TABS = [
  ["all", "Tümü", () => true],
  ["staff", "Çalışanlar", (k) => k === "staff"],
  ["family", "Aile", (k) => k === "family"],
  ["athletes", "Sporcular", (k) => isAthleteSide(k)],
  ["other", "Diğer", (k) => k === "other"],
];

// Kişiler (yalnızca ana hesap): çalışan, aile, sporcu/öğrenci/veli… Bilgileri düzenle, eksikleri tamamla, hesap aç/kapat, sil.
export default function PeoplePage() {
  const { isStaff, members } = useData();
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [edit, setEdit] = useState(null); // { person } | { person: null } (yeni)
  useEffect(() => {
    if (isStaff) router.replace("/");
  }, [isStaff, router]);
  if (isStaff) return null;

  const list = [...members].sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
  const count = (fn) => list.filter((m) => fn(kindOf(m))).length;
  const tabs = TABS.filter(([k, , fn]) => k === "all" || count(fn) > 0);
  const shown = list.filter((m) => (TABS.find((t) => t[0] === tab)?.[2] || (() => true))(kindOf(m)));
  const accounts = list.filter((m) => m.account !== false).length;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Kişiler" sub={list.length ? `${list.length} kişi · ${accounts} hesap` : "Henüz kişi yok"} />

      {tabs.length > 2 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {tabs.map(([k, label, fn]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold active:scale-95 ${tab === k ? "bg-[#2c5163] text-white" : "bg-card text-fg ring-1 ring-line"}`}
            >
              {label} <span className={`tabular-nums ${tab === k ? "text-white/75" : "text-mut"}`}>{count(fn)}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length ? (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
          {shown.map((m) => {
            const k = kindOf(m);
            const acc = m.account !== false;
            const online = acc && seenText(m.lastSeen) === "Çevrimiçi";
            const miss = missingOf(m);
            return (
              <li key={m.uid}>
                <button type="button" onClick={() => setEdit({ person: m })} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-bg">
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.875rem] font-bold text-acc">
                    {initials(m.name)}
                    {acc && <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card ${online ? "bg-ok" : "bg-line"}`} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{m.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">
                      {[KIND_LABEL[k], m.relation, m.title, k === "parent" && (m.children || []).map((c) => members.find((x) => x.uid === c)?.name?.split(" ")[0]).filter(Boolean).join(", ")].filter(Boolean).join(" · ")} · {acc ? `hesap: ${shownLogin(m.loginName || m.email) || "açık"}` : "hesap yok"}
                    </small>
                    {miss.length > 0 && <small className="block truncate text-[0.75rem] font-medium text-amber-700">Eksik: {miss.join(", ")}</small>}
                  </span>
                  <Icon name="chev" className="size-4 shrink-0 text-mut" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
            <Icon name="users" className="size-7" />
          </span>
          <p className="mt-3 max-w-[18rem] text-[0.9375rem] leading-snug text-mut">Çalışanlarını, aileni ya da sporcularını ekle. İstediğine uygulama hesabı açabilirsin.</p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={() => setEdit({ person: null })}
          className="mx-auto flex h-12 w-full max-w-[26rem] items-center justify-center gap-2 rounded-xl bg-[#2c5163] text-[0.9375rem] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(44,81,99,.8)] active:scale-[.98]"
        >
          <Icon name="plus" className="size-5" /> Kişi ekle
        </button>
      </div>

      {edit && <PersonSheet key={edit.person?.uid || "new"} open onClose={() => setEdit(null)} person={edit.person} />}
    </main>
  );
}
