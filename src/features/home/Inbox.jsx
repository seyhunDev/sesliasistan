"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, runTransaction, updateDoc } from "firebase/firestore";
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
  const [gone, setGone] = useState(() => new Set()); // bu ziyarette kaydırılıp silinen bildirimler (sunucu yazana kadar gizli)
  const [wide, setWide] = useState(""); // gidilecek yeri olmayan, tam metni açılan bildirim
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
  const kept = inbox.filter((x) => !gone.has(`n:${x.id || `${x.tag}-${x.at}`}`));
  const fresh = since === null ? [] : kept.filter((x) => isUnread(x, since)).map(note);
  const list = [...actions, ...fresh];
  // Bildirim satırı: listeden kalıcı silinir (users/{uid}.inbox); yapılacak satırı: bu cihazda gizlenir (ForYou)
  const hide = (id) => {
    if (!id.startsWith("n:")) return hideTodo(id);
    setGone((g) => new Set(g).add(id));
    const x = inbox.find((y) => `n:${y.id || `${y.tag}-${y.at}`}` === id);
    if (x?.id) clearInbox(uid, [x.id]).catch(() => {});
  };
  const clearAll = () => {
    setGone(new Set(inbox.map((x) => `n:${x.id || `${x.tag}-${x.at}`}`)));
    return clearInbox(uid).catch(() => {});
  };
  return { list, actions, history: kept.map(note), hide, clearAll };
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
            <b className={`min-w-0 flex-1 truncate text-[0.9375rem] leading-snug ${x.old ? "font-normal text-mut" : "font-semibold"}`}>{x.title}</b>
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
            <SectionHead title="YAPILACAKLAR" count={actions.length} />
            <List rows={actions.map(go)} onHide={hide} />
          </section>
        )}
        {history.length > 0 && (
          <section aria-label="Bildirimler">
            <SectionHead title="BİLDİRİMLER">
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
