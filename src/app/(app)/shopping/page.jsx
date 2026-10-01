"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { useData } from "@/features/data/DataProvider";
import { LISTS, addItems, clearDone, listsFor, removeItem, splitItems, toggleItem, useShop } from "@/features/shop/shop";

// Alışveriş listesi: yaz (virgülle birden çok), dokun → alındı; alınanlar altta, "Temizle" ile silinir.
// Aile ve Ekip listeleri ayrı; herkes yalnızca kendi grubunun listesini görür.
export default function ShoppingPage() {
  const { profile } = useAuth();
  const kind = useKind();
  const { members, nameOf } = useData();
  const toast = useToast();
  const lists = listsFor(kind, members);
  const [pick, setPick] = useState("");
  const list = lists.includes(pick) ? pick : lists[0];
  const orgId = profile?.orgId;
  const uid = profile?.uid;
  const items = useShop(orgId, list);
  const [text, setText] = useState("");

  async function add(e) {
    e.preventDefault();
    const parts = splitItems(text);
    if (!parts.length) return;
    setText("");
    try {
      await addItems(orgId, list, uid, parts);
    } catch {
      toast("Eklenemedi");
      setText(text);
    }
  }

  const open = (items || []).filter((i) => !i.done);
  const done = (items || []).filter((i) => i.done);
  if (!lists.length)
    return (
      <main className="mx-auto max-w-[30rem] px-5">
        <PageHeader title="Alışveriş" />
        <p className="mt-10 text-center text-[0.9375rem] text-mut">Bu hesapta alışveriş listesi yok.</p>
      </main>
    );

  const row = (it) => (
    <li key={it.id} className="flex items-center gap-1">
      <button type="button" onClick={() => toggleItem(orgId, it, uid)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left active:bg-bg">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 transition ${it.done ? "bg-ok text-white ring-ok" : "ring-line"}`}>
          {it.done && <Icon name="check" className="size-4 [stroke-width:3]" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[1rem] ${it.done ? "text-mut line-through" : "font-medium"}`}>{it.text}</span>
          {kind === "owner" || it.by !== uid ? <small className="block truncate text-[0.75rem] text-mut">{it.done ? (it.doneBy === uid ? "Sen aldın" : `${nameOf(it.doneBy) || "Biri"} aldı`) : it.by === uid ? "Sen ekledin" : `${nameOf(it.by) || "Biri"} ekledi`}</small> : null}
        </span>
      </button>
      <button type="button" onClick={() => removeItem(orgId, it)} aria-label={`${it.text} sil`} className="mr-2 grid size-9 shrink-0 place-items-center rounded-full text-mut active:bg-bg">
        <Icon name="x" className="size-4" />
      </button>
    </li>
  );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Alışveriş" sub={items ? (open.length ? `${open.length} alınacak` : "Liste boş") : "…"} />

      {lists.length > 1 && (
        <div className="mt-2 flex gap-2">
          {lists.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setPick(l)}
              aria-pressed={list === l}
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold active:scale-95 ${list === l ? "bg-[#2c5163] text-white" : "bg-card ring-1 ring-line"}`}
            >
              <Icon name={LISTS[l].icon} className="size-4" /> {LISTS[l].name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ekle: süt, ekmek, 2 kg domates"
          enterKeyHint="done"
          className="h-12 min-w-0 flex-1 rounded-xl bg-card px-4 text-base outline-none ring-1 ring-line focus:ring-acc"
        />
        <button type="submit" disabled={!text.trim()} aria-label="Ekle" className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#2c5163] text-white disabled:opacity-40 active:scale-95">
          <Icon name="plus" className="size-6" />
        </button>
      </form>
      <p className="mt-1.5 px-1 text-[0.75rem] text-mut">Asistana da söyleyebilirsin: “listeye süt ve ekmek ekle”.</p>

      {!items ? (
        <Loading className="py-10" />
      ) : (
        <>
          {open.length > 0 ? (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05)]">{open.map(row)}</ul>
          ) : (
            <div className="mt-8 flex flex-col items-center text-center">
              <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
                <Icon name="cart" className="size-7" />
              </span>
              <p className="mt-3 text-[0.9375rem] text-mut">{done.length ? "Hepsi alındı." : "Alınacak bir şey yok."}</p>
            </div>
          )}
          {done.length > 0 && (
            <>
              <div className="mt-5 flex items-center justify-between px-1">
                <span className="text-[0.75rem] font-bold tracking-[.08em] text-mut">ALINDI · {done.length}</span>
                <button type="button" onClick={() => clearDone(orgId, items).catch(() => toast("Temizlenemedi"))} className="text-[0.8125rem] font-semibold text-acc">
                  Temizle
                </button>
              </div>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card/70">{done.map(row)}</ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
