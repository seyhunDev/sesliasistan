"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { DEBT_KINDS, leftOf, tl } from "@/lib/debts";

// Verilen borçlar Hesaplar › Borçlar sekmesinde (Geri gelecek: kulübün verdikleri kasadan düşer, kişisel olanlar düşmez).
// Kayıt ve asistan aynı (debts.js, debtData.js).
const dateText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

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
  const btn = "btn w-full";
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
            <button type="button" onClick={() => onPay(0)} data-press className={`${btn} btn-primary`}>
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
                data-press
                className="btn btn-primary shrink-0"
              >
                Yaz
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={onUndo} data-press className={`${btn} btn-secondary`}>
            Ödemeleri geri al
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onEdit} data-press className={`${btn} btn-secondary`}>
            Düzenle
          </button>
          <button type="button" onClick={() => (sure ? onDelete() : setSure(true))} data-press className={`${btn} btn-danger ${sure ? "!bg-none !bg-[var(--rec)] !text-white" : ""}`}>
            {sure ? "Emin misin? Sil" : "Sil"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
