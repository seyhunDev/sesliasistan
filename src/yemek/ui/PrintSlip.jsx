"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { lineDetail } from "../order";
import { orderNo } from "../qr";
import { OrderQr } from "./OrderQr";
import { tl } from "./Img";

// Basılan sipariş fişi (Restoran ekranı › Bastır): 80 mm fiş yazıcısına göre; sayfanın geri kalanı basılmaz (globals.css .print-slip).
// Altta siparişin kare kodu: kurye okutup kabul edince sipariş ona verilir.
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function PrintSlip({ order: o, place, onDone }) {
  useEffect(() => {
    const done = () => onDone();
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(<Slip o={o} place={place} />, document.body);
}

export function Slip({ o, place }) {
  return (
    <div className="print-slip">
      <h1>{place?.name || o.placeName}</h1>
      <p className="ps-no">Sipariş #{orderNo(o.id)} · {hm(o.at)}</p>
      <hr />
      {o.lines.map((l, i) => (
        <div key={i} className="ps-line">
          <span>{l.qty}× {l.name}{lineDetail(l) && <small>{lineDetail(l)}</small>}</span>
          <b>{tl(l.total ?? l.unit * l.qty)}</b>
        </div>
      ))}
      <hr />
      {o.fee > 0 && <div className="ps-line"><span>Teslim</span><b>{tl(o.fee)}</b></div>}
      <div className="ps-line ps-total"><span>Toplam</span><b>{tl(o.total)}</b></div>
      <p>{o.pay === "kapıda-nakit" ? "Kapıda nakit" : "Kapıda kart"}</p>
      <hr />
      <p><b>{o.customer || "Müşteri"}</b>{o.phone ? ` · ${o.phone}` : ""}</p>
      {o.address && <p>{o.address.name} · {o.address.text}{o.address.note ? ` · ${o.address.note}` : ""}</p>}
      <OrderQr id={o.id} className="ps-qr" />
      <p className="ps-no">#{orderNo(o.id)}</p>
    </div>
  );
}
