"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useWho } from "@/features/data/useWho";
import { seenText } from "@/features/staff/StaffCard";
import { assigneesOf, isNewFor, unseenNotes } from "@/lib/people";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useHomeTools } from "./tools";
import { useNow } from "@/hooks/useNow";
import { leftLabel, lessonsOn, nextPlan, pendingPlans, pickPlans, pickTasks, planState, soonLabel, upcomingBirthdays } from "@/lib/agenda";
import { addDate } from "@/lib/ai/digest";
import { totalOf } from "@/lib/receipts";
import { rel, short, todayStr } from "@/lib/utils/format";
import { stamp } from "@/features/add/EditCard";

const MAX = 3; // her grupta en fazla gösterilen kayıt
const money = (k) => ((k || 0) / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

// Sıradaki plan: süren ya da en yakın başlayacak plan, tek büyük satır
export function NextUp() {
  const { plans } = useData();
  const who = useWho();
  const { openAdd } = useAdd();
  const now = useNow();
  const n = nextPlan(plans, now);
  if (!n) return null;
  const p = n.plan;
  return (
    <button
      onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })}
      className="flex w-full items-center gap-3.5 rounded-2xl bg-acc/[.08] px-4 py-3.5 text-left transition active:scale-[.98]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-acc">
        <Icon name="cal" className="size-[1.375rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-acc">
          {n.state === "now" && <i className="size-1.5 animate-pulse rounded-full bg-acc" />}
          {n.state === "now" ? "Şu an" : "Sıradaki"}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="min-w-0 truncate text-[1.0625rem] font-semibold tracking-tight">{p.title}</span>
          {who(p)}
        </span>
        <span className="block truncate text-[0.8125rem] text-mut">
          {[n.state === "now" ? `${p.time} başladı` : n.when, p.place].filter(Boolean).join(" · ")}
        </span>
      </span>
      <Icon name="chev" className="size-5 shrink-0 text-mut" />
    </button>
  );
}

// Her tür için tek kart: başlığa dokununca o türün sayfası (ekle + gör) açılır. count: bitmemiş plan / açık görev
function Block({ title, icon, count, href, empty, children }) {
  return (
    <section className="rounded-2xl bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <Link href={href} className="-mx-1 -my-1 flex items-center gap-2.5 rounded-xl px-1 py-1 active:bg-bg">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-acc/10 text-acc">
          <Icon name={icon} className="size-[1.125rem]" />
        </span>
        <h2 className="flex flex-1 items-center gap-2 text-[1rem] font-semibold tracking-tight">
          {title}
          {count > 0 && <span className="text-[0.875rem] font-medium tabular-nums text-mut">{count > 99 ? "99+" : count}</span>}
        </h2>
        <Icon name="chev" className="size-4 text-mut" />
      </Link>
      {children || <p className="mt-2 text-[0.875rem] text-mut">{empty}</p>}
    </section>
  );
}

// drop: liste sığmazsa önce çıkarılacaklar (saati geçmiş planlar)
function Group({ label, items, render, drop }) {
  let shown = items;
  if (drop) while (shown.length > MAX && shown.some(drop)) shown = shown.filter((x, i) => i !== shown.findIndex(drop));
  return (
    <div className="mt-2">
      <p className={`text-[0.8125rem] font-medium ${label === "Geciken" ? "text-rec" : "text-mut"}`}>{label}</p>
      <ul className="mt-0.5">
        {shown.slice(0, MAX).map(render)}
        {items.length > MAX && <li className="py-1 text-[0.8125rem] text-mut">+{items.length - MAX} daha</li>}
      </ul>
    </div>
  );
}

