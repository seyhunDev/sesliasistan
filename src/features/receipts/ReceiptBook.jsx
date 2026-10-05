"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tile } from "@/components/dashboard/Row";
import { useData } from "@/features/data/DataProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { PendingPayments } from "@/features/receipts/Payment";
import { whoText } from "@/lib/people";
import { CAT, CATS, DOC, PAYS, TLk, accountingName, accountingSheets, catOf, noText, parseTL, payOf, totalOf } from "@/lib/receipts";
import { useToast } from "@/components/ui/ToastProvider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { MailTo } from "@/features/mail/MailTo";
import { mailToMe } from "@/features/mail/outbox";
import { fdate, monthLabel, todayStr } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";
import { useDock } from "@/features/home/TabBar";
import { InvoicePanel, InvoiceRow, useInvoiceDesk } from "@/features/invoices/InvoicesView";
import { TL } from "@/lib/invoices";

const inp = "h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-base text-fg outline-none transition focus:border-acc";
const shiftMonth = (m, n) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const download = (file) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Seçim: "" hepsi, receipt yalnız fişler, invoice yalnız faturalar (ana hesap)
const KINDS = [["", "Tümü"], ["receipt", "Fiş"], ["invoice", "Fatura"]];
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");

// Fişler ve faturalar tek sayfada; kind ilk seçim (/invoices "invoice" ile açar)
export function ReceiptBook({ kind: start = "" }) {
  const { receipts, loading, myUid, nameOf } = useData();
  const toast = useToast();
  const { user, profile } = useAuth();
  // Gmail betiği kurulu ana hesap uygulamadan mail atar; değilse paylaşım menüsü (Mail seçilir)
  const mailSet = profile?.mailSeen && user && profile.orgId === user.uid ? { version: profile.mailOutbox, saved: profile.mailTo } : null;
  const [mailPick, setMailPick] = useState(false);
  const [mailing, setMailing] = useState(false);
  const { openReceipt } = useReceipt();
  const [month, setMonth] = useState(() => todayStr().slice(0, 7)); // "" = tüm zamanlar
  const [q, setQ] = useState("");
  const [cats, setCats] = useState([]);
  const [pay, setPay] = useState("");
  const [by, setBy] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [review, setReview] = useState(false);
  const [state, setState] = useState(""); // "" | pending | paid
  const [open, setOpen] = useState(false);
  // Faturalar yalnız ana hesapta; çalışan yalnız fişleri görür
  const owner = !!profile && profile.role !== "staff";
  const desk = useInvoiceDesk(owner ? profile.orgId : null);
  const [kind, setKind] = useState(start);
  const shownKind = owner ? kind : "receipt";

  const users = useMemo(() => [...new Set(receipts.map((r) => r.createdBy?.name).filter(Boolean))], [receipts]);
  const active = [pay, by, min, max, review, state].filter(Boolean).length;

  const list = useMemo(() => {
    const lo = parseTL(min);
    const hi = parseTL(max);
    const s = q.trim().toLocaleLowerCase("tr-TR");
    const match = (r) => {
        const t = totalOf(r);
        if (month && !(r.date || "").startsWith(month)) return false;
        if (cats.length && !cats.includes(r.cat)) return false;
        if (pay && r.pay !== pay) return false;
        if (by && r.createdBy?.name !== by) return false;
        if (review && r.status !== "review") return false;
        if (state && payOf(r) !== state) return false;
        if (!Number.isNaN(lo) && t < lo) return false;
        if (!Number.isNaN(hi) && t > hi) return false;
        if (s && !`${noText(r.no)} ${r.no || ""} ${r.merchant} ${r.docNo || ""} ${r.taxId || ""} ${r.note || ""} ${(r.items || []).map((i) => i.n).join(" ")}`.toLocaleLowerCase("tr-TR").includes(s)) return false;
        return true;
    };
    const byDate = (a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`);
    return shownKind === "invoice" ? [] : receipts.filter(match).sort(byDate);
  }, [receipts, month, q, cats, pay, by, min, max, review, state, shownKind]);

  // Karışık listedeki faturalar: fişe özgü süzgeçler (kategori, ödeme şekli, ekleyen, kontrol) seçiliyse girmez
  const invList = useMemo(() => {
    if (shownKind !== "" || cats.length || pay || by || review) return [];
    const lo = parseTL(min);
    const hi = parseTL(max);
    const s = low(q.trim());
    return (desk.list || []).filter((x) => {
      const day = x.date || x.due || "";
      if (month && !day.startsWith(month)) return false;
      if (state === "pending" && x.status === "paid") return false;
      if (state === "paid" && x.status !== "paid") return false;
      if (!Number.isNaN(lo) && (x.amount || 0) < lo) return false;
      if (!Number.isNaN(hi) && (x.amount || 0) > hi) return false;
      if (s && !low(`${x.seller} ${x.no} ${x.taxId} ${x.desc} ${x.note}`).includes(s)) return false;
      return true;
    });
  }, [desk.list, shownKind, month, q, cats, pay, by, min, max, review, state]);

  const total = list.reduce((a, r) => a + totalOf(r), 0);
  const vat = list.reduce((a, r) => a + (r.totals?.vat || 0), 0);
  const byCat = {};
  list.forEach((r) => (byCat[r.cat] = (byCat[r.cat] || 0) + totalOf(r)));
  const catRank = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const pending = receipts.filter((r) => r.status === "review").length;

  const groups = {};
  list.forEach((r) => (groups[r.date] = [...(groups[r.date] || []), r]));
  invList.forEach((x) => {
    const d = x.date || x.due || "";
    groups[d] = [...(groups[d] || []), { id: `inv:${x.id}`, inv: x }];
  });
  const days = Object.keys(groups).sort().reverse();

  const toggleCat = (c) => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const clear = () => {
    setPay("");
    setBy("");
    setMin("");
    setMax("");
    setReview(false);
    setState("");
  };

  // Muhasebeci için Excel: filtrelenmiş liste, fiş numarasıyla sıralı (Fişler + Kategoriler sayfası)
  async function book() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(accountingSheets(list, nameOf))) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = rows[0].map((h, i) => ({ wch: Math.min(40, Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? "").length)) + 2) }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
    return { XLSX, wb };
  }
  async function excel() {
    try {
      const { XLSX, wb } = await book();
      XLSX.writeFile(wb, accountingName(month));
    } catch {
      toast("Excel dosyası hazırlanamadı");
    }
  }
  const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  async function excelFile() {
    const { XLSX, wb } = await book();
    return new File([XLSX.write(wb, { type: "array", bookType: "xlsx" })], accountingName(month), { type: XLSX_TYPE });
  }
  const mailSubject = () => `Fişler · ${month ? monthLabel(month) : "Tüm zamanlar"}`;
  const mailBody = () => `${mailSubject()}: ${list.length} belge, toplam ${TLk(total)}, KDV ${TLk(vat)}.\nExcel dosyası ektedir.`;
  // Mail: betik kuruluysa alıcı seçilir ve uygulama gönderir; değilse telefonun paylaşım menüsü (Mail, WhatsApp…)
  async function mail() {
    if (mailSet) return setMailPick(true);
    try {
      const file = await excelFile();
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: mailSubject(), text: mailBody() });
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
      await mailToMe(user.uid, { subject: mailSubject(), text: mailBody(), file: await excelFile(), self, to });
      toast(mailSet.version >= (to.length ? 2 : 1) ? "Mail sıraya alındı, birkaç dakika içinde gider" : "Sıraya alındı. Gitmesi için Mail ayarlarından betiği bir kez yeniden kopyala");
    } catch (e) {
      toast(e?.message || "Mail sıraya alınamadı");
    }
    setMailing(false);
  }

  // Filtrelenmiş listeyi yazdırılabilir sayfada açar
  function print() {
    const title = `Fiş listesi · ${month ? monthLabel(month) : "Tüm zamanlar"}`;
    const f = [cats.length && `Kategori: ${cats.join(", ")}`, pay && `Ödeme: ${pay}`, by && `Ekleyen: ${by}`, q && `Arama: ${q}`, review && "Yalnızca kontrol bekleyenler"].filter(Boolean).join(" · ");
    const rows = [...list]
      .reverse()
      .map((r) => `<tr><td>${esc(noText(r.no))}</td><td>${esc((r.date || "").split("-").reverse().join("."))}</td><td>${esc(r.merchant)}</td><td>${esc(r.taxId)}</td><td>${esc(r.docNo)}</td><td>${esc(DOC[r.docType] || "")}</td><td>${esc(r.cat)}</td><td>${esc(r.pay)}</td><td>${esc(r.createdBy?.name)}</td><td>${payOf(r) === "pending" ? "Bekliyor" : "Ödendi"}</td><td class="n">${TLk(r.totals?.vat)}</td><td class="n">${TLk(totalOf(r))}</td></tr>`)
      .join("");
    const cat = catRank.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="n">${TLk(v)}</td></tr>`).join("");
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      body{font:12px -apple-system,Arial,sans-serif;color:#111;margin:24px}h1{font-size:18px;margin:0 0 4px}p{color:#555;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left}th{border-bottom:2px solid #111}
      .n{text-align:right;white-space:nowrap}tfoot td{font-weight:700;border-top:2px solid #111}
    </style></head><body><h1>${esc(title)}</h1><p>${esc(f || "Filtre yok")} · ${list.length} belge</p>
    <table><thead><tr><th>No</th><th>Tarih</th><th>İşletme</th><th>VKN</th><th>Belge no</th><th>Tür</th><th>Kategori</th><th>Ödeme</th><th>Ödeyen</th><th>Durum</th><th class="n">KDV</th><th class="n">Tutar</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td colspan="10">Toplam</td><td class="n">${TLk(vat)}</td><td class="n">${TLk(total)}</td></tr></tfoot></table>
    <table style="width:auto;min-width:280px"><thead><tr><th>Kategori</th><th class="n">Tutar</th></tr></thead><tbody>${cat}</tbody></table>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("Yazdırma penceresi açılamadı. Açılır pencere engelini kaldır.");
    w.document.write(html);
    w.document.close();
  }

  useDock({
    create: [
      ["camera", "Fiş fotoğrafı", "Çek ya da seç", () => openReceipt()],
      ["edit", "Elle ekle", "Tutarı yaz", () => openReceipt({ manual: true })],
      ...(owner ? [["receipt", "Fatura yükle", "PDF ya da fotoğraf", desk.pick]] : []),
    ],
  });

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      {/* Başlık */}
      <PageHeader title={owner ? "Fişler ve faturalar" : "Fişler"}>
        {shownKind !== "invoice" && (
          <>
        <button onClick={excel} disabled={!list.length} aria-label="Muhasebe Excel'i" className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-card px-3 text-[0.875rem] font-semibold text-fg transition active:scale-95 disabled:opacity-40">
          <Icon name="download" className="size-4" /> Excel
        </button>
        <button onClick={mail} disabled={!list.length || mailing} aria-label="Excel'i mail at" className="grid size-9 place-items-center rounded-xl border border-line bg-card text-fg transition active:scale-95 disabled:opacity-40">
          <Icon name="mail" className="size-[1.125rem]" />
        </button>
        <button onClick={print} disabled={!list.length} aria-label="Yazdır" className="grid size-9 place-items-center rounded-xl border border-line bg-card text-fg transition active:scale-95 disabled:opacity-40">
          <Icon name="print" className="size-[1.125rem]" />
        </button>
          </>
        )}
      </PageHeader>
      {owner && (
        <div className="-mx-5 mt-1 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {KINDS.map(([k, l]) => (
            <button
              key={k || "all"}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${kind === k ? "border-acc bg-acc text-white" : "border-line bg-card"}`}
            >
              {l}
              {k === "invoice" && desk.sum.open > 0 && <span className={`ml-1.5 rounded-full px-1.5 text-[0.75rem] ${kind === k ? "bg-white/25" : "bg-rec/10 text-rec"}`}>{desk.sum.open}</span>}
            </button>
          ))}
        </div>
      )}
      {owner && desk.sheets}

      {shownKind === "invoice" ? (
        <InvoicePanel desk={desk} />
      ) : (
      <>

      {/* Ay seçici */}
      <div className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-card p-1">
        <button onClick={() => setMonth((m) => shiftMonth(m || todayStr().slice(0, 7), -1))} aria-label="Önceki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg">
          <Icon name="back" className="size-5" />
        </button>
        <button onClick={() => setMonth((m) => (m ? "" : todayStr().slice(0, 7)))} className="text-[0.9375rem] font-semibold capitalize">
          {month ? monthLabel(month) : "Tüm zamanlar"}
        </button>
        <button onClick={() => setMonth((m) => shiftMonth(m || todayStr().slice(0, 7), 1))} aria-label="Sonraki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg">
          <Icon name="chev" className="size-5" />
        </button>
      </div>

      {/* Özet */}
      <div className="mt-3 rounded-2xl bg-acc p-4 text-white">
        <div className="text-[1.75rem] font-bold leading-tight tracking-tight tabular-nums">{TLk(total)}</div>
        <p className="text-[0.8125rem] opacity-80">
          {list.length} fiş · KDV {TLk(vat)}
        </p>
        {total > 0 && (
          <>
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/20">
              {catRank.map(([c, v]) => (
                <span key={c} style={{ width: `${(v / total) * 100}%`, background: catOf(c).color }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] opacity-90">
              {catRank.slice(0, 3).map(([c, v]) => (
                <span key={c} className="flex items-center gap-1">
                  <i className="size-2 rounded-full" style={{ background: catOf(c).color }} /> {c} {TLk(v)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <PendingPayments />

      {shownKind === "" && desk.sum.open > 0 && (
        <button onClick={() => setKind("invoice")} className="mt-3 flex w-full items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-3 text-left active:scale-[.98]">
          <Icon name="receipt" className="size-5 text-acc" />
          <span className="flex-1 text-[0.9375rem] font-semibold">
            {desk.sum.open} fatura ödenmedi · {TL(desk.sum.sum)}
            {desk.sum.late > 0 && <span className="text-rec"> · {desk.sum.late} gecikti</span>}
          </span>
          <Icon name="chev" className="size-4" />
        </button>
      )}

      {pending > 0 && !review && (
        <button onClick={() => setReview(true)} className="mt-3 flex w-full items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-amber-900 active:scale-[.98]">
          <Icon name="alert" className="size-5" />
          <span className="flex-1 text-[0.9375rem] font-semibold">{pending} fiş kontrol bekliyor</span>
          <Icon name="chev" className="size-4" />
        </button>
      )}

      {/* Arama + filtre */}
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-[1.125rem] -translate-y-1/2 text-mut" />
          <input className={`${inp} pl-10`} type="search" placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Filtreler"
          className={`relative grid size-11 shrink-0 place-items-center rounded-xl border transition active:scale-95 ${open || active ? "border-acc bg-acc/10 text-acc" : "border-line bg-card"}`}
        >
          <Icon name="filter" className="size-5" />
          {active > 0 && <span className="absolute -right-1 -top-1 grid size-[1.125rem] place-items-center rounded-full bg-acc text-[0.6875rem] font-bold text-white">{active}</span>}
        </button>
      </div>

      {open && (
        <div className="fade-in mt-2 space-y-2 rounded-2xl border border-line bg-card p-3">
          <div className="flex rounded-xl bg-bg p-[0.1875rem]">
            {["", ...PAYS].map((p) => (
              <button key={p || "all"} onClick={() => setPay(p)} className={`flex-1 rounded-[0.625rem] py-2 text-sm font-semibold transition ${pay === p ? "bg-card shadow-sm" : "text-mut"}`}>
                {p || "Tümü"}
              </button>
            ))}
          </div>
          {users.length > 1 && (
            <select className={inp} value={by} onChange={(e) => setBy(e.target.value)} aria-label="Ekleyen">
              <option value="">Herkes</option>
              {users.map((u) => <option key={u}>{u}</option>)}
            </select>
          )}
          <div className="flex rounded-xl bg-bg p-[0.1875rem]">
            {[["", "Hepsi"], ["pending", "Ödeme bekleyen"], ["paid", "Ödenen"]].map(([v, l]) => (
              <button key={v || "all"} onClick={() => setState(v)} className={`flex-1 rounded-[0.625rem] py-2 text-sm font-semibold transition ${state === v ? "bg-card shadow-sm" : "text-mut"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} inputMode="decimal" placeholder="En az ₺" value={min} onChange={(e) => setMin(e.target.value)} />
            <input className={inp} inputMode="decimal" placeholder="En çok ₺" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <label className="flex items-center justify-between px-1 py-1 text-[0.9375rem]">
            Yalnızca kontrol bekleyenler
            <input type="checkbox" className="size-5 accent-[var(--acc)]" checked={review} onChange={(e) => setReview(e.target.checked)} />
          </label>
          {active > 0 && (
            <button onClick={clear} className="h-10 w-full text-sm font-semibold text-acc">
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {/* Kategoriler */}
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {CATS.map((c) => {
          const on = cats.includes(c);
          return (
            <button key={c} onClick={() => toggleCat(c)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95 ${on ? "border-acc bg-acc text-white" : "border-line bg-card"}`}>
              <Icon name={CAT[c].icon} className="size-4" /> {c}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <Loading />
      ) : days.length === 0 ? (
        <div className="py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-card text-mut ring-1 ring-line">
            <Icon name="receipt" className="size-7" />
          </span>
          <p className="mt-3 text-[0.9375rem] text-mut">{receipts.length || desk.list?.length ? "Bu filtrede kayıt yok" : "Henüz fiş yok"}</p>
          {!receipts.length && <p className="mt-1 text-[0.8125rem] text-mut">Aşağıdan fotoğrafını çek ya da elle ekle.</p>}
        </div>
      ) : (
        days.map((d) => (
          <section key={d}>
            <h3 className="mb-2 mt-5 px-1 text-[0.8125rem] font-medium text-mut">{fdate(d)}</h3>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {groups[d].map((r) =>
                r.inv ? (
                  <InvoiceRow key={r.id} inv={r.inv} desk={desk} badge />
                ) : (
                <Link key={r.id} href={`/receipts/${r.id}`} className="flex items-center gap-3 px-4 py-3 transition active:bg-bg">
                  <Tile icon={catOf(r.cat).icon} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">
                      {shownKind === "" && <span className="mr-1.5 rounded-md bg-acc/10 px-1.5 py-0.5 align-[1px] text-[0.6875rem] font-bold uppercase tracking-wide text-acc">Fiş</span>}
                      {r.no > 0 && <span className="mr-1.5 font-mono text-[0.8125rem] font-semibold text-acc">{noText(r.no)}</span>}
                      {r.merchant || "İsimsiz"}
                    </b>
                    <small className="block truncate text-[0.8125rem] text-mut">
                      {[r.time, r.cat, r.pay].filter(Boolean).join(" · ")}
                      {whoText(r, myUid, nameOf) && <span className="text-acc"> · {whoText(r, myUid, nameOf)}</span>}
                    </small>
                    {payOf(r) === "pending" ? <small className="block text-[0.75rem] font-semibold text-amber-700">Ödeme bekliyor</small> : <small className="block text-[0.75rem] font-semibold text-ok">Ödendi</small>}
                  </span>
                  {r.status === "review" && <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-label="Kontrol bekliyor" />}
                  <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{TLk(totalOf(r))}</span>
                </Link>
                ),
              )}
            </div>
          </section>
        ))
      )}

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
