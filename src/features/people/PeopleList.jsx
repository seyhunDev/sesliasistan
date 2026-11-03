"use client";

import { FadeImg } from "@/components/ui/FadeImg";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { Empty } from "@/components/ui/Page";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { useData } from "@/features/data/DataProvider";
import { PersonSheet } from "@/features/people/PersonSheet";
import { SendLogin } from "@/features/people/SendLogin";
import { memberData } from "@/features/people/assistPerson";
import { OPEN_KEY, takeOpen } from "@/features/people/personActions";

const pick = ({ name, kind, relation, title, phone, email, birth }) => ({ name, kind, relation, title, phone, email, birth });
import { seenText } from "@/features/staff/StaffCard";
import { KIND_LABEL, PEOPLE_GROUPS, kindOf, missingOf, shownLogin } from "@/lib/kinds";
import { initials } from "@/lib/utils/format";
import { personPath } from "@/lib/personPage";

// Bir grubun kişileri (Çalışanlar / Aile / Sporcular / Diğer): giriş bilgisi ve "Gönder" (WhatsApp), hesap aç, düzenle.
// Yeni tasarım (2026-11-03): lacivert üstte ad, kişi sayısı ve "+ Sporcu/Çalışan…"; altta Hesabı var / Hesabı yok listeleri.
export function PeopleList({ group }) {
  const g = PEOPLE_GROUPS[group];
  const { members } = useData();
  const { profile } = useAuth();
  const [edit, setEdit] = useState(null); // { person, step } | { person: null }
  const [send, setSend] = useState(null);
  const list = members.filter((m) => g.kinds.includes(kindOf(m))).sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
  // Asistandan açılış: { uid, step } (kişi kartı / hesap ekranı) ya da { prefill } (yeni kişi formu dolu)
  const [want, setWant] = useState(null);
  useEffect(() => {
    const take = () => {
      const o = takeOpen();
      if (o) setWant(o);
    };
    take();
    window.addEventListener(OPEN_KEY, take);
    return () => window.removeEventListener(OPEN_KEY, take);
  }, []);
  // İstenen kişi listede görünene kadar (yükleniyor) beklenir
  const wanted = !want ? null : want.prefill ? { person: null, prefill: pick(memberData({ ...want.prefill, name: want.prefill.name || "" })) } : members.find((x) => x.uid === want.uid) ? { person: members.find((x) => x.uid === want.uid), step: want.step } : null;
  const shown = edit || wanted;
  const close = () => (setEdit(null), setWant(null));
  const childNames = (m) => (m.children || []).map((c) => members.find((x) => x.uid === c)?.name?.split(" ")[0]).filter(Boolean).join(", ");

  const addCls = "ck-btn shrink-0 !flex items-center gap-1";
  const row = (m) => {
    const k = kindOf(m);
    const acc = m.account !== false;
    const online = acc && seenText(m.lastSeen) === "Çevrimiçi";
    const miss = missingOf(m).filter((x) => x !== "e-posta" || !acc);
    const login = shownLogin(m.loginName || m.email);
    const info = [g.kinds.length > 1 && KIND_LABEL[k], m.relation, m.title, k === "parent" && childNames(m)].filter(Boolean).join(" · ") || KIND_LABEL[k];
    return (
      <li key={m.uid} className="flex items-center gap-2 pr-3.5">
        <Link href={personPath(m.uid)} data-press="row" className="flex min-h-[3.5rem] min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 text-left">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-accbg text-[0.8125rem] font-bold text-acc">
            {initials(m.name)}
            {m.photo && <FadeImg src={m.photo} className="size-full rounded-full object-cover" />}
            {acc && <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card ${online ? "bg-ok" : "bg-line"}`} />}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[0.9375rem] font-semibold">{m.name}</b>
            <small className="block truncate text-[0.8125rem] text-mut">{[info, acc && `Giriş: ${login || "—"}`].filter(Boolean).join(" · ")}</small>
            {miss.length > 0 && <small className="block truncate text-[0.8125rem] text-warn">Eksik: {miss.join(", ")}</small>}
          </span>
        </Link>
        {acc ? (
          <button type="button" onClick={() => setSend(m)} data-press className="btn btn-secondary btn-sm shrink-0">
            Gönder
          </button>
        ) : (
          <button type="button" onClick={() => setEdit({ person: m, step: "account" })} data-press className="btn btn-secondary btn-sm shrink-0">
            Hesap aç
          </button>
        )}
      </li>
    );
  };
  const section = (title, items) =>
    items.length > 0 && (
      <section>
        <ListHead title={title} count={items.length} />
        <ul className="overflow-hidden rounded-[1.25rem] border border-line bg-card [&>*+*]:border-t [&>*+*]:border-line">{items.map(row)}</ul>
      </section>
    );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label={g.title}>
        <header className="flex items-center gap-2.5">
          <BackButton href="/staff" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{g.title}</h1>
            {list.length > 0 && <p className="truncate text-[0.8125rem] text-white/65">{list.length} kişi</p>}
          </div>
          <button type="button" onClick={() => setEdit({ person: null })} data-press className={addCls}>
            <Icon name="plus" className="size-4" />
            {group === "family" ? "Aile" : group === "athletes" ? "Sporcu" : group === "staff" ? "Çalışan" : "Kişi"}
          </button>
        </header>
        {group === "athletes" && canSeeAthletes(profile?.email) && (
          <Link href="/athletes" data-press className="raised mt-4 flex h-10 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold">
            Kulüpten ekle
          </Link>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {list.length === 0 && <Empty icon={g.icon} title="Henüz kimse yok" />}
        {section("Hesabı var", list.filter((m) => m.account !== false))}
        {section("Hesabı yok", list.filter((m) => m.account === false))}
      </div>

      {shown && <PersonSheet key={`${shown.person?.uid || "new"}-${shown.step || ""}`} open onClose={close} person={shown.person} defaultKind={g.add} initialStep={shown.step} prefill={shown.prefill} />}
      {send && <SendLogin key={send.uid} person={send} onClose={() => setSend(null)} />}
    </main>
  );
}
