"use client";

// Ana sayfa için ödenmemiş faturalar: yalnız status "open" olanlar okunur (açık fatura sayısı kadar okuma),
// 3 dakika bellekte kalır, uygulamaya dönünce tazelenir. Faturalar sayfası değişiklik yapınca listeyi buraya da verir (primeOpen).
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";

const TTL = 3 * 60e3;
let memo = null; // { org, at, list, p }
const subs = new Set();
const emit = () => subs.forEach((f) => f(memo?.list || null));

export function primeOpen(orgId, list) {
  memo = { org: orgId, at: Date.now(), list: list.filter((x) => x.status !== "paid") };
  emit();
}

function load(orgId, fresh = false) {
  if (!fresh && memo?.org === orgId && (memo.p || Date.now() - memo.at < TTL)) return memo.p || Promise.resolve(memo.list);
  const p = getDocs(query(collection(db, "orgs", orgId, "invoices"), where("status", "==", "open")))
    .then((s) => {
      memo = { org: orgId, at: Date.now(), list: s.docs.map((d) => ({ id: d.id, ...d.data() })) };
      emit();
      return memo.list;
    })
    .catch(() => {
      if (memo?.p === p) memo = null;
      return [];
    });
  memo = { ...(memo?.org === orgId ? memo : { org: orgId, list: null }), p };
  return p;
}

// Açılış ekranı sürerken okumayı başlatır (DataProvider); ana sayfa açılınca aynı istek kullanılır, ikinci okuma olmaz
export const prefetchOpen = (orgId) => orgId && load(orgId);

// enabled: yalnız ana hesap. Dönüş: açık faturalar ya da null (yükleniyor)
export function useOpenInvoices(orgId, enabled) {
  const [list, setList] = useState(() => (memo?.org === orgId ? memo.list : null));
  useEffect(() => {
    if (!enabled || !orgId) return;
    subs.add(setList);
    load(orgId);
    const onShow = () => document.visibilityState === "visible" && load(orgId);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      subs.delete(setList);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [orgId, enabled]);
  return enabled ? list : null;
}
