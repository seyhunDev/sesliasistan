"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { dmId, toMs, useChat } from "./ChatProvider";
import { Avatar, Ticks, isOnline, listTime } from "./bits";
import { NewChatSheet } from "./NewChatSheet";
import { prefetchChat } from "./ChatView";
import { GROUPS } from "@/lib/kinds";

const TYPING_MS = 6000;
// Arama: büyük/küçük harf ve ı/i, ş, ğ… farkı yok sayılır
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");

// Mesajlar: popüler mesajlaşma uygulamaları gibi tek liste. Kişi sohbetleri, gruplar ve Ekip
// son mesaja göre sıralı; okunmamışlar kalın ve sayılı. Üstte kişiler (çevrimiçi noktasıyla): dokununca birebir sohbet.
export function ChatList() {
  const router = useRouter();
  const { chats, people, personName, uid, denied, orgId, ready, groupIds, chatRef } = useChat();
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
      avatar: <Avatar name={c.title} icon={GROUPS[c.id]?.icon || (c.type === "group" ? "chat" : null)} online={isOnline(other)} size="size-[3.25rem]" tone={GROUPS[c.id] ? "bg-[#2c5163] text-white" : undefined} />,
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
          {c.last.text}
        </>
      ) : (
        <span className="text-mut">{GROUPS[c.id] ? "Gruptaki herkes · ilk mesajı yaz" : "Henüz mesaj yok"}</span>
      ),
      muted: c.mutedByMe,
    };
  });

  const needle = fold(q.trim());
  // Plan/görev/not konuşmaları burada gösterilmez: kendi kayıtlarında ve ana sayfadaki "Senin için"de
  // Ekip, mesajı yokken listede yer tutmaz (kişiler şeridinin başında her zaman var)
  const rows = chatRows
    .filter((x) => !(GROUPS[x.c.id] && !x.c.last))
    .filter((x) => (filter === "unread" ? x.unread > 0 : filter === "groups" ? x.group : true))
    .filter((x) => !needle || fold(x.title).includes(needle))
    .sort((a, b) => b.at - a.at);
  const unreadCount = chatRows.filter((x) => x.unread > 0).length;

  return (
    // min-h-lvh: liste kısa olsa da sayfa en az ekran boyu; Safari alt çubuğu küçülmüş kalır, alt menü yerinden oynamaz
    <main className="mx-auto min-h-lvh max-w-[30rem] pb-[calc(8rem+env(safe-area-inset-bottom))]">
      {/* Başlık: büyük "Mesajlar", sağda yeni sohbet */}
      <header className="sticky top-0 z-10 bg-bg/90 px-5 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[1.625rem] font-bold leading-tight tracking-[-0.02em]">Mesajlar</h1>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            aria-label="Yeni sohbet"
            className="grid size-10 place-items-center rounded-full bg-[#2c5163] text-white shadow-[0_6px_16px_-8px_rgba(44,81,99,.8)] active:scale-90"
          >
            <Icon name="edit" className="size-5" />
          </button>
        </div>
        <label className="mt-2.5 flex h-10 items-center gap-2.5 rounded-xl bg-line/60 px-3.5">
          <Icon name="search" className="size-[1.125rem] text-mut" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Ara" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-mut" />
        </label>
        <div className="mt-2.5 flex gap-2">
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
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold transition active:scale-95 ${
                filter === k ? "bg-[#2c5163] text-white" : "bg-card text-fg ring-1 ring-line"
              }`}
            >
              {label}
              {n > 0 && <span className={`tabular-nums ${filter === k ? "text-white/75" : "text-acc"}`}>{n}</span>}
            </button>
          ))}
        </div>
      </header>

      {denied && (
        <div className="mx-5 mb-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] leading-snug text-amber-900 ring-1 ring-amber-200">
          <b className="block font-semibold">Mesajlaşma henüz açılmadı</b>
          {orgId === uid
            ? "Firebase kuralları güncel değil. Terminalde firebase deploy --only firestore:rules çalıştır ya da Console › Firestore › Rules'dan yayınla."
            : "Ana hesabın Firebase kurallarını güncellemesi gerekiyor. Güncellenince kişiler ve sohbetler burada görünür."}
        </div>
      )}

      {/* Kişiler: dokun, birebir yaz */}
      {!q && filter === "all" && (
        <div className="flex gap-4 overflow-x-auto px-5 pb-2 pt-1 [scrollbar-width:none]">
          {/* Sabit gruplar (Ekip, Aile, Sporcular): türüne uyan herkes otomatik üye */}
          {groupIds.map((g) => {
            const c = chats.find((x) => x.id === g);
            return (
              <button key={g} type="button" onPointerDown={() => warm(g)} onClick={() => router.push(`/messages?c=${g}`)} className="relative flex w-[3.75rem] shrink-0 flex-col items-center gap-1.5 active:scale-95">
                <Avatar icon={GROUPS[g].icon} size="size-[3.75rem]" tone="bg-[#2c5163] text-white" />
                {c?.unread > 0 && !c.mutedByMe && (
                  <span className="absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-rec px-1 text-[0.6875rem] font-bold tabular-nums text-white ring-2 ring-bg">{c.unread > 99 ? "99+" : c.unread}</span>
                )}
                <span className="w-full truncate text-center text-[0.75rem] font-semibold text-fg">{GROUPS[g].name}</span>
              </button>
            );
          })}
          {people.map((p) => (
            <button key={p.uid} type="button" onClick={() => router.push(`/messages?c=${dmId(uid, p.uid)}`)} className="relative flex w-[3.75rem] shrink-0 flex-col items-center gap-1.5 active:scale-95">
              <Avatar name={p.name} online={isOnline(p)} size="size-[3.75rem]" text="text-[1.0625rem]" />
              <span className="w-full truncate text-center text-[0.75rem] font-medium text-fg">{(p.name || "").split(" ")[0]}</span>
            </button>
          ))}
        </div>
      )}

      {rows.length ? (
        <ul className="mt-1">
          {rows.map((x) => (
            <li key={x.key}>
              <button type="button" onPointerDown={() => x.c && warm(x.c.id)} onClick={x.open} className="flex w-full items-center gap-3.5 px-5 text-left transition active:bg-line/40">
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
          ))}
        </ul>
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
            {q ? `“${q}” bulunamadı.` : filter === "unread" ? "Okunmamış mesaj yok." : "Henüz sohbet yok. Yukarıdan bir kişiye dokun ya da kalemle yeni sohbet başlat."}
          </p>
        </div>
      )}

      <NewChatSheet open={newOpen} onClose={() => setNewOpen(false)} />
    </main>
  );
}
