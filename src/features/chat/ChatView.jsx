"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, getDocsFromCache, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { ConvoComposer } from "@/features/assistant/ConvoComposer";
import { sendErrorText, toMs, useChat } from "./ChatProvider";
import { Avatar, Ticks, dayText, hm, isOnline, sameDay, seenText } from "./bits";
import { ChatInfoSheet } from "./ChatInfoSheet";
import { GROUPS, kindOf } from "@/lib/kinds";
import { authFetch } from "@/lib/authFetch";

const PAGE = 50;
const EDIT_MS = 15 * 60e3; // kendi mesajını düzenleme süresi (kural da aynı)
const ACT = "flex w-full items-center gap-3 px-4 py-3.5 text-left text-[0.9375rem] font-medium active:bg-card";
const TYPING_MS = 6000;
const EMOJI = ["👍", "❤️", "😂", "😮", "🙏", "✅"];
const NAME_TONES = ["text-[#2c5163]", "text-[#8a4f0c]", "text-[#2f6446]", "text-[#8e3a34]", "text-[#553f86]", "text-[#2c6262]"];
// Hazır yanıt önerileri: son mesaj başkasındansa yapay zeka 3 kısa yanıt önerir (mesaj başına bir kez; oturum boyunca saklanır)
const SUGG = new Map();
async function fetchReplies(key, body) {
  if (SUGG.has(key)) return SUGG.get(key);
  SUGG.set(key, []); // aynı mesaj için ikinci istek gitmesin
  try {
    const res = await authFetch("/api/replies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const list = res.ok ? ((await res.json()).replies || []).slice(0, 3) : [];
    SUGG.set(key, list);
    return list;
  } catch {
    return [];
  }
}

// Son açılan sohbetlerin mesajları bellekte: aynı sohbete dönünce mesajlar beklemeden görünür, yenileri arkadan gelir.
// prefetchChat: listede sohbete parmak değince (ya da okunmamışlar için arka planda) mesajlar önceden okunur.
const MSGS = new Map();
const MAX_CACHED = 30;
const toList = (s) => s.docs.map((d) => ({ ...d.data({ serverTimestamps: "estimate" }), id: d.id, pending: d.metadata.hasPendingWrites })).reverse();
const keep = (cid, list) => {
  MSGS.delete(cid);
  MSGS.set(cid, list);
  if (MSGS.size > MAX_CACHED) MSGS.delete(MSGS.keys().next().value);
};
const lastQ = (cref, n = PAGE) => query(collection(cref, "messages"), orderBy("at", "desc"), limit(n));
const busy = new Set();
export async function prefetchChat(cref, cid) {
  if (!cref || MSGS.has(cid) || busy.has(cid)) return;
  busy.add(cid);
  try {
    const c = await getDocsFromCache(lastQ(cref)).catch(() => null);
    if (c && !c.empty && !MSGS.has(cid)) keep(cid, toList(c));
    const s = await getDocs(lastQ(cref));
    keep(cid, toList(s));
  } catch {
    /* çevrimdışı ya da izin yok: sohbet açılınca kendisi okur */
  } finally {
    busy.delete(cid);
  }
}

const toneOf = (uid = "") => NAME_TONES[[...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % NAME_TONES.length];

// Tek sohbet: üstte kişi/grup ve durum (çevrimiçi, yazıyor…), ortada mesajlar, altta sabit yazma alanı.
// Mesaja dokun: tepki (👍 ❤️ …), Yanıtla, Kopyala, Sil (kendi mesajın). Okundu: çift mavi tik.
export function ChatView({ cid }) {
  const router = useRouter();
  const toast = useToast();
  const { chats, allPeople, people, personName, uid, orgId, chatRef, send, markRead, setTyping, react, remove, edit, pin, ready } = useChat();
  const { setViewing } = useData();
  const now = useNow(2000);

  // Sohbet: listede yoksa (henüz mesajlaşılmamış birebir sohbet) boş olarak açılır; ilk mesajla oluşur
  const found = chats.find((c) => c.id === cid);
  const dmMembers = cid.startsWith("dm_") ? cid.slice(3).split("_") : null;
  const chat =
    found ||
    (dmMembers && dmMembers.includes(uid)
      ? { id: cid, type: "dm", members: dmMembers, other: dmMembers.find((m) => m !== uid), title: personName(dmMembers.find((m) => m !== uid)), seq: 0, _ghost: true }
      : null);
  const exists = !!chat && !chat._ghost;
  // Sabit grup: ana hesap + türü gruba uyan (ayrılmamış) kişiler
  const members = GROUPS[cid] ? allPeople.filter((p) => !p.left && (p.role === "owner" || GROUPS[cid].has(kindOf(p)))).map((p) => p.uid) : chat?.members || [];
  const others = members.filter((m) => m !== uid);
  const otherP = chat?.type === "dm" ? allPeople.find((p) => p.uid === chat.other) : null;

  const [raw, setRaw] = useState(() => MSGS.get(cid) || null); // null: henüz okunmadı (boş sohbetle karışmasın)
  const msgs = raw || [];
  const [cached] = useState(() => MSGS.has(cid)); // bellekten geldiyse belirme animasyonu yok
  const [lim, setLim] = useState(PAGE);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null); // düzenlenen mesaj (yazı kutuda)
  const [attach, setAttach] = useState(false); // ek menüsü (fotoğraf, dosya, sesli mesaj: yakında)
  const [act, setAct] = useState(null); // dokunulan mesaj (işlem menüsü)
  const [info, setInfo] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const box = useRef(null);
  const input = useRef(null);
  const readAt = useRef(null); // açılıştaki "okuduğum son mesaj" numarası
  const [divider, setDivider] = useState(null); // "Okunmamış mesajlar" çizgisinin üstünde durduğu mesaj (açılışta bir kez)

  // iPhone: klavye kapansa da sayfa yukarı kaymış kalabilir; sohbetten çıkarken sıfırla (alt menü yerinde dursun)
  useEffect(() => () => window.scrollTo(0, 0), []);

  // Mesajlar (son 50; yukarı kaydırıp "Önceki mesajlar" ile daha fazlası)
  useEffect(() => {
    if (!exists || !orgId) return;
    return onSnapshot(
      lastQ(chatRef(cid), lim),
      { includeMetadataChanges: true },
      (s) => {
        const list = toList(s);
        // Önbellekte hiç yoksa sunucuyu bekle (önce boş, sonra dolu görünmesin)
        if (s.empty && s.metadata.fromCache && !MSGS.has(cid)) return;
        keep(cid, list);
        setRaw(list);
        setDivider((v) => (v !== null ? v : list.find((m) => m.by !== uid && (m.n || 0) > (readAt.current ?? Infinity))?.id || ""));
      },
      (e) => console.warn("[chat] mesajlar okunamadı:", e.code),
    );
  }, [exists, orgId, cid, lim, chatRef, uid]);

  // Ekrandayken okundu say; sunucuya "bu sohbetteyim" (bu sohbetin mesajı için telefona bildirim gelmez)
  useEffect(() => {
    if (!exists) return;
    if (readAt.current === null) readAt.current = chat.read?.[uid] || 0;
    if (document.visibilityState === "visible") markRead(chat);
  }, [exists, chat?.seq, markRead]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const key = `chat-${cid}`;
    const beat = () => {
      setViewing(document.visibilityState === "visible" ? key : null);
      if (document.visibilityState === "visible" && chat) markRead(chat);
    };
    beat();
    const t = setInterval(() => document.visibilityState === "visible" && setViewing(key), 30e3);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
      setViewing(null);
    };
  }, [cid, setViewing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alta kaydırma: açılışta en alt; yeni mesajda kullanıcı alttaysa ya da mesaj benimse kayar, değilse "↓ yeni" düğmesi
  const count = useRef(-1);
  const lastBy = msgs.at(-1)?.by;
  // İlk konumlama ekrana çizilmeden önce yapılır (useLayoutEffect): sayfa önce üstte görünüp alta zıplamaz.
  useLayoutEffect(() => {
    const el = document.scrollingElement;
    if (!el || !msgs.length) return;
    const first = count.current < 0;
    const grew = msgs.length > count.current && !first;
    count.current = msgs.length;
    const near = el.scrollHeight - window.scrollY - window.innerHeight < 200;
    if (first) window.scrollTo(0, el.scrollHeight);
    if (first || (grew && (near || lastBy === uid))) {
      if (!first) requestAnimationFrame(() => window.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
      setNewBelow(0);
    } else if (grew) setNewBelow((n) => n + 1);
  }, [msgs.length, lastBy, uid]);
  const startReply = (m) => {
    setEditing(null);
    setReplyTo(m);
    setTimeout(() => input.current?.focus(), 50);
  };
  const startEdit = (m) => {
    setReplyTo(null);
    setEditing(m);
    setText(m.text);
    setTimeout(() => input.current?.focus(), 50);
  };
  const cancelEdit = () => {
    setEditing(null);
    setText("");
  };
  // Sabitlenen mesaja git (yüklü değilse önceki mesajları açar)
  const goPinned = () => {
    const el = box.current?.querySelector(`[data-mid="${chat?.pinned?.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.animate?.([{ opacity: 0.4 }, { opacity: 1 }], { duration: 700 });
    } else setLim((n) => n + PAGE);
  };
  const toBottom = () => {
    window.scrollTo({ top: document.scrollingElement.scrollHeight, behavior: "smooth" });
    setNewBelow(0);
  };

  // Ana asistan bu sohbeti bilir: özetler, mesajlardan kayıt çıkarır; alıcı söylenmezse buraya yazar
  const focusTo = GROUPS[cid]?.name || (chat?.type === "dm" ? personName(chat.other) : "");
  const focus = chat && {
    title: chat.title,
    to: focusTo,
    text: [
      `Sohbet: ${chat.title} (${chat.type === "dm" ? "birebir" : "grup"})`,
      `Varsayılan alıcı: ${focusTo || "yok (bu gruba asistan yazamaz; kişiyi ya da grubu sor)"}`,
      "Son mesajlar (eskiden yeniye):",
      ...msgs.slice(-15).filter((m) => !m.deleted && m.text).map((m) => `${m.by === uid ? "Ben" : personName(m.by)}: ${String(m.text).slice(0, 300)}`),
    ].join("\n"),
  };

  // Son mesaj başkasındansa hazır yanıtlar; dokununca kutuya yazılır, istersen düzeltip gönderirsin
  const last = msgs.at(-1);
  const suggKey = last && last.by !== uid && !last.deleted && last.text && !last.pending ? `${cid}/${last.id}` : "";
  const [sugg, setSugg] = useState({ key: "", list: [] });
  useEffect(() => {
    if (!suggKey) return;
    let live = true;
    const body = {
      messages: msgs.slice(-8).filter((m) => !m.deleted && m.text).map((m) => ({ me: m.by === uid, name: personName(m.by).split(" ")[0], text: m.text })),
      name: personName(uid).split(" ")[0],
      group: GROUPS[cid]?.name || (chat?.type === "dm" ? "" : chat?.name || "grup"),
    };
    fetchReplies(suggKey, body).then((list) => live && setSugg({ key: suggKey, list }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggKey]);
  const replies = sugg.key === suggKey && !text && !editing ? sugg.list : [];

  async function submit() {
    const t = text.trim();
    if (!t || !chat) return;
    if (editing) {
      const m = editing;
      setEditing(null);
      setText("");
      if (!(await edit(chat, m, t))) {
        setText(t);
        setEditing(m);
        toast("Düzenlenemedi (mesajlar 15 dakika içinde düzenlenebilir)");
      }
      return;
    }
    setText("");
    const r = replyTo;
    setReplyTo(null);
    const ok = await send(cid, t, {
      replyTo: r ? { id: r.id, by: r.by, text: r.text } : null,
      create: chat.type === "dm" ? { type: "dm", members: [...chat.members].sort() } : { type: "team" },
    });
    if (!ok) {
      setText(t);
      toast(sendErrorText());
    }
    input.current?.focus();
  }

  const typers = Object.entries(chat?.typing || {})
    .filter(([u, t]) => u !== uid && now.getTime() - toMs(t) < TYPING_MS)
    .map(([u]) => personName(u).split(" ")[0]);
  const sub = typers.length
    ? chat.type === "dm"
      ? "yazıyor…"
      : `${typers.join(", ")} yazıyor…`
    : chat?.type === "dm"
      ? seenText(otherP?.lastSeen)
      : GROUPS[cid]
        ? `${members.length} kişi`
        : members.map((m) => personName(m).split(" ")[0]).join(", ");
  const readAll = (m) => others.length > 0 && others.every((o) => (chat?.read?.[o] || 0) >= (m.n || 0));
  const firstUnread = divider ? msgs.findIndex((m) => m.id === divider) : -1;

  // Sohbet listesi henüz gelmediyse "bulunamadı" değil, yükleniyor
  if (!chat && !ready)
    return (
      <main className="mx-auto grid min-h-dvh max-w-[30rem] place-items-center">
        <Loader className="text-mut" />
      </main>
    );
  if (!chat)
    return (
      <main className="mx-auto grid min-h-dvh max-w-[30rem] place-items-center px-6 text-center">
        <div>
          <p className="text-[0.9375rem] text-mut">Bu sohbet bulunamadı ya da artık üyesi değilsin.</p>
          <button type="button" onClick={() => router.replace("/messages")} className="mt-4 h-11 rounded-xl bg-acc px-5 text-[0.9375rem] font-semibold text-white">
            Mesajlara dön
          </button>
        </div>
      </main>
    );

  return (
    // Sayfanın kendisi kayar (iç kutu değil): iPhone Safari alt çubuğu küçültür, yazma alanı ekranın altına oturur.
    // Başlık üstte, yazma alanı altta yapışık (sticky); sayfa en az ekran boyu.
    <main className="bg-bg">
      <div className="mx-auto flex min-h-lvh w-full max-w-[30rem] flex-col">
        {/* Üst: geri, fotoğraf + ad (yalnızca yazarken altında "yazıyor…"), ayarlar */}
        <header className="sticky top-0 z-10 flex shrink-0 items-center gap-1.5 border-b border-line bg-bg px-1.5 pb-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))]">
          <button type="button" onClick={() => router.push("/messages")} aria-label="Mesajlar" className="grid size-10 shrink-0 place-items-center rounded-full active:bg-line">
            <Icon name="back" className="size-5" />
          </button>
          <button type="button" onClick={() => setInfo(true)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Avatar name={chat.title} icon={GROUPS[cid]?.icon || (chat.type === "group" ? "chat" : null)} online={isOnline(otherP)} size="size-9" text="text-[0.8125rem]" tone={GROUPS[cid] ? "bg-[#2c5163] text-white" : undefined} />
            <span className="min-w-0">
              <b className="flex items-center gap-1.5 truncate text-[1rem] font-semibold leading-tight">
                <span className="truncate">{chat.title}</span>
                {chat.mutedByMe && <Icon name="mute" className="size-3.5 shrink-0 text-mut" />}
              </b>
              {typers.length > 0 && <small className="block truncate text-[0.75rem] font-medium leading-tight text-acc">{sub}</small>}
            </span>
          </button>
          <button type="button" onClick={() => setInfo(true)} aria-label="Sohbet ayarları" className="grid size-10 shrink-0 place-items-center rounded-full text-mut active:bg-line">
            <Icon name="sliders" className="size-5" />
          </button>
        </header>

        {/* Sabitlenen mesaj */}
        {chat.pinned && (
          <div className="flex shrink-0 items-center gap-2 border-b border-line bg-card/80 px-3 py-1.5">
            <button type="button" onClick={goPinned} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <Icon name="pushpin" className="size-4 shrink-0 text-acc" />
              <span className="min-w-0">
                <b className="block text-[0.6875rem] font-semibold text-acc">Sabitlenen mesaj</b>
                <span className="block truncate text-[0.8125rem]">{chat.pinned.text}</span>
              </span>
            </button>
            <button type="button" onClick={() => pin(cid, null)} aria-label="Sabitlemeyi kaldır" className="grid size-8 shrink-0 place-items-center rounded-full text-mut active:bg-bg">
              <Icon name="x" className="size-4" />
            </button>
          </div>
        )}

        {/* Mesajlar */}
        <div ref={box} className={`relative flex-1 px-3.5 pb-4 pt-2 ${raw && !cached ? "msgs-in" : ""}`}>
          {msgs.length >= lim && (
            <button type="button" onClick={() => setLim((n) => n + PAGE)} className="mx-auto mb-2 block rounded-full bg-card px-3 py-1.5 text-[0.75rem] font-semibold text-acc shadow-sm">
              Önceki mesajlar
            </button>
          )}
          {exists && !raw && <MsgSkeleton />}
          {(!exists || raw) && !msgs.length && (
            <div className="mx-auto mt-10 max-w-[18rem] rounded-2xl bg-card px-4 py-3 text-center text-[0.8125rem] leading-snug text-mut shadow-sm">
              <Icon name="chat" className="mx-auto mb-1.5 size-5 text-acc" />
              {chat.type === "dm" ? `${chat.title} ile mesajlaşmaya başla.` : GROUPS[cid] ? `${GROUPS[cid].name} grubu: yazdığını gruptaki herkes görür.` : "Grup sohbeti: yazdığını gruptaki herkes görür."}
              <br />
              Mesajları yalnızca bu sohbetteki kişiler görebilir.
            </div>
          )}
          {msgs.map((m, i) => {
            const mine = m.by === uid;
            const prev = msgs[i - 1];
            const next = msgs[i + 1];
            const near = (a, b) => a && b && a.by === b.by && sameDay(a.at, b.at) && Math.abs(toMs(b.at) - toMs(a.at)) < 5 * 60e3;
            const head = !near(prev, m) || i === firstUnread;
            const tail = !near(m, next) || i + 1 === firstUnread;
            const reacts = Object.entries(m.reactions || {}).reduce((a, [u, e]) => ({ ...a, [e]: [...(a[e] || []), u] }), {});
            const showName = !mine && chat.type !== "dm" && head;
            const meta = (
              <>
                {m.editedAt && !m.deleted && <span className="mr-0.5 italic">düzenlendi</span>}
                {chat.pinned?.id === m.id && <Icon name="pushpin" className="size-3" />}
                {hm(m.at)}
                {mine && !m.deleted && <Ticks read={readAll(m)} pending={m.pending} />}
              </>
            );
            return (
              <div key={m.id} data-mid={m.id}>
                {(!prev || !sameDay(prev.at, m.at)) && (
                  <p className="my-3 text-center">
                    <span className="rounded-full bg-card/90 px-3.5 py-1 text-[0.75rem] font-semibold text-mut shadow-[0_1px_2px_rgba(38,40,44,.08)]">{dayText(m.at)}</span>
                  </p>
                )}
                {i === firstUnread && (
                  <p className="my-3 flex items-center gap-2 text-[0.6875rem] font-semibold text-acc">
                    <span className="h-px flex-1 bg-acc/30" /> Okunmamış mesajlar <span className="h-px flex-1 bg-acc/30" />
                  </p>
                )}
                <div className={`flex items-end gap-2 ${mine ? "justify-end" : ""} ${head ? "mt-3" : "mt-[3px]"}`}>
                  {!mine && chat.type !== "dm" && (
                    <span className={tail ? "" : "invisible"}>
                      <Avatar name={personName(m.by)} size="size-8" text="text-[0.75rem]" />
                    </span>
                  )}
                  <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                    <button
                      type="button"
                      onClick={() => !m.deleted && setAct(m)}
                      className={`relative min-w-[4.5rem] px-3 pb-2 pt-1.5 text-left text-[1rem] leading-[1.35] shadow-[0_1px_1.5px_rgba(38,40,44,.08)] transition active:scale-[.99] ${
                        mine ? `bg-[#2c5163] text-white ${tail ? "rounded-[1.25rem] rounded-br-md" : "rounded-[1.25rem]"}` : `bg-card text-fg ${tail ? "rounded-[1.25rem] rounded-bl-md" : "rounded-[1.25rem]"}`
                      }`}
                    >
                      {showName && <span className={`mb-0.5 block text-[0.8125rem] font-semibold ${toneOf(m.by)}`}>{personName(m.by)}</span>}
                      {m.replyTo && !m.deleted && (
                        <span className={`mb-1 block rounded-lg border-l-[3px] px-2 py-1 text-[0.8125rem] ${mine ? "border-white/70 bg-white/15" : "border-acc bg-bg"}`}>
                          <b className="block text-[0.75rem] font-semibold">{m.replyTo.by === uid ? "Sen" : personName(m.replyTo.by)}</b>
                          <span className="line-clamp-2 opacity-90">{m.replyTo.text}</span>
                        </span>
                      )}
                      {m.deleted ? (
                        <span className="flex items-center gap-1.5 italic opacity-70">
                          <Icon name="x" className="size-3.5" /> Bu mesaj silindi
                        </span>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{m.text}</span>
                      )}
{/* Saat sağ altta sabit; metnin son satırında onun kadar görünmez yer ayrılır (sığmazsa alt satıra geçer) */}
                      <span aria-hidden="true" className="invisible ml-2 inline-flex gap-1 text-[0.6875rem]">
                        {meta}
                      </span>
                      <span className={`absolute bottom-[0.3125rem] right-3 flex items-center gap-1 whitespace-nowrap text-[0.6875rem] leading-none tabular-nums ${mine ? "text-white/70" : "text-mut"}`}>
                        {meta}
                      </span>
                    </button>
                    {Object.keys(reacts).length > 0 && (
                      <span className={`-mt-1.5 flex gap-1 ${mine ? "mr-2" : "ml-2"}`}>
                        {Object.entries(reacts).map(([e, us]) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => react(cid, m, e)}
                            title={us.map((u) => personName(u)).join(", ")}
                            className={`flex h-6 items-center gap-0.5 rounded-full px-1.5 text-[0.75rem] shadow-sm ring-1 ${us.includes(uid) ? "bg-acc/10 ring-acc/40" : "bg-card ring-line"}`}
                          >
                            {e}
                            {us.length > 1 && <span className="text-[0.6875rem] font-semibold text-mut">{us.length}</span>}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {newBelow > 0 && (
          <button type="button" onClick={toBottom} className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-acc px-3.5 py-1.5 text-[0.75rem] font-semibold text-white shadow-lg">
            <Icon name="chev" className="size-3.5 rotate-90" /> {newBelow} yeni mesaj
          </button>
        )}

        {/* Yazma alanı (altta sabit) */}
        {/* Alt boşluk: adres çubuğu yokken (ana ekrandan açılan uygulama, çentikli iPhone) ev çizgisi payı kadar; fazlası alanı yukarı iter */}
        <footer className="sticky bottom-0 z-10 shrink-0 border-t border-line bg-bg px-2.5 pt-2 pb-[max(0.5rem,calc(env(safe-area-inset-bottom)-0.5rem))]">
          {editing && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
              <Icon name="edit" className="size-4 shrink-0 text-acc" />
              <span className="min-w-0 flex-1">
                <b className="block text-[0.75rem] font-semibold text-acc">Mesajı düzenle</b>
                <span className="block truncate text-[0.8125rem] text-mut">{editing.text}</span>
              </span>
              <button type="button" onClick={cancelEdit} aria-label="Düzenlemeyi bırak" className="grid size-8 place-items-center rounded-full text-mut active:bg-bg">
                <Icon name="x" className="size-4" />
              </button>
            </div>
          )}
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
              <span className="min-w-0 flex-1 border-l-[3px] border-acc pl-2">
                <b className="block text-[0.75rem] font-semibold text-acc">{replyTo.by === uid ? "Kendine yanıt" : `${personName(replyTo.by)} yanıtlanıyor`}</b>
                <span className="block truncate text-[0.8125rem] text-mut">{replyTo.text}</span>
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Yanıtı kaldır" className="grid size-8 place-items-center rounded-full text-mut active:bg-bg">
                <Icon name="x" className="size-4" />
              </button>
            </div>
          )}
          {replies.length > 0 && (
            <div className="fade-in -mx-2.5 mb-1.5 flex gap-1.5 overflow-x-auto px-2.5 py-1 [scrollbar-width:none]" aria-label="Hazır yanıtlar">
              {replies.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setText(r);
                    input.current?.focus();
                  }}
                  className="shrink-0 rounded-full bg-card px-3.5 py-2 text-[0.875rem] font-medium text-acc ring-1 ring-acc/25 transition active:scale-95"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <ConvoComposer
            value={text}
            setValue={setText}
            onSend={submit}
            inputRef={input}
            focus={focus}
            examples={["Bu sohbeti özetle", "Bundan görev çıkar", "Yarın 9'da iskelede olalım yaz"]}
            sendIcon={editing ? "check" : "up"}
            sendLabel={editing ? "Düzenlemeyi kaydet" : "Gönder"}
            leading={
              !editing && (
                <button type="button" onClick={() => setAttach(true)} aria-label="Ekle: fotoğraf, dosya, sesli mesaj" className="grid size-11 shrink-0 place-items-center rounded-full text-acc active:bg-card">
                  <Icon name="plus" className="size-6" />
                </button>
              )
            }
            inputProps={{
              onChange: (e) => {
                setText(e.target.value);
                if (exists) setTyping(cid, !!e.target.value);
              },
              onBlur: () => exists && setTyping(cid, false),
              onKeyDown: (e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  submit();
                }
              },
            }}
          />
        </footer>
      </div>

      {/* Mesaja dokununca: tepki + işlemler */}
      <Sheet open={!!act} onClose={() => setAct(null)} title="Mesaj">
        {act && (
          <div className="pb-2">
            <p className="line-clamp-3 rounded-xl bg-bg px-3 py-2 text-[0.875rem] text-mut">{act.text}</p>
            <div className="mt-3 flex justify-between">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    react(cid, act, e);
                    setAct(null);
                  }}
                  className={`grid size-12 place-items-center rounded-full text-[1.5rem] active:scale-90 ${act.reactions?.[uid] === e ? "bg-acc/15 ring-2 ring-acc/40" : "bg-bg"}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-bg">
              <li>
                <button type="button" onClick={() => (startReply(act), setAct(null))} className={ACT}>
                  <Icon name="chat" className="size-5" /> Yanıtla
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(act.text).then(() => toast("Kopyalandı")).catch(() => {});
                    setAct(null);
                  }}
                  className={ACT}
                >
                  <Icon name="note" className="size-5" /> Kopyala
                </button>
              </li>
              <li>
                <button type="button" onClick={() => (pin(cid, chat.pinned?.id === act.id ? null : act), setAct(null))} className={ACT}>
                  <Icon name="pushpin" className="size-5" /> {chat.pinned?.id === act.id ? "Sabitlemeyi kaldır" : "Sabitle"}
                </button>
              </li>
              {act.by === uid && now.getTime() - toMs(act.at) < EDIT_MS && (
                <li>
                  <button type="button" onClick={() => (startEdit(act), setAct(null))} className={ACT}>
                    <Icon name="edit" className="size-5" /> Düzenle
                  </button>
                </li>
              )}
              {act.by === uid && (
                <li>
                  <button type="button" onClick={() => (remove(cid, act), setAct(null))} className={`${ACT} text-rec`}>
                    <Icon name="trash" className="size-5" /> Herkesten sil
                  </button>
                </li>
              )}
            </ul>
            {act.by === uid && (
              <p className="mt-2 px-1 text-[0.75rem] text-mut">
                {others.length && readAll(act) ? "Görüldü" : "Henüz görülmedi"} · {hm(act.at)}
              </p>
            )}
          </div>
        )}
      </Sheet>

      {/* Ek: fotoğraf, kamera, dosya, sesli mesaj. Gönderim şimdilik kapalı (yakında) */}
      <Sheet open={attach} onClose={() => setAttach(false)} title="Gönder">
        <div className="grid grid-cols-4 gap-2 pb-2">
          {[
            ["image", "Fotoğraf"],
            ["camera", "Kamera"],
            ["paperclip", "Dosya"],
            ["mic", "Sesli mesaj"],
          ].map(([icon, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setAttach(false);
                toast(`${label} gönderme yakında açılacak`);
              }}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-2 active:bg-bg"
            >
              <span className="relative grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
                <Icon name={icon} className="size-6" />
              </span>
              <span className="text-[0.75rem] font-medium">{label}</span>
              <span className="-mt-1 rounded-full bg-line px-1.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-mut">yakında</span>
            </button>
          ))}
        </div>
        <p className="px-1 pb-2 text-[0.75rem] text-mut">Fotoğraf, dosya ve sesli mesaj gönderme hazırlanıyor. Şimdilik yazı gönderebilir, mikrofonla sesle yazdırabilirsin.</p>
      </Sheet>

      <ChatInfoSheet open={info} onClose={() => setInfo(false)} chat={chat} members={members} people={people} exists={exists} />
    </main>
  );
}

// Mesajlar okunurken: gelen/giden balon iskeletleri (boş sohbet kartı yanlışlıkla görünmesin)
function MsgSkeleton() {
  return (
    <div className="soft-in mt-auto space-y-2.5 pt-6" aria-hidden="true">
      {[["w-3/5", 0], ["w-2/5", 0], ["w-1/2", 1], ["w-2/3", 0], ["w-1/3", 1]].map(([w, mine], i) => (
        <div key={i} className={`flex ${mine ? "justify-end" : ""}`}>
          <span className={`block h-9 ${w} animate-pulse rounded-2xl ${mine ? "bg-acc/15" : "bg-card"}`} />
        </div>
      ))}
    </div>
  );
}
