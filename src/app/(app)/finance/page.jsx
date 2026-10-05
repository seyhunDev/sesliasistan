"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { loadDuesRange, loadMovementsRange } from "@/features/dues/duesData";
import { MailTo } from "@/features/mail/MailTo";
import { mailToMe } from "@/features/mail/outbox";
import { db } from "@/lib/firebase/clientApp";
import { money } from "@/lib/bankSheet";
import { lastMonths, monthOf, usedKeys } from "@/lib/dues";
import { payeeOf, whoIn } from "@/lib/payee";
import { INTERNAL, catTotals, financeName, financeSheets, monthLong, monthShort, monthly, periodTotal, withCats } from "@/lib/finance";

const card = "overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const title = "px-1 pb-2 text-[0.8125rem] font-semibold text-mut";
const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date()).slice(0, 7);
const TL = (n) => `${money(n).replace(/,00$/, "")} TL`;
const dayText = (m) => new Date((m.ts || 0) + 3 * 3600e3).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const RANGES = [6, 12];

// Gelir gider (yalnız ana hesap): banka defterinden ay ay gelen/giden/net, türlere göre (aidat, fatura, maaş…; finance.js).
// Okuma sayfa açılınca bir kez: son 12 ayın defter belgeleri + aidat ayarı ve ayları (aidat olarak onaylanan hareketler).
// Muhasebeci için Excel (Aylık özet, Hareketler, Türler): indir ya da Gmail betiğiyle mail at.
export default function FinancePage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const owner = profile?.role === "owner";
  const ym = thisMonth();
  const [all12] = useState(() => lastMonths(ym, 12));
  const [data, setData] = useState(null); // { movements, aidat, payers } | { error }
  const [n, setN] = useState(6);
  const [acct, setAcct] = useState("");
  const [open, setOpen] = useState(ym); // seçili ay
  const [cat, setCat] = useState(""); // açık tür
  const [mailPick, setMailPick] = useState(false);
  const [mailing, setMailing] = useState(false);

  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  useEffect(() => {
    if (!owner) return;
    let live = true;
    Promise.all([loadMovementsRange(profile.uid, all12[0], ym), loadDuesRange(profile.uid, all12).catch(() => ({ cfg: {}, months: {} }))])
      .then(([mv, du]) => {
        if (!live) return;
        const aidat = new Set(Object.values(du.months || {}).flatMap((m) => [...usedKeys(m)]));
        const payers = Object.values(du.cfg?.payers || {}).flat().filter(Boolean);
        setData({ movements: mv.movements || [], aidat, payers });
      })
      .catch(() => live && setData({ error: true, movements: [] }));
    return () => {
      live = false;
    };
  }, [owner, profile?.uid, ym, all12]);

  const payee = payeeOf(profile);
  const list = useMemo(() => (data ? withCats(data.movements, { payee, aidat: data.aidat, payers: data.payers }) : []), [data, payee.name, payee.account]); // eslint-disable-line react-hooks/exhaustive-deps
  const accounts = useMemo(() => {
    const map = new Map();
    for (const m of list) if (m.account && !map.has(m.account)) map.set(m.account, m.accountLabel || m.account);
    return [...map].map(([key, label]) => ({ key, label }));
  }, [list]);
  if (!owner) return null;

  const yms = all12.slice(-n);
  const shown = acct ? list.filter((m) => m.account === acct) : list;
  const months = monthly(shown, yms);
  const total = periodTotal(months);
  const max = Math.max(1, ...months.flatMap((x) => [x.inSum, x.outSum]));
  const sel = months.find((x) => x.ym === open) || months.at(-1);
  const selMoves = shown.filter((m) => monthOf(m) === sel.ym);
  const { ins, outs } = catTotals(selMoves);
  const internalN = selMoves.filter((m) => m.fin === INTERNAL).length;
  const period = `${monthLong(yms[0])} – ${monthLong(yms.at(-1))}`;

  async function excelFile() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(financeSheets(shown, yms))) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = rows[0].map((h, i) => ({ wch: Math.min(40, Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? "").length)) + 2) }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
    return new File([XLSX.write(wb, { type: "array", bookType: "xlsx" })], financeName(yms), { type: XLSX_TYPE });
  }
  const download = (file) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const excel = async () => {
    try {
      download(await excelFile());
    } catch {
      toast("Excel dosyası hazırlanamadı");
    }
  };
  const subject = () => `Gelir gider · ${period}`;
  const body = () => `${subject()}: gelen ${TL(total.inSum)}, giden ${TL(total.outSum)}, net ${TL(total.net)}.\nExcel dosyası ektedir.`;
  const mailSet = profile?.mailSeen && user && profile.orgId === user.uid ? { version: profile.mailOutbox, saved: profile.mailTo } : null;
  async function mail() {
    if (mailSet) return setMailPick(true);
    try {
      const file = await excelFile();
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: subject(), text: body() });
      else {
        download(file);
        toast("Dosya indirildi; maile ekleyip gönder");
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast("Excel dosyası hazırlanamadı");
    }
  }
  async function sendMail({ self, to }) {
    setMailPick(false);
    setMailing(true);
    try {
      await mailToMe(user.uid, { subject: subject(), text: body(), file: await excelFile(), self, to });
      toast(mailSet.version >= (to.length ? 2 : 1) ? "Mail sıraya alındı, birkaç dakika içinde gider" : "Sıraya alındı. Gitmesi için Mail ayarlarından betiği bir kez yeniden kopyala");
    } catch (e) {
      toast(e?.message || "Mail sıraya alınamadı");
    }
    setMailing(false);
  }

  const btn = "grid size-10 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-95 disabled:opacity-40";
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Gelir gider" sub="Banka hareketleri · ay ay" back="/mail">
        <button type="button" onClick={excel} disabled={!list.length} aria-label="Excel'e aktar" className={btn}>
          <Icon name="download" className="size-5" />
        </button>
        <button type="button" onClick={mail} disabled={!list.length || mailing} aria-label="Excel'i mail at" className={btn}>
          <Icon name="mail" className="size-5" />
        </button>
      </PageHeader>

      {!data ? (
        <Loading />
      ) : data.error ? (
        <p className={`${card} mt-5 px-4 py-6 text-center text-[0.875rem] text-mut`}>Banka hareketleri okunamadı. İnternet bağlantını kontrol et.</p>
      ) : !list.length ? (
        <p className={`${card} mt-5 px-4 py-6 text-center text-[0.875rem] leading-snug text-mut`}>Henüz banka hareketi yok. Günlük hesap özeti mailleri geldikçe burada ay ay görünür.</p>
      ) : (
        <>
          <div className="mt-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {RANGES.map((r) => (
              <Chip key={r} on={n === r} onClick={() => setN(r)} label={`Son ${r} ay`} />
            ))}
            {accounts.length > 1 && (
              <>
                <span className="mx-1 w-px shrink-0 bg-line" />
                <Chip on={!acct} onClick={() => setAcct("")} label="Tüm hesaplar" />
                {accounts.map((a) => (
                  <Chip key={a.key} on={acct === a.key} onClick={() => setAcct(a.key)} label={a.label} />
                ))}
              </>
            )}
          </div>

          {/* Dönem toplamı ve aylık grafik: yeşil gelen, kırmızı giden; aya dokununca ayrıntısı */}
          <section className="mt-4">
            <h2 className={title}>{period}</h2>
            <div className={card}>
              <div className="grid grid-cols-3 gap-2 px-4 pt-3.5">
                <Box label="GELEN" value={`+${TL(total.inSum)}`} cls="bg-ok/10 text-ok" />
                <Box label="GİDEN" value={`−${TL(total.outSum)}`} cls="bg-rec/10 text-rec" />
                <Box label="NET" value={`${total.net < 0 ? "−" : "+"}${TL(Math.abs(total.net))}`} cls="bg-bg text-fg" />
              </div>
              <div className="flex h-40 items-end gap-1 px-3 pb-2 pt-4" aria-label="Aylık gelen ve giden">
                {months.map((x) => (
                  <button
                    key={x.ym}
                    type="button"
                    onClick={() => (setOpen(x.ym), setCat(""))}
                    aria-label={`${monthLong(x.ym)}: gelen ${TL(x.inSum)}, giden ${TL(x.outSum)}`}
                    aria-pressed={sel.ym === x.ym}
                    className={`flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-lg pt-1 ${sel.ym === x.ym ? "bg-acc/10" : ""}`}
                  >
                    <span className="flex w-full flex-1 items-end justify-center gap-[2px]">
                      <span className="w-[38%] max-w-3 rounded-t bg-ok" style={{ height: `${(x.inSum / max) * 100}%` }} />
                      <span className="w-[38%] max-w-3 rounded-t bg-rec" style={{ height: `${(x.outSum / max) * 100}%` }} />
                    </span>
                    <span className={`text-[0.6875rem] ${sel.ym === x.ym ? "font-bold text-acc" : "text-mut"}`}>{monthShort(x.ym)}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[0.75rem] text-mut">
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-sm bg-ok" /> Gelen
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-sm bg-rec" /> Giden
                </span>
                <span className="ml-auto">Aya dokun</span>
              </div>
            </div>
          </section>

          {/* Seçili ayın türleri */}
          <section className="mt-5">
            <h2 className={title}>{monthLong(sel.ym)}</h2>
            <div className={card}>
              <div className="grid grid-cols-3 gap-2 px-4 pt-3.5">
                <Box label="GELEN" value={`+${TL(sel.inSum)}`} cls="bg-ok/10 text-ok" />
                <Box label="GİDEN" value={`−${TL(sel.outSum)}`} cls="bg-rec/10 text-rec" />
                <Box label="NET" value={`${sel.net < 0 ? "−" : "+"}${TL(Math.abs(sel.net))}`} cls="bg-bg text-fg" />
              </div>
              {!sel.n && <p className="px-4 py-5 text-center text-[0.875rem] text-mut">Bu ay banka hareketi yok.</p>}
              <Cats label="Gelen" list={ins} total={sel.inSum} out={false} moves={selMoves} open={cat} setOpen={setCat} />
              <Cats label="Giden" list={outs} total={sel.outSum} out moves={selMoves} open={cat} setOpen={setCat} />
              {internalN > 0 && <p className="px-4 pb-3 text-[0.75rem] text-mut">{internalN} hesaplar arası aktarım toplama girmedi.</p>}
            </div>
          </section>
          <p className="mt-3 px-1 text-[0.75rem] leading-snug text-mut">
            Türler banka açıklamasından ve Aidatlar&apos;daki eşleşmelerden çıkarılır. {payee.name ? `Kulüp hesabından ${payee.name} adına giden para "Ödeme: ${payee.name}" türündedir.` : ""} Yalnız TL hareketler sayılır.
          </p>
        </>
      )}

      {mailSet && (
        <MailTo
          open={mailPick}
          onClose={() => setMailPick(false)}
          saved={mailSet.saved}
          onSaved={(l) => updateDoc(doc(db, "users", user.uid), { mailTo: l }).catch(() => toast("Adres kaydedilemedi"))}
          onSend={sendMail}
        />
      )}
    </main>
  );
}

