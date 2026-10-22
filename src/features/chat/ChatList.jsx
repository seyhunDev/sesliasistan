"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useNow } from "@/hooks/useNow";
import { toMs, useChat } from "./ChatProvider";
import { Avatar, Ticks, isOnline, listTime } from "./bits";
import { NewChatSheet } from "./NewChatSheet";
import { prefetchChat } from "./ChatView";
import { GROUPS, GROUP_IDS } from "@/lib/kinds";
import { cardGroups, listed } from "@/lib/chatList";

const TYPING_MS = 6000;
// Arama: büyük/küçük harf ve ı/i, ş, ğ… farkı yok sayılır
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");

// Mesajlar: popüler mesajlaşma uygulamaları gibi tek liste. Kişi sohbetleri, gruplar ve Ekip
// son mesaja göre sıralı; okunmamışlar kalın ve sayılı. Üstte kişiler (çevrimiçi noktasıyla): dokununca birebir sohbet.
export function ChatList() {
  const router = useRouter();
  const { chats, people, personName, uid, denied, orgId, ready, groupIds, chatRef, chatCounts, resetChats } = useChat();
  const toast = useToast();
  const owner = !!orgId && orgId === uid;
  const [showArch, setShowArch] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread | groups
  const [q, setQ] = useState("");
  const [find, setFind] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const now = useNow(3000).getTime();
  // Önceden okuma: parmak sohbete değince başlar (dokunuşla açılış arasında kazanılan süre); okunmamış ve en son
  // sohbetler liste açılınca arka planda hazırlanır. Böylece sohbet açılınca mesajlar beklemeden görünür.
  const warm = (cid) => prefetchChat(chatRef(cid), cid);
  const warmKey = chats
    .filter((c) => c.last)
    .slice()
    .sort((a, b) => (b.unread > 0) - (a.unread > 0) || toMs(b.last?.at) - toMs(a.last?.at))
    .slice(0, 5)
    .map((c) => c.id)
    .join(",");
  useEffect(() => {
    if (!ready || !warmKey) return;
    const t = setTimeout(() => warmKey.split(",").forEach((cid) => prefetchChat(chatRef(cid), cid)), 400);
    return () => clearTimeout(t);
  }, [ready, warmKey, chatRef]);
  const chatRows = chats.map((c) => {
    const typers = Object.entries(c.typing || {})
      .filter(([u, t]) => u !== uid && now - toMs(t) < TYPING_MS)
      .map(([u]) => personName(u).split(" ")[0]);
    const other = c.other ? people.find((p) => p.uid === c.other) : null;
    return {
      key: c.id,
      kind: "chat",
      c,
      title: c.title,
      at: toMs(c.last?.at),
      unread: c.unread,
      group: c.type !== "dm",
      open: () => router.push(`/messages?c=${c.id}`),
      avatar: <Avatar name={c.title} photo={c.type === "dm" ? other?.photo : undefined} icon={GROUPS[c.id]?.icon || (c.type === "group" ? "chat" : null)} online={isOnline(other)} size="size-[3.25rem]" tone={GROUPS[c.id] ? "bg-deep text-white" : undefined} />,
      preview: typers.length ? (
        <span className="font-medium text-acc">{c.type === "dm" ? "yazıyor…" : `${typers.join(", ")} yazıyor…`}</span>
      ) : c.last ? (
        <>
          {c.last.by === uid && (
            <span className="mr-1 inline-flex align-[-2px] text-mut">
              <Ticks read={(c.members || []).filter((m) => m !== uid).every((m) => (c.read?.[m] || 0) >= c.seq)} readTone="text-sky-600" />
            </span>
          )}
          {c.last.by === uid ? "" : c.type !== "dm" ? <b className="font-semibold">{personName(c.last.by).split(" ")[0]}: </b> : null}
          {c.last.deleted ? <span className="pr-1 text-mut">Mesaj silindi</span> : c.last.text}
        </>
      ) : (
        <span className="text-mut">{GROUPS[c.id] ? "Gruptaki herkes · ilk mesajı yaz" : "Henüz mesaj yok"}</span>
      ),
      muted: c.mutedByMe,
    };
  });

  const needle = fold(q.trim());
  // Sabit gruplar (Ekip, Aile, Sporcular): mesajı olan grup diğer sohbetlerle birlikte listede (son mesaja göre);
  // henüz mesajı olmayan grup Tümü'nde üstte kısa yol kartı. Böylece her sohbet tek yerde görünür
  // (Seyhun, 2026-10-21: Sporcular'a yazmaya başladım, liste hâlâ "Henüz sohbet yok" diyordu).
  const cards = !needle && filter === "all";
  const cardIds = cards ? cardGroups(groupIds, chats) : [];
  // Plan/görev/not konuşmaları burada gösterilmez: kendi kayıtlarında ve ana sayfadaki "Senin için"de
  const rows = chatRows
    .filter((x) => listed(x.c, GROUP_IDS))
    .filter((x) => !x.c.archivedByMe || needle)
    .filter((x) => (filter === "unread" ? x.unread > 0 : filter === "groups" ? x.group : true))
    .filter((x) => !needle || fold(x.title).includes(needle))
    .sort((a, b) => b.at - a.at);
  const unreadCount = chatRows.filter((x) => x.unread > 0 && !x.c.archivedByMe).length;
  const chatCount = chatRows.filter((x) => !x.c.archivedByMe).length; // başlığın alt satırı (okunmamış sayısı süzgeçte durur)
  // Arşivlenen sohbetler (yalnız benim listemden kalkar): listenin altında, dokununca açılır
  const archRows = needle ? [] : chatRows.filter((x) => x.c.archivedByMe).sort((a, b) => b.at - a.at);

  // Ana hesap: tüm mesajları herkes için sıfırla; önce kaç sohbet ve mesaj silineceği sorulur
  const reset = async () => {
    setResetting(true);
    const n = await chatCounts();
    setResetting(false);
    if (n.error) return toast(n.error);
    if (!n.chats) return toast("Silinecek mesaj yok");
    if (!window.confirm(`${n.chats} sohbet, ${n.messages} mesaj ve tüm ekler herkes için kalıcı silinecek. Geri alınamaz. Mesajlar sıfırlansın mı?`)) return;
    setResetting(true);
    const ok = await resetChats();
    setResetting(false);
    toast(ok ? "Mesajlar sıfırlandı" : "Sıfırlanamadı");
  };

  const row = (x) => (
    <li key={x.key}>
      <button type="button" onPointerDown={() => x.c && warm(x.c.id)} onClick={x.open} data-press="row" className="flex w-full items-center gap-3.5 px-5 text-left transition">
        <span className="py-2.5">{x.avatar}</span>
        <span className="min-w-0 flex-1 self-stretch border-b border-line/80 py-3">
          <span className="flex items-baseline gap-2">
            <b className={`min-w-0 flex-1 truncate text-[1rem] leading-snug ${x.unread ? "font-bold" : "font-semibold"}`}>{x.title}</b>
            <time className={`shrink-0 text-[0.75rem] tabular-nums ${x.unread ? "font-semibold text-acc" : "text-mut"}`}>{x.at ? listTime(x.at) : ""}</time>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className={`line-clamp-1 min-w-0 flex-1 text-[0.875rem] leading-snug ${x.unread ? "text-fg" : "text-mut"}`}>{x.preview}</span>
            {x.muted && <Icon name="mute" className="size-4 shrink-0 text-mut" />}
            {x.unread > 0 && (
              <span className={`grid h-[1.375rem] min-w-[1.375rem] shrink-0 place-items-center rounded-full px-1.5 text-[0.75rem] font-bold tabular-nums text-white ${x.muted ? "bg-mut" : "bg-acc"}`}>
                {x.unread > 99 ? "99+" : x.unread}
              </span>
            )}
          </span>
          {x.sub && <small className="mt-0.5 block truncate text-[0.75rem] text-mut">{x.sub}</small>}
        </span>
      </button>
    </li>
  );

  return (
    // min-h-lvh: liste kısa olsa da sayfa en az ekran boyu; Safari alt çubuğu küçülmüş kalır, alt menü yerinden oynamaz
    <main className="mx-auto min-h-lvh max-w-[30rem] pb-[calc(8rem+env(safe-area-inset-bottom))]">
      {/* Başlık: diğer sayfalardaki PageHeader ile aynı (geri, başlık + kısa alt satır, sağda yeni sohbet); altında arama ve süzgeç */}
      <header className="sticky top-0 z-10 bg-bg/90 px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-2.5">
          <BackButton href="/" className="-my-0.5 touch-manipulation" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.375rem] font-semibold leading-tight tracking-tight">Mesajlar</h1>
            <p className="truncate text-[0.8125rem] text-mut">{chatCount ? `${chatCount} sohbet` : "Henüz sohbet yok"}</p>
          </div>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            aria-label="Yeni sohbet"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90"
          >
            <Icon name="edit" className="size-[1.125rem]" />
          </button>
        </div>
        {find ? (
          <label className="mt-2.5 flex h-10 items-center gap-2.5 rounded-xl bg-line/60 px-3.5">
            <Icon name="search" className="size-[1.125rem] text-mut" />
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Ara" autoFocus className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-mut" />
            <button type="button" onClick={() => (setQ(""), setFind(false))} aria-label="Aramayı kapat" data-press className="btn btn-icon btn-sm size-8 -mr-1.5 text-mut">
              <Icon name="x" className="size-4" />
            </button>
          </label>
        ) : (
          <div className="mt-2.5 flex items-center gap-1.5">
            <button type="button" onClick={() => setFind(true)} aria-label="Ara" className="grid h-9 w-10 shrink-0 place-items-center rounded-xl bg-line/60 text-mut">
              <Icon name="search" className="size-[1.125rem]" />
            </button>
            <div className="flex min-w-0 flex-1 rounded-xl bg-line/60 p-[3px]">
              {[
                ["all", "Tümü"],
                ["unread", "Okunmamış", unreadCount],
                ["groups", "Gruplar"],
              ].map(([k, label, n]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  aria-pressed={filter === k}
                  className={`flex h-[1.875rem] min-w-0 flex-1 items-center justify-center gap-1 rounded-[0.5625rem] text-[0.8125rem] font-semibold transition ${
                    filter === k ? "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.14)]" : "text-mut"
                  }`}
                >
                  <span className="truncate">{label}</span>
                  {n > 0 && <span className="tabular-nums text-acc">{n}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {denied && (
        <div className="mx-5 mb-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] leading-snug text-amber-900 ring-1 ring-amber-200">
          <b className="block font-semibold">Mesajlaşma henüz açılmadı</b>
          {orgId === uid
            ? "Firebase kuralları güncel değil. Terminalde firebase deploy --only firestore:rules çalıştır ya da Console › Firestore › Rules'dan yayınla."
            : "Ana hesabın Firebase kurallarını güncellemesi gerekiyor. Güncellenince kişiler ve sohbetler burada görünür."}
        </div>
      )}

      {/* Sabit gruplar (Ekip, Aile, Sporcular): türüne uyan herkes otomatik üye; kişiye kalemle ya da aramayla yazılır */}
      {cardIds.length > 0 && (
        <div className={`grid gap-2 px-5 pb-1 pt-1.5 ${cardIds.length >= 3 ? "grid-cols-3" : cardIds.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {cardIds.map((g) => {
            const c = chats.find((x) => x.id === g);
            const at = toMs(c?.last?.at);
            return (
              <button key={g} type="button" onPointerDown={() => c && !c._ghost && warm(g)} onClick={() => router.push(`/messages?c=${g}`)} className="relative flex min-w-0 items-center gap-2 rounded-2xl bg-card p-2.5 text-left shadow-[0_1px_2px_rgba(38,40,44,.06)]">
                <Avatar icon={GROUPS[g].icon} size="size-[2.125rem]" tone="bg-deep text-white" />
                <span className="min-w-0">
                  <b className="block truncate text-[0.8125rem] font-semibold leading-tight">{GROUPS[g].name}</b>
                  <small className={`block truncate text-[0.6875rem] ${c?.unread ? "font-semibold text-acc" : "text-mut"}`}>{at ? listTime(at) : "Yaz"}</small>
                </span>
                {c?.unread > 0 && !c.mutedByMe && (
                  <span className="absolute -right-1 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rec px-1 text-[0.6875rem] font-bold tabular-nums text-white ring-2 ring-bg">{c.unread > 99 ? "99+" : c.unread}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {cardIds.length > 0 && rows.length > 0 && <p className="px-5 pb-1 pt-3.5 text-[0.6875rem] font-bold tracking-[0.06em] text-mut">SOHBETLER</p>}

      {rows.length ? (
        <ul className="mt-1">{rows.map(row)}</ul>
      ) : !ready ? (
        <ul className="mt-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3.5 px-5 py-2.5">
              <span className="size-[3.25rem] shrink-0 animate-pulse rounded-full bg-line/70" />
              <span className="flex-1 space-y-2">
                <span className="block h-3.5 w-2/5 animate-pulse rounded-full bg-line/70" />
                <span className="block h-3 w-3/4 animate-pulse rounded-full bg-line/50" />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-5 mt-10 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
            <Icon name="chat" className="size-7" />
          </span>
          <p className="mt-3 max-w-[16rem] text-[0.9375rem] leading-snug text-mut">
            {q ? `“${q}” bulunamadı.` : filter === "unread" ? "Okunmamış mesaj yok." : "Henüz sohbet yok. Kalemle yeni sohbet başlat."}
          </p>
        </div>
      )}

      {archRows.length > 0 && (
        <>
          <button type="button" onClick={() => setShowArch((v) => !v)} aria-expanded={showArch} data-press className="btn btn-text btn-sm w-full text-mut">
            <span>Arşiv · {archRows.length}</span>
            <span className="text-acc">{showArch ? "Gizle" : "Göster"}</span>
          </button>
          {showArch && <ul>{archRows.map(row)}</ul>}
        </>
      )}

      {owner && ready && !denied && (
        <div className="px-5 pt-10">
          <button type="button" disabled={resetting} onClick={reset} data-press className="btn btn-danger w-full">
            {resetting ? "Bekle…" : "Mesajları sıfırla"}
          </button>
        </div>
      )}

      <NewChatSheet open={newOpen} onClose={() => setNewOpen(false)} />
    </main>
  );
}
