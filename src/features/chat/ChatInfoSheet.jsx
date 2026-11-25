"use client";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useChat } from "./ChatProvider";
import { Avatar, isOnline, seenText } from "./bits";
import { GROUPS } from "@/lib/kinds";

// Sohbet bilgisi: sessize al, fotoğraf ve dosyalar, üyeler (çevrimiçi / son görülme); grupta kuran kişi ad değiştirir,
// üye ekler/çıkarır; gruptan çık. Ana hesap: sohbeti arşivle (yalnız kendi listesinden) ya da herkes için kalıcı sil.
// Telefonda alttan pencere (ChatInfoSheet); Mac ve yatay iPad'de sohbetin sağında panel (ChatInfoPanel, "Bilgi" düğmesi).
export function ChatInfoSheet({ open, onClose, ...p }) {
  return (
    <Sheet open={open} onClose={onClose} title={p.chat?.title || "Sohbet"}>
      {p.chat && <ChatInfo {...p} onClose={onClose} />}
    </Sheet>
  );
}

export function ChatInfoPanel({ onClose, ...p }) {
  return (
    <aside className="chat-info" aria-label="Sohbet bilgisi">
      <header className="flex h-[3.75rem] shrink-0 items-center gap-2 border-b border-line px-4">
        <b className="min-w-0 flex-1 truncate text-[1rem] font-semibold">Bilgi</b>
        <button type="button" onClick={onClose} aria-label="Bilgiyi kapat" data-press className="btn btn-icon btn-sm size-8 text-mut">
          <Icon name="x" className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">{p.chat && <ChatInfo {...p} onClose={onClose} />}</div>
    </aside>
  );
}

// Sohbetteki fotoğraf ve dosyalar (ekranda yüklü mesajlardan; ayrı okuma yok). files: en yeni önce { id, file }
function ChatFiles({ files }) {
  const [all, setAll] = useState(false);
  if (!files?.length) return null;
  const shown = all ? files : files.slice(0, 8);
  return (
    <div>
      <p className="mb-1.5 flex items-center justify-between px-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">
        <span>FOTOĞRAF VE DOSYALAR · {files.length}</span>
        {files.length > 8 && (
          <button type="button" onClick={() => setAll((v) => !v)} className="text-[0.8125rem] font-semibold tracking-normal text-acc">
            {all ? "Daha az" : "Tümü"}
          </button>
        )}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {shown.map(({ id, file: f }) => (
          <a key={id} href={f.url} target="_blank" rel="noreferrer" title={f.name || ""} className="grid aspect-square min-w-0 place-items-center overflow-hidden rounded-xl bg-bg text-mut">
            {f.kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt="Fotoğraf" loading="lazy" className="size-full object-cover" />
            ) : (
              <span className="grid justify-items-center gap-1 px-1 text-center">
                <Icon name={f.kind === "voice" ? "mic" : "paperclip"} className="size-5" />
                <small className="w-full truncate text-[0.625rem]">{f.kind === "voice" ? "Ses" : f.name || "Dosya"}</small>
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function ChatInfo({ onClose, chat, members, people, exists, files }) {
  const confirmAsk = useConfirm();
  const router = useRouter();
  const toast = useToast();
  const { uid, orgId, allPeople, personName, mute, archive, deleteChat, updateGroup, leaveGroup } = useChat();
  const [busy, setBusy] = useState(false);
  const owner = orgId === uid;
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
        <div className="space-y-4 pb-2">

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
                data-press className="btn btn-primary"
              >
                Kaydet
              </button>
            </div>
          )}

          {owner && chat.type === "dm" && byUid(chat.other) && byUid(chat.other).role !== "owner" && (
            <button type="button" onClick={() => router.push(`/people/p/${chat.other}`)} data-press className="btn btn-secondary w-full">
              Kişi sayfası
            </button>
          )}

          <ChatFiles files={files} />

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
                    <Avatar name={p?.name || personName(u)} photo={p?.photo} online={u !== uid && isOnline(p)} size="size-10" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">
                        {u === uid ? "Sen" : personName(u)}
                        {isGroup && chat.createdBy === u && <span className="ml-1.5 text-[0.6875rem] font-semibold text-acc">yönetici</span>}
                      </b>
                      {u !== uid && <small className="block truncate text-[0.75rem] text-mut">{seenText(p?.lastSeen) || (p?.role === "owner" ? "Ana hesap" : "Çalışan")}</small>}
                    </span>
                    {chat.type === "dm" && u !== uid ? null : adding ? (
                      <button type="button" onClick={() => save({ members: [...members, u] }, `${personName(u)} eklendi`)} data-press className="btn btn-primary btn-sm">
                        Ekle
                      </button>
                    ) : (
                      admin &&
                      u !== uid && (
                        <button type="button" onClick={() => save({ members: members.filter((m) => m !== u) }, `${personName(u)} çıkarıldı`)} aria-label="Gruptan çıkar" data-press className="btn btn-icon btn-sm size-8 text-rec">
                          <Icon name="x" className="size-4" />
                        </button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {owner && exists && !GROUPS[chat.id] && (
            <button
              type="button"
              onClick={() =>
                archive(chat, !chat.archivedByMe).then((ok) => {
                  toast(ok ? (chat.archivedByMe ? "Arşivden çıkarıldı" : "Arşivlendi") : "Yapılamadı");
                  if (ok && !chat.archivedByMe) {
                    onClose();
                    router.replace("/messages");
                  }
                })
              }
              className="h-12 w-full rounded-xl border border-line bg-card text-[0.9375rem] font-semibold active:scale-[.98]"
            >
              {chat.archivedByMe ? "Arşivden çıkar" : "Arşivle"}
            </button>
          )}

          {owner && exists && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!(await confirmAsk({ title: "Sohbet silinsin mi?", text: `${chat.title} · tüm mesajlar ve ekler herkes için silinir.` }))) return;
                setBusy(true);
                const ok = await deleteChat(chat.id);
                setBusy(false);
                toast(ok ? "Sohbet herkes için silindi" : "Sohbet silinemedi");
                if (ok) {
                  onClose();
                  router.replace("/messages");
                }
              }}
              className="h-12 w-full rounded-xl border border-line bg-card text-[0.9375rem] font-semibold text-rec active:scale-[.98] disabled:opacity-50"
            >
              {busy ? "Siliniyor…" : "Herkes için sil"}
            </button>
          )}

          {isGroup && (
            <button
              type="button"
              onClick={async () => {
                if (!(await confirmAsk({ title: "Gruptan çıkılsın mı?", text: "Mesajları artık göremezsin.", yes: "Çık" }))) return;
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
  );
}
