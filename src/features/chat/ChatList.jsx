"use client";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { RowList, ListHead, SkelRow } from "@/components/ui/Row";
import { Empty } from "@/components/ui/Page";
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
  const confirmAsk = useConfirm();
  const router = useRouter();
  const { chats, people, personName, uid, denied, orgId, ready, groupIds, chatRef, chatCounts, resetChats } = useChat();
  const toast = useToast();
  const owner = !!orgId && orgId === uid;
  const [showArch, setShowArch] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread | groups
  const [q, setQ] = useState("");
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
      avatar: <Avatar name={c.title} photo={c.type === "dm" ? other?.photo : undefined} icon={GROUPS[c.id]?.icon || (c.type === "group" ? "chat" : null)} online={isOnline(other)} size="size-11" tone={GROUPS[c.id] ? "bg-deep text-white" : undefined} />,
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
    if (!(await confirmAsk({ title: "Mesajlar sıfırlansın mı?", text: `${n.chats} sohbet, ${n.messages} mesaj ve tüm ekler herkes için kalıcı silinir.`, yes: "Sıfırla" }))) return;
    setResetting(true);
    const ok = await resetChats();
    setResetting(false);
    toast(ok ? "Mesajlar sıfırlandı" : "Sıfırlanamadı");
  };

  const row = (x) => (
    <li key={x.key}>
      <button type="button" onPointerDown={() => x.c && warm(x.c.id)} onClick={x.open} data-press="row" className="flex min-h-[3.5rem] w-full items-center gap-3 px-3.5 py-2.5 text-left">
        {x.avatar}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <b className={`min-w-0 flex-1 truncate text-[0.9375rem] leading-snug ${x.unread ? "font-bold" : "font-semibold"}`}>{x.title}</b>
            <time className={`shrink-0 text-[0.75rem] tabular-nums ${x.unread ? "font-semibold text-acc" : "text-mut"}`}>{x.at ? listTime(x.at) : ""}</time>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={`line-clamp-1 min-w-0 flex-1 text-[0.8125rem] leading-snug ${x.unread ? "text-fg" : "text-mut"}`}>{x.preview}</span>
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
  const listCls = "overflow-hidden rounded-[1.25rem] border border-line bg-card [&>*+*]:border-t [&>*+*]:border-line";
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";

  return (
    // min-h-lvh: liste kısa olsa da sayfa en az ekran boyu; Safari alt çubuğu küçülmüş kalır, alt menü yerinden oynamaz
    <main className="mx-auto min-h-lvh max-w-[30rem] px-5 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      {/* Yeni tasarım (2026-11-03): lacivert üstte geri, ad, "+ Sohbet", arama, Tümü · Okunmamış · Gruplar ve sabit grup kısa yolları */}
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Mesajlar">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" className="touch-manipulation" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-semibold tracking-[-.02em]">Mesajlar</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{chatCount ? `${chatCount} sohbet` : "Henüz sohbet yok"}</p>
          </div>
          <button type="button" onClick={() => setNewOpen(true)} data-press className="btn btn-primary btn-sm shrink-0 gap-1">
            <Icon name="plus" className="size-4" />
            Sohbet
          </button>
        </header>

        <label className="ck-glass mt-4 flex h-11 items-center gap-2 rounded-2xl px-3.5">
          <Icon name="search" className="size-[1.125rem] shrink-0 text-white/55" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Ara" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/50" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Aramayı temizle" data-press className="grid size-7 place-items-center rounded-full text-white/70">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
          {[
            ["all", "Tümü"],
            ["unread", "Okunmamış", unreadCount],
            ["groups", "Gruplar"],
          ].map(([k, label, n]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} data-press className={`${pill0} ${filter === k ? "border-white bg-white text-deep" : "ck-glass text-white"}`}>
              {label}
              {n > 0 && <span className="ml-1.5 tabular-nums opacity-70">{n}</span>}
            </button>
          ))}
        </div>

        {/* Sabit gruplar (Ekip, Aile, Sporcular): türüne uyan herkes otomatik üye; kişiye "+ Sohbet" ya da aramayla yazılır */}
        {cardIds.length > 0 && (
          <div className={`mt-3 grid gap-2 ${cardIds.length >= 3 ? "grid-cols-3" : cardIds.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {cardIds.map((g) => {
              const c = chats.find((x) => x.id === g);
              const at = toMs(c?.last?.at);
              return (
                <button key={g} type="button" onPointerDown={() => c && !c._ghost && warm(g)} onClick={() => router.push(`/messages?c=${g}`)} data-press className="ck-glass relative flex min-w-0 items-center gap-2 rounded-2xl p-2.5 text-left">
                  <Avatar icon={GROUPS[g].icon} size="size-[2.125rem]" tone="bg-white/10 text-white" />
                  <span className="min-w-0">
                    <b className="block truncate text-[0.8125rem] font-semibold leading-tight text-white">{GROUPS[g].name}</b>
                    <small className={`block truncate text-[0.6875rem] ${c?.unread ? "font-semibold text-white" : "text-white/60"}`}>{at ? listTime(at) : "Yaz"}</small>
                  </span>
                  {c?.unread > 0 && !c.mutedByMe && (
                    <span className="absolute -right-1 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rec px-1 text-[0.6875rem] font-bold tabular-nums text-white ring-2 ring-deep">{c.unread > 99 ? "99+" : c.unread}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {denied && (
          <div className="rounded-[1.25rem] border border-line bg-warnbg px-3.5 py-3 text-[0.8125rem] leading-snug text-warn">
            <b className="block font-semibold">Mesajlaşma henüz açılmadı</b>
            {orgId === uid
              ? "Firebase kuralları güncel değil. Terminalde firebase deploy --only firestore:rules çalıştır ya da Console › Firestore › Rules'dan yayınla."
              : "Ana hesabın Firebase kurallarını güncellemesi gerekiyor. Güncellenince kişiler ve sohbetler burada görünür."}
          </div>
        )}

        {rows.length ? (
          <section>
            <ListHead title="Sohbetler" count={rows.length} />
            <ul className={listCls}>{rows.map(row)}</ul>
          </section>
        ) : !ready ? (
          <RowList>
            {[0, 1, 2].map((i) => (
              <SkelRow key={i} />
            ))}
          </RowList>
        ) : (
          <Empty icon="chat" title={q ? `“${q}” bulunamadı` : filter === "unread" ? "Okunmamış mesaj yok" : "Henüz sohbet yok"} />
        )}

        {archRows.length > 0 && (
          <section>
            <button type="button" onClick={() => setShowArch((v) => !v)} aria-expanded={showArch} data-press className="mb-1.5 flex w-full items-center justify-between gap-3 px-1">
              <span className="text-[0.8125rem] font-bold tracking-[.04em] text-mut">
                ARŞİV<span className="ml-1.5 font-semibold tabular-nums">{archRows.length}</span>
              </span>
              <span className="text-[0.8125rem] font-semibold text-acc">{showArch ? "Gizle" : "Göster"}</span>
            </button>
            {showArch && <ul className={listCls}>{archRows.map(row)}</ul>}
          </section>
        )}

        {owner && ready && !denied && (
          <div className="pt-4">
            <button type="button" disabled={resetting} onClick={reset} data-press className="btn btn-danger w-full">
              {resetting ? "Bekle…" : "Mesajları sıfırla"}
            </button>
          </div>
        )}
      </div>

      <NewChatSheet open={newOpen} onClose={() => setNewOpen(false)} />
    </main>
  );
}
