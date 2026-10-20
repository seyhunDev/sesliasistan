"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, runTransaction } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { useAuth } from "@/features/auth/AuthProvider";
import { listTime } from "@/features/chat/bits";
import { inboxDrop, inboxLink, isUnread } from "@/lib/inbox";
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

// Bildirimleri listeden çıkarır (ids yoksa hepsi). Okuma + yazma tek işlemde: aynı anda gelen bildirim kaybolmasın.
export async function clearInbox(uid, ids) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await runTransaction(db, async (t) => {
    const u = (await t.get(ref)).data() || {};
    const inbox = inboxDrop(u.inbox, ids);
    t.update(ref, { inbox, ...(ids ? {} : { inboxSeen: new Date().toISOString() }) });
  });
}

// "Senin için" (tek kutu): bakman gereken her şey bir listede. Önce yapılacaklar (useForYou: silme isteği, mesaj, fatura,
// geciken ve bugünkü görev, yeni verilen, ödenecek fiş), sonra telefona gelen bildirimler (users/{uid}.inbox, lib/inbox).
// Zilin sayısı = GÖRMEDİĞİN bildirimler (uygulama simgesindeki sayıyla aynı). Zile dokunup pencere açılınca hepsi görüldü yazılır
// (inboxSeen), sayı hemen düşer; pencere açıkken gelen yeni bildirim de görüldü sayılır. Pencere açılmadan sayı düşmez.
// Pencerede o açılışta yeni olanlar noktalı ve koyu, eskiler soluk. Bir kez çağrılır (OwnerHome), sonuç zile, şeride ve pencereye verilir.
export function useInbox() {
  const { profile } = useAuth();
  const router = useRouter();
  const { list: todo, hide: hideTodo } = useForYou();
  const uid = profile?.uid;
  const all = Array.isArray(profile?.inbox) ? profile.inbox : [];
  const seen = profile?.inboxSeen || "";
  const [gone, setGone] = useState(() => new Set()); // silinen bildirimler (sunucu yazana kadar gizli)
  const [wide, setWide] = useState(""); // gidilecek yeri olmayan, tam metni açılan bildirim
  const [open, setOpenState] = useState(false);
  const [mark, setMark] = useState(""); // pencere açıldığında görülmüş sayılan an: bundan yenileri pencerede "yeni"
  const keyOf = (x) => `n:${x.id || `${x.tag}-${x.at}`}`;
  const inbox = all.filter((x) => !gone.has(keyOf(x)));
  const newest = all[0]?.at || "";
  // Pencere açıkken en yenisi de görülmüş sayılır: sayı yazmayı beklemeden hemen düşer
  const lastSeen = open && newest > seen ? newest : seen;
  const unread = inbox.filter((x) => isUnread(x, lastSeen));

  const setOpen = (v) => {
    if (v) setMark(lastSeen);
    setOpenState(v);
  };
  // Pencere açıkken: okunmamış varsa hemen görüldü yaz (açıkken gelen de)
  useEffect(() => {
    if (!open || !uid || !newest || newest <= seen) return;
    updateDoc(doc(db, "users", uid), { inboxSeen: newest }).catch(() => {});
  }, [open, uid, newest, seen]);

  const note = (x) => {
    const isNew = isUnread(x, open ? mark : lastSeen);
    const key = keyOf(x).slice(2);
    const link = inboxLink(x);
    return {
      id: `n:${key}`,
      lead: <IconDot icon={iconOf(x.tag)} tone={isNew ? "acc" : "mut"} />,
      title: x.title || x.body,
      sub: x.title ? x.body : "",
      time: listTime(x.at),
      dot: isNew,
      old: !isNew,
      wrap: wide === key,
      stay: !link, // dokununca pencere kapanmaz, tam metin açılır
      onOpen: () => (link ? router.push(link) : setWide((w) => (w === key ? "" : key))),
    };
  };
  const actions = todo;
  const fresh = unread.map(note);
  const list = [...actions, ...fresh]; // "N şey seni bekliyor" şeridi
  // Bildirim satırı: listeden kalıcı silinir (users/{uid}.inbox); yapılacak satırı: bu cihazda gizlenir (ForYou)
  const hide = (id) => {
    if (!id.startsWith("n:")) return hideTodo(id);
    setGone((g) => new Set(g).add(id));
    const x = all.find((y) => keyOf(y) === id);
    if (x?.id) clearInbox(uid, [x.id]).catch(() => {});
  };
  const clearAll = () => {
    setGone(new Set(all.map(keyOf)));
    return clearInbox(uid).catch(() => {});
  };
  return { list, actions, count: unread.length, history: inbox.map(note), hide, clearAll, open, setOpen };
}

// Satır: solda simge/kişi, tek satır başlık + zaman, tek satır açıklama, sağda tek eylem. Dokun → ilgili yer açılır.
function Row({ x, first, onHide, hideLabel = "Gizle" }) {
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
            <b className={`min-w-0 flex-1 line-clamp-2 text-[0.9375rem] leading-snug ${x.old ? "font-normal text-mut" : "font-semibold"}`}>{x.title}</b>
            {x.time && <time className={`shrink-0 text-[0.75rem] tabular-nums ${x.badge ? "font-semibold text-acc" : "text-mut"}`}>{x.time}</time>}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={`min-w-0 flex-1 text-[0.8125rem] leading-snug ${x.wrap ? "whitespace-pre-line break-words" : "truncate"} ${x.subTone || "text-mut"}`}>{x.sub}</span>
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
  return <li>{onHide ? <SwipeRow actions={[{ label: hideLabel, icon: "x", tone: "neutral", onAction: () => onHide(x.id) }]}>{body}</SwipeRow> : body}</li>;
}

function List({ rows, onHide, hideLabel }) {
  return (
    <ul className={`overflow-hidden ${CARD}`}>
      {rows.map((x, i) => (
        <Row key={x.id} x={x} first={!i} onHide={onHide} hideLabel={hideLabel} />
      ))}
    </ul>
  );
}

// Başlıktaki zil: sayı = görülmemiş bildirimler; dokununca pencere (açılınca sayı düşer)
export function InboxBell({ inbox, onOpen }) {
  const n = inbox.count;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={n ? `Senin için, ${n} yeni` : "Senin için"}
      data-press className="btn btn-round size-10 relative mt-0.5 shrink-0 text-fg"
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

// Pencere: yapılacakların hepsi, altında son bildirimler (okunanlar soluk; sola kaydır › Sil, ya da Tümünü temizle)
export function InboxSheet({ inbox, open, onClose }) {
  const { actions, history, hide, clearAll } = inbox;
  const go = (x) => (x.stay ? x : { ...x, onOpen: () => (onClose(), x.onOpen()) });
  return (
    <Sheet open={open} onClose={onClose} title="Senin için">
      <div className="space-y-5">
        {!actions.length && !history.length && <p className="px-1 py-6 text-center text-[0.875rem] text-mut">Yeni bir şey yok.</p>}
        {actions.length > 0 && (
          <section aria-label="Yapılacaklar">
            <SectionHead title="Yapılacaklar" count={actions.length} />
            <List rows={actions.map(go)} onHide={hide} />
          </section>
        )}
        {history.length > 0 && (
          <section aria-label="Bildirimler">
            <SectionHead title="Bildirimler">
              <button type="button" onClick={clearAll} className="font-semibold text-acc">
                Tümünü temizle
              </button>
            </SectionHead>
            <List rows={history.map(go)} onHide={hide} hideLabel="Sil" />
          </section>
        )}
      </div>
    </Sheet>
  );
}
