"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useChat } from "./ChatProvider";
import { Avatar, isOnline, seenText } from "./bits";
import { GROUPS } from "@/lib/kinds";

// Sohbet bilgisi: sessize al, üyeler (çevrimiçi / son görülme); grupta kuran kişi ad değiştirir, üye ekler/çıkarır; gruptan çık
export function ChatInfoSheet({ open, onClose, chat, members, people, exists }) {
  const router = useRouter();
  const toast = useToast();
  const { uid, allPeople, personName, mute, updateGroup, leaveGroup } = useChat();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const isGroup = chat?.type === "group";
  const admin = isGroup && chat.createdBy === uid;
  const byUid = (u) => allPeople.find((p) => p.uid === u);
  const addable = people.filter((p) => !members.includes(p.uid));

  const save = (patch, msg) =>
    updateGroup(chat.id, patch)
      .then(() => msg && toast(msg))
      .catch(() => toast("Değiştirilemedi"));

  return (
    <Sheet open={open} onClose={onClose} title={chat?.title || "Sohbet"}>
      {chat && (
        <div className="space-y-4 pb-2">
          <p className="px-1 text-[0.8125rem] leading-snug text-mut">
            <Icon name="alert" className="mr-1 inline size-3.5 align-[-2px]" />
            Bu sohbeti yalnızca içindeki kişiler görebilir{GROUPS[chat.id] ? " (gruba uyan herkes otomatik üye)" : ""}.
          </p>

          {exists && (
            <button
              type="button"
              role="switch"
              aria-checked={chat.mutedByMe}
              onClick={() => mute(chat, !chat.mutedByMe)}
              className="flex w-full items-center gap-3 rounded-2xl bg-bg px-4 py-3 text-left"
            >
              <Icon name={chat.mutedByMe ? "mute" : "bell"} className="size-5 text-acc" />
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-semibold">Sessize al</b>
                <small className="block text-[0.75rem] text-mut">Bu sohbetten telefona bildirim gelmez</small>
              </span>
              <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${chat.mutedByMe ? "bg-acc" : "bg-line"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${chat.mutedByMe ? "left-[1.125rem]" : "left-0.5"}`} />
              </span>
            </button>
          )}

          {admin && (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder={chat.name || "Grup adı"}
                className="h-11 min-w-0 flex-1 rounded-xl bg-bg px-3.5 text-base outline-none focus:bg-card focus:ring-1 focus:ring-acc"
              />
              <button
                type="button"
                disabled={!name.trim()}
                onClick={() => save({ name: name.trim() }, "Grup adı değişti").then(() => setName(""))}
                className="h-11 rounded-xl bg-acc px-4 text-[0.875rem] font-semibold text-white disabled:opacity-40"
              >
                Kaydet
              </button>
            </div>
          )}

          <div>
            <p className="mb-1.5 flex items-center justify-between px-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">
              <span>{chat.type === "dm" ? "KİŞİ" : `ÜYELER · ${members.length}`}</span>
              {admin && addable.length > 0 && (
                <button type="button" onClick={() => setAdding((v) => !v)} className="text-[0.8125rem] font-semibold tracking-normal text-acc">
                  {adding ? "Bitti" : "+ Üye ekle"}
                </button>
              )}
            </p>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
              {(adding ? addable.map((p) => p.uid) : members).map((u) => {
                const p = byUid(u);
                return (
                  <li key={u} className="flex items-center gap-3 px-3.5 py-2.5">
                    <Avatar name={p?.name || personName(u)} online={u !== uid && isOnline(p)} size="size-10" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">
                        {u === uid ? "Sen" : personName(u)}
                        {isGroup && chat.createdBy === u && <span className="ml-1.5 text-[0.6875rem] font-semibold text-acc">yönetici</span>}
                      </b>
                      {u !== uid && <small className="block truncate text-[0.75rem] text-mut">{seenText(p?.lastSeen) || (p?.role === "owner" ? "Ana hesap" : "Çalışan")}</small>}
                    </span>
                    {chat.type === "dm" && u !== uid ? null : adding ? (
                      <button type="button" onClick={() => save({ members: [...members, u] }, `${personName(u)} eklendi`)} className="h-8 rounded-full bg-acc px-3 text-[0.75rem] font-semibold text-white">
                        Ekle
                      </button>
                    ) : (
                      admin &&
                      u !== uid && (
                        <button type="button" onClick={() => save({ members: members.filter((m) => m !== u) }, `${personName(u)} çıkarıldı`)} aria-label="Gruptan çıkar" className="grid size-8 place-items-center rounded-full text-rec active:bg-card">
                          <Icon name="x" className="size-4" />
                        </button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {isGroup && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Gruptan çıkmak istiyor musun? Mesajları artık göremezsin.")) return;
                leaveGroup(chat)
                  .then(() => {
                    onClose();
                    router.replace("/messages");
                  })
                  .catch(() => toast("Gruptan çıkılamadı"));
              }}
              className="h-12 w-full rounded-xl border border-line bg-card text-[0.9375rem] font-semibold text-rec active:scale-[.98]"
            >
              Gruptan çık
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
