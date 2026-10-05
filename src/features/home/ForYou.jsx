"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAdd } from "@/features/add/AddProvider";
import { useChat } from "@/features/chat/ChatProvider";
import { Avatar, listTime } from "@/features/chat/bits";
import { GROUPS } from "@/lib/kinds";
import { useData } from "@/features/data/DataProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { assigneesOf, isNewFor, unseenNotes } from "@/lib/people";
import { TLk, totalOf } from "@/lib/receipts";
import { todayStr } from "@/lib/utils/format";

const SHOW = 4;
const KIND = { plan: "Plan", task: "Görev", note: "Not", receipt: "Fiş" };
const KIND_ICON = { plan: "cal", task: "task", note: "note", receipt: "receipt" };
const TONE = {
  rec: "bg-rec/10 text-rec",
  amb: "bg-amber-500/12 text-amber-700",
  acc: "bg-acc/10 text-acc",
  ok: "bg-ok/10 text-ok",
};

// Kapatılan öneriler bu cihazda gün boyu gizli kalır (ertesi gün yeniden değerlendirilir)
const hideKey = () => `sa-foryou-${todayStr()}`;
function readHidden() {
  try {
    return new Set(JSON.parse(localStorage.getItem(hideKey()) || "[]"));
  } catch {
    return new Set();
  }
}

const IconDot = ({ icon, tone }) => (
  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${TONE[tone]}`}>
    <Icon name={icon} className="size-5" />
  </span>
);

// Sağdaki tek eylem: küçük yuvarlak düğme (işaret) ya da kısa yazılı düğme
function Pill({ children, onClick, tone = "light", label }) {
  const cls = { light: "bg-bg text-fg", rec: "bg-rec/10 text-rec", ok: "bg-ok text-white", acc: "bg-acc text-white" }[tone];
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-[0.8125rem] font-semibold transition active:scale-95 ${cls}`}
    >
      {children}
    </button>
  );
}

// "Senin için" öğeleri (ana sayfadaki liste ve asistan sahnesindeki kısa özet aynı listeyi kullanır).
// Sıra: Karar › Mesaj › Rüzgâr › Geciken › Yeni › Ödeme. Gizlenenler çıkarılmış hâliyle döner.
export function useForYou() {
  const router = useRouter();
  const { plans, tasks, notes, receipts, myUid, nameOf, isStaff, markSeen, deleteRecord, rejectDelete, toggleTask, markPaid } = useData();
  const { chats, personName } = useChat();
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const [hidden, setHidden] = useState(() => (typeof window === "undefined" ? new Set() : readHidden()));
  // Sayfadaki listede gizlenen, sahnedeki özetten de kalkar (ikisi ayrı kopya)
  useEffect(() => {
    const on = () => setHidden(readHidden());
    window.addEventListener("sa-foryou-hide", on);
    return () => window.removeEventListener("sa-foryou-hide", on);
  }, []);
  const today = todayStr();
  const open = (kind, id) => openAdd({ edit: { kind, id } });
  const recs = [...plans.map((r) => ["plan", r]), ...tasks.map((r) => ["task", r]), ...notes.map((r) => ["note", r])];
  const first = (n) => String(n || "Kişi").split(" ")[0];

  const items = [];
  // Karar: çalışanın silme isteği (ana hesap)
  if (!isStaff)
    for (const [kind, r] of [...recs, ...receipts.map((r) => ["receipt", { ...r, title: r.merchant || "Fiş" }])])
      if (r.deleteReq?.by)
        items.push({
          id: `del:${kind}:${r.id}`,
          lead: <IconDot icon="trash" tone="rec" />,
          title: r.title,
          sub: `${first(nameOf(r.deleteReq.by))} silmek istiyor · ${KIND[kind]}`,
          subTone: "text-rec",
          onOpen: () => (kind === "receipt" ? openReceipt({ edit: r.id }) : open(kind, r.id)),
          trail: (
            <span className="flex gap-1.5">
              <Pill tone="light" onClick={() => rejectDelete(kind, r.id)} label="Silme, kalsın">
                Kalsın
              </Pill>
              <Pill tone="rec" onClick={() => deleteRecord(kind, r.id)} label="Sil">
                Sil
              </Pill>
            </span>
          ),
        });
  // Mesaj: sohbetler (kişi, grup, Ekip) — okunmamış
  for (const c of chats)
    if (c.unread > 0 && !c.mutedByMe && c.last && c.last.by !== myUid)
      items.push({
        id: `chat:${c.id}:${c.seq}`,
        lead: <Avatar name={c.title} icon={GROUPS[c.id]?.icon || (c.type === "group" ? "chat" : null)} size="size-11" tone={GROUPS[c.id] ? "bg-deep text-white" : undefined} />,
        title: c.title,
        sub: `${c.type === "dm" ? "" : `${first(personName(c.last.by))}: `}${c.last.text}`,
        time: listTime(c.last.at),
        badge: c.unread,
        onOpen: () => router.push(`/messages?c=${c.id}`),
      });
  // Mesaj: plan/görev/not konuşmaları
  for (const [kind, r] of recs) {
    const fresh = unseenNotes(r, myUid);
    const last = fresh.at(-1);
    if (last)
      items.push({
        id: `msg:${kind}:${r.id}:${last.at}`,
        lead: <Avatar name={nameOf(last.by) || "Kişi"} size="size-11" />,
        title: (
          <>
            {nameOf(last.by) || "Kişi"} <span className="font-normal text-mut">· {r.title}</span>
          </>
        ),
        sub: last.text,
        time: listTime(last.at),
        badge: fresh.length,
        onOpen: () => open(kind, r.id),
      });
  }
  // Geciken görev: sağda tek dokunuşla "bitti"
  for (const t of tasks)
    if (!t.done && !t.doneBy?.[myUid] && t.due && t.due < today) {
      const days = Math.round((Date.parse(today) - Date.parse(t.due)) / 864e5);
      items.push({
        id: `late:${t.id}:${t.due}`,
        lead: <IconDot icon="alert" tone="rec" />,
        title: t.title,
        sub: `${days} gün gecikti`,
        subTone: "text-rec",
        onOpen: () => open("task", t.id),
        trail: (
          <button
            type="button"
            aria-label="Yapıldı olarak işaretle"
            onClick={(e) => {
              e.stopPropagation();
              toggleTask(t.id);
            }}
            className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-line text-transparent transition hover:text-ok active:scale-90 active:border-ok active:text-ok"
          >
            <Icon name="check" className="size-4 [stroke-width:3]" />
          </button>
        ),
      });
    }
  // Yeni verilen / eklenen
  for (const [kind, r] of recs)
    if (isNewFor(r, myUid) && !(kind === "task" && r.done))
      items.push({
        id: `new:${kind}:${r.id}`,
        lead: <IconDot icon={KIND_ICON[kind]} tone="acc" />,
        title: r.title,
        sub: `${first(nameOf(r.createdByUid))} · ${assigneesOf(r).includes(myUid) ? `sana ${KIND[kind].toLocaleLowerCase("tr-TR")} verdi` : `yeni ${KIND[kind].toLocaleLowerCase("tr-TR")}`}`,
        time: r.createdAt ? listTime(r.createdAt) : "",
        dot: true,
        onOpen: () => {
          markSeen(kind, r.id);
          open(kind, r.id);
        },
      });
  // Ödeme bekleyen fiş (ana hesap)
  if (!isStaff)
    for (const r of receipts)
      if (r.payStatus === "pending" && !r.deleteReq)
        items.push({
          id: `pay:${r.id}`,
          lead: <IconDot icon="receipt" tone="ok" />,
          title: `${r.merchant || "Fiş"} · ${TLk(totalOf(r))}`,
          sub: `${first(nameOf(r.createdByUid))} · ödeme bekliyor`,
          onOpen: () => openReceipt({ edit: r.id }),
          trail: (
            <Pill tone="ok" onClick={() => markPaid(r.id)} label="Öde">
              Öde
            </Pill>
          ),
        });

  const list = items.filter((x) => !hidden.has(x.id));
  const hide = (id) =>
    setHidden((h) => {
      const next = new Set(h).add(id);
      try {
        localStorage.setItem(hideKey(), JSON.stringify([...next]));
      } catch {}
      setTimeout(() => window.dispatchEvent(new Event("sa-foryou-hide")));
      return next;
    });
  return { list, hide };
}

