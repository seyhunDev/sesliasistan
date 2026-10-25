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
import { free, packOf, tl } from "../catalog";
import { alternatives, byMeasure, dur, menuRows, minutesOf, rowOk, rowPrice } from "../menus";
import { deleteMenu, useCatalog, useMenus } from "../store";
import { Img } from "@/yemek/ui/Img";
import { MenuEdit } from "./MenuEdit";

// Hazır menü (Seyhun 2026-10-24, tarif/ornek.png): üstte yemeğin fotoğrafı açıktan koyu laciverte solar; ad, kişi · süre · malzeme,
// kişi seçimi, Malzemeler / Tarif. Her malzeme ayrı seçilir: Ölçü (tarifteki kadarı, ör. 3 yemek kaşığı un) ya da Paket (en küçük
// paket) ve Marka (ürün başına; ölçüde de pakette de aynı). Dokununca "evde var". Markette olmayan "Bulunamadı" (amber) ve
// yöneticinin İstekler listesine gider. 2026-10-25: market alışverişi Velora Sanal'da; burası yönetimin menü sayfası (Market yönetimi ›
// Menüler), sepete ekleme yok, seçimler fiyatı göstermek için.
export function MenuView({ orgId, id }) {
  const router = useRouter();
  const toast = useToast();
  const menus = useMenus(orgId);
  const products = useCatalog(orgId);
  const menu = menus?.find((m) => m.id === id);
  const [people, setPeople] = useState(0);
  const [tab, setTab] = useState("malzeme"); // | "tarif"
  const [skip, setSkip] = useState({});
  const [how, setHow] = useState({}); // { [malzeme]: "olcu" | "paket" } (ölçü olabiliyorsa varsayılan ölçü)
  const [pick, setPick] = useState({}); // { [malzeme]: seçilen markanın ürün id'si }
  const [brandRow, setBrandRow] = useState(null);
  const [more, setMore] = useState(false); // false | "menu" | "sil"
  const [edit, setEdit] = useState(false);
  const n = people || menu?.serves || 4;
  const list = useMemo(() => Object.values(products || {}), [products]);
  const rows = useMemo(() => {
    if (!menu || !products) return [];
    const chosen = Object.fromEntries(Object.entries(pick).filter(([, pid]) => products[pid]).map(([k, pid]) => [k, products[pid]]));
    return menuRows(menu, list, n, chosen);
  }, [menu, products, list, n, pick]);
  const take = rows.filter((r) => !skip[r.item.name] && rowOk(r, how));
  const total = take.reduce((s, r) => s + rowPrice(r, how), 0);
  const steps = menu?.steps || [];
  const minutes = minutesOf(menu);

  if (id === "yeni") return <MenuEdit orgId={orgId} onDone={(x) => router.replace(x ? `/market/menu/${x.id}` : "/market/yonetim")} />;
  if (edit && menu) return <MenuEdit orgId={orgId} start={menu} onDone={() => setEdit(false)} />;

  async function remove() {
    try {
      await deleteMenu(orgId, menu.id);
      router.replace("/market/yonetim");
    } catch {
      toast("Silinemedi");
    }
  }

  const sizes = [...new Set([2, 4, 6, menu?.serves || 4])].sort((a, b) => a - b);
  const info = menu ? [`${n} kişilik`, dur(minutes), `${menu.items.length} malzeme`].filter(Boolean).join(" · ") : "";
  const tabs = [
    ["malzeme", "Malzemeler", `${take.length} ürün · ${tl(total)}`],
    ["tarif", "Tarif", `${steps.length} adım`],
  ];

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck relative -mx-5 overflow-hidden px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Hazır menü">
        {menu?.photo && <Img src={menu.photo} w={900} alt="" className="absolute inset-0 !bg-transparent" />}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,32,58,.12)_0%,rgba(17,32,58,.45)_35%,rgba(17,32,58,.9)_62%,#11203a_80%)]" />
        <header className="relative flex items-center justify-between">
          <BackButton href="/market/yonetim" />
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
          <section>
            <ListHead title="Malzemeler" count={take.length} />
            <RowList>
              {rows.map((r) => {
                const p = r.product, name = r.item.name, measure = byMeasure(r, how), ok = rowOk(r, how), off = !ok || skip[name];
                const sub = !p ? "Bulunamadı" : !ok ? "Tükendi" : skip[name] ? "Evde var" : measure ? [p.brand, r.amount].filter(Boolean).join(" · ") : `${r.qty > 1 ? `${r.qty} × ` : ""}${packOf(p)}`;
                const alts = alternatives(list, p);
                const chip = (sel) => `h-7 rounded-full border px-3 text-[0.8125rem] font-semibold ${sel ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`;
                return (
                  <div key={name} className={`border-t border-line py-2.5 first:border-t-0 ${!p ? "opacity-70" : ""}`}>
                    <div className="flex min-h-[2.5rem] items-center gap-3">
                      <button type="button" disabled={!ok} onClick={() => setSkip((s) => ({ ...s, [name]: !s[name] }))} data-press="row" className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${off ? "ring-line" : "bg-acc text-white ring-acc"}`}>
                          {!off && <Icon name="check" className="size-4 [stroke-width:3]" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[0.9375rem] font-semibold">{name}</b>
                          <small className={`block truncate text-[0.8125rem] ${!ok ? "text-warn" : "text-mut"}`}>{sub}</small>
                        </span>
                      </button>
                      <span className={`shrink-0 text-[0.9375rem] font-bold tabular-nums ${off ? "text-mut" : ""}`}>{p ? tl(rowPrice(r, how)) : "–"}</span>
                    </div>
                    {p && (r.part || alts.length > 1) && (
                      <div className="mt-2 flex gap-1.5 pl-9">
                        {r.part && (
                          <>
                            <button type="button" aria-pressed={measure} onClick={() => setHow((h) => ({ ...h, [name]: "olcu" }))} data-press className={chip(measure)}>Ölçü</button>
                            <button type="button" aria-pressed={!measure} onClick={() => setHow((h) => ({ ...h, [name]: "paket" }))} data-press className={chip(!measure)}>Paket</button>
                          </>
                        )}
                        {alts.length > 1 && <button type="button" onClick={() => setBrandRow(r)} data-press className={chip(false)}>Marka</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </RowList>
          </section>
        )}
      </div>

      <Sheet open={!!brandRow} onClose={() => setBrandRow(null)} title={brandRow ? [brandRow.item.name, brandRow.amount && `tarif ${brandRow.amount}`].filter(Boolean).join(" · ") : ""}>
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
