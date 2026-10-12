"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { DEBT_KINDS, leftOf, paidOf, splitDebts, tl } from "@/lib/debts";

// Verilen borçlar Hesaplar'da (ayrı Borçlar sayfası kalktı, Seyhun: "tek şey olsun"): Kulüp sekmesinde kulübün verdikleri
// (kasadan düşer), Kişisel'de "Bana borçlu olanlar". Kayıt ve asistan aynı (debts.js, debtData.js).
const dateText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const initials = (s) => s.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");
const card = "overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";

// Verilen borçların listesi (tek tür): açıklar, kalan toplam, ödenenler katlanır; "+ Borç ver"
export function LentSection({ items, kind, title, onAdd, onOpen, flat }) {
  const [showClosed, setShowClosed] = useState(false);
  const { open, closed } = splitDebts(items || [], kind);
  const left = open.reduce((n, d) => n + leftOf(d), 0);
  const row = (d) => {
    const l = leftOf(d);
    return (
      <li key={d.id}>
        <button type="button" onClick={() => onOpen(d.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-100 text-[0.75rem] font-bold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{initials(d.who)}</span>
          <span className="min-w-0 flex-1">
            <b className={`block truncate text-[0.9375rem] font-medium ${l ? "" : "text-mut line-through"}`}>{d.who}</b>
            <small className="block truncate text-[0.75rem] text-mut">{[dateText(d.date), d.note, paidOf(d) > 0 && l > 0 && `${tl(d.amount)} verildi`].filter(Boolean).join(" · ")}</small>
          </span>
          <b className={`shrink-0 text-[0.9375rem] font-semibold tabular-nums ${l ? "text-sky-700 dark:text-sky-300" : "text-mut"}`}>{l ? tl(l) : "Ödendi"}</b>
        </button>
      </li>
    );
  };
  return (
    <div className={flat ? "" : "mt-6"}>
      <div className="flex items-center gap-2 px-1 pb-2">
        <h2 className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-mut">
          {title}
          {left > 0 ? ` · ${tl(left)}` : ""}
        </h2>
        <button type="button" onClick={onAdd} className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-card px-2.5 text-[0.75rem] font-semibold text-acc shadow-[0_1px_2px_rgba(38,40,44,.06)]">
          <Icon name="plus" className="size-3.5" /> Borç ver
        </button>
      </div>
      <div className={card}>
        {open.length ? <ul className="divide-y divide-line">{open.map(row)}</ul> : <p className="px-4 py-3 text-[0.8125rem] text-mut">{closed.length ? "Hepsi geri ödendi." : "Açık borç yok."}</p>}
        {closed.length > 0 && (
          <>
            <button type="button" onClick={() => setShowClosed((v) => !v)} aria-expanded={showClosed} className="flex h-10 w-full items-center gap-2 border-t border-line px-4 text-left text-[0.8125rem] font-semibold text-mut">
              <span className="flex-1">Ödenenler ({closed.length})</span>
              <Icon name="chev" className={`size-4 transition ${showClosed ? "rotate-90" : ""}`} />
            </button>
            {showClosed && <ul className="divide-y divide-line border-t border-line">{closed.map(row)}</ul>}
          </>
        )}
      </div>
    </div>
  );
}

// Ekle / düzenle: kime, tutar, tür; tarih ve not isteğe bağlı
export function DebtForm({ value, names, onClose, onSave }) {
  const [d, setD] = useState(value || {});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const q = String(d.who || "").toLocaleLowerCase("tr-TR").trim();
  const hints = q ? names.filter((n) => n.toLocaleLowerCase("tr-TR").includes(q) && n.toLocaleLowerCase("tr-TR") !== q).slice(0, 5) : [];
  const ok = String(d.who || "").trim() && Number(String(d.amount || "").replace(",", ".")) > 0;
  const input = "h-12 w-full min-w-0 rounded-xl bg-bg px-4 text-base outline-none ring-1 ring-line focus:ring-acc";
  return (
    <Sheet open={!!value} onClose={onClose} title={value?.id ? "Borcu düzenle" : "Borç ekle"}>
      <div className="space-y-3 px-5 pb-2">
        <div>
          <input value={d.who || ""} onChange={set("who")} placeholder="Kime" className={input} />
          {hints.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hints.map((n) => (
                <button key={n} type="button" onClick={() => setD((x) => ({ ...x, who: n }))} className="h-8 rounded-full bg-bg px-3 text-[0.8125rem] font-medium ring-1 ring-line">
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input value={d.amount ?? ""} onChange={set("amount")} inputMode="decimal" placeholder="Tutar" className={input} />
          <span className="shrink-0 text-[1rem] font-semibold text-mut">TL</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DEBT_KINDS).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setD((x) => ({ ...x, kind: k }))} aria-pressed={d.kind === k} className={`h-11 rounded-xl text-[0.9375rem] font-semibold ${d.kind === k ? "bg-deep text-white" : "bg-bg ring-1 ring-line"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={d.date || ""} onChange={set("date")} aria-label="Tarih" className={`${input} appearance-none`} />
        </div>
        <input value={d.note || ""} onChange={set("note")} placeholder="Not (isteğe bağlı)" className={input} />
        <button
          type="button"
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            await onSave({ ...d, amount: Number(String(d.amount).replace(",", ".")) });
            setBusy(false);
          }}
          className="h-12 w-full rounded-xl bg-acc text-base font-semibold text-white disabled:opacity-50"
        >
          Kaydet
        </button>
      </div>
    </Sheet>
  );
}

// Ayrıntı: kalan, ödemeler; Ödendi (tamamı), Kısmi ödeme, Düzenle, Sil (onaylı)
export function DebtDetail({ debt, onClose, onPay, onUndo, onEdit, onDelete }) {
  const [part, setPart] = useState("");
  const [sure, setSure] = useState(false);
  if (!debt) return <Sheet open={false} onClose={onClose} title="" />;
  const left = leftOf(debt);
  const btn = "h-12 w-full rounded-xl text-base font-semibold";
  return (
    <Sheet open={!!debt} onClose={onClose} title={debt.who}>
      <div className="space-y-3 px-5 pb-2">
        <div className="rounded-2xl bg-bg p-4">
          <p className="text-[0.75rem] font-bold tracking-[.08em] text-mut">{left ? "KALAN" : "ÖDENDİ"}</p>
          <p className="text-[1.75rem] font-bold tabular-nums">{tl(left || debt.amount)}</p>
          <p className="text-[0.8125rem] text-mut">{[`Verilen ${tl(debt.amount)}`, DEBT_KINDS[debt.kind], dateText(debt.date)].filter(Boolean).join(" · ")}</p>
          {debt.note && <p className="mt-1 text-[0.875rem]">{debt.note}</p>}
          {debt.paid.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[0.8125rem] text-mut">
              {debt.paid.map((p) => (
                <li key={p.id}>
                  Geri geldi: {tl(p.amt)} {p.date && `· ${dateText(p.date)}`}
                </li>
              ))}
            </ul>
          )}
        </div>
        {left > 0 ? (
          <>
            <button type="button" onClick={() => onPay(0)} className={`${btn} bg-acc text-white`}>
              Hepsi ödendi
            </button>
            <div className="flex gap-2">
              <input value={part} onChange={(e) => setPart(e.target.value)} inputMode="decimal" placeholder="Kısmi ödeme (TL)" className="h-12 min-w-0 flex-1 rounded-xl bg-bg px-4 text-base outline-none ring-1 ring-line focus:ring-acc" />
              <button
                type="button"
                disabled={!(Number(part.replace(",", ".")) > 0)}
                onClick={() => {
                  onPay(Number(part.replace(",", ".")));
                  setPart("");
                }}
                className="h-12 shrink-0 rounded-xl bg-deep px-4 font-semibold text-white disabled:opacity-40"
              >
                Yaz
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={onUndo} className={`${btn} bg-bg ring-1 ring-line`}>
            Ödemeleri geri al
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onEdit} className={`${btn} bg-bg ring-1 ring-line`}>
            Düzenle
          </button>
          <button type="button" onClick={() => (sure ? onDelete() : setSure(true))} className={`${btn} ${sure ? "bg-red-600 text-white" : "bg-bg text-red-600 ring-1 ring-line"}`}>
            {sure ? "Emin misin? Sil" : "Sil"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
