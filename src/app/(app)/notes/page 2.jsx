"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { rel } from "@/lib/utils/format";
import { whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";

// Arama için sadeleştirir: büyük/küçük harf, ı/i ve ş, ğ, ç, ö, ü farkını yok sayar ("iskota" = "Iskota")
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");

export default function NotesPage() {
  const { notes, updateRecord, removeWithUndo, myUid, nameOf } = useData();
  const pillOf = useWho(); // ana hesapta görevli etiketi; çalışanda "Ana hesap ekledi" yazısı
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const [q, setQ] = useState("");
  const by = { name: profile?.name ?? "Kullanıcı" };

  const needle = fold(q.trim());
  const list = [...notes]
    .filter((n) => !needle || fold(`${n.title} ${n.body}`).includes(needle))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const pinned = list.filter((n) => n.pinned);
  const rest = list.filter((n) => !n.pinned);

  const row = (n) => {
    const pill = pillOf(n);
    const who = pill ? "" : whoText(n, myUid, nameOf);
    return (
    <SwipeRow
      key={n.id}
      actions={[
        { label: n.pinned ? "Bırak" : "Sabitle", icon: "star", tone: "neutral", onAction: () => updateRecord("note", n.id, { pinned: !n.pinned }, by) },
        { label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("note", n.id) },
      ]}
    >
      <button onClick={() => openAdd({ edit: { kind: "note", id: n.id } })} className="flex w-full items-start gap-3 px-4 py-3 text-left transition active:bg-bg">
        <span className="min-w-0 flex-1">
          <b className="flex items-center gap-1.5 text-[15px] font-medium">
            {n.pinned && <Icon name="star" className="size-3.5 fill-current text-acc" />}
            <span className="truncate">{n.title}</span>
            {pill && <span className="ml-auto flex shrink-0 pl-1">{pill}</span>}
          </b>
          {n.body && n.body !== n.title && <small className="mt-0.5 line-clamp-2 block text-[14px] text-mut">{n.body}</small>}
          {n.createdAt && (
            <small className="mt-1 block text-[12px] text-mut">
              {rel(n.createdAt.slice(0, 10))}
              {who && <span className="text-acc"> · {who}</span>}
            </small>
          )}
        </span>
      </button>
    </SwipeRow>
    );
  };

  const box = (items) => (
    <div className="divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">{items.map(row)}</div>
  );

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-32 pt-3">
      <PageHeader title="Notlar" addLabel="Not" onAdd={() => openAdd({ type: "note" })} />

      {notes.length > 0 && (
        <label className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-card px-3.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
          <Icon name="search" className="size-[18px] text-mut" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Notlarda ara"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mut"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Aramayı temizle" className="grid size-7 place-items-center rounded-full text-mut active:bg-bg">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>
      )}

      {notes.length === 0 && <p className="py-14 text-center text-sm text-mut">Henüz not yok.</p>}
      {notes.length > 0 && list.length === 0 && <p className="py-10 text-center text-sm text-mut">“{q}” için not bulunamadı.</p>}

      {pinned.length > 0 && (
        <section>
          <h3 className="mb-2 mt-6 px-1 text-[13px] font-semibold text-mut">Sabitlenenler</h3>
          {box(pinned)}
        </section>
      )}
      {rest.length > 0 && (
        <section>
          {pinned.length > 0 && <h3 className="mb-2 mt-6 px-1 text-[13px] font-semibold text-mut">Diğer notlar</h3>}
          <div className={pinned.length ? "" : "mt-4"}>{box(rest)}</div>
        </section>
      )}

      {notes.length > 0 && <p className="mt-8 text-center text-[12px] text-mut">İpucu: sabitlemek ya da silmek için notu sola kaydır.</p>}
    </main>
  );
}