// Ana sayfa özeti: planlar ve görevler için bugün/yarın (yoksa en yakın), notlarda son eklenen
export function HomeAgenda() {
  const { plans, tasks, notes, receipts, toggleTask, isStaff, members, birthdays, lessons } = useData();
  const { openBirthday } = useBirthday();
  const tools = useHomeTools(); // doğum günü ve dersler kartı yalnızca seçiliyse
  const { openAdd } = useAdd();
  const who = useWho();
  const now = useNow();
  const today = todayStr();
  const planGroups = pickPlans(plans, today);
  const taskGroups = pickTasks(tasks, today);
  // Notlar: ana sayfada kısa bilgi olarak en fazla 3 satır (sabitlenenler önce)
  const briefNotes = [...notes]
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 3);
  const month = today.slice(0, 7);
  const spend = receipts.filter((r) => (r.date || "").startsWith(month)).reduce((a, r) => a + totalOf(r), 0);
  const review = receipts.filter((r) => r.status === "review").length;
  const toPay = receipts.filter((r) => r.payStatus === "pending");

  // Saati geçen plan soluk, süren plan "Şu an" etiketli
  const planRow = (p) => {
    const st = planState(p, now);
    return (
      <li key={p.id}>
        <button onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className={`flex w-full items-center gap-3 py-1.5 text-left active:opacity-60 ${st === "past" ? "opacity-40" : ""}`}>
          <span className="w-16 shrink-0 whitespace-nowrap text-[0.875rem] font-medium tabular-nums text-mut">
            {p.time || "Tüm gün"}
          </span>
          {/* Başlık üstte; kalan süre ve yer alt satırda, görevli sağda (dar ekranda başlık sıkışmasın) */}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-medium">{p.title}</span>
            {(p.place || (p.time && (st === "now" || (st === "next" && p.date === today)))) && (
              <span className="block truncate text-[0.8125rem] text-mut">
                {st === "now" && p.time && <b className="font-semibold text-acc">Şu an</b>}
                {st === "next" && p.time && p.date === today && <span className="font-medium text-acc">{soonLabel(p, now)}</span>}
                {p.place && p.time && (st === "now" || (st === "next" && p.date === today)) ? " · " : ""}
                {p.place}
              </span>
            )}
          </span>
          {who(p)}
        </button>
      </li>
    );
  };

  const taskRow = (x) => {
    const late = x.due && x.due < today;
    return (
      <li key={x.id} className="flex items-center gap-3 py-1.5">
        <button
          onClick={() => toggleTask(x.id)}
          aria-label="Yapıldı olarak işaretle"
          className="grid size-5 shrink-0 place-items-center rounded-full border-[0.0938rem] border-mut/60 text-transparent transition active:scale-90 active:border-emerald-500 active:bg-emerald-500 active:text-white"
        >
          <Icon name="check" className="size-3 [stroke-width:3]" />
        </button>
        <button onClick={() => openAdd({ edit: { kind: "task", id: x.id } })} className="flex min-w-0 flex-1 items-center gap-2 text-left active:opacity-60">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-medium">{x.title}</span>
            {late && <span className="block text-[0.8125rem] font-semibold text-rec">Gecikti · {short(x.due)}</span>}
          </span>
          {who(x)}
        </button>
      </li>
    );
  };

  return (
    <div className="flex w-full flex-col gap-3 text-left">
      {/* Bugünkü dersler (ders programı varsa) */}
      {tools.has("schedule") && lessonsOn(lessons, today).length > 0 && (
        <Block title="Bugünkü dersler" icon="book" count={lessonsOn(lessons, today).length} href="/schedule">
          <ul className="mt-2">
            {lessonsOn(lessons, today).slice(0, 5).map((l) => (
              <li key={l.id} className={`flex items-baseline gap-3 py-1 ${l.end && l.end < now.toTimeString().slice(0, 5) ? "opacity-40" : ""}`}>
                <span className="w-24 shrink-0 text-[0.8125rem] font-medium tabular-nums text-mut">{l.end ? `${l.start}–${l.end}` : l.start}</span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{l.title}</span>
                {l.place && <span className="max-w-[30%] shrink-0 truncate text-[0.8125rem] text-mut">{l.place}</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* Yaklaşan doğum günleri (30 gün) */}
      {tools.has("birthday") && upcomingBirthdays(birthdays, today, 30).length > 0 && (
        <Block title="Doğum günleri" icon="cake" href="/calendar">
          <ul className="mt-2">
            {upcomingBirthdays(birthdays, today, 30).slice(0, 3).map((b) => (
              <li key={b.id}>
                <button onClick={() => openBirthday({ edit: b.id })} className="flex w-full items-baseline gap-3 py-1 text-left active:opacity-60">
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">
                    {b.name}
                    {b.age ? <span className="font-normal text-mut"> · {b.age} yaşına</span> : null}
                  </span>
                  <span className={`shrink-0 text-[0.8125rem] font-semibold ${b.date === today ? "text-pink-600" : "text-mut"}`}>
                    {b.date === today ? "Bugün!" : b.date === addDate(today, 1) ? "Yarın" : `${short(b.date)} · ${leftLabel(b.date, today)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Planlar" icon="cal" count={pendingPlans(plans, now)} href="/plans" empty="Yaklaşan plan yok. Eklemek için dokun.">
        {planGroups.length > 0 && planGroups.map((g) => <Group key={g.key} label={g.label} items={g.items} render={planRow} drop={(p) => planState(p, now) === "past"} />)}
      </Block>

      <Block title="Görevler" icon="task" count={tasks.filter((x) => !x.done).length} href="/tasks" empty="Açık görev yok. Eklemek için dokun.">
        {taskGroups.length > 0 && taskGroups.map((g) => <Group key={g.key} label={g.label} items={g.items} render={taskRow} />)}
      </Block>

      <Block title="Notlar" icon="note" count={notes.length} href="/notes" empty="Henüz not yok. Eklemek için dokun.">
        {/* Kısa bilgi: sabitlenenler önce, sonra en yeniler; her not tek satır */}
        {briefNotes.length > 0 && (
          <ul className="mt-1.5">
            {briefNotes.map((n) => (
              <li key={n.id}>
                <button onClick={() => openAdd({ edit: { kind: "note", id: n.id } })} className="flex w-full items-baseline gap-2 py-1 text-left active:opacity-60">
                  {n.pinned && <Icon name="star" className="size-3.5 shrink-0 translate-y-0.5 fill-current text-acc" />}
                  <span className="min-w-0 flex-1 truncate text-[0.875rem]">
                    <b className="font-medium">{n.title}</b>
                    {n.body && n.body !== n.title && <span className="text-mut"> — {n.body.replace(/\s+/g, " ")}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Fişler" icon="receipt" count={review} href="/receipts">
        <Link href="/receipts" className="mt-2 flex items-baseline justify-between gap-3 active:opacity-60">
          <span className="text-[0.875rem] text-mut">Bu ay harcama</span>
          <span className="text-[1.0625rem] font-semibold tabular-nums">{money(spend)}</span>
        </Link>
        {toPay.length > 0 && (
          <Link href="/receipts" className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-700 active:opacity-60">
            <Icon name="wallet" className="size-4" />
            {isStaff ? `${toPay.length} fişinin ödemesi bekleniyor` : `${toPay.length} fiş ödeme bekliyor · ${money(toPay.reduce((a, r) => a + totalOf(r), 0))}`}
          </Link>
        )}
        {review > 0 && (
          <Link href="/receipts" className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-700 active:opacity-60">
            <Icon name="alert" className="size-4" /> {review} fiş kontrol bekliyor
          </Link>
        )}
      </Block>

      {/* Ana hesap: çalışanlar (ekle, gör); kim çevrimiçi, kimde kaç açık iş */}
      {!isStaff && (
        <Block title="Kişiler" icon="users" count={members.length} href="/staff" empty="Henüz kişi yok. Ekip arkadaşı ya da aile üyesi eklemek için dokun.">
          {members.length > 0 && (
            <ul className="mt-2 space-y-1">
              {members.map((m) => {
                const seen = seenText(m.lastSeen);
                const on = seen === "Çevrimiçi";
                const open = tasks.filter((t) => !t.done && (t.createdByUid === m.uid || assigneesOf(t).includes(m.uid))).length;
                return (
                  <li key={m.uid}>
                    <Link href="/staff" className="flex items-center gap-3 py-1 active:opacity-60">
                      <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-semibold text-acc">
                        {(m.name || "?")[0]}
                        <span className={`absolute -bottom-px -right-px size-2.5 rounded-full ring-2 ring-card ${on ? "bg-ok" : "bg-line"}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-medium">{m.name}</span>
                        <span className={`block truncate text-[0.75rem] ${on ? "font-medium text-ok" : "text-mut"}`}>{seen}</span>
                      </span>
                      <span className="shrink-0 text-[0.8125rem] text-mut">{open ? `${open} açık iş` : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Block>
      )}
    </div>
  );
}

// Yenilikler: sana verilen / başkasının eklediği yeni kayıtlar ve kayıtlara başkalarının yazdığı yeni mesajlar TEK kartta.
// Üst üste yığılmasın diye her kayıt tek satır (aynı kayda 3 mesaj geldiyse "3 yeni mesaj" + son mesajın kendisi), en yenisi üstte.
// İlk 3 satır görünür, fazlası "+N daha" ile açılır. Satıra dokununca kayıt açılır ve görüldü sayılır (karttan düşer);
// "Tümünü gördüm" hepsini birden kapatır. Görüldü bilgisi kayıtta tutulur (ack.{uid}.r / .n), her cihazda aynıdır.
const SHOW_NEW = 3;
export function NewItems() {
  const { plans, tasks, notes, receipts, myUid, nameOf, markSeen, isStaff, deleteRecord, rejectDelete } = useData();
  const { openAdd } = useAdd();
  const [all, setAll] = useState(false);
  // Ana hesap: çalışanların silme istekleri (onayla → silinir, reddet → kalır)
  const dels = isStaff
    ? []
    : [
        ...plans.map((r) => ({ kind: "plan", icon: "cal", r })),
        ...tasks.map((r) => ({ kind: "task", icon: "task", r })),
        ...notes.map((r) => ({ kind: "note", icon: "note", r })),
        ...receipts.map((r) => ({ kind: "receipt", icon: "receipt", r: { ...r, title: r.merchant || "Fiş" } })),
      ]
        .filter((x) => x.r.deleteReq?.by)
        .sort((a, b) => String(b.r.deleteReq.at).localeCompare(String(a.r.deleteReq.at)));
  const KIND = { plan: "Plan", task: "Görev", note: "Not" };
  const items = [
    ...plans.map((r) => ({ kind: "plan", icon: "cal", r })),
    ...tasks.filter((t) => !t.done).map((r) => ({ kind: "task", icon: "task", r })),
    ...notes.map((r) => ({ kind: "note", icon: "note", r })),
  ]
    .map((x) => {
      const isNew = isNewFor(x.r, myUid);
      const fresh = unseenNotes(x.r, myUid);
      const last = fresh.at(-1);
      return { ...x, isNew, fresh, last, at: last?.at > (x.r.createdAt || "") || !isNew ? last?.at : x.r.createdAt };
    })
    .filter((x) => (x.isNew || x.fresh.length) && !(!isStaff && x.r.deleteReq?.by)) // silme isteği varsa yalnızca istek satırı
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  if (!items.length && !dels.length) return null;

  const noteCount = items.reduce((n, x) => n + x.fresh.length, 0);
  const newCount = items.filter((x) => x.isNew).length;
  const sub = [
    dels.length && `${dels.length} silme isteği`,
    newCount && (newCount === 1 ? "1 yeni kayıt" : `${newCount} yeni kayıt`),
    noteCount && (noteCount === 1 ? "1 yeni mesaj" : `${noteCount} yeni mesaj`),
  ]
    .filter(Boolean)
    .join(" · ");
  const shown = all ? items : items.slice(0, SHOW_NEW);
  const open = (x) => {
    markSeen(x.kind, x.r.id);
    openAdd({ edit: { kind: x.kind, id: x.r.id } });
  };

  return (
    <section className="fade-in overflow-hidden rounded-2xl bg-card shadow-[0_8px_24px_-12px_rgba(47,125,107,.45)] ring-1 ring-acc/20" aria-label="Yenilikler">
      {/* Başlık bandı: toplam sayı, ne olduğu, hepsini kapat */}
      <div className="flex items-center gap-3 bg-acc px-4 py-3 text-white">
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
          <Icon name="bell" className="size-[1.125rem]" />
          <span className="absolute -right-1 -top-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-white px-1 text-[0.6875rem] font-bold tabular-nums text-acc">
            {items.length + dels.length > 9 ? "9+" : items.length + dels.length}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[1rem] font-semibold leading-tight">Yenilikler</b>
          <small className="block truncate text-[0.75rem] text-white/75">{sub}</small>
        </span>
        {items.length > 0 && (
        <button
          type="button"
          onClick={() => items.forEach((x) => markSeen(x.kind, x.r.id))}
          className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold transition active:scale-95 active:bg-white/25"
        >
          Tümünü gördüm
        </button>
        )}
      </div>
      {/* Silme istekleri: onay ana hesabın */}
      {dels.length > 0 && (
        <ul className="divide-y divide-line border-b border-line">
          {dels.map(({ kind, icon, r }) => (
            <li key={`del${kind}${r.id}`} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rec/10 text-rec">
                <Icon name="trash" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{r.title}</b>
                <small className="flex items-center gap-1 truncate text-[0.75rem] text-mut">
                  <Icon name={icon} className="size-3.5 shrink-0" /> {nameOf(r.deleteReq.by) || "Kişi"} silmek istiyor
                </small>
              </span>
              <button type="button" onClick={() => rejectDelete(kind, r.id)} className="h-8 shrink-0 rounded-full bg-bg px-3 text-[0.75rem] font-semibold active:scale-95">
                Kalsın
              </button>
              <button type="button" onClick={() => deleteRecord(kind, r.id)} className="h-8 shrink-0 rounded-full bg-rec px-3 text-[0.75rem] font-semibold text-white active:scale-95">
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
      <ul className="divide-y divide-line">
        {shown.map((x) => {
          const { kind, icon, r, isNew, fresh, last } = x;
          const lastBy = last ? nameOf(last.by) || "Biri" : "";
          return (
            <li key={`${kind}${r.id}`}>
              <button type="button" onClick={() => open(x)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-bg">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                  <Icon name={fresh.length && !isNew ? "chat" : icon} className="size-5" />
                  {fresh.length > 1 && (
                    <span className="absolute -right-1 -top-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-acc px-1 text-[0.6875rem] font-bold tabular-nums text-white">{fresh.length}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{r.title}</b>
                    {x.at && <small className="shrink-0 text-[0.6875rem] tabular-nums text-mut">{stamp(x.at)}</small>}
                  </span>
                  {last ? (
                    <span className="block truncate text-[0.8125rem] text-fg/80">
                      <b className="font-semibold">{lastBy}:</b> {String(last.text || "").replace(/\s+/g, " ")}
                    </span>
                  ) : null}
                  <span className="block truncate text-[0.75rem] text-mut">
                    {[
                      KIND[kind],
                      isNew && `${nameOf(r.createdByUid) || "Başkası"} ${assigneesOf(r).includes(myUid) ? "verdi" : "ekledi"}`,
                      fresh.length > 1 && `${fresh.length} yeni mesaj`,
                      fresh.length === 1 && !isNew && "yeni mesaj",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Icon name="chev" className="size-4 shrink-0 text-mut" />
              </button>
            </li>
          );
        })}
      </ul>
      {(items.length > SHOW_NEW || noteCount > 0) && (
      <div className="flex h-10 items-center border-t border-line text-[0.8125rem] font-semibold text-acc">
        {items.length > SHOW_NEW && (
          <button type="button" onClick={() => setAll((v) => !v)} className="h-full flex-1 active:bg-bg">
            {all ? "Daha az göster" : `+${items.length - SHOW_NEW} daha`}
          </button>
        )}
        {noteCount > 0 && (
          <Link href="/messages" className={`flex h-full flex-1 items-center justify-center gap-1 active:bg-bg ${items.length > SHOW_NEW ? "border-l border-line" : ""}`}>
            Tüm mesajlar <Icon name="chev" className="size-3.5" />
          </Link>
        )}
      </div>
      )}
    </section>
  );
}
