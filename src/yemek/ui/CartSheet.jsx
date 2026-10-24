"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { cartTotals, lineDetail } from "../order";
import { pickAddress, distanceKm } from "../address";
import { herePos, openNow, orderNow, saveMe, writeCart } from "../store";
import { tl } from "./Img";
import { AddressForm } from "./AddressForm";

const PAYS = [["kapıda-kart", "Kapıda kart"], ["kapıda-nakit", "Kapıda nakit"]];

const HEMEN_MS = 3000;

// Sepet (örnek 4): ürünler (adet ±), toplam, adres (konuma 300 m içindeki kendiliğinden; yoksa sorar), ödeme, "Siparişi ver".
// hemen: sesle verilen sipariş (asistan, isler/yemek.js); 3 sn çizgi dolar, sipariş kendiliğinden verilir (İptal / Şimdi).
// adres: asistanın seçtiği adres.
export function CartSheet({ open, onClose, place, lines, food, orgId, uid, name, onPlaced, hemen, adres }) {
  const toast = useToast();
  const [pos, setPos] = useState(null);
  const [addrId, setAddrId] = useState(adres || ""); // elle seçilen; yoksa konuma göre / son kullanılan
  const [count, setCount] = useState(!!hemen); // sesle sipariş: geri sayım sürüyor
  const [mode, setMode] = useState("cart"); // cart | pick | new | edit
  const [editId, setEditId] = useState("");
  const [pay, setPay] = useState("kapıda-kart");
  const [busy, setBusy] = useState(false);
  const addresses = food?.me.addresses || [];

  const close = () => {
    setCount(false);
    onClose();
    setMode("cart");
    setAddrId("");
  };
  useEffect(() => {
    if (!open) return;
    herePos().then(setPos);
  }, [open]);

  const auto = pickAddress(addresses, pos, food?.me.lastAddressId);
  const addr = addresses.find((a) => a.id === addrId) || auto.address || null;
  const totals = cartTotals(place, lines);
  const closed = !openNow(place, food?.settings);
  const canSend = !!food && !!addr && !closed && totals.short <= 0 && lines.length > 0;
  const counting = count && open && mode === "cart" && canSend;

  // Sesle sipariş: veri ve adres hazır olunca 3 sn sonra kendiliğinden
  useEffect(() => {
    if (!counting) return;
    const t = setTimeout(() => send(), HEMEN_MS);
    return () => clearTimeout(t);
  }, [counting]); // eslint-disable-line react-hooks/exhaustive-deps

  const setQty = (i, d) => {
    setCount(false);
    const next = lines.map((l, j) => (j === i ? { ...l, qty: l.qty + d, total: l.unit * (l.qty + d) } : l)).filter((l) => l.qty > 0);
    writeCart({ placeId: next.length ? place.id : "", lines: next });
    if (!next.length) close();
  };

  async function send() {
    setCount(false);
    if (!addr) return setMode("pick");
    setBusy(true);
    try {
      const id = await orderNow(orgId, uid, { place, lines, address: addr, pay, name, demo: food?.settings?.demo !== false });
      writeCart({ placeId: "", lines: [] });
      close();
      onPlaced(id);
    } catch {
      toast("Sipariş gönderilemedi");
    }
    setBusy(false);
  }

  const title = mode === "pick" ? "Hangi adrese?" : mode === "new" ? "Yeni adres" : mode === "edit" ? "Adresi düzenle" : "Sepet";
  return (
    <Sheet open={open} onClose={close} title={title}>
      {mode === "cart" && (
        <div className="space-y-4 pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{l.name}</b>
                  {lineDetail(l) && <small className="block truncate text-[0.8125rem] text-mut">{lineDetail(l)}</small>}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => setQty(i, -1)} aria-label="Azalt" data-press className="btn btn-round btn-sm"><Icon name={l.qty === 1 ? "trash" : "minus"} className="size-3.5" /></button>
                  <b className="w-4 text-center tabular-nums">{l.qty}</b>
                  <button type="button" onClick={() => setQty(i, 1)} aria-label="Artır" data-press className="btn btn-round btn-sm"><Icon name="plus" className="size-3.5" /></button>
                </span>
                <b className="w-16 shrink-0 text-right tabular-nums">{tl(l.unit * l.qty)}</b>
              </div>
            ))}
            {totals.fee > 0 && <Line name="Teslim" value={tl(totals.fee)} />}
            <Line name="Toplam" value={tl(totals.total)} bold />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <h3 className="text-[0.8125rem] font-bold text-mut">Adres</h3>
              {addresses.length > 0 && <button type="button" onClick={() => (setCount(false), setMode("pick"))} className="text-[0.8125rem] font-semibold text-acc">Değiştir</button>}
            </div>
            <button type="button" onClick={() => setMode(addresses.length ? "pick" : "new")} data-press="row" className="flex w-full items-center gap-3 rounded-[1.25rem] border border-line bg-bg px-3.5 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{addr ? addr.name : "Adres seç"}</b>
                <small className="block truncate text-[0.8125rem] text-mut">
                  {addr ? `${addr.id === auto.address?.id && auto.why === "near" ? "Konumuna göre · " : ""}${addr.text}` : addresses.length ? "Bulunduğun yerde kayıtlı adres yok" : "Henüz adres yok"}
                </small>
              </span>
            </button>
          </div>

          <div className="flex gap-2">
            {PAYS.map(([k, n]) => (
              <button key={k} type="button" aria-pressed={pay === k} onClick={() => (setCount(false), setPay(k))} data-press
                className={`flex-1 rounded-xl border py-2.5 text-[0.875rem] font-semibold ${pay === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{n}</button>
            ))}
          </div>

          {counting && (
            <div className="h-[3px] overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className="h-full origin-left rounded-full bg-acc" style={{ animation: `autofill ${HEMEN_MS}ms linear forwards` }} />
            </div>
          )}
          <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
            <Button variant="secondary" onClick={counting ? () => setCount(false) : close}>{counting ? "İptal" : "Vazgeç"}</Button>
            <Button loading={busy} disabled={closed || totals.short > 0 || !food} onClick={send}>
              {counting ? "Şimdi" : closed ? "Şu an kapalı" : totals.short > 0 ? `Min sepete ${tl(totals.short)} var` : addr ? "Siparişi ver" : "Adres seç"}
            </Button>
          </div>
        </div>
      )}

      {mode === "pick" && (
        <div className="space-y-3 pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {addresses.map((a) => (
              <div key={a.id} className="flex items-center gap-1 border-t border-line first:border-t-0">
                <button type="button" onClick={() => (setAddrId(a.id), setMode("cart"))} data-press="row" className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{a.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{a.text}{pos && a.pos ? ` · ${km(distanceKm(pos, a.pos))}` : ""}</small>
                  </span>
                  {a.id === addr?.id && <Icon name="check" className="size-5 shrink-0 text-acc" />}
                </button>
                <button type="button" onClick={() => (setEditId(a.id), setMode("edit"))} aria-label={`${a.name} düzenle`} data-press className="btn btn-icon btn-sm shrink-0 text-mut">
                  <Icon name="more" className="size-5" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setMode("new")}>Yeni adres</Button>
        </div>
      )}

      {(mode === "new" || mode === "edit") && (
        <AddressForm key={mode + editId} pos={pos} start={mode === "edit" ? addresses.find((a) => a.id === editId) : null}
          onCancel={() => setMode(addresses.length ? "pick" : "cart")}
          onDelete={mode === "edit" ? async () => {
            try {
              await saveMe(orgId, { addresses: addresses.filter((a) => a.id !== editId) });
              if (addrId === editId) setAddrId("");
              setMode("pick");
            } catch {
              toast("Silinemedi");
            }
          } : null}
          onSave={async (a) => {
            const list = addresses.some((x) => x.id === a.id) ? addresses.map((x) => (x.id === a.id ? a : x)) : [...addresses, a];
            try {
              await saveMe(orgId, { addresses: list });
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

const km = (k) => (k < 1 ? `${Math.round(k * 1000)} m` : `${k.toFixed(1).replace(".", ",")} km`);
const Line = ({ name, value, bold }) => (
  <div className={`flex items-center justify-between border-t border-line py-2.5 ${bold ? "font-bold" : "text-mut"}`}>
    <span>{name}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);
