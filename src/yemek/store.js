"use client";

// Velora Yemek verisi (Firestore). Şimdilik ana hesabın işletmesi altında (orgs/{org}/…, kural değişikliği gerekmez);
// ayrı projeye taşınınca kök koleksiyonlar olur, adlar aynı kalır:
//   yemekSiparisler/{id}  sipariş (order.js'deki yapı)
//   yemek/me              { addresses: [{ id, name, text, note, pos }], lastAddressId }
// Restoranlar şimdilik koddaki örnek veri (sample.js): okuma yok. Geçmiş sayfa açılınca bir kez (en çok 30 okuma),
// açık sipariş canlı izlenir (tek belge).
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { addDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { SAMPLE_PLACES } from "./sample";

export const PLACES = SAMPLE_PLACES;
export const placeById = (id) => PLACES.find((p) => p.id === id) || null;

const ordersCol = (orgId) => collection(db, "orgs", orgId, "yemekSiparisler");
const meRef = (orgId) => doc(db, "orgs", orgId, "yemek", "me");

// Geçmiş + adresler: bir kez okunur, sayfalar arasında bellekte kalır (aynı oturumda tekrar okunmaz)
let memo = null; // { orgId, history, me }
export function useFood(orgId) {
  const [state, setState] = useState(() => (memo?.orgId === orgId ? memo : null));
  useEffect(() => {
    if (!orgId || memo?.orgId === orgId) return;
    let off = false;
    Promise.all([
      getDocs(query(ordersCol(orgId), orderBy("at", "desc"), limit(30))).then((s) => s.docs.map((d) => ({ ...d.data(), id: d.id }))).catch(() => []),
      getDoc(meRef(orgId)).then((d) => d.data() || {}).catch(() => ({})),
    ]).then(([history, me]) => {
      memo = { orgId, history, me };
      if (!off) setState(memo);
    });
    return () => { off = true; };
  }, [orgId]);
  return state;
}
const touch = (fn) => { if (memo) memo = { ...memo, ...fn(memo) }; };

export function useOrder(orgId, id) {
  const [order, setOrder] = useState(() => memo?.history.find((o) => o.id === id) || null);
  useEffect(() => {
    if (!orgId || !id) return;
    return onSnapshot(doc(ordersCol(orgId), id), (d) => setOrder(d.exists() ? { ...d.data(), id: d.id } : false), () => setOrder(false));
  }, [orgId, id]);
  return order;
}

export async function placeOrder(orgId, uid, data) {
  const at = new Date().toISOString();
  const order = { ...data, uid, at, status: "sent", times: { sent: at } };
  const ref = await addDoc(ordersCol(orgId), order);
  touch((m) => ({ history: [{ ...order, id: ref.id }, ...m.history] }));
  return ref.id;
}

export async function patchOrder(orgId, id, patch) {
  await updateDoc(doc(ordersCol(orgId), id), patch);
  touch((m) => ({ history: m.history.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
}

export async function saveMe(orgId, patch) {
  await setDoc(meRef(orgId), patch, { merge: true });
  touch((m) => ({ me: { ...m.me, ...patch } }));
}

// Sepet: tek restoran, telefonda (localStorage). Başka restorandan ürün eklenince eski sepet değişir (sorulur).
const CART = "yemek-sepet";
export function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART) || "null") || { placeId: "", lines: [] };
  } catch {
    return { placeId: "", lines: [] };
  }
}
export function writeCart(cart) {
  try {
    localStorage.setItem(CART, JSON.stringify(cart));
  } catch {}
  window.dispatchEvent(new Event("yemek-sepet"));
}
export function useCart() {
  const [cart, setCart] = useState({ placeId: "", lines: [] });
  useEffect(() => {
    const read = () => setCart(readCart());
    read();
    window.addEventListener("yemek-sepet", read);
    return () => window.removeEventListener("yemek-sepet", read);
  }, []);
  return cart;
}

// Telefon konumu (bir kez, en çok 6 sn). İzin yoksa null.
export function herePos() {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), () => ok(null), { timeout: 6000, maximumAge: 120000 });
  });
}
