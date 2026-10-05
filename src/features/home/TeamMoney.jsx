"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { money } from "@/lib/bankSheet";
import { db } from "@/lib/firebase/clientApp";
import { accountsOf, balanceOf, totalsOf } from "@/lib/mailBoard";
import { TLk, totalOf } from "@/lib/receipts";

// Ana sayfa özet kartları için para: banka (hesap özetlerinden, yalnız ana hesap) ve bu ayın fişleri.
// Banka Mailler sayfasıyla aynı hesabı gösterir: aynı mailler (son 40), aynı hesaplar (accountsOf), TL toplamı;
// değişim son 7 özetteki toplam bakiyeye göre. Dönüş: { bank: {big, sub, warn} | null, receipts: {big, sub} }
export function useMoney() {
  const { profile } = useAuth();
  const { receipts, isStaff } = useData();
  const owner = profile?.role === "owner";
  const [mails, setMails] = useState([]);
  useEffect(() => {
    if (!owner) return;
    return onSnapshot(
      query(collection(db, "orgs", profile.uid, "mails"), orderBy("at", "desc"), limit(40)),
      (s) => setMails(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMails([]),
    );
  }, [owner, profile?.uid]);

  const accounts = accountsOf(mails);
  const tot = totalsOf(accounts)[0];
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
  const sign = `${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")}%`;

  return {
    bank: owner && acc ? { big: `${money(tot.total)} ${cur}`, sub: spark.length > 1 ? `${sign} · son ${spark.length} özet` : tot.n > 1 ? `${tot.n} hesap` : "Son özet", warn: spark.length > 1 && pct < 0 } : null,
    receipts: { big: TLk(spend), sub: `${monthName.charAt(0).toLocaleUpperCase("tr-TR")}${monthName.slice(1)}${isStaff ? " · eklediğin" : ""}` },
  };
}
