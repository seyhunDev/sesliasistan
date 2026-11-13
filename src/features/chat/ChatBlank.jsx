"use client";

import { useRouter } from "next/navigation";
import { GROUPS, kindOf } from "@/lib/kinds";
import { dmId, toMs, useChat } from "./ChatProvider";
import { Avatar, isOnline, listTime } from "./bits";

// İki bölmede (Mac ve yatay iPad) sohbet seçili değilken sağ taraf: sabit gruplar ve yazışılabilen kişiler; dokununca o sohbet
// açılır (Seyhun 2026-11-13 onaylı örnek). Telefonda görünmez (globals.css MESAJLAR .chat-blank).
export function ChatBlank() {
  const router = useRouter();
  const { uid, chats, people, groupIds } = useChat();
  const go = (cid) => router.push(`/messages?c=${cid}`);
  const size = (g) => people.filter((p) => p.role !== "owner" && GROUPS[g].has(kindOf(p))).length;
  return (
    <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-6 px-10 pb-10 pt-[calc(3.5rem+env(safe-area-inset-top))]">
      <h2 className="text-[1.5rem] font-semibold tracking-[-.02em]">Kime yazacaksın?</h2>
      {groupIds.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {groupIds.map((g) => {
            const c = chats.find((x) => x.id === g);
            const at = toMs(c?.last?.at);
            return (
              <button key={g} type="button" onClick={() => go(g)} data-press className="flex min-w-0 items-center gap-3 rounded-[1.25rem] border border-line bg-card p-3.5 text-left">
                <Avatar icon={GROUPS[g].icon} size="size-10" tone="bg-deep text-white" />
                <span className="min-w-0">
                  <b className="block truncate text-[0.9375rem] font-semibold">{GROUPS[g].name}</b>
                  <small className={`block truncate text-[0.75rem] ${c?.unread ? "font-semibold text-acc" : "text-mut"}`}>{c?.unread ? `${c.unread} yeni` : at ? listTime(at) : `${size(g)} kişi`}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {people.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-2 gap-y-4">
          {people.map((p) => (
            <li key={p.uid}>
              <button type="button" onClick={() => go(dmId(uid, p.uid))} data-press className="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-2xl py-1.5">
                <Avatar name={p.name} photo={p.photo} online={isOnline(p)} size="size-14" />
                <span className="w-full truncate px-1 text-center text-[0.8125rem] font-medium">{(p.name || "Kişi").split(" ")[0]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
