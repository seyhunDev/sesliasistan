"use client";

import { useMemo, useState } from "react";
import { Sheet, SheetActions } from "./Sheet";

const fold = (s) => (s || "").toLocaleLowerCase("tr-TR");

// Ortak seçim listesi (Seyhun 2026-11-09 onaylı "Ortak eylemler"): kişi, sporcu, grup… seçmek her yerde böyle.
// items: [{ id, title, sub?, right?, rightTone? ("rec") }]. 8'den fazla öğe varsa üstte arama.
// Tek seçim: dokununca onPick(id) çağrılır ve kapanır. Çoklu (multi): yuvarlak işaretler, altta "Seç (n)" → onPick([id]).
// iPad'de anchor (düğmenin ref'i) verilirse liste düğmenin altında küçük kutu olarak açılır.
export function PickSheet({ open, onClose, title, items, onPick, multi, value, anchor, yes = "Seç" }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(value || []);
  const [was, setWas] = useState(open);
  if (was !== open) {
    setWas(open);
    if (open) {
      setQ("");
      setSel(value || []);
    }
  }
  const shown = useMemo(() => {
    const k = fold(q.trim());
    return k ? items.filter((x) => fold(`${x.title} ${x.sub || ""}`).includes(k)) : items;
  }, [items, q]);
  const tap = (id) => {
    if (!multi) {
      onClose();
      return onPick(id);
    }
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      anchor={anchor}
      footer={multi && <SheetActions onCancel={onClose} yes={sel.length ? `${yes} (${sel.length})` : yes} disabled={!sel.length} onYes={() => (onClose(), onPick(sel))} />}
    >
      {items.length > 8 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Ara"
          enterKeyHint="search"
          aria-label="Ara"
          className="mb-2 h-10 w-full rounded-xl border border-transparent bg-bg px-3.5 text-base text-fg outline-none placeholder:text-mut/70 focus:border-acc focus:bg-card"
        />
      )}
      <ul className="pb-2">
        {shown.map((x) => {
          const on = sel.includes(x.id);
          return (
            <li key={x.id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => tap(x.id)} aria-pressed={multi ? on : undefined} data-press="row" className="flex min-h-12 w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{x.title}</b>
                  {x.sub && <small className="block truncate text-[0.8125rem] text-mut">{x.sub}</small>}
                </span>
                {x.right != null && <span className={`shrink-0 text-[0.8125rem] font-semibold tabular-nums ${x.rightTone === "rec" ? "text-rec" : "text-mut"}`}>{x.right}</span>}
                {multi && (
                  <span aria-hidden="true" className={`grid size-[1.375rem] shrink-0 place-items-center rounded-full border-2 ${on ? "border-acc bg-acc" : "border-line"}`}>
                    {on && <span className="h-[0.3125rem] w-[0.5625rem] -translate-y-px -rotate-45 border-b-2 border-l-2 border-white" />}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {!shown.length && <li className="py-4 text-center text-[0.875rem] text-mut">Bulunamadı</li>}
      </ul>
    </Sheet>
  );
}
