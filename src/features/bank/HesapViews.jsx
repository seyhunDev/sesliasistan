"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { amt, byMonth, monthText, para } from "@/lib/hesapRows";

// Hesaplar sekmelerinin ortak parçaları (Seyhun 2026-10-17, "sade, kullanışlı"): her sekme tek liste, aylara göre;
// satır = solda başlık + gün · açıklama, sağda tutar + durum; dokununca ayrıntı penceresi. Ekleme düğmesi alt çubuğun üstünde.
// Yeni tasarım (2026-11-03): liste kartı ve bölüm başlığı ortak listeyle (Row.jsx RowList / ListHead) aynı görünür
export const card = "overflow-hidden rounded-[1.25rem] border border-line bg-card";
export const head = "mb-1.5 flex items-baseline gap-2 px-1 text-[0.8125rem] font-bold tracking-[.04em] text-mut";
const up = (t) => String(t || "").toLocaleUpperCase("tr-TR");

// Aylara bölünmüş tek liste; ilk `step` satır, "Daha fazla göster" ile devamı
export function MonthList({ rows, step = 30, empty }) {
  const [max, setMax] = useState(step);
  if (!rows.length) return empty ? <p className={`${card} px-4 py-5 text-center text-[0.9375rem] text-mut`}>{empty}</p> : null;
  const groups = [];
  for (const g of byMonth(rows)) {
    const used = groups.reduce((n, x) => n + x.shown.length, 0);
    if (used >= max) break;
    groups.push({ ...g, shown: g.rows.slice(0, max - used) });
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.ym}>
          <h3 className={head}>
            <span className="min-w-0 flex-1 truncate">{up(monthText(g.ym))}</span>
            <span className="shrink-0 font-semibold tracking-normal tabular-nums">{[g.in > 0 && `+${para(g.in)}`, g.out > 0 && `−${para(g.out)}`].filter(Boolean).join(" · ")}</span>
          </h3>
          <ul className={`${card} divide-y divide-line`}>
            {g.shown.map((r) => (
              <Line key={r.id} {...r} />
            ))}
          </ul>
        </section>
      ))}
      {rows.length > max && (
        <button type="button" onClick={() => setMax((n) => n + 50)} className={`${card} h-11 w-full text-[0.875rem] font-semibold text-acc`}>
          Daha fazla göster
        </button>
      )}
    </div>
  );
}

// Tek satır: başlık, alt satır; sağda tutar ve durum (warn: amber, gerçek uyarı); action: { label, onClick } sağda küçük düğme
export function Line({ title, sub, amount, status, warn, done, onClick, action }) {
  return (
    <li className="flex items-center">
      <button type="button" onClick={onClick} data-press="row" className="flex min-h-[3.5rem] min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <b className={`block truncate text-[0.9375rem] font-semibold ${done ? "text-mut line-through" : ""}`}>{title || "İsimsiz"}</b>
          {sub && <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>}
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-[0.9375rem] font-bold tabular-nums ${amount > 0 ? "text-ok" : ""}`}>{amt(amount)}</span>
          {status && <small className={`block max-w-[7.5rem] truncate text-[0.75rem] ${warn ? "font-semibold text-warn" : "text-mut"}`}>{status}</small>}
        </span>
      </button>
      {action && (
        <button type="button" onClick={action.onClick} data-press className="btn btn-secondary btn-sm mr-3 shrink-0">
          {action.label}
        </button>
      )}
    </li>
  );
}

// Başlıklı küçük liste (Ödenecek, Geri gelecek…): toplam sağda
export function Group({ title, total, rows, className = "" }) {
  if (!rows.length) return null;
  return (
    <section className={className}>
      <h3 className={head}>
        <span className="min-w-0 flex-1 truncate">{up(title)}</span>
        {total ? <span className="shrink-0 font-semibold tracking-normal tabular-nums">{para(total)} ₺</span> : null}
      </h3>
      <ul className={`${card} divide-y divide-line`}>
        {rows.map((r) => (
          <Line key={r.id} {...r} />
        ))}
      </ul>
    </section>
  );
}

// Kapalı başlık: dokununca açılır (arşiv, ödenenler)
export function Fold({ title, rows, children }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  return (
    <section className="mt-6">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-press="row" className={`${head} w-full text-left`}>
        <span className="min-w-0 flex-1 truncate">
          {up(title)} <span className="font-semibold tabular-nums">{rows.length}</span>
        </span>
        <span className="shrink-0 font-semibold tracking-normal text-acc">{open ? "Gizle" : "Göster"}</span>
      </button>
      {open && (
        <ul className={`${card} divide-y divide-line`}>
          {rows.map((r) => (
            <Line key={r.id} {...r} />
          ))}
          {children}
        </ul>
      )}
    </section>
  );
}

// Sekmenin tek ekleme düğmesi: alt çubuğun hemen üstünde sabit (globals.css body[data-dock] .fixed[data-pagebar])
export function AddBar({ label, onClick }) {
  return (
    <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
      <button type="button" onClick={onClick} data-press className="btn btn-primary mx-auto flex w-full max-w-[26.25rem]">
        {label}
      </button>
    </div>
  );
}

// Ne ekleneceğini seçme penceresi: [[etiket, iş], …]
export function Choose({ open, onClose, title, options }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        {(options || []).map(([label, fn]) => (
          <button key={label} type="button" onClick={() => (onClose(), fn())} data-press className="btn btn-secondary w-full">
            {label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
