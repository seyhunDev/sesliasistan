"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { RowList, Row, SkelRow, ListHead } from "@/components/ui/Row";
import { buttonClass } from "@/components/ui/buttonClass";
import { useToast } from "@/components/ui/ToastProvider";
import { bump, free, packOf, tl } from "../catalog";
import { alternatives, dur, makeSet, menuRows, menuToCart, minutesOf, missingOf, setFor, setItems, setPrice } from "../menus";
import { deleteMenu, noteMissing, readCart, saveProduct, useCatalog, useMenus, writeCart } from "../store";
import { Img } from "@/yemek/ui/Img";
import { MenuEdit } from "./MenuEdit";

// Hazır menü (Seyhun 2026-10-24, tarif/ornek.png): üstte yemeğin fotoğrafı açıktan koyu laciverte solar; ad, kişi · süre · malzeme,
// kişi seçimi, Malzemeler / Tarif. Malzemeler iki türlü ("Set + paketler"):
//   Ölçülü set: market tam ölçüyü hazırlar (katalogda set ürünü; stok ve fiyat yönetimde), liste tarifteki ölçüler
//   Paketlerle: her malzemenin en küçük paketi, markasıyla; "Marka" aynı ürünün başka markasını seçtirir; dokununca "evde var"
// Markette olmayan "Bulunamadı" (amber) ve yöneticinin İstekler listesine gider. Sepete ekle düğmesi alt çubuğun üstünde.
export function MenuView({ orgId, id }) {
  const router = useRouter();
  const toast = useToast();
  const menus = useMenus(orgId);
  const products = useCatalog(orgId);
  const menu = menus?.find((m) => m.id === id);
  const [people, setPeople] = useState(0);
  const [tab, setTab] = useState("malzeme"); // | "tarif"
  const [mode, setMode] = useState(""); // "" (set varsa set) | "set" | "paket"
  const [skip, setSkip] = useState({});
  const [pick, setPick] = useState({}); // { [malzeme]: seçilen markanın ürün id'si }
  const [brandRow, setBrandRow] = useState(null);
  const [more, setMore] = useState(false); // false | "menu" | "sil" | "set"
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = people || menu?.serves || 4;
  const list = useMemo(() => Object.values(products || {}), [products]);
  const rows = useMemo(
    () => (menu && products ? menuRows(menu, list, n).map((r) => (products[pick[r.item.name]] ? { ...r, product: products[pick[r.item.name]] } : r)) : []),
    [menu, products, list, n, pick],
  );
  const set = menu && products ? setFor(list, menu.id, n) : null;
  const setOk = !!set && free(set) > 0;
  const m = mode || (setOk ? "set" : "paket");
  const missing = missingOf(rows);
  const take = rows.filter((r) => r.product && !skip[r.item.name] && free(r.product) > 0);
  const total = take.reduce((s, r) => s + r.product.price * Math.min(r.qty, free(r.product)), 0);
  const steps = menu?.steps || [];
  const minutes = minutesOf(menu);

  if (id === "yeni") return <MenuEdit orgId={orgId} onDone={(x) => router.replace(x ? `/market/menu/${x.id}` : "/shopping?tab=market")} />;
  if (edit && menu) return <MenuEdit orgId={orgId} start={menu} onDone={() => setEdit(false)} />;

  async function add() {
    setBusy(true);
    if (m === "set") {
      writeCart(bump(readCart(), set, 1));
      toast(`${set.name} sepete eklendi`);
    } else {
      writeCart(menuToCart(readCart(), rows, skip));
      noteMissing(orgId, missing, menu.name).catch(() => {});
      toast(`${take.length} ürün sepete eklendi`);
    }
    setBusy(false);
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
  const info = menu ? [`${n} kişilik`, dur(minutes), `${menu.items.length} malzeme`].filter(Boolean).join(" · ") : "";
  const tabs = [
    ["malzeme", "Malzemeler", set ? (setOk ? `Set ${tl(set.price)}` : "Set tükendi") : `${take.length} paket · ${tl(total)}`],
    ["tarif", "Tarif", `${steps.length} adım`],
  ];

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+6rem)]">
      <section className="ck relative -mx-5 overflow-hidden px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Hazır menü">
        {menu?.photo && <Img src={menu.photo} w={900} alt="" className="absolute inset-0 !bg-transparent" />}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,32,58,.12)_0%,rgba(17,32,58,.45)_35%,rgba(17,32,58,.9)_62%,#11203a_80%)]" />
        <header className="relative flex items-center justify-between">
          <BackButton href="/shopping?tab=market" />
          {menu && (
            <button type="button" onClick={() => setMore("menu")} aria-label="Menü işlemleri" data-press className={buttonClass({ variant: "back" })}>
              <Icon name="more" className="size-5" />
            </button>
          )}
        </header>
        <div className="relative">
          <h1 className={`truncate text-[1.875rem] font-bold leading-tight tracking-[-.02em] ${menu?.photo ? "mt-28" : "mt-3"}`}>{menu?.name || (menus ? "Menü bulunamadı" : "…")}</h1>
          {menu && <p className="truncate text-[0.875rem] text-white/75">{info}</p>}
          {menu && (
            <div className="mt-3 flex gap-2">
              {sizes.map((k) => (
                <button key={k} type="button" onClick={() => setPeople(k)} aria-pressed={n === k}
                  className={`h-8 rounded-full px-3.5 text-[0.8125rem] font-semibold active:scale-95 ${n === k ? "border border-white bg-white text-[#141938]" : "ck-glass"}`}>{k} kişi</button>
              ))}
            </div>
          )}
          {menu && steps.length > 0 && (
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              {tabs.map(([k, t, s]) => (
                <button key={k} type="button" data-press aria-pressed={tab === k} onClick={() => setTab(k)} className={`raised rounded-xl border px-3 py-2 text-left ${tab === k ? "ck-sel" : ""}`}>
                  <b className="block text-[0.9375rem] font-semibold">{t}</b>
                  <small className="block truncate text-[0.75rem] opacity-75">{s}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-4 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {tab === "tarif" && steps.length > 0 ? (
          <section>
            <ListHead title="Yapılışı" />
            <ol className="overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5">
              {steps.map((st, i) => (
                <li key={i} className="flex gap-3 border-t border-line py-3 first:border-t-0">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accbg text-[0.8125rem] font-bold text-acc">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] leading-snug">{st.text}</span>
                    {st.min > 0 && <small className="mt-0.5 block text-[0.8125rem] text-mut">{st.min} dk</small>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : !rows.length ? (
          <RowList><SkelRow /><SkelRow /><SkelRow /></RowList>
        ) : (
          <>
            {set && (
              <div className="grid grid-cols-2 gap-2.5">
                {[["set", "Ölçülü set", setOk ? `Tam ölçü · ${tl(set.price)}` : "Tükendi", !setOk], ["paket", "Paketlerle", `${take.length} paket · ${tl(total)}`, false]].map(([k, t, s, off]) => (
                  <button key={k} type="button" disabled={off} aria-pressed={m === k} onClick={() => setMode(k)} data-press
                    className={`rounded-xl border px-3 py-2 text-left disabled:opacity-60 ${m === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>
                    <b className="block text-[0.9375rem] font-semibold">{t}</b>
                    <small className={`block truncate text-[0.8125rem] ${m === k ? "" : "text-mut"}`}>{s}</small>
                  </button>
                ))}
              </div>
            )}
            {m === "set" ? (
              <section>
                <ListHead title="Sette" count={menu.items.length} />
                <RowList>
                  {setItems(menu, n).map((i) => (
                    <div key={i.name} className="flex min-h-[3rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                      <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{i.name}</b>
                      <span className="shrink-0 text-[0.875rem] text-mut">{i.amount}</span>
                    </div>
                  ))}
                </RowList>
              </section>
            ) : (
              <section>
                <ListHead title="Paketler" count={take.length} />
                <RowList>
                  {rows.map((r) => {
                    const p = r.product, off = !p || skip[r.item.name] || free(p) <= 0;
                    const sub = !p ? "Bulunamadı" : free(p) <= 0 ? "Tükendi" : skip[r.item.name] ? "Evde var" : `${r.qty > 1 ? `${r.qty} × ` : ""}${packOf(p)}`;
                    const alts = alternatives(list, p);
                    return (
                      <div key={r.item.name} className={`flex min-h-[3.5rem] items-center gap-2.5 border-t border-line py-2.5 first:border-t-0 ${!p ? "opacity-70" : ""}`}>
                        <button type="button" disabled={!p || free(p) <= 0} onClick={() => setSkip((s) => ({ ...s, [r.item.name]: !s[r.item.name] }))} data-press="row"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${off ? "ring-line" : "bg-acc text-white ring-acc"}`}>
                            {!off && <Icon name="check" className="size-4 [stroke-width:3]" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-[0.9375rem] font-semibold">{r.item.name}</b>
                            <small className={`block truncate text-[0.8125rem] ${!p || free(p) <= 0 ? "text-warn" : "text-mut"}`}>{sub}</small>
                          </span>
                        </button>
                        {alts.length > 1 && (
                          <button type="button" onClick={() => setBrandRow(r)} data-press className="btn btn-sm shrink-0 !h-8 !px-2.5 text-[0.8125rem]">Marka</button>
                        )}
                        <span className={`w-14 shrink-0 text-right text-[0.9375rem] font-bold tabular-nums ${off ? "text-mut" : ""}`}>{p ? tl(p.price * r.qty) : "–"}</span>
                      </div>
                    );
                  })}
                </RowList>
              </section>
            )}
          </>
        )}
      </div>

      {menu && rows.length > 0 && tab === "malzeme" && (
        <div className="fixed inset-x-0 bottom-[calc(var(--dome-h,var(--stage-h,5.5rem))+0.75rem)] z-30 mx-auto w-full max-w-[30rem] px-5">
          <Button loading={busy} disabled={m === "set" ? !setOk : !take.length} onClick={add}>
            <span className="flex w-full items-center justify-between">
              <span>{m === "set" ? "Seti sepete ekle" : `Sepete ekle · ${take.length} paket`}</span>
              <span className="tabular-nums">{tl(m === "set" ? set.price : total)}</span>
            </span>
          </Button>
        </div>
      )}

      <Sheet open={!!brandRow} onClose={() => setBrandRow(null)} title={brandRow ? [brandRow.item.name, brandRow.item.amount && `tarif ${brandRow.item.amount}`].filter(Boolean).join(" · ") : ""}>
        {brandRow && (
          <div className="pb-2">
            <RowList>
              {alternatives(list, brandRow.product).map((p) => {
                const cur = rows.find((r) => r.item.name === brandRow.item.name)?.product?.id === p.id;
                const out = free(p) <= 0;
                return (
                  <button key={p.id} type="button" disabled={out} data-press="row" onClick={() => (setPick((x) => ({ ...x, [brandRow.item.name]: p.id })), setBrandRow(null))}
                    className={`flex min-h-[3.25rem] w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0 ${out ? "opacity-60" : ""}`}>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{p.brand || "Markasız"}</b>
                      <small className={`block truncate text-[0.8125rem] ${out ? "text-warn" : "text-mut"}`}>{p.size}{out ? " · Tükendi" : ""}</small>
                    </span>
                    <b className="shrink-0 tabular-nums">{tl(p.price)}</b>
                    <span className="w-5 shrink-0">{cur && <Icon name="check" className="size-5 text-acc" />}</span>
                  </button>
                );
              })}
            </RowList>
          </div>
        )}
      </Sheet>

      <Sheet open={!!more} onClose={() => setMore(false)} title={more === "sil" ? `${menu?.name} silinsin mi?` : more === "set" ? `${n} kişilik set` : menu?.name || ""}>
        {more === "sil" ? (
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            <Button variant="secondary" onClick={() => setMore(false)}>Vazgeç</Button>
            <Button variant="danger" onClick={() => (setMore(false), remove())}>Sil</Button>
          </div>
        ) : more === "set" ? (
          <SetForm key={`${menu.id}-${n}`} orgId={orgId} menu={menu} people={n} set={set} suggest={setPrice(menu, list, n)} onClose={() => setMore(false)} />
        ) : (
          <RowList>
            <Row onClick={() => (setMore(false), setEdit(true))} title="Düzenle" />
            <Row onClick={() => setMore("set")} title="Set fiyatı ve stoğu" sub={set ? `${n} kişilik · ${tl(set.price)} · stok ${set.stock}` : `${n} kişilik set yok`} />
            <Row onClick={() => setMore("sil")} title="Menüyü sil" />
          </RowList>
        )}
      </Sheet>
    </main>
  );
}

// Ölçülü setin fiyatı ve stoğu (yönetici; set yoksa açılır, fiyat önerisi paketlerin %75'i)
function SetForm({ orgId, menu, people, set, suggest, onClose }) {
  const toast = useToast();
  const [price, setPrice] = useState(String(set?.price ?? suggest));
  const [stock, setStock] = useState(String(set?.stock ?? 5));
  const [busy, setBusy] = useState(false);
  const p = Number(price.replace(",", ".")), s = Math.round(Number(stock));
  const problem = !(p > 0) ? "Fiyat yaz" : !(s >= 0) ? "Stok yaz" : "";
  async function save() {
    setBusy(true);
    try {
      const { held, ...item } = makeSet(menu, people, p, s); // bekleyen sayısı katalogdaki kalır
      await saveProduct(orgId, item);
      onClose();
    } catch {
      toast("Kaydedilemedi");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 pb-2">
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Fiyat ₺" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
        <Field label="Stok" value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
      </div>
      <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button loading={busy} disabled={!!problem} onClick={save}>{problem || "Kaydet"}</Button>
      </div>
    </div>
  );
}
