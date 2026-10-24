"use client";

// Velora Market verisi (Firestore, ana hesabın işletmesi altında; kural değişikliği gerekmez):
//   market/katalog          { products: { [id]: ürün } }   tüm ürünler ve stok tek belgede (sayfa açılınca 1 okuma, canlı)
//   marketSiparisler/{id}   sipariş (catalog.js'deki yapı)
//   market/menuler          { list: [menü] }   hazır menüler (menus.js; belge yoksa örnek menüler)
//   market/istekler         { items: { [anahtar]: { name, count, from, at } } }   bulunamayan ürünler (yönetim › İstekler)
// Katalog belgesi yoksa örnek ürünler (sample.js) gösterilir; ilk sipariş ya da yönetim yazması belgeyi onlarla açar.
// Stok aynı anda iki siparişte bozulmasın diye sipariş, teslim ve iptal işlem (transaction) içinde yapılır.
import { useEffect, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { SAMPLE_PRODUCTS } from "./sample";
import { SAMPLE_MENUS, addRequests } from "./menus";
import { deliverFor, holdFor, releaseFor, stockStep } from "./catalog";

const katRef = (orgId) => doc(db, "orgs", orgId, "market", "katalog");
const ordersCol = (orgId) => collection(db, "orgs", orgId, "marketSiparisler");
export const SAMPLE_MAP = Object.fromEntries(SAMPLE_PRODUCTS.map((p) => [p.id, p]));
const productsOf = (snap) => (snap.exists() ? snap.data().products || {} : SAMPLE_MAP);

// Katalog canlı: { [id]: ürün } (okunana kadar null)
export function useCatalog(orgId) {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    if (!orgId) return;
    return onSnapshot(katRef(orgId), (s) => setProducts(productsOf(s)), () => setProducts(SAMPLE_MAP));
  }, [orgId]);
  return products;
}

// Son siparişler canlı (en çok n belge): açık sipariş ve geçmiş buradan
export function useOrders(orgId, n = 5) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!orgId) return;
    return onSnapshot(query(ordersCol(orgId), orderBy("at", "desc"), limit(n)),
      (s) => setList(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setList([]));
  }, [orgId, n]);
  return list;
}

// Siparişi ver: ürünler bekleyene alınır, sipariş yazılır (ikisi birlikte). Yetmeyen varsa { short } döner, hiçbir şey yazılmaz.
export async function orderNow(orgId, uid, { lines, address, pay = "kapıda-kart", name = "" }) {
  const ref = doc(ordersCol(orgId));
  return runTransaction(db, async (tx) => {
    const r = holdFor(productsOf(await tx.get(katRef(orgId))), lines);
    if (r.short) return { short: r.short };
    const at = new Date().toISOString();
    tx.set(katRef(orgId), { products: r.products });
    tx.set(ref, { uid, customer: name, lines: r.lines, total: r.total, pay, address, status: "sent", times: { sent: at }, at });
    return { id: ref.id };
  });
}

// Durum değiştir (yönetim; müşteri yalnız "Gönderildi"yken iptal eder). Teslimde stoktan düşer, iptalde bekleyen açılır.
export function setStatus(orgId, id, status) {
  const oRef = doc(ordersCol(orgId), id);
  return runTransaction(db, async (tx) => {
    const o = (await tx.get(oRef)).data();
    const kat = await tx.get(katRef(orgId));
    if (!o) return;
    const step = stockStep(o.status, status);
    if (step) tx.set(katRef(orgId), { products: (step === "deliver" ? deliverFor : releaseFor)(productsOf(kat), o.lines) });
    tx.update(oRef, { status, [`times.${status}`]: new Date().toISOString() });
  });
}

// Yönetim: ürünü kaydet / sil, stok ± (katalog tamamı yazılır; belge yoksa örnek ürünlerle açılır)
function editKatalog(orgId, fn) {
  return runTransaction(db, async (tx) => {
    tx.set(katRef(orgId), { products: fn(productsOf(await tx.get(katRef(orgId)))) });
  });
}
export const saveProduct = (orgId, p) => editKatalog(orgId, (all) => ({ ...all, [p.id]: { held: 0, ...all[p.id], ...p } }));
export const deleteProduct = (orgId, id) => editKatalog(orgId, (all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== id)));
export const addStock = (orgId, id, d) => editKatalog(orgId, (all) => (all[id] ? { ...all, [id]: { ...all[id], stock: Math.max(0, (all[id].stock || 0) + d) } } : all));

// Hazır menüler canlı (tek belge)
const menuRef = (orgId) => doc(db, "orgs", orgId, "market", "menuler");
const reqRef = (orgId) => doc(db, "orgs", orgId, "market", "istekler");
const menusOf = (snap) => (snap.exists() ? snap.data().list || [] : SAMPLE_MENUS);
export function useMenus(orgId) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!orgId) return;
    return onSnapshot(menuRef(orgId), (s) => setList(menusOf(s)), () => setList(SAMPLE_MENUS));
  }, [orgId]);
  return list;
}
function editMenus(orgId, fn) {
  return runTransaction(db, async (tx) => {
    tx.set(menuRef(orgId), { list: fn(menusOf(await tx.get(menuRef(orgId)))) });
  });
}
// Menüyü kaydet (aynı id varsa yerine, yoksa en başa) / sil
export const saveMenu = (orgId, menu) => editMenus(orgId, (list) => (list.some((m) => m.id === menu.id) ? list.map((m) => (m.id === menu.id ? menu : m)) : [menu, ...list]));
export const deleteMenu = (orgId, id) => editMenus(orgId, (list) => list.filter((m) => m.id !== id));

// Bulunamayan ürünler yöneticinin listesine (yönetim canlı izler)
export function useRequests(orgId) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!orgId) return;
    return onSnapshot(reqRef(orgId), (s) => setItems(s.data()?.items || {}), () => setItems({}));
  }, [orgId]);
  return items;
}
export function noteMissing(orgId, names, from = "") {
  if (!names.length) return Promise.resolve();
  return runTransaction(db, async (tx) => {
    tx.set(reqRef(orgId), { items: addRequests((await tx.get(reqRef(orgId))).data()?.items, names, from) });
  });
}
export const dropRequest = (orgId, key) => runTransaction(db, async (tx) => {
  const items = { ...((await tx.get(reqRef(orgId))).data()?.items || {}) };
  delete items[key];
  tx.set(reqRef(orgId), { items });
});

// Sepet telefonda (localStorage); ekranlar "market-sepet" olayıyla tazelenir
const CART = "market-sepet";
export function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART) || "[]");
  } catch {
    return [];
  }
}
export function writeCart(lines) {
  try {
    localStorage.setItem(CART, JSON.stringify(lines));
  } catch {}
  window.dispatchEvent(new Event(CART));
}
export function useCart() {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    const read = () => setLines(readCart());
    read();
    window.addEventListener(CART, read);
    return () => window.removeEventListener(CART, read);
  }, []);
  return lines;
}
