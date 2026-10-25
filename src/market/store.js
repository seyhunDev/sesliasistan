"use client";

// Velora'da kalan market parçası (2026-10-25): market alışverişi, yönetimi ve hazır menüler Velora Sanal'da (ayrı depo velora-sanal).
// Burada yalnız ana sayfadaki açık market siparişi kartı (features/home/ShopCards, ui/MarketOrder) için:
//   marketSiparisler/{id}   sipariş (catalog.js'deki yapı; Velora Sanal yazar)
//   market/katalog          { products, v }   müşteri iptal edince bekleyen stok açılır (belge Velora Sanal'ın)
import { useEffect, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { deliverFor, releaseFor, stockStep } from "./catalog";

const katRef = (orgId) => doc(db, "orgs", orgId, "market", "katalog");
const ordersCol = (orgId) => collection(db, "orgs", orgId, "marketSiparisler");

// Son siparişler canlı (en çok n belge)
export function useOrders(orgId, n = 5) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!orgId) return;
    return onSnapshot(query(ordersCol(orgId), orderBy("at", "desc"), limit(n)),
      (s) => setList(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setList([]));
  }, [orgId, n]);
  return list;
}

// Durum değiştir (müşteri yalnız "Gönderildi"yken iptal eder). Teslimde stoktan düşer, iptalde bekleyen açılır.
// Katalog belgesi yoksa stoğa dokunulmaz (boş katalog yazılmasın); sürüm alanı (v) olduğu gibi kalır.
export function setStatus(orgId, id, status) {
  const oRef = doc(ordersCol(orgId), id);
  return runTransaction(db, async (tx) => {
    const o = (await tx.get(oRef)).data();
    const kat = await tx.get(katRef(orgId));
    if (!o) return;
    const step = stockStep(o.status, status);
    if (step && kat.exists()) tx.update(katRef(orgId), { products: (step === "deliver" ? deliverFor : releaseFor)(kat.data().products || {}, o.lines) });
    tx.update(oRef, { status, [`times.${status}`]: new Date().toISOString() });
  });
}
