"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { useData } from "@/features/data/DataProvider";
import { athleteNames } from "@/features/athletes/data";
import { loadDebts, updateDebts } from "@/features/debts/debtData";
import { DEBT_KINDS, cleanDebt, debtTotals, leftOf, newId, paidOf, payDebt, splitDebts, tl } from "@/lib/debts";
import { todayStr } from "@/lib/utils/format";

// Borçlar (Hesaplar'dan bağımsız): kime ne kadar para verildi, kişisel mi kulüpten mi. Üstte kalan toplam, altta liste.
// Satıra dokun: ödendi / kısmi ödeme / düzenle / sil. Asistan: "Ali'ye 500 lira borç verdim", "Ali borcunu ödedi", "kime ne kadar borç verdim".
const dateText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const initials = (s) => s.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");

export default function DebtsPage() {
  const { profile } = useAuth();
  const kind = useKind();
  const { members } = useData();
  const toast = useToast();
  const orgId = profile?.orgId;
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(null); // yeni ya da düzenlenen borç
  const [open, setOpen] = useState(null); // ayrıntısı açık borç kimliği
  const [showClosed, setShowClosed] = useState(false);

  const load = useCallback((fresh) => orgId && loadDebts(orgId, { fresh }).then(setItems).catch(() => setItems([])), [orgId]);
  useEffect(() => {
    load(false);
    const on = () => load(false);
    window.addEventListener("sa-debts-saved", on);
    return () => window.removeEventListener("sa-debts-saved", on);
  }, [load]);

  const save = async (fn, ok) => {
    try {
      setItems(await updateDebts(orgId, fn));
      if (ok) toast(ok);
      return true;
    } catch {
      toast("Kaydedilemedi, tekrar dene");
      return false;
    }
  };

  const names = useMemo(() => {
    const all = [...(items || []).map((d) => d.who), ...members.map((m) => m.name), ...athleteNames()];
    return [...new Set(all.filter(Boolean).map((s) => s.trim()))].slice(0, 300);
  }, [items, members]);

  if (kind && kind !== "owner")
    return (
      <main className="mx-auto max-w-[30rem] px-5">
        <PageHeader title="Borçlar" />
        <p className="mt-10 text-center text-[0.9375rem] text-mut">Borçlar yalnız ana hesapta.</p>
      </main>
    );

  const tot = debtTotals(items || []);
  const both = (items || []).some((d) => d.kind === "club") && (items || []).some((d) => d.kind === "personal");
  const { open: openList, closed } = splitDebts(items || [], filter);
  const cur = (items || []).find((d) => d.id === open);

  const row = (d) => {
    const left = leftOf(d);
    const part = paidOf(d) > 0 && left > 0;
    return (
      <li key={d.id}>
        <button type="button" onClick={() => setOpen(d.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ${d.kind === "club" ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" : "bg-acc/10 text-acc"}`}>{initials(d.who)}</span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[1rem] font-semibold ${left ? "" : "text-mut line-through"}`}>{d.who}</span>
            <small className="block truncate text-[0.75rem] text-mut">{[DEBT_KINDS[d.kind], dateText(d.date), d.note].filter(Boolean).join(" · ")}</small>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[1rem] font-bold tabular-nums">{tl(left || d.amount)}</span>
            {part && <small className="block text-[0.6875rem] text-mut">/ {tl(d.amount)}</small>}
            {!left && <small className="block text-[0.6875rem] font-semibold text-ok">Ödendi</small>}
          </span>
        </button>
      </li>
    );
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Borçlar" sub="Kime ne kadar para verdin">
        <button type="button" onClick={() => setForm({ kind: "personal", date: todayStr() })} aria-label="Borç ekle" className="grid size-11 place-items-center rounded-full bg-deep text-white active:scale-95">
          <Icon name="plus" className="size-6" />
        </button>
      </PageHeader>

      {!items ? (
        <Loading className="py-10" />
      ) : (
        <>
          <div className="mt-2 rounded-[1.5rem] bg-deep p-5 text-white">
            <p className="text-[0.75rem] font-bold tracking-[.08em] text-white/70">GERİ GELECEK</p>
            <p className="mt-1 text-[2.25rem] font-bold leading-none tabular-nums">{tl(tot.left)}</p>
            <p className="mt-2 text-[0.875rem] text-white/80">
              {tot.count ? `${tot.people} kişi${both ? ` · Kişisel ${tl(tot.personal)} · Kulüp ${tl(tot.club)}` : ""}` : "Açık borç yok"}
            </p>
          </div>

          {both && (
            <div className="mt-3 flex gap-2">
              {[["", "Tümü"], ["personal", "Kişisel"], ["club", "Kulüp"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={`h-9 rounded-full px-4 text-[0.875rem] font-semibold ${filter === k ? "bg-deep text-white" : "bg-card ring-1 ring-line"}`}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {openList.length > 0 ? (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05)]">{openList.map(row)}</ul>
          ) : (
            <div className="mt-8 flex flex-col items-center text-center">
              <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
                <Icon name="coins" className="size-7" />
              </span>
              <p className="mt-3 text-[0.9375rem] text-mut">{items.length ? "Hepsi geri ödendi." : "Henüz borç yok. + ile ekle."}</p>
            </div>
          )}

          {closed.length > 0 && (
            <>
              <button type="button" onClick={() => setShowClosed(!showClosed)} className="mt-5 flex w-full items-center justify-between px-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">
                ÖDENENLER · {closed.length}
                <Icon name="chev" className={`size-4 transition ${showClosed ? "rotate-90" : ""}`} />
              </button>
              {showClosed && <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[1.25rem] bg-card/70">{closed.map(row)}</ul>}
            </>
          )}
          <p className="mt-4 px-1 text-[0.75rem] text-mut">Asistana da söyleyebilirsin: “Ali&apos;ye 500 lira borç verdim”, “Ali borcunu ödedi”.</p>
        </>
      )}

      <DebtForm
        key={form ? form.id || "new" : "off"}
        value={form}
        names={names}
        onClose={() => setForm(null)}
        onSave={async (d) => {
          const isNew = !d.id;
          const x = cleanDebt({ ...d, id: d.id || newId(), at: d.at || new Date().toISOString() });
          if (await save((list) => (isNew ? [x, ...list] : list.map((y) => (y.id === x.id ? { ...x, paid: y.paid } : y))), isNew ? "Borç eklendi" : "Kaydedildi")) setForm(null);
        }}
      />
      <DebtDetail
        key={cur?.id || "off"}
        debt={cur}
        onClose={() => setOpen(null)}
        onPay={(amt) => save((list) => list.map((y) => (y.id === cur.id ? payDebt(y, amt, todayStr()) : y)), "Ödeme yazıldı")}
        onUndo={() => save((list) => list.map((y) => (y.id === cur.id ? { ...y, paid: [] } : y)), "Ödemeler geri alındı")}
        onEdit={() => {
          setForm(cur);
          setOpen(null);
        }}
        onDelete={async () => {
          if (await save((list) => list.filter((y) => y.id !== cur.id), "Silindi")) setOpen(null);
        }}
      />
    </main>
  );
}

// Ekle / düzenle: kime, tutar, tür; tarih ve not isteğe bağlı
function DebtForm({ value, names, onClose, onSave }) {
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
function DebtDetail({ debt, onClose, onPay, onUndo, onEdit, onDelete }) {
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
