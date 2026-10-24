"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { RowList, Row, SkelRow, ListHead } from "@/components/ui/Row";
import { buttonClass } from "@/components/ui/buttonClass";
import { useToast } from "@/components/ui/ToastProvider";
import { free, tl } from "../catalog";
import { menuRows, menuToCart, missingOf } from "../menus";
import { deleteMenu, noteMissing, readCart, useCatalog, useMenus, writeCart } from "../store";
import { MenuEdit } from "./MenuEdit";

// Hazır menü (Seyhun 2026-10-24, örnek 2): lacivertte ad, kişi sayısı; altta malzemeler. Dokununca "evde var" (sepete girmez).
// Markette olmayan "Bulunamadı" (amber) ve yöneticinin İstekler listesine gider. "Sepete ekle" alt çubuğun üstünde.
export function MenuView({ orgId, id }) {
  const router = useRouter();
  const toast = useToast();
  const menus = useMenus(orgId);
  const products = useCatalog(orgId);
  const menu = menus?.find((m) => m.id === id);
  const [people, setPeople] = useState(0);
  const [skip, setSkip] = useState({});
  const [more, setMore] = useState(false); // false | "menu" | "sil"
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = people || menu?.serves || 4;
  const list = useMemo(() => Object.values(products || {}), [products]);
  const rows = useMemo(() => (menu && products ? menuRows(menu, list, n) : []), [menu, products, list, n]);
  const missing = missingOf(rows);
  const take = rows.filter((r) => r.product && !skip[r.item.name] && free(r.product) > 0);
  const total = take.reduce((s, r) => s + r.product.price * Math.min(r.qty, free(r.product)), 0);

  if (id === "yeni") return <MenuEdit orgId={orgId} onDone={(m) => router.replace(m ? `/market/menu/${m.id}` : "/shopping?tab=market")} />;
  if (edit && menu) return <MenuEdit orgId={orgId} start={menu} onDone={() => setEdit(false)} />;

  async function add() {
    setBusy(true);
    writeCart(menuToCart(readCart(), rows, skip));
    noteMissing(orgId, missing, menu.name).catch(() => {});
    setBusy(false);
    toast(`${take.length} ürün sepete eklendi`);
    router.push("/shopping?tab=market");
  }
  async function remove() {
    try {
      await deleteMenu(orgId, menu.id);
      router.replace("/shopping?tab=market");
    } catch {
      toast("Silinemedi");
    }
  }

  const sizes = [...new Set([2, 4, 6, menu?.serves || 4])].sort((a, b) => a - b);
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+6rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Hazır menü">
        <header className="flex items-center gap-2.5">
          <BackButton href="/shopping?tab=market" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{menu?.name || (menus ? "Menü bulunamadı" : "…")}</h1>
            {menu && <p className="truncate text-[0.8125rem] text-white/65">{n} kişilik · {menu.items.length} malzeme{missing.length ? ` · ${missing.length} bulunamadı` : ""}</p>}
          </div>
          {menu && (
            <button type="button" onClick={() => setMore("menu")} aria-label="Menü işlemleri" data-press className={buttonClass({ variant: "back" })}>
              <Icon name="more" className="size-5" />
            </button>
          )}
        </header>
        {menu && (
          <div className="mt-3 flex gap-2">
            {sizes.map((k) => (
              <button key={k} type="button" onClick={() => setPeople(k)} aria-pressed={n === k}
                className={`h-8 rounded-full px-3.5 text-[0.8125rem] font-semibold active:scale-95 ${n === k ? "border border-white bg-white text-[#141938]" : "ck-glass"}`}>{k} kişi</button>
            ))}
          </div>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <ListHead title="Malzemeler" count={menu ? take.length : 0} />
        {!rows.length ? (
          <RowList><SkelRow /><SkelRow /><SkelRow /></RowList>
        ) : (
          <RowList>
            {rows.map((r) => {
              const p = r.product, off = !p || skip[r.item.name] || free(p) <= 0;
              const sub = !p ? "Bulunamadı" : free(p) <= 0 ? "Tükendi" : skip[r.item.name] ? "Evde var" : [r.item.amount, `${r.qty > 1 ? `${r.qty} × ` : ""}${p.name} ${p.size}`].filter(Boolean).join(" · ");
              return (
                <button key={r.item.name} type="button" disabled={!p || free(p) <= 0} onClick={() => setSkip((s) => ({ ...s, [r.item.name]: !s[r.item.name] }))} data-press="row"
                  className={`flex min-h-[3.5rem] w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0 ${!p ? "opacity-70" : ""}`}>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${off ? "ring-line" : "bg-acc text-white ring-acc"}`}>
                    {!off && <Icon name="check" className="size-4 [stroke-width:3]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{r.item.name}</b>
                    <small className={`block truncate text-[0.8125rem] ${!p || free(p) <= 0 ? "text-warn" : "text-mut"}`}>{sub}</small>
                  </span>
                  <span className={`shrink-0 text-[0.9375rem] font-bold tabular-nums ${off ? "text-mut" : ""}`}>{p ? tl(p.price * r.qty) : "–"}</span>
                </button>
              );
            })}
          </RowList>
        )}
      </div>

      {menu && rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(var(--dome-h,var(--stage-h,5.5rem))+0.75rem)] z-30 mx-auto w-full max-w-[30rem] px-5">
          <Button loading={busy} disabled={!take.length} onClick={add}>
            <span className="flex w-full items-center justify-between"><span>Sepete ekle · {take.length} ürün</span><span className="tabular-nums">{tl(total)}</span></span>
          </Button>
        </div>
      )}

      <Sheet open={!!more} onClose={() => setMore(false)} title={more === "sil" ? `${menu?.name} silinsin mi?` : menu?.name || ""}>
        {more === "sil" ? (
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            <Button variant="secondary" onClick={() => setMore(false)}>Vazgeç</Button>
            <Button variant="danger" onClick={() => (setMore(false), remove())}>Sil</Button>
          </div>
        ) : (
          <RowList>
            <Row onClick={() => (setMore(false), setEdit(true))} title="Düzenle" />
            <Row onClick={() => setMore("sil")} title="Menüyü sil" />
          </RowList>
        )}
      </Sheet>
    </main>
  );
}
