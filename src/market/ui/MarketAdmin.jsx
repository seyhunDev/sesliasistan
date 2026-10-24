"use client";

import { useMemo, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { ListHead, RowList, Row, SkelRow } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { AISLES } from "../sample";
import { LOW, NEXT, STATUS_NAMES, free, isOpenOrder, linesText, newId, productProblem, search, tl } from "../catalog";
import { addStock, deleteProduct, dropRequest, saveProduct, setStatus, useCatalog, useOrders, useRequests } from "../store";

const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

// Market yönetimi (Seyhun 2026-10-24, örnek 4-5): lacivertte Ürünler / Siparişler / İstekler. Ürünler reyon reyon, satırda stok − sayı +;
// alt satırda fiyat ve siparişte bekleyen. Satıra dokununca düzenle; "Ürün ekle" alt çubuğun üstünde.
// Siparişler: açıklar üstte, adım adım ilerletilir (teslimde stoktan düşer, iptalde bekleyen açılır).
// İstekler: menülerde markette bulunamayan malzemeler (kaç kez, hangi menüden); "Ekle" ürün formunu adıyla açar, kaydedince listeden çıkar.
export function MarketAdmin({ orgId }) {
  const products = useCatalog(orgId);
  const orders = useOrders(orgId, 30);
  const reqs = useRequests(orgId);
  const reqList = Object.entries(reqs || {}).map(([key, r]) => ({ key, ...r })).sort((a, b) => b.count - a.count || (b.at || "").localeCompare(a.at || ""));
  const [tab, setTab] = useState("urun");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // ürün ya da {} (yeni)
  const [show, setShow] = useState("");
  const toast = useToast();

  const all = useMemo(() => Object.values(products || {}), [products]);
  const found = useMemo(() => search(all, q), [all, q]);
  const low = all.filter((p) => p.stock - (p.held || 0) <= LOW).length;
  const open = (orders || []).filter(isOpenOrder);
  const shown = (orders || []).find((o) => o.id === show);
  const bumpStock = (p, d) => addStock(orgId, p.id, d).catch(() => toast("Stok değişmedi"));

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+6rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Market yönetimi">
        <header className="flex items-center gap-2.5">
          <BackButton href="/shopping?tab=market" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Market yönetimi</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{products ? `${all.length} ürün${low ? ` · ${low} az kaldı` : ""}` : "…"}</p>
          </div>
        </header>
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {[["urun", "Ürünler", `${all.length}`], ["siparis", "Siparişler", open.length ? `${open.length} açık` : "Açık yok"], ["istek", "İstekler", reqList.length ? `${reqList.length} ürün` : "Yok"]].map(([k, n, s]) => (
            <button key={k} type="button" data-press aria-pressed={tab === k} onClick={() => setTab(k)} className={`raised rounded-xl border px-3 py-2 text-left ${tab === k ? "ck-sel" : ""}`}>
              <b className="block text-[0.9375rem] font-semibold">{n}</b>
              <small className="block truncate text-[0.75rem] opacity-75">{s}</small>
            </button>
          ))}
        </div>
        {tab === "urun" && (
          <label className="ck-glass mt-3 flex h-11 items-center gap-2 rounded-xl px-3.5">
            <Icon name="search" className="size-4 shrink-0 text-white/60" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ara" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white outline-none placeholder:text-white/55" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Temizle" className="text-white/60"><Icon name="x" className="size-4" /></button>}
          </label>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {tab === "urun" &&
          (!products ? (
            <RowList><SkelRow /><SkelRow /><SkelRow /></RowList>
          ) : (
            AISLES.map(([k, n]) => {
              const list = found.filter((p) => p.cat === k).sort((a, b) => a.name.localeCompare(b.name, "tr"));
              if (!list.length) return null;
              return (
                <section key={k}>
                  <ListHead title={n} count={list.length} />
                  <RowList>
                    {list.map((p) => (
                      <div key={p.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                        <button type="button" onClick={() => setEdit(p)} data-press="row" className="min-w-0 flex-1 text-left">
                          <b className="block truncate text-[0.9375rem] font-semibold">{p.name} <span className="font-normal text-mut">{p.size}</span></b>
                          <small className={`block truncate text-[0.8125rem] ${free(p) <= LOW ? "text-warn" : "text-mut"}`}>
                            {tl(p.price)}{p.held ? ` · ${p.held} siparişte bekliyor` : ""}{free(p) <= 0 ? " · Tükendi" : free(p) <= LOW ? " · Az kaldı" : ""}
                          </small>
                        </button>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <button type="button" onClick={() => bumpStock(p, -1)} disabled={p.stock <= (p.held || 0)} aria-label={`${p.name} stok azalt`} data-press className="btn btn-round btn-sm"><Icon name="minus" className="size-3.5" /></button>
                          <b className="w-7 text-center tabular-nums">{p.stock}</b>
                          <button type="button" onClick={() => bumpStock(p, 1)} aria-label={`${p.name} stok artır`} data-press className="btn btn-round btn-sm"><Icon name="plus" className="size-3.5" /></button>
                        </span>
                      </div>
                    ))}
                  </RowList>
                </section>
              );
            })
          ))}
        {tab === "urun" && products && !found.length && <p className="px-1 text-[0.875rem] text-mut">Ürün bulunamadı.</p>}

        {tab === "siparis" && (
          <section>
            <ListHead title="Siparişler" count={orders?.length} />
            {!orders ? (
              <RowList><SkelRow /><SkelRow /></RowList>
            ) : orders.length ? (
              <RowList>
                {[...open, ...orders.filter((o) => !isOpenOrder(o))].map((o) => (
                  <Row key={o.id} onClick={() => setShow(o.id)} title={`${o.customer || "Müşteri"} · ${linesText(o.lines)}`}
                    sub={`${STATUS_NAMES[o.status]} · ${hm(o.at)} · ${o.address?.name || ""}`} right={tl(o.total)} />
                ))}
              </RowList>
            ) : (
              <p className="px-1 text-[0.875rem] text-mut">Henüz sipariş yok.</p>
            )}
          </section>
        )}
        {tab === "istek" && (
          <section>
            <ListHead title="Bulunamayan ürünler" count={reqList.length} />
            {!reqs ? (
              <RowList><SkelRow /><SkelRow /></RowList>
            ) : reqList.length ? (
              <RowList>
                {reqList.map((r) => (
                  <div key={r.key} className="flex min-h-[3.5rem] items-center gap-2 border-t border-line py-2.5 first:border-t-0">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{r.name}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">{r.count} kez{r.from?.length ? ` · ${r.from.join(", ")}` : ""}</small>
                    </span>
                    <Button size="sm" full={false} className="shrink-0" onClick={() => setEdit({ name: r.name, req: r.key })}>Ekle</Button>
                    <button type="button" onClick={() => dropRequest(orgId, r.key).catch(() => toast("Silinemedi"))} aria-label={`${r.name} listeden çıkar`} data-press className="btn btn-icon btn-sm shrink-0 text-mut">
                      <Icon name="x" className="size-4" />
                    </button>
                  </div>
                ))}
              </RowList>
            ) : (
              <p className="px-1 text-[0.875rem] text-mut">Bulunamayan ürün yok.</p>
            )}
          </section>
        )}
      </div>

      {tab === "urun" && products && (
        <div className="fixed inset-x-0 bottom-[calc(var(--dome-h,var(--stage-h,5.5rem))+0.75rem)] z-30 mx-auto w-full max-w-[30rem] px-5">
          <Button onClick={() => setEdit({})}>Ürün ekle</Button>
        </div>
      )}

      <ProductSheet key={edit?.id || edit?.req || (edit ? "yeni" : "")} p={edit} products={products} orgId={orgId} onClose={() => setEdit(null)} />
      <AdminOrder order={shown} orgId={orgId} onClose={() => setShow("")} />
    </main>
  );
}

// Ürün ekle / düzenle: ad, boyut, reyon, fiyat, stok. Düzenlerken Sil (siparişte bekleyen varsa silinmez).
function ProductSheet({ p, products, orgId, onClose }) {
  const toast = useToast();
  const isNew = p && !p.id;
  const [f, setF] = useState(() => ({ name: p?.name || "", size: p?.size || "", cat: p?.cat || AISLES[0][0], price: p?.price ?? "", stock: p?.stock ?? "" }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const problem = productProblem(f);
  async function save() {
    setBusy(true);
    try {
      const id = p.id || newId(products || {}, f.name, f.size);
      await saveProduct(orgId, { id, name: f.name.trim(), size: f.size.trim(), cat: f.cat, price: Number(String(f.price).replace(",", ".")), stock: Math.round(Number(f.stock)) });
      if (p.req) dropRequest(orgId, p.req).catch(() => {});
      onClose();
    } catch {
      toast("Kaydedilemedi");
    }
    setBusy(false);
  }
  async function remove() {
    if (p.held) return toast(`${p.held} siparişte bekliyor, önce siparişler bitsin`);
    setBusy(true);
    try {
      await deleteProduct(orgId, p.id);
      onClose();
    } catch {
      toast("Silinemedi");
    }
    setBusy(false);
  }
  return (
    <Sheet open={!!p} onClose={onClose} title={isNew ? "Yeni ürün" : p ? p.name : ""}>
      {p && (
        <div className="space-y-3 pb-2">
          <Field label="Ad" value={f.name} onChange={set("name")} placeholder="Süt" />
          <div className="grid grid-cols-3 gap-2.5">
            <Field label="Boyut" value={f.size} onChange={set("size")} placeholder="1 L" />
            <Field label="Fiyat ₺" value={f.price} onChange={set("price")} inputMode="decimal" />
            <Field label="Stok" value={f.stock} onChange={set("stock")} inputMode="numeric" />
          </div>
          <div>
            <span className="text-[0.8125rem] font-medium text-mut">Reyon</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AISLES.map(([k, n]) => (
                <button key={k} type="button" aria-pressed={f.cat === k} onClick={() => setF((x) => ({ ...x, cat: k }))} data-press
                  className={`rounded-xl border px-3 py-2 text-[0.8125rem] font-semibold ${f.cat === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{n}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1.7fr] gap-2.5 pt-1">
            {isNew ? <Button variant="secondary" onClick={onClose}>Vazgeç</Button> : <Button variant="danger" loading={busy} onClick={remove}>Sil</Button>}
            <Button loading={busy} disabled={!!problem} onClick={save}>{problem || "Kaydet"}</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// Yönetimde sipariş: ürünler, adres, sonraki adım düğmesi (Hazırla › Yola çıkar › Teslim edildi), bitmemişse İptal
function AdminOrder({ order: o, orgId, onClose }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  async function go(status) {
    setBusy(status);
    try {
      await setStatus(orgId, o.id, status);
    } catch {
      toast("Değişmedi");
    }
    setBusy("");
  }
  const next = o && NEXT[o.status];
  return (
    <Sheet open={!!o} onClose={onClose} title={o ? `${STATUS_NAMES[o.status]} · ${tl(o.total)}` : ""}>
      {o && (
        <div className="space-y-4 pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {o.lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                <span className="min-w-0 flex-1 truncate font-semibold">{l.name} <span className="font-normal text-mut">{l.size}</span></span>
                <span className="shrink-0 tabular-nums text-mut">×{l.qty}</span>
                <b className="w-16 shrink-0 text-right tabular-nums">{tl(l.total)}</b>
              </div>
            ))}
          </div>
          <RowList>
            <Row title={`${o.customer || "Müşteri"} · ${o.address?.name || ""}`} sub={`${o.address?.text || ""} · ${o.pay === "kapıda-nakit" ? "Kapıda nakit" : "Kapıda kart"}`} />
          </RowList>
          {isOpenOrder(o) && (
            <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
              <Button variant="secondary" loading={busy === "cancelled"} disabled={!!busy} onClick={() => go("cancelled")}>İptal</Button>
              {next && <Button loading={busy === next[0]} disabled={!!busy} onClick={() => go(next[0])}>{next[1]}</Button>}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

