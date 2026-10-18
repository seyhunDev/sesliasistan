"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { money } from "@/lib/bankSheet";
import { db } from "@/lib/firebase/clientApp";
import { accountsOf, balanceOf, shownAccounts, totalsOf } from "@/lib/mailBoard";
import { TLk, totalOf } from "@/lib/receipts";
import { debtMoves, kasaOf } from "@/lib/cashbook";
import { loadCash } from "@/features/dues/duesData";
import { loadDebts } from "@/features/debts/debtData";
import { cashMonth, readSum, saveSum } from "@/lib/homeTiles";

// Ana sayfa Hesap alanı için para (Seyhun 2026-10-17: "Hesaplar'daki gibi: toplam, altında banka ve kasa ayrı ayrı, yüzde artış, giriş varsa").
// Banka: hesap özetlerinden (yalnız ana hesap), Hesaplar sayfasıyla aynı hesaplar (seçilenler, shownAccounts), TL toplamı; değişim son 7 özetteki
// toplam bakiyeye göre. Kasa: Hesaplar'daki kasa (nakit girişler + kulüp borçları, kasaOf), açılışta bir kez ve kasa değişince okunur; son değer bu cihazda
// saklanır, okuma bitene kadar o gösterilir. Dönüş: { bank: {big (kasa, yoksa banka), label, sub (küçük banka), warn, spark, diff, cur, bankTL, kasa, month} | null, receipts: {big, sub} | false, loading }
export function useMoney() {
  const { profile } = useAuth();
  const { receipts, isStaff } = useData();
  const owner = profile?.role === "owner";
  const [mails, setMails] = useState([]);
  const [got, setGot] = useState(false); // ilk okuma geldi mi (önbellekten de olur); gelene kadar kartta iskelet
  useEffect(() => {
    if (!owner) return;
    return onSnapshot(
      query(collection(db, "orgs", profile.uid, "mails"), orderBy("at", "desc"), limit(40)),
      (s) => {
        setMails(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setGot(true);
      },
      () => {
        setMails([]);
        setGot(true);
      },
    );
  }, [owner, profile?.uid]);
  // Kasa (Hesaplar sayfasıyla aynı hesap): nakit hareketler + kulüp borçları; meta.accts gösterilen banka hesapları
  const [cash, setCash] = useState(() => readSum().cash || null);
  useEffect(() => {
    if (!owner) return;
    let live = true;
    const load = () =>
      Promise.all([loadCash(profile.uid), loadDebts(profile.uid).catch(() => [])])
        .then(([c, lent]) => {
          if (!live) return;
          const k = kasaOf([...c.moves, ...debtMoves(lent)], c.meta);
          const next = { total: k.total, accts: c.meta?.accts || null, ...cashMonth(k.counted) };
          saveSum("cash", next);
          setCash(next);
        })
        .catch(() => {});
    load();
    window.addEventListener("sa-cash-saved", load);
    return () => {
      live = false;
      window.removeEventListener("sa-cash-saved", load);
    };
  }, [owner, profile?.uid]);

  const accounts = shownAccounts(accountsOf(mails), cash?.accts);
  const totals = totalsOf(accounts);
  const tot = totals.find((t) => !t.currency || /^(TL|TRY)$/i.test(t.currency)) || totals[0];
  const cur = tot?.currency || "";
  // Her özette o para birimindeki hesapların son bilinen bakiyelerinin toplamı (en eski özetten başlayarak birikir)
  const series = [];
  if (tot) {
    const last = new Map();
    for (const m of [...mails].reverse()) {
      let touched = false;
      for (const sh of m.sheets || []) {
        const b = balanceOf(sh);
        if (b === null || (sh.sum?.currency || "") !== cur) continue;
        last.set(`${sh.sum.last4 || ""}|${sh.sum.product || ""}`, b);
        touched = true;
      }
      if (touched) series.push([...last.values()].reduce((a, b) => a + b, 0));
    }
  }
  const spark = series.slice(-7);
  const first = spark[0];
  const pct = tot && first ? ((tot.total - first) / Math.abs(first)) * 100 : 0;
  const acc = !!tot;

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const spend = receipts.filter((r) => (r.date || "").startsWith(ym)).reduce((a, r) => a + totalOf(r), 0);
  const monthName = now.toLocaleDateString("tr-TR", { month: "long" });

  // Seyhun 2026-10-18: "kasadaki nakit ön planda, banka küçük, çok detaya gerek yok": büyük sayı kasa (kasa yoksa banka), altında küçük banka
  const isTL = !cur || /^(TL|TRY)$/i.test(cur);
  const bankTL = acc && isTL ? tot.total : 0;
  const kasa = cash?.total || 0;
  const has = acc || cash;
  return {
    bank:
      owner && has
        ? {
            big: `${money(cash ? kasa : bankTL)} ₺`,
            label: cash ? "Kasada nakit" : "Banka",
            sub: cash && acc && isTL ? `Banka ${money(bankTL)} ₺` : "",
            warn: spark.length > 1 && pct < 0,
            spark,
            diff: spark.length > 1 ? tot.total - first : 0,
            cur,
            bankTL,
            kasa,
          }
        : null,
    loading: owner && !got,
    receipts: spend > 0 && { big: TLk(spend), sub: `${monthName.charAt(0).toLocaleUpperCase("tr-TR")}${monthName.slice(1)} harcaması${isStaff ? " (senin)" : ""}` },
  };
}
