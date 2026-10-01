"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { useData } from "@/features/data/DataProvider";
import { PersonSheet } from "@/features/people/PersonSheet";
import { SendLogin } from "@/features/people/SendLogin";
import { seenText } from "@/features/staff/StaffCard";
import { KIND_LABEL, PEOPLE_GROUPS, kindOf, missingOf, shownLogin } from "@/lib/kinds";
import { initials } from "@/lib/utils/format";

// Bir grubun kişileri (Çalışanlar / Aile / Sporcular / Diğer): giriş bilgisi ve "Gönder" (WhatsApp), hesap aç, düzenle
export function PeopleList({ group }) {
  const g = PEOPLE_GROUPS[group];
  const { members } = useData();
  const { profile } = useAuth();
  const [edit, setEdit] = useState(null); // { person, step } | { person: null }
  const [send, setSend] = useState(null);
  const list = members.filter((m) => g.kinds.includes(kindOf(m))).sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
  const accounts = list.filter((m) => m.account !== false).length;
  const childNames = (m) => (m.children || []).map((c) => members.find((x) => x.uid === c)?.name?.split(" ")[0]).filter(Boolean).join(", ");

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <PageHeader title={g.title} sub={list.length ? `${list.length} kişi · ${accounts} hesap` : "Henüz kimse yok"} back="/staff">
        {group === "athletes" && canSeeAthletes(profile?.email) && (
          <Link href="/athletes" className="flex h-10 items-center gap-1.5 rounded-full bg-card px-3.5 text-[0.8125rem] font-semibold text-acc ring-1 ring-line active:scale-95">
            <Icon name="anchor" className="size-4" /> Kulüpten ekle
          </Link>
        )}
      </PageHeader>

      {list.length ? (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
          {list.map((m) => {
            const k = kindOf(m);
            const acc = m.account !== false;
            const online = acc && seenText(m.lastSeen) === "Çevrimiçi";
            const miss = missingOf(m).filter((x) => x !== "e-posta" || !acc);
            const login = shownLogin(m.loginName || m.email);
            return (
              <li key={m.uid} className="flex items-center gap-2 pr-3">
                <button type="button" onClick={() => setEdit({ person: m })} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left active:bg-bg">
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.875rem] font-bold text-acc">
                    {initials(m.name)}
                    {acc && <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card ${online ? "bg-ok" : "bg-line"}`} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{m.name}</b>
                    <small className="block truncate text-[0.75rem] text-mut">
                      {[g.kinds.length > 1 && KIND_LABEL[k], m.relation, m.title, k === "parent" && childNames(m)].filter(Boolean).join(" · ") || KIND_LABEL[k]}
                    </small>
                    <small className={`block truncate text-[0.8125rem] ${acc ? "font-medium text-fg" : "text-mut"}`}>{acc ? `Giriş: ${login || "—"}` : "Uygulama hesabı yok"}</small>
                    {miss.length > 0 && <small className="block truncate text-[0.75rem] font-medium text-amber-700">Eksik: {miss.join(", ")}</small>}
                  </span>
                </button>
                {acc ? (
                  <button type="button" onClick={() => setSend(m)} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#25d366]/12 px-3 text-[0.8125rem] font-semibold text-[#128c4a] active:scale-95">
                    <Icon name="whatsapp" className="size-4" /> Gönder
                  </button>
                ) : (
                  <button type="button" onClick={() => setEdit({ person: m, step: "account" })} className="h-9 shrink-0 rounded-full bg-acc/10 px-3 text-[0.8125rem] font-semibold text-acc active:scale-95">
                    Hesap aç
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
            <Icon name={g.icon} className="size-7" />
          </span>
          <p className="mt-3 max-w-[18rem] text-[0.9375rem] leading-snug text-mut">
            {group === "athletes" ? "Sporcuları kulüp listesinden ekleyebilir ya da tek tek ekleyebilirsin." : "Kişi ekle; istersen uygulama hesabı açıp giriş bilgilerini WhatsApp ile gönder."}
          </p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={() => setEdit({ person: null })}
          className="mx-auto flex h-12 w-full max-w-[26rem] items-center justify-center gap-2 rounded-xl bg-[#2c5163] text-[0.9375rem] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(44,81,99,.8)] active:scale-[.98]"
        >
          <Icon name="plus" className="size-5" /> {group === "family" ? "Aile bireyi ekle" : group === "athletes" ? "Sporcu ekle" : group === "staff" ? "Çalışan ekle" : "Kişi ekle"}
        </button>
      </div>

      {edit && <PersonSheet key={`${edit.person?.uid || "new"}-${edit.step || ""}`} open onClose={() => setEdit(null)} person={edit.person} defaultKind={g.add} initialStep={edit.step} />}
      {send && <SendLogin key={send.uid} person={send} onClose={() => setSend(null)} />}
    </main>
  );
}
