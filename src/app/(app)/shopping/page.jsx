"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { Sheet } from "@/components/ui/Sheet";
import { RowList, Row } from "@/components/ui/Row";
import { buttonClass } from "@/components/ui/buttonClass";
import { openSanal } from "@/lib/sanal";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { useData } from "@/features/data/DataProvider";
import { FoodHome } from "@/yemek/ui/FoodHome";
import { MarketHome } from "@/market/ui/MarketHome";
import { LISTS, addItems, clearDone, listsFor, removeItem, splitItems, toggleItem, useShop } from "@/features/shop/shop";

// Alışveriş (Seyhun 2026-10-22: "alışveriş, yemek siparişi gibisinden birleştirmeliyiz"): ana hesapta lacivert üstte
// Liste / Yemek / Market. Yemek: Velora Yemek (src/yemek, ayrı projeye taşınacak). Market: Velora Market (src/market, Seyhun 2026-10-24).
// ?tab=yemek ya da ?tab=market ile o sekme açılır. Market düğmesi Velora Sanal'ı açar (Seyhun 2026-10-24: "kullanıcı markete tıklayınca
// Velora Sanal'a gider"; tek dokunuşla giriş lib/sanal.js). Velora'daki market sayfası ?tab=market ile (sesli "malzemeleri al") açık kalır;
// Market yönetimi Liste'nin ⋯ içinde.
export default function ShoppingPage() {
  return (
    <Suspense fallback={null}>
      <Shopping />
    </Suspense>
  );
}

function Shopping() {
  const kind = useKind();
  const sp = useSearchParams();
  const [picked, setPicked] = useState(null);
  const tab = picked || (["yemek", "market"].includes(sp.get("tab")) ? sp.get("tab") : "liste");
  const { profile } = useAuth();
  const pick = (t) => {
    setPicked(t);
    window.history.replaceState(window.history.state, "", t === "liste" ? "/shopping" : `/shopping?tab=${t}`);
  };
  const tabs =
    kind === "owner" ? (
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {[["liste", "Liste"], ["yemek", "Yemek"], ["market", "Market"]].map(([k, n]) => (
          <button key={k} type="button" data-press aria-pressed={tab === k} onClick={() => (k === "market" ? openSanal() : pick(k))} className={`raised h-11 rounded-xl border text-[0.9375rem] font-semibold ${tab === k ? "ck-sel" : ""}`}>
            {n}
          </button>
        ))}
      </div>
    ) : null;
  if (tab === "yemek" && kind === "owner" && profile?.orgId) return <FoodHome orgId={profile.orgId} tabs={tabs} />;
  if (tab === "market" && kind === "owner" && profile?.orgId) return <MarketHome orgId={profile.orgId} uid={profile.uid} name={profile.name || ""} tabs={tabs} />;
  return <ListPage tabs={tabs} />;
}

// Alışveriş listesi: yaz (virgülle birden çok), dokun → alındı; alınanlar altta, "Temizle" ile silinir.
// Aile ve Ekip listeleri ayrı; herkes yalnızca kendi grubunun listesini görür.
function ListPage({ tabs }) {
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
  const [more, setMore] = useState(false);

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
      <button type="button" onClick={() => toggleItem(orgId, it, uid)} data-press="row" className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 transition ${it.done ? "bg-ok text-white ring-ok" : "ring-line"}`}>
          {it.done && <Icon name="check" className="size-4 [stroke-width:3]" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[1rem] ${it.done ? "text-mut line-through" : "font-medium"}`}>{it.text}</span>
          {kind === "owner" || it.by !== uid ? <small className="block truncate text-[0.75rem] text-mut">{it.done ? (it.doneBy === uid ? "Sen aldın" : `${nameOf(it.doneBy) || "Biri"} aldı`) : it.by === uid ? "Sen ekledin" : `${nameOf(it.by) || "Biri"} ekledi`}</small> : null}
        </span>
      </button>
      <button type="button" onClick={() => removeItem(orgId, it)} aria-label={`${it.text} sil`} data-press className="btn btn-icon btn-sm mr-2 shrink-0 text-mut">
        <Icon name="x" className="size-4" />
      </button>
    </li>
  );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Alışveriş">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Alışveriş</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{items ? (open.length ? `${open.length} alınacak` : "Liste boş") : "…"}</p>
          </div>
          {kind === "owner" && (
            <button type="button" onClick={() => setMore(true)} aria-label="Diğer" data-press className={buttonClass({ variant: "back" })}>
              <Icon name="more" className="size-5" />
            </button>
          )}
        </header>
        {tabs}
      </section>
      <div className="relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-3">

      {lists.length > 1 && (
        <div className="mt-2 flex gap-2">
          {lists.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setPick(l)}
              aria-pressed={list === l}
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold active:scale-95 ${list === l ? "bg-deep text-white" : "bg-card ring-1 ring-line"}`}
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
        <button type="submit" disabled={!text.trim()} aria-label="Ekle" className="grid size-12 shrink-0 place-items-center rounded-xl bg-deep text-white disabled:opacity-40 active:scale-95">
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
                <button type="button" onClick={() => clearDone(orgId, items).catch(() => toast("Temizlenemedi"))} data-press className="btn btn-text btn-sm">
                  Temizle
                </button>
              </div>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card/70">{done.map(row)}</ul>
            </>
          )}
        </>
      )}
      </div>
      <Sheet open={more} onClose={() => setMore(false)} title="Alışveriş">
        <RowList>
          <Row href="/market/yonetim" title="Market yönetimi" sub="Ürünler, stok, siparişler" />
        </RowList>
      </Sheet>
    </main>
  );
}
