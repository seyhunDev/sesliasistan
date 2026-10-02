"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { money } from "@/lib/bankSheet";
import { db } from "@/lib/firebase/clientApp";
import { accountsOf, balanceOf, totalsOf } from "@/lib/mailBoard";
import { TLk, totalOf } from "@/lib/receipts";

const card = "rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]";

// Küçük eğri (bakiye) ve çubuk (aylık fiş) grafikleri
function Spark({ vals, tone = "var(--ok)" }) {
  if (vals.length < 2) return <span className="block h-8" />;
  const w = 130;
  const h = 32;
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const X = (i) => 2 + (i * (w - 4)) / (vals.length - 1);
  const Y = (v) => h - 4 - ((v - mn) / (mx - mn || 1)) * (h - 8);
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" aria-hidden="true">
      <path d={`M2 ${h} L${pts.replaceAll(" ", " L")} L${X(vals.length - 1)} ${h} Z`} fill={tone} opacity=".12" />
      <polyline points={pts} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(vals.length - 1)} cy={Y(vals.at(-1))} r="3" fill={tone} />
    </svg>
  );
}
function Bars({ vals }) {
  const mx = Math.max(1, ...vals);
  return (
    <span className="flex h-8 items-end gap-1" aria-hidden="true">
      {vals.map((v, i) => (
        <span key={i} className={`flex-1 rounded-[3px] bg-acc ${i === vals.length - 1 ? "" : "opacity-30"}`} style={{ height: `${Math.max(10, (v / mx) * 100)}%` }} />
      ))}
    </span>
  );
}

// Para: banka (hesap özetlerinden, ana hesap) ve fişler (son 5 ay).
// Banka kartı Mailler sayfasıyla aynı hesabı gösterir: aynı mailler (son 40), aynı hesaplar (accountsOf), TL toplamı.
// Bakiye eğrisi: son özetlerde bütün TL hesapların toplamı (eskiden yeniye).
export function MoneyRow() {
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
  const months = [...Array(5)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const spend = months.map((m) => receipts.filter((r) => (r.date || "").startsWith(m)).reduce((a, r) => a + totalOf(r), 0));
  const monthName = now.toLocaleDateString("tr-TR", { month: "long" });

  return (
    <div className={`grid gap-2.5 ${owner && acc ? "grid-cols-2" : "grid-cols-1"}`}>
      {owner && acc && (
        <Link href="/mail" className={`${card} flex min-w-0 flex-col gap-1.5 p-3.5`}>
          <span className="flex items-center gap-1.5 text-[0.75rem] text-mut">
            <Icon name="wallet" className="size-4 text-acc" /> {tot.n > 1 ? `Toplam · ${tot.n} hesap` : accounts[0].name}
          </span>
          <b className="truncate text-[1.0625rem] font-bold tabular-nums">
            {money(tot.total)} {cur}
          </b>
          <Spark vals={spark} tone={pct < 0 ? "var(--rec)" : "var(--ok)"} />
          <span className={`text-[0.6875rem] font-semibold ${spark.length > 1 ? (pct < 0 ? "text-rec" : "text-ok") : "text-mut"}`}>
            {spark.length > 1 ? `son ${spark.length} özette ${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")}%` : "son özet"}
          </span>
        </Link>
      )}
      <Link href="/receipts" className={`${card} flex min-w-0 flex-col gap-1.5 p-3.5`}>
        <span className="flex items-center gap-1.5 text-[0.75rem] text-mut">
          <Icon name="receipt" className="size-4 text-acc" /> Fişler · <span className="capitalize">{monthName}</span>
        </span>
        <b className="truncate text-[1.0625rem] font-bold tabular-nums">{TLk(spend.at(-1))}</b>
        <Bars vals={spend} />
        <span className="text-[0.6875rem] text-mut">{isStaff ? "eklediğin fişler · son 5 ay" : "son 5 ay"}</span>
      </Link>
    </div>
  );
}
