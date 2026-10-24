"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { defaultPicks, makeLine, pickProblem, unitPrice } from "../order";
import { Img, tl } from "./Img";

// Ürün penceresi (örnek 3): fotoğraf, seçenek grupları (tek/çok seçim), not, adet, "Sepete ekle · ₺".
export function ItemSheet({ item, onClose, onAdd, closed }) {
  const [picks, setPicks] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [shown, setShown] = useState(null); // kapanırken içerik kaybolmasın
  if (item && item !== shown) {
    setShown(item);
    setPicks(defaultPicks(item));
    setQty(1);
    setNote("");
  }
  const toggle = (g, name) =>
    setPicks((p) => {
      const cur = p[g.name] || [];
      if (g.type === "one") return { ...p, [g.name]: [name] };
      const next = cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name];
      return { ...p, [g.name]: g.max ? next.slice(-g.max) : next };
    });
  const problem = shown ? pickProblem(shown, picks) : "";
  const price = shown ? unitPrice(shown, picks) * qty : 0;

  return (
    <Sheet open={!!item} onClose={onClose} title={shown?.name || ""}>
      {shown && (
        <div className="space-y-4 pb-2">
          <Img src={shown.photo} w={800} alt={shown.name} className="h-44 w-full rounded-2xl" />
          {shown.desc && <p className="text-[0.9375rem] text-mut">{shown.desc}</p>}
          {shown.options.map((g) => (
            <div key={g.name}>
              <h3 className="mb-1.5 px-1 text-[0.8125rem] font-bold text-mut">{g.name}{g.type === "many" && g.max ? ` · en çok ${g.max}` : ""}</h3>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const on = (picks[g.name] || []).includes(o.name);
                  return (
                    <button key={o.name} type="button" aria-pressed={on} onClick={() => toggle(g, o.name)} data-press
                      className={`rounded-xl border px-3 py-2 text-[0.875rem] font-semibold ${on ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>
                      {o.name}{o.extra ? ` ${o.extra > 0 ? "+" : "−"}${tl(Math.abs(o.extra))}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (ör. az pişmiş olsun)" maxLength={80}
            className="h-11 w-full rounded-xl border border-line bg-card px-3.5 text-base outline-none focus:border-acc" />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Azalt" data-press className="btn btn-round btn-sm"><Icon name="minus" className="size-4" /></button>
            <b className="w-6 text-center text-[1.0625rem] tabular-nums">{qty}</b>
            <button type="button" onClick={() => setQty((n) => Math.min(20, n + 1))} aria-label="Artır" data-press className="btn btn-round btn-sm"><Icon name="plus" className="size-4" /></button>
          </div>
          <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
            <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
            <Button disabled={!!problem || closed} onClick={() => onAdd(makeLine(shown, { qty, picks, note: note.trim() }))}>
              {closed ? "Şu an kapalı" : problem || `Sepete ekle · ${tl(price)}`}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