// "Senin için": bildirim merkezi gibi sade liste. Her öğe: solda simge/kişi, tek satır başlık, tek satır açıklama,
// sağda zaman ya da tek eylem. Dokun → ilgili kayıt/sohbet açılır. Sola kaydır → bugünlük gizle. Hiç öneri yoksa bölüm görünmez.
// Ana sayfada geciken görevler gösterilmez: hemen altındaki Bugün kartında zaten var (iki kez görünüyordu).
export function ForYou() {
  const { list: all0, hide } = useForYou();
  const list = all0.filter((x) => !x.id.startsWith("late:"));
  const [all, setAll] = useState(false);
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, SHOW);

  return (
    <section id="foryou" aria-label="Senin için" className="scroll-mt-4">
      <div className="mb-2.5 flex items-baseline justify-between px-1">
        <span className="text-[0.75rem] font-bold tracking-[.08em] text-mut">SENİN İÇİN</span>
        {list.length > SHOW && (
          <button type="button" onClick={() => setAll((v) => !v)} className="text-[0.8125rem] font-semibold text-acc">
            {all ? "Daha az" : `Tümü · ${list.length}`}
          </button>
        )}
      </div>
      <ul className="overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
        {shown.map((x, i) => (
          <li key={x.id}>
            <SwipeRow actions={[{ label: "Gizle", icon: "x", tone: "neutral", onAction: () => hide(x.id) }]}>
              <div
                role="button"
                tabIndex={0}
                onClick={x.onOpen}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), x.onOpen())}
                className="flex w-full cursor-pointer items-center gap-3 bg-card pl-3.5 pr-3 text-left transition active:bg-bg"
              >
                <span className="py-2.5">{x.lead}</span>
                <span className={`flex min-w-0 flex-1 items-center gap-2 self-stretch py-3 ${i ? "border-t border-line/80" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold leading-snug">{x.title}</b>
                      {x.time && <time className={`shrink-0 text-[0.75rem] tabular-nums ${x.badge ? "font-semibold text-acc" : "text-mut"}`}>{x.time}</time>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[0.8125rem] leading-snug ${x.subTone || "text-mut"}`}>{x.sub}</span>
                      {x.badge > 0 && (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-acc px-1.5 text-[0.6875rem] font-bold tabular-nums text-white">{x.badge > 99 ? "99+" : x.badge}</span>
                      )}
                      {x.dot && <span className="size-2.5 shrink-0 rounded-full bg-acc" aria-label="yeni" />}
                    </span>
                  </span>
                  {x.trail}
                </span>
              </div>
            </SwipeRow>
          </li>
        ))}
      </ul>
    </section>
  );
}
