"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAuth } from "@/features/auth/AuthProvider";
import { listTime } from "@/features/chat/bits";
import { isUnread } from "@/lib/inbox";
import { IconDot, useForYou } from "./ForYou";
import { CARD, SectionHead } from "./ui";


// Etiketten simge: sohbet, plan/özet, görev, not, para (fiş, fatura, aidat, banka maili), diğerleri zil
function iconOf(tag = "") {
  if (/chat/.test(tag)) return "chat";
  if (/plan|summary|evening|weekly|wind/.test(tag)) return "cal";
  if (/task/.test(tag)) return "task";
  if (/note/.test(tag)) return "note";
  if (/pay|paid|inv|dues|mail/.test(tag)) return "receipt";
  return "bell";
}

// "Senin için" (tek kutu): bakman gereken her şey bir listede. Önce yapılacaklar (useForYou: silme isteği, mesaj, fatura,
// geciken ve bugünkü görev, yeni verilen, ödenecek fiş), sonra telefona gelen okunmamış bildirimler (users/{uid}.inbox, lib/inbox). Başlıktaki zilin sayısı bu listenin uzunluğu; zil (ve "Tümü") pencereyi açar, pencerede
// yapılacakların hepsi ve son 30 bildirim. Ana sayfa görülünce bildirimler okundu yazılır (inboxSeen, simgedeki sayı sıfırlanır),
// ama bu ziyaret boyunca listede kalır. Bir kez çağrılır (OwnerHome), sonuç zile ve kutuya verilir.
export function useInbox() {
  const { profile } = useAuth();
  const router = useRouter();
  const { list: todo, hide: hideTodo } = useForYou();
  const uid = profile?.uid;
  const inbox = Array.isArray(profile?.inbox) ? profile.inbox : [];
  const seen = profile?.inboxSeen || "";
  // Bu ziyarette "yeni" sayılanlar: sayfa açıldığında okunmamış olanlar (okundu yazılınca kaybolmasın)
  const [since, setSince] = useState(null);
  const [gone, setGone] = useState(() => new Set()); // bu ziyarette kaydırılıp gizlenen bildirimler
  if (profile && since === null) setSince(seen); // ilk çizimde bir kez (React: çizim sırasında durum düzeltme)
  const seenRef = useRef(seen);
  useEffect(() => {
    seenRef.current = seen;
  }, [seen]);
  // Uygulama arka plana geçince: döndüğünde yalnız bu arada gelenler yeni görünsün
  useEffect(() => {
    const on = () => document.visibilityState === "hidden" && setSince(seenRef.current);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  // Görüldü: okunmamış varsa ve sayfa ekrandaysa kısa süre sonra okundu yazılır
  const newest = inbox[0]?.at || "";
  const unread = !!newest && isUnread(inbox[0], seen);
  useEffect(() => {
    if (!uid || !unread) return;
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") updateDoc(doc(db, "users", uid), { inboxSeen: newest }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [uid, unread, newest]);

  const note = (x) => {
    const isNew = since !== null && isUnread(x, since);
    const key = x.id || `${x.tag}-${x.at}`;
    return {
      id: `n:${key}`,
      lead: <IconDot icon={iconOf(x.tag)} tone={isNew ? "acc" : "mut"} />,
      title: x.title || x.body,
      sub: x.title ? x.body : "",
      time: listTime(x.at),
      dot: isNew,
      old: !isNew,
      onOpen: () => x.url && x.url !== "/" && router.push(x.url),
    };
  };
  const actions = todo;
  const fresh = since === null ? [] : inbox.filter((x) => isUnread(x, since)).map(note).filter((x) => !gone.has(x.id));
  const list = [...actions, ...fresh];
  const hide = (id) => (id.startsWith("n:") ? setGone((g) => new Set(g).add(id)) : hideTodo(id));
  return { list, actions, history: inbox.map(note), hide };
}

// Satır: solda simge/kişi, tek satır başlık + zaman, tek satır açıklama, sağda tek eylem. Dokun → ilgili yer açılır.
function Row({ x, first, onHide }) {
  const body = (
    <div
      role="button"
      tabIndex={0}
      onClick={x.onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), x.onOpen())}
      className="flex w-full cursor-pointer items-center gap-3 bg-card pl-3.5 pr-3 text-left transition active:bg-bg"
    >
      <span className="py-2.5">{x.lead}</span>
      <span className={`flex min-w-0 flex-1 items-center gap-2 self-stretch py-3 ${first ? "" : "border-t border-line/80"}`}>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <b className={`min-w-0 flex-1 truncate text-[0.9375rem] leading-snug ${x.old ? "font-normal text-mut" : "font-semibold"}`}>{x.title}</b>
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
  );
  return <li>{onHide ? <SwipeRow actions={[{ label: "Gizle", icon: "x", tone: "neutral", onAction: () => onHide(x.id) }]}>{body}</SwipeRow> : body}</li>;
}

function List({ rows, onHide }) {
  return (
    <ul className={`overflow-hidden ${CARD}`}>
      {rows.map((x, i) => (
        <Row key={x.id} x={x} first={!i} onHide={onHide} />
      ))}
    </ul>
  );
}

// Başlıktaki zil: sayı = Senin için'deki satır sayısı; dokununca pencere
export function InboxBell({ inbox, onOpen }) {
  const n = inbox.list.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={n ? `Senin için, ${n} yeni` : "Senin için"}
      className="relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-card text-fg ring-1 ring-line/70 active:scale-90"
    >
      <Icon name="bell" className="size-5" />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rec px-1 text-[0.6875rem] font-bold tabular-nums text-white ring-2 ring-bg">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </button>
  );
}

// Pencere: yapılacakların hepsi, altında son bildirimler (okunanlar soluk)
export function InboxSheet({ inbox, open, onClose }) {
  const { actions, history, hide } = inbox;
  const go = (x) => ({ ...x, onOpen: () => (onClose(), x.onOpen()) });
  return (
    <Sheet open={open} onClose={onClose} title="Senin için">
      <div className="space-y-5">
        {!actions.length && !history.length && <p className="px-1 py-6 text-center text-[0.875rem] text-mut">Yeni bir şey yok.</p>}
        {actions.length > 0 && (
          <section aria-label="Yapılacaklar">
            <SectionHead title="YAPILACAKLAR" count={actions.length} />
            <List rows={actions.map(go)} onHide={hide} />
          </section>
        )}
        {history.length > 0 && (
          <section aria-label="Bildirimler">
            <SectionHead title="BİLDİRİMLER" />
            <List rows={history.map(go)} />
          </section>
        )}
      </div>
    </Sheet>
  );
}

// Ana sayfadaki tek satır: "N şey seni bekliyor", solda ilk üç öğenin küçük simgesi, altında ilk başlıklar; dokununca pencere.
// Bekleyen yoksa görünmez.
const MINI = [
  [/^(del|late):/, "alert", "bg-rec/10 text-rec"],
  [/^inv:/, "receipt", "bg-amber-500/12 text-amber-700"],
  [/^pay:/, "receipt", "bg-ok/10 text-ok"],
  [/^(chat|msg):/, "chat", "bg-acc/10 text-acc"],
  [/^n:/, "bell", "bg-acc/10 text-acc"],
  [/./, "task", "bg-acc/10 text-acc"],
];
const miniOf = (id) => MINI.find(([re]) => re.test(id));
export function WaitRow({ inbox, onAll }) {
  const { list } = inbox;
  if (!list.length) return null;
  const names = list
    .slice(0, 3)
    .map((x) => (typeof x.title === "string" ? x.title : x.short))
    .filter(Boolean);
  return (
    <button type="button" onClick={onAll} aria-label={`${list.length} şey seni bekliyor`} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${CARD} transition active:scale-[.98]`}>
      <span className="flex shrink-0">
        {list.slice(0, 3).map((x, i) => {
          const [, icon, tone] = miniOf(x.id);
          return (
            <span key={x.id} style={{ zIndex: 3 - i }} className="relative -ml-2 grid size-9 place-items-center rounded-full bg-card ring-2 ring-card first:ml-0">
              <span className={`grid size-full place-items-center rounded-full ${tone}`}>
                <Icon name={icon} className="size-4" />
              </span>
            </span>
          );
        })}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[1rem] font-semibold leading-snug">{list.length} şey seni bekliyor</b>
        <small className="line-clamp-2 block text-[0.8125rem] leading-snug text-mut">{names.join(" · ")}</small>
      </span>
      <Icon name="chev" className="size-4 shrink-0 text-mut" />
    </button>
  );
}
