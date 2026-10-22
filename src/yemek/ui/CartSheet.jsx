"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { cartTotals, lineDetail, etaFrom } from "../order";
import { pickAddress, distanceKm } from "../address";
import { herePos, openNow, placeOrder, saveMe, writeCart } from "../store";
import { tl } from "./Img";

const PAYS = [["kapıda-kart", "Kapıda kart"], ["kapıda-nakit", "Kapıda nakit"]];

// Sepet (örnek 4): ürünler (adet ±), toplam, adres (konuma 300 m içindeki kendiliğinden; yoksa sorar), ödeme, "Siparişi ver".
export function CartSheet({ open, onClose, place, lines, food, orgId, uid, name, onPlaced }) {
  const toast = useToast();
  const [pos, setPos] = useState(null);
  const [addrId, setAddrId] = useState(""); // elle seçilen; yoksa konuma göre / son kullanılan
  const [mode, setMode] = useState("cart"); // cart | pick | new
  const [pay, setPay] = useState("kapıda-kart");
  const [busy, setBusy] = useState(false);
  const addresses = food?.me.addresses || [];

  const close = () => {
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

  const setQty = (i, d) => {
    const next = lines.map((l, j) => (j === i ? { ...l, qty: l.qty + d, total: l.unit * (l.qty + d) } : l)).filter((l) => l.qty > 0);
    writeCart({ placeId: next.length ? place.id : "", lines: next });
    if (!next.length) close();
  };

  async function send() {
    if (!addr) return setMode("pick");
    setBusy(true);
    try {
      const km = distanceKm(place.pos, addr.pos);
      const order = {
        placeId: place.id, placeName: place.name, cuisines: place.cuisines, lines, subtotal: totals.subtotal, fee: totals.fee, total: totals.total,
        pay, address: addr, customer: name || "", demo: food?.settings?.demo !== false, eta: etaFrom({ status: "sent" }, place, Number.isFinite(km) ? km : 2).toISOString(), courier: null,
      };
      const id = await placeOrder(orgId, uid, order);
      saveMe(orgId, { lastAddressId: addr.id }).catch(() => {});
      writeCart({ placeId: "", lines: [] });
      close();
      onPlaced(id);
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
              {addresses.length > 0 && <button type="button" onClick={() => setMode("pick")} className="text-[0.8125rem] font-semibold text-acc">Değiştir</button>}
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
              <button key={k} type="button" aria-pressed={pay === k} onClick={() => setPay(k)} data-press
                className={`flex-1 rounded-xl border py-2.5 text-[0.875rem] font-semibold ${pay === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{n}</button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
            <Button variant="secondary" onClick={close}>Vazgeç</Button>
            <Button loading={busy} disabled={closed || totals.short > 0 || !food} onClick={send}>
              {closed ? "Şu an kapalı" : totals.short > 0 ? `Min sepete ${tl(totals.short)} var` : addr ? "Siparişi ver" : "Adres seç"}
            </Button>
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
                  <small className="block truncate text-[0.8125rem] text-mut">{a.text}{pos && a.pos ? ` · ${km(distanceKm(pos, a.pos))}` : ""}</small>
                </span>
                {a.id === addr?.id && <Icon name="check" className="size-5 shrink-0 text-acc" />}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setMode("new")}>Buraya yeni adres</Button>
        </div>
      )}

      {mode === "new" && (
        <NewAddress pos={pos} onCancel={() => setMode(addresses.length ? "pick" : "cart")}
          onSave={async (a) => {
            const list = [...addresses, a];
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

// Yeni adres: ad (Ev/Kulüp/İş ya da yazılan), açık adres; konum şu anki yer (izin yoksa konumsuz kaydedilir)
function NewAddress({ pos, onSave, onCancel }) {
  const [name, setName] = useState("Ev");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3 pb-2">
      <div className="flex gap-2">
        {["Ev", "Kulüp", "İş"].map((n) => (
          <button key={n} type="button" aria-pressed={name === n} onClick={() => setName(n)} data-press
            className={`flex-1 rounded-xl border py-2.5 text-[0.875rem] font-semibold ${name === n ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{n}</button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın (ör. Annemler)" maxLength={24} className="h-11 w-full rounded-xl border border-line bg-card px-3.5 text-base outline-none focus:border-acc" />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Açık adres, kapı, tarif" rows={3} maxLength={200} className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-base outline-none focus:border-acc" />
      <p className="px-1 text-[0.8125rem] text-mut">{pos ? "Konum: şu an bulunduğun yer" : "Konum alınamadı; adres konumsuz kaydedilir"}</p>
      <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
        <Button variant="secondary" onClick={onCancel}>Vazgeç</Button>
        <Button loading={busy} disabled={!name.trim() || !text.trim()} onClick={async () => { setBusy(true); await onSave({ id: `a${Date.now().toString(36)}`, name: name.trim(), text: text.trim(), pos: pos || null }); setBusy(false); }}>Kaydet</Button>
      </div>
    </div>
  );
}
