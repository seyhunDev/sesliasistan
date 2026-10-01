"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { dmId, useChat } from "./ChatProvider";
import { Avatar, isOnline, seenText } from "./bits";

// Yeni sohbet: kişiye dokun → birebir; "Yeni grup" → kişileri seç, ad ver
export function NewChatSheet({ open, onClose }) {
  const router = useRouter();
  const toast = useToast();
  const { people, uid, createGroup } = useChat();
  const [mode, setMode] = useState("pick"); // pick | group
  const [sel, setSel] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => {
    setMode("pick");
    setSel([]);
    setName("");
    onClose();
  };
  const go = (cid) => {
    close();
    router.push(`/messages?c=${cid}`);
  };
  async function makeGroup() {
    if (!name.trim() || !sel.length) return;
    setBusy(true);
    try {
      go(await createGroup(name, sel));
    } catch {
      toast("Grup kurulamadı, tekrar dene");
    }
    setBusy(false);
  }

  return (
    <Sheet open={open} onClose={close} title={mode === "group" ? "Yeni grup" : "Yeni sohbet"}>
      {mode === "pick" ? (
        <div className="pb-2">
          <button type="button" onClick={() => setMode("group")} className="flex w-full items-center gap-3 rounded-2xl bg-bg px-3.5 py-3 text-left active:scale-[.99]">
            <Avatar icon="users" size="size-11" tone="bg-acc text-white" />
            <b className="text-[0.9375rem] font-semibold">Yeni grup</b>
          </button>
          <p className="mb-1.5 mt-4 px-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">KİŞİLER</p>
          {people.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
              {people.map((p) => (
                <li key={p.uid}>
                  <button type="button" onClick={() => go(dmId(uid, p.uid))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-card">
                    <Avatar name={p.name} online={isOnline(p)} size="size-11" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{p.name}</b>
                      <small className="block truncate text-[0.75rem] text-mut">{p.role === "owner" ? "Ana hesap" : "Çalışan"}{seenText(p.lastSeen) ? ` · ${seenText(p.lastSeen)}` : ""}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-[0.875rem] text-mut">Henüz kimse yok. Kişiler uygulamayı bir kez açınca burada görünür.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3 pb-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Grup adı, ör. Antrenörler" autoFocus className="h-12 w-full rounded-xl bg-bg px-3.5 text-base outline-none focus:bg-card focus:ring-1 focus:ring-acc" />
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
            {people.map((p) => {
              const on = sel.includes(p.uid);
              return (
                <li key={p.uid}>
                  <button type="button" role="checkbox" aria-checked={on} onClick={() => setSel((x) => (on ? x.filter((u) => u !== p.uid) : [...x, p.uid]))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-card">
                    <Avatar name={p.name} size="size-10" />
                    <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{p.name}</b>
                    <span className={`grid size-6 place-items-center rounded-full border-2 ${on ? "border-acc bg-acc text-white" : "border-line"}`}>{on && <Icon name="check" className="size-3.5 [stroke-width:3]" />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={() => setMode("pick")} className="h-12 flex-1 rounded-xl border border-line bg-card text-[0.9375rem] font-semibold active:scale-[.98]">
              Geri
            </button>
            <button type="button" onClick={makeGroup} disabled={busy || !name.trim() || !sel.length} className="h-12 flex-[1.6] rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-40">
              Grubu kur{sel.length ? ` (${sel.length + 1} kişi)` : ""}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
