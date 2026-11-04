"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { db } from "@/lib/firebase/clientApp";
import { accountsOf, shownAccounts, movementsOf, totalsOf } from "@/lib/mailBoard";
import { moveMailFiles } from "@/features/mail/mailFiles";
import { todayIn } from "@/lib/notifyText";
import { inOut, payeeMoves, payeeOf, received, searchMoves, whoIn } from "@/lib/payee";
import { ledgerStart, loadLedger } from "@/features/bank/ledgerData";
import { addIncome, updateIncome, archiveCash, dropCashName, saveCashName, saveShownAccts, convertToCash, unarchiveCash, deleteIncome, loadCash, setDebtPaid, setInKasa, undoConvert } from "@/features/dues/duesData";
import { canConv, canEditCash, convSet, debtMoves, inKasa, kasaLink, kasaOf, needsReceipt, newWhoName, personalOf, whoOptions, withoutConv } from "@/lib/cashbook";
import { DebtDetail, DebtForm } from "@/features/debts/DebtViews";
import { loadDebts, updateDebts } from "@/features/debts/debtData";
import { cleanDebt, leftOf, newId, paidOf, payDebt, splitDebts } from "@/lib/debts";
import { todayStr } from "@/lib/utils/format";
import { AddIncome } from "@/features/bank/AddIncome";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { noText, payOf, totalOf } from "@/lib/receipts";
import { useInvoiceDesk } from "@/features/invoices/InvoicesView";
import { STATE, stateOf } from "@/lib/invoices";
import { AddBar, Choose, Fold, Group, MonthList, card } from "@/features/bank/HesapViews";
import { amt, dayText, para, tieOf } from "@/lib/hesapRows";

const localDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(iso));
// Hareketin günü "YYYY-MM-DD": zamandan, yoksa "17.10.2026" yazımından
const dayOf = (x) => {
  if (x?.ts) return localDate(new Date(x.ts).toISOString());
  const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(x?.date || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
const sortOf = (x) => (x?.ts ? new Date(x.ts).toISOString() : dayOf(x));
const cash = (n, cur) => `${para(n)}${cur ? ` ${cur}` : ""}`;
const signed = (n, cur) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${cash(Math.abs(n), cur)}`;
const PAY_TEXT = { Nakit: "Kasadan", Kart: "Kartla", Havale: "Bankadan" };
// Faturanın listedeki günü: ödenen fatura ödendiği gün, ödenmeyenin tarihi
const invDay = (x) => (x.status === "paid" && x.paidAt) || x.date || x.due || "";
const TABS = [
  ["banka", "Banka"],
  ["kasa", "Kasa"],
  ["fis", "Fişler"],
  ["borc", "Borçlar"],
  ["kisi", "Kişisel"],
];

// Hesaplar (adres /mail, yalnızca ana hesap). Seyhun 2026-10-17 "sade, kullanışlı": üstte kulüp toplamı (banka + kasa),
// beş sekme Banka · Kasa · Fişler · Borçlar · Kişisel; her sekme aylara göre tek liste (satır: kayıt + durum, dokununca
// ayrıntı) ve tek ekleme düğmesi. Gelen mailler, Gmail durumu ve banka defteri Mail ayarlarında (/mail/setup).
// Gmail betiği mailleri orgs/{uid}/mails'e yazar; bu sayfa bakiyeleri okur, Excel eklerini Storage'a taşır (mailFiles.js).
export default function MailPage() {
  const { profile } = useAuth();
  const { allMembers = [], receipts = [], loading } = useData();
  const router = useRouter();
  const owner = profile?.role === "owner";
  const [mails, setMails] = useState(null);
  const [acctPick, setAcctPick] = useState(false); // gösterilen banka hesaplarını seçme penceresi
  const [ledger, setLedger] = useState(null); // banka defterinin bütün hareketleri
  const [cashData, setCashData] = useState({ moves: [], personal: [], meta: {}, roster: [], cfg: {} }); // nakitler + kişisel defter
  const cashList = cashData.moves;
  // Sekme; /mail?tab=kisisel Kişisel'i açar (asistan, eski bağlantılar), ?tab=borc Borçlar'ı
  const [tab, setTab] = useState(() => {
    const t = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : "";
    return t === "kisisel" ? "kisi" : TABS.some(([k]) => k === t) ? t : "banka";
  });
  const [lent, setLent] = useState([]); // verilen borçlar (debts/book)
  const [debtForm, setDebtForm] = useState(null); // yeni ya da düzenlenen verilen borç
  const [debtOpen, setDebtOpen] = useState(null); // ayrıntısı açık verilen borç
  const [add, setAdd] = useState(null); // { book, dir, edit? } nakit giriş/çıkış ya da kişisel gelir/gider/borç (edit: düzeltilen kayıt)
  const [choose, setChoose] = useState(false); // sekmenin ekleme seçenekleri
  const [bankPick, setBankPick] = useState(null); // dokunulan banka hareketi (nakite çevir)
  const [manual, setManual] = useState(null); // dokunulan nakit/kişisel hareket (sil, kasaya ekle, ödendi)
  const [cashTick, setCashTick] = useState(0);
  const [q, setQ] = useState(""); // Banka'da arama
  const { openReceipt } = useReceipt() || {};
  // Faturalar Fişler sekmesi ilk açılınca okunur (sonra sekme değişse de dinlemeye devam eder)
  const [fisSeen, setFisSeen] = useState(tab === "fis");
  const desk = useInvoiceDesk(owner && fisSeen ? profile.orgId || profile.uid : null);
  const toast = useToast();
  // Fişle nakit çıkış ya da fiş/fatura nakit ödenince kasa yeniden okunur
  useEffect(() => {
    const on = () => setCashTick((n) => n + 1);
    window.addEventListener("sa-cash-saved", on);
    return () => window.removeEventListener("sa-cash-saved", on);
  }, []);

  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  // Son 40 mail: hesap bakiyeleri ve eki taşınacak mailler için (gelen kutusu Mail ayarlarında)
  useEffect(() => {
    if (!owner) return;
    return onSnapshot(
      query(collection(db, "orgs", profile.uid, "mails"), orderBy("at", "desc"), limit(40)),
      (s) => setMails(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMails([]),
    );
  }, [owner, profile?.uid]);

  // Banka defteri: yeni mail gelince yeniden okunur
  const newest = mails?.[0]?.id || "";
  const loaded = mails !== null;
  useEffect(() => {
    if (!owner || !loaded) return;
    let live = true;
    const ym = todayIn().slice(0, 7);
    ledgerStart(profile.uid, ym)
      .then((first) => loadLedger(profile.uid, first, ym))
      .then(
        (r) => live && setLedger(r.movements),
        () => live && setLedger(null),
      );
    return () => {
      live = false;
    };
  }, [owner, loaded, profile?.uid, newest]);
  // Nakitler ve kişisel defter
  useEffect(() => {
    if (!owner) return;
    let live = true;
    loadCash(profile.uid).then(
      (r) => live && setCashData(r),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [owner, profile?.uid, cashTick]);

  // Verilen borçlar: sayfa açılınca bir kez (1 okuma); asistan kaydedince yenilenir
  useEffect(() => {
    if (!owner) return;
    const load = () => loadDebts(profile.uid).then(setLent, () => {});
    load();
    window.addEventListener("sa-debts-saved", load);
    return () => window.removeEventListener("sa-debts-saved", load);
  }, [owner, profile?.uid]);

  // Ekleri hâlâ mailin içinde duran mailler: tablo okunur (yoksa), ek silinir (mailFiles.js; bir kez)
  const pending = (mails || [])
    .filter((m) => m.raw?.length)
    .map((m) => m.id)
    .join(",");
  useEffect(() => {
    if (!owner || !pending) return;
    let live = true;
    (async () => {
      for (const m of mails.filter((x) => pending.split(",").includes(x.id))) {
        if (!live) return;
        await moveMailFiles(profile.uid, m);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, pending]);
  if (!owner) return null;

  const list = mails || [];
  const allAccts = accountsOf(list);
  const accounts = shownAccounts(allAccts, cashData.meta?.accts); // yalnız seçilen hesaplar (seçim yoksa bakiyesi olanlar)
  const totals = totalsOf(accounts);
  const tlTotal = totals.find((t) => !t.currency || /^(TL|TRY)$/i.test(t.currency));
  const bankTL = tlTotal?.total || 0;
  const otherCur = totals.filter((t) => t !== tlTotal);
  const bankMoves = ledger || movementsOf(list);
  const payee = payeeOf(profile);
  const conv = convSet(cashData.meta); // nakite çevrilen banka hareketleri: kişisel hesapta sayılmaz
  const payeeAll = payeeMoves(withoutConv(bankMoves, conv), payee);
  const kasa = kasaOf([...cashList, ...debtMoves(lent)].sort((a, b) => (b.ts || 0) - (a.ts || 0)), cashData.meta);
  const personal = personalOf(cashData.personal || []);
  const curDebt = lent.find((d) => d.id === debtOpen);
  const whoOpts = whoOptions(allMembers, cashData.meta?.names); // Kişiler (sporcular hariç) + elle yazılan adlar
  const debtNames = [...new Set([...lent.map((d) => d.who), ...whoOpts.map((o) => o.name)].filter(Boolean))].slice(0, 300);

  const saveDebts = async (fn, ok) => {
    try {
      setLent(await updateDebts(profile.uid, fn));
      if (ok) toast(ok);
      return true;
    } catch {
      toast("Kaydedilemedi, tekrar dene");
      return false;
    }
  };
  const toggleAcct = (key) => {
    const cur = new Set(accounts.map((a) => a.key));
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    if (!cur.size) return toast("En az bir hesap görünmeli");
    const keys = allAccts.filter((a) => cur.has(a.key)).map((a) => a.key);
    setCashData((c) => ({ ...c, meta: { ...c.meta, accts: keys } }));
    saveShownAccts(profile.uid, keys).catch(() => toast("Kaydedilemedi, tekrar dene"));
  };
  const dropName = (name) =>
    dropCashName(profile.uid, name).then(
      () => (setCashData((c) => ({ ...c, meta: { ...c.meta, names: (c.meta?.names || []).filter((n) => n !== name) } })), toast("Seçeneklerden silindi")),
      () => toast("Silinemedi, tekrar dene"),
    );
  const saveIncome = (x) =>
    (x.incomeId ? updateIncome(profile.uid, x.incomeId, x) : addIncome(profile.uid, x)).then(
      () => (
        x.cat !== "Aidat" && newWhoName(x.who, whoOpts) && saveCashName(profile.uid, newWhoName(x.who, whoOpts)).catch(() => {}),
        setAdd(null),
        setCashTick((n) => n + 1),
        toast(x.incomeId ? "Düzeltildi" : x.book === "personal" ? "Kişisel deftere eklendi" : x.dir === "out" ? "Nakit çıkış kasadan düşüldü" : x.cat === "Aidat" ? "Aidat kasaya girdi, Aidatlar'da da ödendi görünür" : "Nakit giriş kasaya eklendi")
      ),
      () => (toast("Kaydedilemedi, internet bağlantını kontrol et"), false),
    );
  const after = (p, msg) =>
    p.then(
      () => (setManual(null), setCashTick((n) => n + 1), toast(msg)),
      () => toast("Kaydedilemedi, internet bağlantını kontrol et"),
    );
  const dropIncome = (x) => after(x.conv ? undoConvert(profile.uid, x.conv) : deleteIncome(profile.uid, x.incomeId), x.conv ? "Geri alındı, banka hareketi yine kişisel hesapta" : "Silindi");
  const toCash = (m) => after(convertToCash(profile.uid, m), "Kulüp kasasına nakit olarak eklendi").then(() => setBankPick(null));
  const unConv = (m) => after(undoConvert(profile.uid, m.id), "Geri alındı").then(() => setBankPick(null));
  const archive = (xs) => after(archiveCash(profile.uid, xs.map((x) => x.key)), xs.length > 1 ? `${xs.length} giriş arşivlendi` : "Arşivlendi");
  const unarchive = (xs) => after(unarchiveCash(profile.uid, xs.map((x) => x.key)), "Arşivden çıkarıldı");
  const include = (x, on) => after(setInKasa(profile.uid, x.key, on), on ? "Kasaya eklendi" : "Kasadan çıkarıldı");
  const payMyDebt = (x) => after(setDebtPaid(profile.uid, x.incomeId, !x.paid), x.paid ? "Ödenmedi olarak işaretlendi" : "Borç ödendi");
  const openReceiptPage = (r) => router.push(`/receipts/${r.id}`);

  // Satırlar ------------------------------------------------------------------
  const bankRow = (x) => ({
    id: x.id,
    day: dayOf(x),
    sort: sortOf(x),
    tie: tieOf(x),
    amount: x.amount,
    title: whoIn(x) || x.note || x.desc,
    sub: [dayText(dayOf(x)), whoIn(x) && (x.note || x.desc), x.currency && !/^(TL|TRY)$/i.test(x.currency) && x.currency].filter(Boolean).join(" · "),
    status: conv.has(x.id) ? "Kasaya geçti" : received(x, payee) ? "Kişisel" : x.cat || x.kind || "",
    onClick: () => setBankPick(x),
  });
  const cashRow = (x) => {
    const link = kasaLink(x);
    return {
      id: x.id,
      day: dayOf(x),
      sort: sortOf(x),
      tie: tieOf(x),
      amount: x.amount,
      title: x.who || x.note,
      sub: [dayText(dayOf(x)), x.who && x.note].filter(Boolean).join(" · "),
      status: link ? (link.kind === "receipt" ? "Fiş" : "Fatura") : x.conv ? "Bankadan" : x.cat || "",
      onClick: () => (x.debtId ? setDebtOpen(x.debtId) : setManual(x)),
      // Fişsiz nakit çıkış: fiş eklenince bu çıkışa bağlanır (yeni çıkış yazılmaz)
      action: needsReceipt(x) ? { label: "Fiş ekle", onClick: () => openReceipt?.({ kasa: true, link: { incomeId: x.incomeId, amount: -x.amount, date: dayOf(x), note: x.note, who: x.who } }) } : null,
    };
  };
  const receiptRow = (r) => ({
    id: `rc-${r.id}`,
    day: r.date || "",
    sort: `${r.date || ""}T${r.time || "00:00"}`,
    tie: tieOf(r),
    amount: -totalOf(r) / 100,
    title: r.merchant || "İsimsiz",
    sub: [dayText(r.date), noText(r.no), r.cat].filter(Boolean).join(" · "),
    status: payOf(r) === "pending" ? "Ödeme bekliyor" : PAY_TEXT[r.pay] || "Ödendi",
    warn: payOf(r) === "pending",
    onClick: () => openReceiptPage(r),
  });
  const invoiceRow = (x) => {
    const st = stateOf(x, desk.today);
    return {
      id: `inv-${x.id}`,
      day: invDay(x),
      sort: invDay(x),
      tie: tieOf(x),
      amount: -(x.amount || 0),
      title: x.seller || "Fatura",
      sub: [st === "paid" ? dayText(x.paidAt) : x.due && `Son gün ${dayText(x.due)}`, x.no && `Fatura ${x.no}`, x.desc].filter(Boolean).join(" · "),
      status: st === "paid" ? "Fatura ödendi" : STATE[st],
      warn: st === "late",
      onClick: () => desk.open(x.id),
    };
  };
  const debtRow = (d) => {
    const l = leftOf(d);
    return {
      id: `d-${d.id}`,
      amount: l || d.amount,
      title: d.who,
      sub: [dayText(d.date), d.note, paidOf(d) > 0 && l > 0 && `${para(d.amount)} ₺ verildi`].filter(Boolean).join(" · "),
      status: !l ? "Ödendi" : d.kind === "club" ? "Kulüpten" : "Kişisel",
      done: !l,
      onClick: () => setDebtOpen(d.id),
    };
  };
  const personalRow = (x) => ({
    id: x.id,
    day: dayOf(x),
    sort: sortOf(x),
    tie: tieOf(x),
    amount: x.dir === "debt" ? -Math.abs(x.amount) : x.amount,
    title: x.who || x.note,
    sub: [dayText(dayOf(x)), x.who && x.note].filter(Boolean).join(" · "),
    status: x.dir === "debt" ? (x.paid ? "Borç ödendi" : "Ödenmedi") : x.dir === "out" ? "Gider" : "Gelir",
    warn: x.dir === "debt" && !x.paid,
    onClick: () => setManual(x),
  });

  // Sekmelerin içeriği ------------------------------------------------------------
  const bankShown = q.trim() ? searchMoves(bankMoves, q) : bankMoves;
  const qSum = inOut(bankShown);
  const clubReceipts = receipts.filter((r) => (r.scope || "club") !== "personal");
  const invList = desk.list || [];
  const toPay = [...invList.filter((x) => x.status !== "paid").sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || String(a.id).localeCompare(String(b.id))).map(invoiceRow), ...clubReceipts.filter((r) => payOf(r) === "pending").map(receiptRow)];
  const toPaySum = toPay.reduce((n, r) => n + Math.abs(r.amount), 0);
  const fisRows = [...clubReceipts.filter((r) => payOf(r) !== "pending").map(receiptRow), ...invList.filter((x) => x.status === "paid").map(invoiceRow)];
  const lentOpen = [...splitDebts(lent, "club").open, ...splitDebts(lent, "personal").open].sort((a, b) => `${b.date || ""}${b.at || ""}`.localeCompare(`${a.date || ""}${a.at || ""}`) || String(a.id).localeCompare(String(b.id)));
  const lentClosed = [...splitDebts(lent, "club").closed, ...splitDebts(lent, "personal").closed];
  const lentSum = lentOpen.reduce((n, d) => n + leftOf(d), 0);
  const kisiRows = [
    ...personal.moves.filter((x) => !(x.dir === "debt" && !x.paid)).map(personalRow),
    ...payeeAll.map((x) => ({ ...bankRow(x), status: x.amount > 0 ? "Bankadan" : "Bankaya" })),
    ...receipts.filter((r) => r.scope === "personal").map(receiptRow),
  ];

  const addFor = {
    banka: ["Gelir ekle", () => setAdd({ book: "club", dir: "in" })],
    kasa: ["Nakit giriş ya da çıkış", () => setChoose(true)],
    fis: ["Fiş ya da fatura ekle", () => setChoose(true)],
    borc: ["Borç ekle", () => setChoose(true)],
    kisi: ["Gelir ya da gider ekle", () => setChoose(true)],
  }[tab];
  const chooseFor = {
    kasa: [
      ["Nakit giriş", () => setAdd({ book: "club", dir: "in" })],
      ["Fişle çıkış", () => openReceipt?.({ camera: true, kasa: true })],
      ["Elle çıkış", () => setAdd({ book: "club", dir: "out" })],
    ],
    fis: [
      ["Fiş fotoğrafı", () => openReceipt?.()],
      ["Elle fiş", () => openReceipt?.({ manual: true })],
      ["Fatura", () => desk.pick()],
    ],
    borc: [
      ["Borç verdim", () => setDebtForm({ kind: "club", date: todayStr() })],
      ["Borç aldım", () => setAdd({ book: "personal", dir: "debt" })],
    ],
    kisi: [
      ["Gelir", () => setAdd({ book: "personal", dir: "in" })],
      ["Gider", () => setAdd({ book: "personal", dir: "out" })],
    ],
  }[tab];

  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {/* Yeni tasarım (2026-11-03): lacivert üstte ad, Ayarlar, tek toplam (kulüp: banka + kasa; Kişisel'de gelir − gider), sekmeler ve Banka'da arama */}
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Hesaplar">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold leading-tight tracking-[-.02em]">Hesaplar</h1>
          <Link href="/mail/setup" data-press className="raised flex h-9 shrink-0 items-center rounded-xl border px-3.5 text-[0.875rem] font-semibold">
            Ayarlar
          </Link>
        </header>

        {tab === "kisi" ? (
          <div className="mt-4">
            <p className="text-[0.8125rem] font-semibold text-white/65">Kişisel toplam</p>
            <p className="text-[2.125rem] font-bold leading-tight tabular-nums tracking-[-.02em]">
              {personal.net < 0 ? "−" : ""}
              {para(Math.abs(personal.net))} ₺
            </p>
            <p className="truncate text-[0.8125rem] tabular-nums text-white/65">
              Gelir {para(personal.in)} ₺ · Gider {para(personal.out)} ₺
            </p>
          </div>
        ) : (
          <button type="button" onClick={() => allAccts.length > 1 && setAcctPick(true)} className="mt-4 block w-full text-left">
            <span className="block text-[0.8125rem] font-semibold text-white/65">Kulüp toplam</span>
            <span className="block text-[2.125rem] font-bold leading-tight tabular-nums tracking-[-.02em]">{mails === null ? "…" : `${para(bankTL + kasa.total)} ₺`}</span>
            <span className="block truncate text-[0.8125rem] tabular-nums text-white/65">
              {[`Banka ${para(bankTL)} ₺`, `Kasa ${para(kasa.total)} ₺`, ...otherCur.map((t) => `${para(t.total)} ${t.currency}`)].join(" · ")}
            </span>
          </button>
        )}

        <div role="tablist" className="mt-4 grid grid-cols-5 gap-1.5">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => (setTab(k), k === "fis" && setFisSeen(true))} data-press className={`h-9 truncate rounded-xl border px-1 text-[0.8125rem] font-semibold ${tab === k ? "border-white bg-white text-deep" : "ck-glass text-white"}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === "banka" && mails !== null && (
          <label className="ck-glass mt-3 flex h-11 items-center gap-2 rounded-2xl px-3.5">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad ya da açıklama ara" enterKeyHint="search" className="h-full min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/50 [&::-webkit-search-cancel-button]:hidden" />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Aramayı temizle" data-press className="grid size-7 shrink-0 place-items-center rounded-full text-white/70">
                <Icon name="x" className="size-4" />
              </button>
            )}
          </label>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {tab === "banka" &&
          (mails === null ? (
            <Loading />
          ) : (
            <>
              {q.trim() && (
                <div className={`${card} mb-6 flex items-center gap-3 px-3.5 py-3`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{q.trim()}</span>
                    <span className="block text-[0.8125rem] text-mut">{bankShown.length} hareket</span>
                  </span>
                  <span className="shrink-0 text-right text-[0.9375rem] font-semibold tabular-nums">
                    {qSum.in > 0 && <span className="block text-ok">+{para(qSum.in)}</span>}
                    {qSum.out > 0 && <span className="block">−{para(qSum.out)}</span>}
                  </span>
                </div>
              )}
              <MonthList key={q} rows={bankShown.map(bankRow)} empty={q.trim() ? "Bu aramayla hareket yok" : "Banka hareketi yok"} />
            </>
          ))}

        {tab === "kasa" && (
          <>
            <MonthList rows={kasa.counted.map(cashRow)} empty="Kasada hareket yok" />
            <Fold title="Kasaya sayılmayan girişler" rows={kasa.old.map(cashRow)}>
              {kasa.old.length > 1 && (
                <li>
                  <button type="button" onClick={() => archive(kasa.old)} data-press className="btn btn-text btn-sm w-full text-mut">
                    Hepsini arşivle
                  </button>
                </li>
              )}
            </Fold>
            <Fold title="Arşiv" rows={kasa.archived.map(cashRow)} />
          </>
        )}

        {tab === "fis" &&
          (loading ? (
            <Loading />
          ) : (
            <>
              <Group title="Ödenecek" total={toPaySum} rows={toPay} className="mb-6" />
              <MonthList rows={fisRows} empty={toPay.length ? "" : "Fiş ya da fatura yok"} />
              <Link href="/receipts" className="mt-6 block text-center text-[0.875rem] font-semibold text-acc active:opacity-70">
                Filtre ve Excel ›
              </Link>
            </>
          ))}

        {tab === "borc" && (
          <>
            <Group title="Geri gelecek" total={lentSum} rows={lentOpen.map(debtRow)} className="mb-6" />
            <Group title="Benim borcum" total={personal.debt} rows={personal.debts.map(personalRow)} className="mb-6" />
            {!lentOpen.length && !personal.debts.length && <p className={`${card} px-4 py-5 text-center text-[0.9375rem] text-mut`}>Açık borç yok</p>}
            <Fold title="Ödenenler" rows={lentClosed.map(debtRow)} />
          </>
        )}

        {tab === "kisi" && <MonthList rows={kisiRows} empty="Kişisel kayıt yok" />}
      </div>

      {addFor && <AddBar label={addFor[0]} onClick={addFor[1]} />}
      <Choose open={choose && !!chooseFor} onClose={() => setChoose(false)} title={addFor?.[0] || ""} options={chooseFor} />
      {desk.sheets}

      <Sheet open={acctPick} onClose={() => setAcctPick(false)} title="Gösterilen hesaplar">
        <ul className="divide-y divide-line px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {allAccts.map((a) => {
            const on = accounts.some((x) => x.key === a.key);
            return (
              <li key={a.key}>
                <button type="button" onClick={() => toggleAcct(a.key)} aria-pressed={on} data-press="row" className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{a.name}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{[a.last4 && `·${a.last4}`, cash(a.balance, a.currency)].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${on ? "border-acc bg-acc text-white" : "border-line"}`}>{on && <Icon name="check" className="size-4" />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
      <DebtForm
        key={debtForm ? `form-${debtForm.id || `new-${debtForm.kind}`}` : "form-off"}
        value={debtForm}
        names={debtNames}
        onClose={() => setDebtForm(null)}
        onSave={async (d) => {
          const isNew = !d.id;
          const x = cleanDebt({ ...d, id: d.id || newId(), at: d.at || new Date().toISOString() });
          if (await saveDebts((list) => (isNew ? [x, ...list] : list.map((y) => (y.id === x.id ? { ...x, paid: y.paid } : y))), isNew ? (x.kind === "club" ? "Borç eklendi, kasadan düştü" : "Borç eklendi") : "Kaydedildi")) setDebtForm(null);
        }}
      />
      <DebtDetail
        key={`detail-${curDebt?.id || "off"}`}
        debt={curDebt}
        onClose={() => setDebtOpen(null)}
        onPay={(n) => saveDebts((list) => list.map((y) => (y.id === curDebt.id ? payDebt(y, n, todayStr()) : y)), curDebt.kind === "club" ? "Ödeme kasaya girdi" : "Ödeme yazıldı")}
        onUndo={() => saveDebts((list) => list.map((y) => (y.id === curDebt.id ? { ...y, paid: [] } : y)), "Ödemeler geri alındı")}
        onEdit={() => (setDebtForm(curDebt), setDebtOpen(null))}
        onDelete={async () => {
          if (await saveDebts((list) => list.filter((y) => y.id !== curDebt.id), "Silindi")) setDebtOpen(null);
        }}
      />
      <AddIncome open={!!add} onClose={() => setAdd(null)} book={add?.book || "club"} dir={add?.dir || "in"} edit={add?.edit || null} roster={cashData.roster} cfg={cashData.cfg} options={whoOpts} onDropName={dropName} onSave={saveIncome} />
      <Sheet open={!!bankPick} onClose={() => setBankPick(null)} title={bankPick?.amount > 0 ? "Gelen para" : "Giden para"}>
        {bankPick && (
          <div className="space-y-3 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <p className={`text-[1.5rem] font-semibold tabular-nums ${bankPick.amount > 0 ? "text-ok" : ""}`}>{signed(bankPick.amount, bankPick.currency)}</p>
            <p className="text-[0.9375rem]">{[whoIn(bankPick) && <b key="w" className="font-semibold">{whoIn(bankPick)}</b>, bankPick.note || bankPick.desc, bankPick.date, bankPick.accountLabel].filter(Boolean).reduce((acc, x, i) => (i ? [...acc, " · ", x] : [x]), [])}</p>
            {conv.has(bankPick.id) ? (
              <>
                <p className="text-[0.8125rem] text-mut">Nakite çevrildi, kulüp kasasında.</p>
                <button type="button" onClick={() => unConv(bankPick)} data-press className="btn btn-secondary w-full">
                  Geri al
                </button>
              </>
            ) : (
              canConv(bankPick) && (
                <button type="button" onClick={() => toCash(bankPick)} data-press className="btn btn-primary w-full">
                  Nakite çevir · kasaya {para(Math.abs(bankPick.amount))} ₺
                </button>
              )
            )}
            <button type="button" onClick={() => (setTab("banka"), setQ(whoIn(bankPick) || ""), setBankPick(null))} disabled={!whoIn(bankPick)} data-press className="btn btn-secondary w-full">
              Bu kişinin bütün hareketleri
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!manual} onClose={() => setManual(null)} title={manual?.book === "personal" ? (manual.dir === "debt" ? "Borcum" : manual.dir === "out" ? "Kişisel gider" : "Kişisel gelir") : manual?.amount < 0 ? "Nakit çıkış" : "Nakit giriş"}>
        {manual && (
          <div className="space-y-3 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <p className={`text-[1.5rem] font-semibold tabular-nums ${manual.amount > 0 ? "text-ok" : manual.dir === "debt" ? "text-warn" : ""}`}>{amt(manual.dir === "debt" ? -Math.abs(manual.amount) : manual.amount)} ₺</p>
            {manual.conv && <p className="text-[0.8125rem] text-mut">Bankadan nakite çevrildi.</p>}
            <p className="text-[0.9375rem]">{[manual.who && <b key="w" className="font-semibold">{manual.who}</b>, manual.note, manual.date].filter(Boolean).reduce((acc, x, i) => (i ? [...acc, " · ", x] : [x]), [])}</p>
            {manual.cash && manual.key && <p className="text-[0.8125rem] text-mut">{inKasa(manual, cashData.meta) ? "Kasaya sayılıyor." : kasa.archived.some((x) => x.key === manual.key) ? "Arşivde, kasaya sayılmıyor." : "Kasaya sayılmıyor."}</p>}
            {manual.dir === "debt" && (
              <button type="button" onClick={() => payMyDebt(manual)} data-press className="btn btn-secondary w-full">
                {manual.paid ? "Ödenmedi olarak işaretle" : "Borcu ödedim"}
              </button>
            )}
            {manual.cash && manual.key && !kasa.archived.some((x) => x.key === manual.key) && (
              <button type="button" onClick={() => include(manual, !inKasa(manual, cashData.meta))} data-press className="btn btn-secondary w-full">
                {inKasa(manual, cashData.meta) ? "Kasadan çıkar" : "Kasaya ekle"}
              </button>
            )}
            {kasa.old.some((x) => x.key === manual.key) && (
              <button type="button" onClick={() => archive([manual])} data-press className="btn btn-secondary w-full">
                Arşivle
              </button>
            )}
            {kasa.archived.some((x) => x.key === manual.key) && (
              <button type="button" onClick={() => unarchive([manual])} data-press className="btn btn-secondary w-full">
                Arşivden çıkar
              </button>
            )}
            {manual.athleteId && (
              <button type="button" onClick={() => router.push(`/athletes/${manual.athleteId}`)} data-press className="btn btn-secondary w-full">
                Sporcuyu aç
              </button>
            )}
            {kasaLink(manual) && (
              <button type="button" onClick={() => (kasaLink(manual).kind === "invoice" ? (setManual(null), setTab("fis"), setFisSeen(true)) : router.push(kasaLink(manual).href))} data-press className="btn btn-secondary w-full">
                {kasaLink(manual).kind === "receipt" ? "Fişi aç" : "Faturaları aç"}
              </button>
            )}
            {canEditCash(manual) && (
              <button type="button" onClick={() => (setManual(null), setAdd({ book: manual.book, dir: manual.dir, edit: { incomeId: manual.incomeId, dir: manual.dir, cat: manual.cat, who: manual.who, amount: manual.amount, day: dayOf(manual), memo: manual.memo } }))} data-press className="btn btn-secondary w-full">
                Düzenle
              </button>
            )}
            {manual.manual && !kasaLink(manual) && (
              <button type="button" onClick={() => dropIncome(manual)} data-press className="btn btn-danger w-full">
                {manual.conv ? "Nakite çevirmeyi geri al" : "Sil"}
              </button>
            )}
          </div>
        )}
      </Sheet>
    </main>
  );
}
