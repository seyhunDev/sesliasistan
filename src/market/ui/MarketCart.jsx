"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { pickAddress } from "@/yemek/address";
import { herePos, saveMe, useFood } from "@/yemek/store";
import { AddressForm } from "@/yemek/ui/AddressForm";
import { bump, cartTotal, tl } from "../catalog";
import { orderNow, writeCart } from "../store";

const PAYS = [["kapıda-kart", "Kapıda kart"], ["kapıda-nakit", "Kapıda nakit"]];

// Market sepeti: ürünler (adet ±), toplam, adres (yemekle aynı kayıtlı adresler, yemek/me), ödeme, "Siparişi ver".
// Stok sipariş anında denetlenir; yetmeyen varsa sipariş verilmez, ne kaldığı yazılır.
export function MarketCart({ open, onClose, lines, products, orgId, uid, name, onPlaced }) {
  const toast = useToast();
  const food = useFood(orgId);
  const [pos, setPos] = useState(null);
  const [addrId, setAddrId] = useState("");
  const [mode, setMode] = useState("cart"); // cart | pick | new
  const [pay, setPay] = useState("kapıda-kart");
  const [busy, setBusy] = useState(false);
  const addresses = food?.me.addresses || [];
  useEffect(() => {
    if (open) herePos().then(setPos);
  }, [open]);

  const auto = pickAddress(addresses, pos, food?.me.lastAddressId);
  const addr = addresses.find((a) => a.id === addrId) || auto.address || null;
  const close = () => {
    onClose();
    setMode("cart");
  };
  const setQty = (l, d) => {
    const p = products?.[l.id] || { ...l };
    const next = bump(lines, p, d);
    writeCart(next);
    if (!next.length) close();
  };

  async function send() {
    if (!addr) return setMode(addresses.length ? "pick" : "new");
    setBusy(true);
    try {
      const r = await orderNow(orgId, uid, { lines, address: { id: addr.id, name: addr.name, text: addr.text, pos: addr.pos || null }, pay, name });
      if (r.short) toast(r.short.join(" · "));
      else {
        writeCart([]);
        saveMe(orgId, { lastAddressId: addr.id }).catch(() => {});
        close();
        onPlaced(r.id);
      }
    } catch {
      toast("Sipariş gönderilemedi");
    }
    setBusy(false);
  }

  const title = mode === "pick" ? "Hangi adrese?" : mode === "new" ? "Yeni adres" : "Sepet";
  return (
    <Sheet open={open} onClose={close} title={title}>
      {mode === "cart" && (
        <div className="space-y-4 pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{l.name}</b>
                  <small className="block truncate text-[0.8125rem] text-mut">{l.size} · {tl(l.price)}</small>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => setQty(l, -1)} aria-label="Azalt" data-press className="btn btn-round btn-sm"><Icon name={l.qty === 1 ? "trash" : "minus"} className="size-3.5" /></button>
                  <b className="w-5 text-center tabular-nums">{l.qty}</b>
                  <button type="button" onClick={() => setQty(l, 1)} aria-label="Artır" data-press className="btn btn-round btn-sm"><Icon name="plus" className="size-3.5" /></button>
                </span>
                <b className="w-16 shrink-0 text-right tabular-nums">{tl(l.price * l.qty)}</b>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line py-2.5 font-bold">
              <span>Toplam</span>
              <span className="tabular-nums">{tl(cartTotal(lines))}</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <h3 className="text-[0.8125rem] font-bold text-mut">Adres</h3>
              {addresses.length > 0 && <button type="button" onClick={() => setMode("pick")} className="text-[0.8125rem] font-semibold text-acc">Değiştir</button>}
            </div>
            <button type="button" onClick={() => setMode(addresses.length ? "pick" : "new")} data-press="row" className="flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-bg px-3.5 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{addr ? addr.name : "Adres seç"}</b>
                <small className="block truncate text-[0.8125rem] text-mut">{addr ? addr.text : addresses.length ? "Bulunduğun yerde kayıtlı adres yok" : "Henüz adres yok"}</small>
              </span>
            </button>
          </div>

          <div className="flex gap-2">
            {PAYS.map(([k, n]) => (
              <button key={k} type="button" aria-pressed={pay === k} onClick={() => setPay(k)} data-press
                className={`flex-1 rounded-xl border py-2.5 text-[0.875rem] font-semibold ${pay === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{n}</button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
            <Button variant="secondary" onClick={close}>Vazgeç</Button>
            <Button loading={busy} disabled={!food || !lines.length} onClick={send}>{addr ? "Siparişi ver" : "Adres seç"}</Button>
          </div>
        </div>
      )}

      {mode === "pick" && (
        <div className="space-y-3 pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {addresses.map((a) => (
              <button key={a.id} type="button" onClick={() => (setAddrId(a.id), setMode("cart"))} data-press="row" className="flex w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{a.name}</b>
                  <small className="block truncate text-[0.8125rem] text-mut">{a.text}</small>
                </span>
                {a.id === addr?.id && <Icon name="check" className="size-5 shrink-0 text-acc" />}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setMode("new")}>Yeni adres</Button>
        </div>
      )}

      {mode === "new" && (
        <AddressForm pos={pos} start={null} onCancel={() => setMode(addresses.length ? "pick" : "cart")} onDelete={null}
          onSave={async (a) => {
            try {
              await saveMe(orgId, { addresses: [...addresses, a] });
              setAddrId(a.id);
              setMode("cart");
            } catch {
              toast("Adres kaydedilemedi");
            }
          }} />
      )}
    </Sheet>
  );
}
