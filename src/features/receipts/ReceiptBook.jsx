"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { Empty } from "@/components/ui/Page";
import { buttonClass } from "@/components/ui/buttonClass";
import { useData } from "@/features/data/DataProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { PendingPayments } from "@/features/receipts/Payment";
import { whoText } from "@/lib/people";
import { CATS, DOC, PAYS, TLk, accountingName, accountingSheets, catOf, needsCheck, noText, parseTL, payOf, totalOf } from "@/lib/receipts";
import { useToast } from "@/components/ui/ToastProvider";
import { doc } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { MailTo } from "@/features/mail/MailTo";
import { mailToMe } from "@/features/mail/outbox";
import { fdate, monthLabel, todayStr } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";
import { useDock } from "@/features/home/TabBar";
import { InvoicePanel, InvoiceRow, useInvoiceDesk } from "@/features/invoices/InvoicesView";
import { TL } from "@/lib/invoices";
import { tieOf } from "@/lib/hesapRows";

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
const KINDS = [["", "Tümü"], ["receipt", "Fişler"], ["invoice", "Faturalar"]];
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");

// Faturanın listedeki günü: ödenen fatura ödendiği gün (ayın dışında kalıp Faturalar'dakinden eksik görünmesin), ödenmeyen faturanın tarihi
const invDay = (x) => (x.status === "paid" && x.paidAt) || x.date || x.due || "";

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
  // "" | personal | club; /receipts?scope=kisisel Kişisel'i açar (Hesaplar › Kişisel'deki kart harcamaları)
  const [scope, setScope] = useState(() => (typeof window !== "undefined" ? ({ kisisel: "personal", kulup: "club" })[new URLSearchParams(window.location.search).get("scope")] || "" : ""));
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false); // ⋯ penceresi (Excel, mail, yazdır)
  const [invTab, setInvTab] = useState("open"); // Faturalar: open | paid | all
  // Faturalar yalnız ana hesapta; çalışan yalnız fişleri görür
  const owner = !!profile && profile.role !== "staff";
  const desk = useInvoiceDesk(owner ? profile.orgId : null);
  const [kind, setKind] = useState(start);
  const shownKind = owner ? kind : "receipt";

  const users = useMemo(() => [...new Set(receipts.map((r) => r.createdBy?.name).filter(Boolean))], [receipts]);
  const active = [pay, by, min, max, review, state, scope].filter(Boolean).length;

  const list = useMemo(() => {
    const lo = parseTL(min);
    const hi = parseTL(max);
    const s = q.trim().toLocaleLowerCase("tr-TR");
    const match = (r) => {
        const t = totalOf(r);
        if (month && !review && !(r.date || "").startsWith(month)) return false; // kontrol bekleyenler ay seçiminden bağımsız
        if (shownKind === "receipt" && cats.length && !cats.includes(r.cat)) return false;
        if (pay && r.pay !== pay) return false;
        if (by && r.createdBy?.name !== by) return false;
        if (review && !needsCheck(r)) return false;
        if (state && payOf(r) !== state) return false;
        if (scope && (r.scope || "club") !== scope) return false;
        if (!Number.isNaN(lo) && t < lo) return false;
        if (!Number.isNaN(hi) && t > hi) return false;
        if (s && !`${noText(r.no)} ${r.no || ""} ${r.merchant} ${r.docNo || ""} ${r.taxId || ""} ${r.note || ""} ${(r.items || []).map((i) => i.n).join(" ")}`.toLocaleLowerCase("tr-TR").includes(s)) return false;
        return true;
    };
    const byDate = (a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`) || tieOf(b).localeCompare(tieOf(a)) || String(a.id).localeCompare(String(b.id)); // sabit sıra
    return shownKind === "invoice" ? [] : receipts.filter(match).sort(byDate);
  }, [receipts, month, q, cats, pay, by, min, max, review, state, scope, shownKind]);

  // Tümü'deki faturalar: fişe özgü süzgeçler (ödeme şekli, ekleyen, kontrol) seçiliyse girmez
  const invMatch = useMemo(() => {
    if (shownKind !== "" || pay || by || review || scope) return [];
    const lo = parseTL(min);
    const hi = parseTL(max);
    const s = low(q.trim());
    return (desk.list || []).filter((x) => {
      if (month && !invDay(x).startsWith(month)) return false;
      if (state === "pending" && x.status === "paid") return false;
      if (state === "paid" && x.status !== "paid") return false;
      if (!Number.isNaN(lo) && (x.amount || 0) < lo) return false;
      if (!Number.isNaN(hi) && (x.amount || 0) > hi) return false;
      if (s && !low(`${x.seller} ${x.no} ${x.taxId} ${x.desc} ${x.note}`).includes(s)) return false;
      return true;
    });
  }, [desk.list, shownKind, month, q, pay, by, min, max, review, state, scope]);
  // Tümü'de ödenmemiş faturalar ayın dışında da en üstte ayrı bölümde (son güne göre), ödenenler gün listesinde
  const invOpen = useMemo(() => {
    if (shownKind !== "" || pay || by || review || scope || state === "paid") return [];
    const lo = parseTL(min);
    const hi = parseTL(max);
    const s = low(q.trim());
    return (desk.list || [])
      .filter((x) => x.status !== "paid")
      .filter((x) => (Number.isNaN(lo) || (x.amount || 0) >= lo) && (Number.isNaN(hi) || (x.amount || 0) <= hi))
      .filter((x) => !s || low(`${x.seller} ${x.no} ${x.taxId} ${x.desc} ${x.note}`).includes(s))
      .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || String(a.id).localeCompare(String(b.id)));
  }, [desk.list, shownKind, q, pay, by, min, max, review, state, scope]);
  const invList = invMatch.filter((x) => x.status === "paid");

  const total = list.reduce((a, r) => a + totalOf(r), 0);
  const vat = list.reduce((a, r) => a + (r.totals?.vat || 0), 0);
  const byCat = {};
  list.forEach((r) => (byCat[r.cat] = (byCat[r.cat] || 0) + totalOf(r)));
  const catRank = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const pending = receipts.filter(needsCheck).length; // listedeki süzgeçle aynı kaynak (needsCheck)

  const groups = {};
  list.forEach((r) => (groups[r.date] = [...(groups[r.date] || []), r]));
  invList.forEach((x) => {
    const d = invDay(x);
    groups[d] = [...(groups[d] || []), { id: `inv:${x.id}`, inv: x }];
  });
  const days = Object.keys(groups).sort().reverse();

  // Uyarıya dokununca sayılan fişlerin hepsi görünsün: diğer süzgeçler temizlenir
  const showReview = () => {
    clear();
    setCats([]);
    setQ("");
    if (kind === "invoice") setKind("");
    setReview(true);
  };
  const toggleCat = (c) => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const clear = () => {
    setPay("");
    setBy("");
    setMin("");
    setMax("");
    setReview(false);
    setState("");
    setScope("");
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
      ...(owner ? [["receipt", "Fatura ekle", "Fotoğraf ya da PDF", desk.pick]] : []),
    ],
  });

  const monthText = month ? monthLabel(month) : "Tüm zamanlar";
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";
  const chip = (on) => `${pill0} ${on ? "border-white bg-white text-[#0b1a33]" : "ck-glass text-white"}`;
  const raised = "btn btn-secondary h-10 min-w-0 gap-1.5 px-3 text-[0.9375rem]";
  const listCls = "divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card";
  // ⋯ penceresindeki işler: pencere kapanır, iş başlar
  const run = (fn) => () => (setMore(false), fn());

  // Yeni tasarım (velora-tasarim, 2026-11-03): lacivert üstte ad, büyük tutar, ekleme düğmeleri, ay, arama ve süzgeç çipleri; altta gün gün liste
  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label={owner ? "Fişler ve faturalar" : "Fişler"}>
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{owner ? "Fişler ve faturalar" : "Fişler"}</h1>
            {shownKind !== "invoice" && <p className="truncate text-[0.8125rem] capitalize text-white/65">{monthText}</p>}
          </div>
          {shownKind !== "invoice" && (
            <button type="button" onClick={() => setMore(true)} disabled={!list.length} aria-label="Excel, mail, yazdır" data-press className={`${buttonClass({ variant: "round" })} size-10`}>
              <Icon name="more" className="size-5" />
            </button>
          )}
        </header>

        {/* Tümü · Fişler · Faturalar (ana hesap) */}
        {owner && (
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            {KINDS.map(([k, l]) => (
              <button key={k || "all"} type="button" onClick={() => (setKind(k), setCats([]))} aria-pressed={kind === k} data-press className={chip(kind === k)}>
                {l}
                {k === "invoice" && desk.sum.open > 0 && <span className="ml-1.5 tabular-nums opacity-70">{desk.sum.open}</span>}
              </button>
            ))}
          </div>
        )}

        {shownKind === "invoice" ? (
          <>
            <div className="mt-4">
              <b className="block truncate text-[2.125rem] font-bold leading-none tracking-[-.02em] tabular-nums text-white">{TL(desk.sum.sum)}</b>
              <p className="mt-1.5 truncate text-[0.8125rem] text-white/65">
                {desk.sum.open} ödenmedi
                {desk.sum.late > 0 && <span className="text-warn"> · {desk.sum.late} gecikti</span>}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={desk.pick} data-press className={raised.replace("btn-secondary", "btn-primary")}>
                Fatura ekle
              </button>
              <button type="button" onClick={desk.check} disabled={desk.checking || !desk.sum.open} data-press className={raised}>
                {desk.checking && <Icon name="load" className="size-4 animate-spin" />}
                <span className="truncate">Bankada kontrol</span>
              </button>
            </div>
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
              {[
                ["open", "Ödenmedi", desk.sum.open],
                ["paid", "Ödendi", (desk.list || []).length - desk.sum.open],
                ["all", "Tümü"],
              ].map(([k, l, c]) => (
                <button key={k} type="button" onClick={() => setInvTab(k)} aria-pressed={invTab === k} data-press className={chip(invTab === k)}>
                  {l}
                  {c > 0 && <span className="ml-1.5 tabular-nums opacity-70">{c}</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Özet: Tümü'de fişler ve ödenecek faturalar yan yana; Fişler'de kategorili toplam */}
            {shownKind === "" ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setKind("receipt")} data-press className="min-w-0 text-left">
                  <small className="block truncate text-[0.8125rem] text-white/65">Fişler</small>
                  <b className="block truncate text-[1.625rem] font-bold leading-tight tracking-[-.02em] tabular-nums text-white">{TLk(total)}</b>
                  <small className="block truncate text-[0.8125rem] text-white/65">{list.length} fiş</small>
                </button>
                <button type="button" onClick={() => setKind("invoice")} data-press className="min-w-0 border-l border-white/15 pl-3 text-left">
                  <small className="block truncate text-[0.8125rem] text-white/65">Ödenecek</small>
                  <b className="block truncate text-[1.625rem] font-bold leading-tight tracking-[-.02em] tabular-nums text-white">{desk.sum.open ? TL(desk.sum.sum) : "Yok"}</b>
                  <small className={`block truncate text-[0.8125rem] ${desk.sum.late ? "text-warn" : "text-white/65"}`}>
                    {desk.sum.open ? [`${desk.sum.open} fatura`, desk.sum.late && `${desk.sum.late} gecikti`].filter(Boolean).join(" · ") : "Hepsi ödendi"}
                  </small>
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <b className="block truncate text-[2.125rem] font-bold leading-none tracking-[-.02em] tabular-nums text-white">{TLk(total)}</b>
                <p className="mt-1.5 truncate text-[0.8125rem] text-white/65">
                  {list.length} fiş · KDV {TLk(vat)}
                </p>
                {total > 0 && (
                  <>
                    <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/15">
                      {catRank.map(([c, v]) => (
                        <span key={c} style={{ width: `${(v / total) * 100}%`, background: catOf(c).color }} />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] text-white/75">
                      {catRank.slice(0, 3).map(([c, v]) => (
                        <span key={c} className="flex min-w-0 items-center gap-1">
                          <i className="size-2 shrink-0 rounded-full" style={{ background: catOf(c).color }} />
                          <span className="truncate">
                            {c} {TLk(v)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Ekleme düğmeleri (ana hesap; çalışan alt çubuktan ekler) */}
            {owner && (
              <div className={`mt-4 grid gap-2 ${shownKind === "" ? "grid-cols-2" : ""}`}>
                <button type="button" onClick={() => openReceipt()} data-press className={raised.replace("btn-secondary", "btn-primary")}>
                  Fiş ekle
                </button>
                {shownKind === "" && (
                  <button type="button" onClick={desk.pick} data-press className={raised}>
                    Fatura ekle
                  </button>
                )}
              </div>
            )}

            {/* Ay seçici */}
            <div className="ck-glass mt-3 flex h-11 items-center justify-between rounded-2xl px-1">
              <button type="button" onClick={() => setMonth((m) => shiftMonth(m || todayStr().slice(0, 7), -1))} aria-label="Önceki ay" data-press className="grid size-9 place-items-center rounded-full text-white/80">
                <Icon name="back" className="size-5" />
              </button>
              <button type="button" onClick={() => setMonth((m) => (m ? "" : todayStr().slice(0, 7)))} className="min-w-0 truncate text-[0.9375rem] font-semibold capitalize text-white">
                {monthText}
              </button>
              <button type="button" onClick={() => setMonth((m) => shiftMonth(m || todayStr().slice(0, 7), 1))} aria-label="Sonraki ay" data-press className="grid size-9 place-items-center rounded-full text-white/80">
                <Icon name="chev" className="size-5" />
              </button>
            </div>

            {/* Arama + süzgeç */}
            <div className="mt-3 flex gap-2">
              <label className="ck-glass flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl px-3.5">
                <input
                  type="search"
                  placeholder="Ara"
                  enterKeyHint="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/50"
                />
                {q && (
                  <button type="button" onClick={() => setQ("")} aria-label="Aramayı temizle" data-press className="grid size-7 place-items-center rounded-full text-white/70">
                    <Icon name="x" className="size-4" />
                  </button>
                )}
              </label>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label="Filtreler"
                aria-pressed={open || active > 0}
                data-press
                className={`relative grid size-11 shrink-0 place-items-center rounded-2xl border ${open || active ? "border-white bg-white text-[#0b1a33]" : "ck-glass text-white"}`}
              >
                <Icon name="filter" className="size-5" />
                {active > 0 && <span className="absolute -right-1 -top-1 grid size-[1.125rem] place-items-center rounded-full bg-acc text-[0.6875rem] font-bold text-white">{active}</span>}
              </button>
            </div>

            {/* Kategoriler (yalnız fişler) */}
            {shownKind === "receipt" && (
              <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
                {CATS.map((c) => (
                  <button key={c} type="button" onClick={() => toggleCat(c)} aria-pressed={cats.includes(c)} data-press className={chip(cats.includes(c))}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <div className="split-main relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {shownKind === "invoice" ? (
          <InvoicePanel desk={desk} tab={invTab} />
        ) : (
          <>
            {open && (
              <div className="fade-in space-y-2 rounded-[1.25rem] border border-line bg-card p-3">
                <div className="flex rounded-xl bg-bg p-[0.1875rem]">
                  {["", ...PAYS].map((p) => (
                    <button key={p || "all"} onClick={() => setPay(p)} className={`flex-1 truncate rounded-[0.625rem] py-2 text-sm font-semibold transition ${pay === p ? "bg-card shadow-sm" : "text-mut"}`}>
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
                  {[["", "Hepsi"], ["pending", "Bekleyen"], ["paid", "Ödenen"]].map(([v, l]) => (
                    <button key={v || "all"} onClick={() => setState(v)} className={`flex-1 truncate rounded-[0.625rem] py-2 text-sm font-semibold transition ${state === v ? "bg-card shadow-sm" : "text-mut"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {owner && (
                  <div className="flex rounded-xl bg-bg p-[0.1875rem]">
                    {[["", "Hepsi"], ["club", "Kulüp"], ["personal", "Kişisel"]].map(([v, l]) => (
                      <button key={v || "all"} onClick={() => setScope(v)} className={`flex-1 truncate rounded-[0.625rem] py-2 text-sm font-semibold transition ${scope === v ? "bg-card shadow-sm" : "text-mut"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input className={inp} inputMode="decimal" placeholder="En az ₺" value={min} onChange={(e) => setMin(e.target.value)} />
                  <input className={inp} inputMode="decimal" placeholder="En çok ₺" value={max} onChange={(e) => setMax(e.target.value)} />
                </div>
                <label className="flex items-center justify-between gap-3 px-1 py-1 text-[0.9375rem]">
                  <span className="truncate">Kontrol bekleyenler</span>
                  <input type="checkbox" className="size-5 shrink-0 accent-[var(--acc)]" checked={review} onChange={(e) => setReview(e.target.checked)} />
                </label>
                {active > 0 && (
                  <button onClick={clear} data-press className="btn btn-text btn-sm w-full">
                    Temizle
                  </button>
                )}
              </div>
            )}

            {pending > 0 && !review && (
              <RowList>
                <Row title={`${pending} fiş`} sub="Kontrol bekliyor" warn onClick={showReview} />
              </RowList>
            )}

            <PendingPayments />

            {/* Ödenecek faturalar (Tümü): son güne göre, ay seçiminden bağımsız */}
            {invOpen.length > 0 && (
              <section>
                <ListHead title="Ödenecek faturalar" count={invOpen.length} />
                <div className={listCls}>
                  {invOpen.map((x) => (
                    <InvoiceRow key={x.id} inv={x} desk={desk} />
                  ))}
                </div>
              </section>
            )}

            {/* Liste: gün gün */}
            {loading ? (
              <Loading />
            ) : days.length === 0 && invOpen.length ? null : days.length === 0 ? (
              <Empty icon="receipt" title={receipts.length || desk.list?.length ? "Bu filtrede kayıt yok" : "Henüz fiş yok"} />
            ) : (
              days.map((d) => (
                <section key={d}>
                  <ListHead title={fdate(d)} count={groups[d].length} />
                  <div className={listCls}>
                    {groups[d].map((r) =>
                      r.inv ? (
                        <InvoiceRow key={r.id} inv={r.inv} desk={desk} badge />
                      ) : (
                        <Link key={r.id} href={`/receipts/${r.id}`} data-press="row" className="flex min-h-[3.5rem] items-center gap-3 px-3.5 py-2.5">
                          <span className="w-[3px] self-stretch rounded-full" style={{ background: catOf(r.cat).color }} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-[0.9375rem] font-semibold">
                              {r.no > 0 && <span className="mr-1.5 font-mono text-[0.8125rem] text-acc">{noText(r.no)}</span>}
                              {r.merchant || "İsimsiz"}
                            </b>
                            <small className="block truncate text-[0.8125rem] text-mut">
                              {[shownKind === "" && "Fiş", r.time, r.cat, r.pay, r.scope === "personal" && "Kişisel"].filter(Boolean).join(" · ")}
                              {whoText(r, myUid, nameOf) && <span className="text-acc"> · {whoText(r, myUid, nameOf)}</span>}
                            </small>
                          </span>
                          <span className="shrink-0 text-right">
                            <b className="block text-[0.9375rem] font-bold tabular-nums">{TLk(totalOf(r))}</b>
                            <small className={`flex items-center justify-end gap-1 text-[0.75rem] font-semibold ${payOf(r) === "pending" ? "text-warn" : "text-ok"}`}>
                              {needsCheck(r) && <i className="size-1.5 rounded-full bg-warn" aria-label="Kontrol bekliyor" />}
                              {payOf(r) === "pending" ? "Bekliyor" : "Ödendi"}
                            </small>
                          </span>
                        </Link>
                      ),
                    )}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>

      {owner && desk.sheets}

      {/* ⋯: muhasebe Excel'i, mail, yazdır */}
      <Sheet open={more} onClose={() => setMore(false)} title={`Fişler · ${monthText}`}>
        <div className="pb-4">
          <RowList>
            <Row title="Excel indir" sub={`${list.length} belge`} onClick={run(excel)} />
            {!mailing && <Row title="Mail at" onClick={run(mail)} />}
            <Row title="Yazdır" onClick={run(print)} />
          </RowList>
        </div>
      </Sheet>

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
