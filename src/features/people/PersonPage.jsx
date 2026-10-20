"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { fmtDate, loadAthlete, useDikili } from "@/features/athletes/data";
import { loadRaces } from "@/features/athletes/races";
import { loadDuesRange } from "@/features/dues/duesData";
import { dmId } from "@/features/chat/ChatProvider";
import { CALM, SectionHead } from "@/features/home/ui";
import { PersonSheet } from "./PersonSheet";
import { ProfilePhoto } from "./ProfilePhoto";
import { athleteDues, lastMonths } from "@/lib/dues";
import { dueLabel } from "@/lib/agenda";
import { groupOfKind, kindOf, shownLogin, waPhone } from "@/lib/kinds";
import { ageOf, attendanceOf, bdayInfo, bdayLine, birthOf, clubSide, personPath, receiptsOf, subLine, todoOf } from "@/lib/personPage";
import { historyOf } from "@/lib/raceResults";
import { TLk } from "@/lib/receipts";
import { todayStr } from "@/lib/utils/format";

const short = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }).replace(".", "") : "");
const planWhen = (p) => `${new Date(`${p.date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")} ${short(p.date)}${p.time ? ` ${p.time}` : ""}`;
const TL = (n) => `₺${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)}`;

// Liste satırı: ad, alt satır, sağda sayı/durum. İçi varsa dokununca hemen altında açılır.
function Row({ title, sub, right, tone = "text-mut", href, children }) {
  const [open, setOpen] = useState(false);
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1rem]">{title}</span>
        {sub && <span className="block truncate text-[0.875rem] text-mut">{sub}</span>}
      </span>
      {right != null && right !== "" && <span className={`shrink-0 text-[0.9375rem] tabular-nums ${tone}`}>{right}</span>}
      {(children || href) && <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${open ? "rotate-90" : ""}`} />}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg";
  return (
    <div className="border-b border-line last:border-b-0">
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : children ? (
        <button type="button" onClick={() => setOpen((x) => !x)} aria-expanded={open} className={cls}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
      {open && children && <div className="border-t border-line bg-bg/50 px-4 py-2">{children}</div>}
    </div>
  );
}

// Açılan satırın içindeki tek kayıt (dokununca kaydı açar ya da sayfasına gider)
function Item({ text, extra, tone = "text-mut", onClick, href }) {
  const cls = "flex w-full items-baseline gap-1.5 py-1.5 text-left text-[0.9375rem] active:opacity-60";
  const inner = (
    <>
      <span className="min-w-0 truncate">{text}</span>
      {extra && <span className={`shrink-0 text-[0.875rem] ${tone}`}>· {extra}</span>}
    </>
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Section({ title, children }) {
  const rows = [children].flat(3).filter(Boolean);
  if (!rows.length) return null;
  return (
    <section className="mt-6">
      <SectionHead title={title} />
      <div className={`${CALM} overflow-hidden`}>{rows}</div>
    </section>
  );
}

// Kulüp kartındaki bilgiler (aidat, yarışlar, yoklama): yalnız sporcuyu görme izni olan ana hesap; okunamazsa satırlar çıkmaz
function useClub(athleteId, allowed, orgId) {
  const load = useCallback(() => (athleteId && allowed ? loadAthlete(athleteId) : Promise.resolve(null)), [athleteId, allowed]);
  const { data } = useDikili(`a:${athleteId || "-"}`, load);
  const a = data?.athlete || null;
  const [dues, setDues] = useState(null);
  const [races, setRaces] = useState(null);
  useEffect(() => {
    if (!a || !orgId) return;
    let on = true;
    const yms = lastMonths(todayStr().slice(0, 7), 6);
    loadDuesRange(orgId, yms)
      .then((x) => on && setDues(athleteDues(a, x.cfg, x.months, yms)))
      .catch(() => {});
    loadRaces(orgId)
      .then((list) => on && setRaces(historyOf(list, a.id)))
      .catch(() => on && setRaces([]));
    return () => void (on = false);
  }, [a, orgId]);
  return { a, dues, races };
}

const DUE = { paid: ["Ödendi", "text-acc"], part: ["Eksik", "text-amber-700"], free: ["Sayılmıyor", "text-mut"], none: ["Başlamadı", "text-mut"] };
const ATT = { present: "geldi", absent: "gelmedi", excused: "izinli" };

export function PersonPage({ uid }) {
  const { members, birthdays, tasks, plans, notes, receipts, myUid } = useData();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const [edit, setEdit] = useState(false);
  const today = todayStr();
  const m = members.find((x) => x.uid === uid);
  const orgId = profile?.orgId || profile?.uid;
  const club = m && clubSide(m) && m.athleteId;
  const { a, dues, races } = useClub(club ? m.athleteId : null, !!club && profile?.role === "owner" && canSeeAthletes(profile?.email), orgId);

  if (!m) {
    return (
      <main className="calm mx-auto max-w-[30rem] px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <BackButton href="/people/staff" />
        <p className="mt-10 text-center text-mut">{members.length ? "Kişi bulunamadı." : "Yükleniyor…"}</p>
      </main>
    );
  }

  const b = birthOf(m, birthdays);
  const age = ageOf(b, today);
  const line = bdayLine(b, today);
  const todo = todoOf(uid, { tasks, plans, notes }, today);
  const rc = receiptsOf(uid, receipts);
  const wa = waPhone(m.phone);
  const tel = String(m.phone || "").replace(/[^\d+]/g, "");
  const hasAccount = m.account !== false && m.status !== "left";
  const att = a ? attendanceOf(a, +today.slice(0, 4)) : null;
  const kids = (m.children || []).map((c) => members.find((x) => x.uid === c)).filter(Boolean);
  const parents = members.filter((x) => (x.children || []).includes(uid));
  const open = (kind, id) => openAdd({ edit: { kind, id } });
  const btn = "flex h-12 flex-1 items-center justify-center rounded-2xl text-[1rem] font-semibold transition active:scale-[.97]";
  const plain = `${btn} border border-line bg-card text-fg`;

  return (
    <main className="calm mx-auto max-w-[30rem] px-4 pb-32 pt-[calc(1rem+env(safe-area-inset-top))]">
      <BackButton href={`/people/${groupOfKind(kindOf(m))}`} />

      <header className="mt-2 flex flex-col items-center text-center">
        <ProfilePhoto orgId={orgId} uid={uid} name={m.name} photo={m.photo} photoPath={m.photoPath} />
        <h1 className="mt-3 text-[1.5rem] font-semibold leading-tight">{m.name}</h1>
        <p className="mt-0.5 text-[0.9375rem] text-mut">{subLine(m, age)}</p>
        {line && <p className="mt-2 rounded-full bg-acc/10 px-3 py-1 text-[0.875rem] text-acc">{line}</p>}
      </header>

      <div className="mt-5 flex gap-2.5">
        {hasAccount && myUid && (
          <Link href={`/messages?c=${dmId(myUid, uid)}`} className={`${btn} bg-acc text-white`}>
            Mesaj
          </Link>
        )}
        {tel && (
          <a href={`tel:${tel}`} className={plain}>
            Ara
          </a>
        )}
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={plain}>
            WhatsApp
          </a>
        )}
      </div>

      <Section title="Yapılacaklar">
        {todo.tasks.length > 0 && (
          <Row key="t" title="Görevler" sub={`${todo.tasks.length} açık`}>
            {todo.tasks.map((t) => {
              const d = t.due ? dueLabel(t.due, today) : null;
              return <Item key={t.id} text={t.title || t.text} extra={d ? (d.late ? "gecikti" : short(t.due)) : ""} tone={d?.late ? "text-amber-700" : "text-mut"} onClick={() => open("task", t.id)} />;
            })}
          </Row>
        )}
        {todo.plans.length > 0 && (
          <Row key="p" title="Planlar" sub={`Sıradaki: ${planWhen(todo.plans[0])} ${todo.plans[0].title || ""}`.trim()} right={todo.plans.length}>
            {todo.plans.map((p) => (
              <Item key={p.id} text={p.title || p.text} extra={planWhen(p)} onClick={() => open("plan", p.id)} />
            ))}
          </Row>
        )}
        {todo.notes.length > 0 && (
          <Row key="n" title="Notlar" right={todo.notes.length}>
            {todo.notes.map((n) => (
              <Item key={n.id} text={n.title || n.text} onClick={() => open("note", n.id)} />
            ))}
          </Row>
        )}
        {!todo.tasks.length && !todo.plans.length && !todo.notes.length && <Row key="0" title="Açık iş yok" />}
      </Section>

      <Section title="Para">
        {dues && (
          <Row
            key="d"
            title="Aidat"
            sub={dues.debt ? `Borç: ${dues.dueMonths.length} ay · ${TL(dues.debt)}` : dues.fee > 0 ? `Borcu yok · aylık ${TL(dues.fee)}` : ""}
            right={(DUE[dues.now.state] || ["Ödenmedi", "text-amber-700"])[0]}
            tone={(DUE[dues.now.state] || ["Ödenmedi", "text-amber-700"])[1]}
          >
            {dues.cells.map((c) => (
              <Item key={c.ym} text={new Date(`${c.ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} extra={(DUE[c.state] || ["ödenmedi"])[0].toLocaleLowerCase("tr-TR")} />
            ))}
            <Item text="Aidatlar sayfası" href="/dues" />
          </Row>
        )}
        {rc.list.length > 0 && (
          <Row key="r" title="Fişler" sub={`Ödenen ${rc.paid}${rc.pending ? ` · bekleyen ${rc.pending}` : ""}`} right={rc.pending ? TLk(rc.pendingTotal) : ""}>
            {rc.list.slice(0, 8).map((r) => (
              <Item key={r.id} text={r.merchant || r.title || "Fiş"} extra={r.payStatus === "pending" ? "bekliyor" : short(r.date || r.createdAt)} tone={r.payStatus === "pending" ? "text-amber-700" : "text-mut"} href={`/receipts/${r.id}`} />
            ))}
          </Row>
        )}
      </Section>

      <Section title="Kulüp">
        {races?.length > 0 && (
          <Row key="y" title="Yarışlar" sub={`${races[0].name}${races[0].place ? ` · ${races[0].place}.` : ""}`} right={races.length}>
            {races.map((x) => (
              <Item key={x.id} text={x.name} extra={x.place ? `${x.place}.` : x.date ? fmtDate(x.date, { day: "numeric", month: "short" }) : ""} href={`/athletes/races/${x.id}`} />
            ))}
          </Row>
        )}
        {att?.total > 0 && (
          <Row key="a" title="Yoklama" sub={`Bu yıl ${att.present} geldi · ${att.absent} gelmedi${att.excused ? ` · ${att.excused} izinli` : ""}`} right={`%${att.pct}`}>
            {att.last.map((x) => (
              <Item key={x.day} text={short(x.day)} extra={ATT[x.st]} />
            ))}
          </Row>
        )}
        {club && <Row key="k" title="Sporcu kartı" sub="Sağlık, veli, belgeler" href={`/athletes/${m.athleteId}`} />}
      </Section>

      <Section title="Bilgiler">
        {m.phone && <Row key="ph" title="Telefon" right={m.phone} />}
        {m.email && !m.email.endsWith("kullanici.sesliasistan.app") && <Row key="em" title="E-posta" right={m.email} />}
        {b && <Row key="bd" title="Doğum günü" right={bdayInfo(b, today)} />}
        {kids.length > 0 && (
          <Row key="ki" title="Çocukları" sub={kids.map((k) => k.name).join(", ")}>
            {kids.map((k) => (
              <Item key={k.uid} text={k.name} href={personPath(k.uid)} />
            ))}
          </Row>
        )}
        {parents.length > 0 && (
          <Row key="pa" title="Velisi" sub={parents.map((k) => k.name).join(", ")}>
            {parents.map((k) => (
              <Item key={k.uid} text={k.name} href={personPath(k.uid)} />
            ))}
          </Row>
        )}
        <Row key="ac" title="Uygulama hesabı" right={hasAccount ? shownLogin(m.email) || "Var" : "Yok"} />
        <button key="ed" type="button" onClick={() => setEdit(true)} data-press="row" className="w-full px-4 py-3 text-left text-[1rem] text-acc">
          Düzenle
        </button>
      </Section>

      {edit && <PersonSheet open onClose={() => setEdit(false)} person={m} />}
    </main>
  );
}