function Chip({ on, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold ${on ? "bg-acc text-white" : "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}>
      {label}
    </button>
  );
}

function Box({ label, value, cls }) {
  return (
    <div className={`min-w-0 rounded-xl px-2.5 py-2 ${cls}`}>
      <p className="text-[0.6875rem] font-semibold opacity-80">{label}</p>
      <p className="truncate text-[0.9375rem] font-bold tabular-nums">{value}</p>
    </div>
  );
}

// Türler: tutar ve oran çubuğu; dokununca o türün hareketleri
function Cats({ label, list, total, out, moves, open, setOpen }) {
  if (!list.length) return null;
  return (
    <div className="px-4 pb-2 pt-3">
      <p className="pb-1 text-[0.75rem] font-semibold text-mut">{label}</p>
      <ul className="divide-y divide-line">
        {list.map((c) => {
          const key = `${out ? "o" : "i"}:${c.cat}`;
          const on = open === key;
          const items = on ? moves.filter((m) => m.fin === c.cat && m.amount < 0 === out) : [];
          return (
            <li key={key}>
              <button type="button" onClick={() => setOpen(on ? "" : key)} aria-expanded={on} className="flex w-full items-center gap-2 py-2.5 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <b className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{c.cat}</b>
                    <b className={`shrink-0 text-[0.875rem] font-semibold tabular-nums ${out ? "text-rec" : "text-ok"}`}>
                      {out ? "−" : "+"}
                      {TL(c.sum)}
                    </b>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                      <span className={`block h-full rounded-full ${out ? "bg-rec/70" : "bg-ok/70"}`} style={{ width: `${total ? Math.max(2, (c.sum / total) * 100) : 0}%` }} />
                    </span>
                    <small className="shrink-0 text-[0.6875rem] text-mut">{c.n} hareket</small>
                  </span>
                </span>
                <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${on ? "rotate-90" : ""}`} />
              </button>
              {on && (
                <ul className="mb-2 rounded-xl bg-bg">
                  {items.map((m) => (
                    <li key={m.id || `${m.ts}${m.amount}`} className="flex items-start gap-2 px-3 py-2 text-[0.8125rem]">
                      <span className="w-12 shrink-0 text-mut">{dayText(m)}</span>
                      <span className="min-w-0 flex-1">
                        {whoIn(m) && <b className="block truncate font-semibold">{whoIn(m)}</b>}
                        <small className="block truncate text-[0.75rem] text-mut">{m.desc}</small>
                      </span>
                      <b className={`shrink-0 tabular-nums ${out ? "text-rec" : "text-ok"}`}>{TL(Math.abs(m.amount))}</b>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
