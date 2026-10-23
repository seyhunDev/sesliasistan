"use client";

// Velora Yemek verisi (Firestore). Şimdilik ana hesabın işletmesi altında (orgs/{org}/…, kural değişikliği gerekmez);
// ayrı projeye taşınınca kök koleksiyonlar olur, adlar aynı kalır:
//   yemekSiparisler/{id}  sipariş (order.js'deki yapı)
//   yemek/me              { addresses: [{ id, name, text, note, pos }], lastAddressId }   (müşteri)
//   yemek/ayar            { demo, closed: { [restoran]: true }, couriers: [{ id, name, phone }] }   (Yönetim)
// Restoranlar şimdilik koddaki örnek veri (sample.js): okuma yok. Geçmiş sayfa açılınca bir kez (en çok 30 okuma),
// açık sipariş canlı izlenir (tek belge).
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { addDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { SAMPLE_PLACES } from "./sample";
import { STATUSES, isOpenAt, travelMin } from "./order";
import { distanceKm } from "./address";

export const PLACES = SAMPLE_PLACES;
export const placeById = (id) => PLACES.find((p) => p.id === id) || null;

const ordersCol = (orgId) => collection(db, "orgs", orgId, "yemekSiparisler");
const meRef = (orgId) => doc(db, "orgs", orgId, "yemek", "me");
const setRef = (orgId) => doc(db, "orgs", orgId, "yemek", "ayar");

// Restoran şu an sipariş alıyor mu: saatleri uygun ve Yönetim'den kapatılmamış
export const openNow = (place, settings, date) => !settings?.closed?.[place?.id] && isOpenAt(place, date);

// Geçmiş + adresler: bir kez okunur, sayfalar arasında bellekte kalır (aynı oturumda tekrar okunmaz)
// Değişince (yeni adres, sipariş) açık ekranlar hemen yenilenir.
let memo = null; // { orgId, history, me, settings }
const subs = new Set();
export function useFood(orgId) {
  const [state, setState] = useState(() => (memo?.orgId === orgId ? memo : null));
  useEffect(() => {
    const on = (m) => m.orgId === orgId && setState(m);
    subs.add(on);
    return () => subs.delete(on);
  }, [orgId]);
  useEffect(() => {
    if (!orgId || memo?.orgId === orgId) return;
    let off = false;
    Promise.all([
      getDocs(query(ordersCol(orgId), orderBy("at", "desc"), limit(30))).then((s) => s.docs.map((d) => ({ ...d.data(), id: d.id }))).catch(() => []),
      getDoc(meRef(orgId)).then((d) => d.data() || {}).catch(() => ({})),
      getDoc(setRef(orgId)).then((d) => d.data() || {}).catch(() => ({})),
    ]).then(([history, me, settings]) => {
      memo = { orgId, history, me, settings };
      if (!off) setState(memo);
    });
    return () => { off = true; };
  }, [orgId]);
  return state;
}
const touch = (fn) => {
  if (!memo) return;
  memo = { ...memo, ...fn(memo) };
  subs.forEach((on) => on(memo));
};

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
  const before = memo?.me;
  touch((m) => ({ me: { ...m.me, ...patch } }));
  try {
    await setDoc(meRef(orgId), patch, { merge: true });
  } catch (e) {
    touch(() => ({ me: before }));
    throw e;
  }
}

// ---- Yönetim, restoran ve kurye ekranları ----
// Ayarlar canlı (tek belge)
export function useSettings(orgId) {
  const [st, setSt] = useState(null);
  useEffect(() => {
    if (!orgId) return;
    return onSnapshot(setRef(orgId), (d) => {
      const v = d.data() || {};
      setSt(v);
      touch(() => ({ settings: v }));
    }, () => setSt({}));
  }, [orgId]);
  return st;
}
export const saveSettings = (orgId, patch) => setDoc(setRef(orgId), patch, { merge: true });

// Bugünün siparişleri canlı (tek alanlı sorgu, dizin gerekmez): açıklar, biten ve ciro buradan
export function useToday(orgId) {
  const [list, setList] = useState(null);
  useEffect(() => {
    if (!orgId) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return onSnapshot(query(ordersCol(orgId), where("at", ">=", start.toISOString())),
      (s) => setList(s.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => b.at.localeCompare(a.at))),
      () => setList([]));
  }, [orgId]);
  return list;
}

// Restoranın ve kuryenin işleri. Deneme siparişine dokunulunca gerçek olur (demo: false).
const nowIso = () => new Date().toISOString();
export function acceptOrder(orgId, o, place) {
  const t = nowIso();
  const km = distanceKm(place?.pos, o.address?.pos);
  const road = travelMin(Number.isFinite(km) ? km : 2);
  return patchOrder(orgId, o.id, { demo: false, status: "preparing", times: { ...(o.times || {}), accepted: t, preparing: t }, eta: new Date(Date.now() + ((place?.prepMin || 20) + road) * 60000).toISOString() });
}
export const rejectOrder = (orgId, o) => patchOrder(orgId, o.id, { demo: false, status: "cancelled", times: { ...(o.times || {}), cancelled: nowIso() } });
export function giveToCourier(orgId, o, place, courier) {
  return patchOrder(orgId, o.id, {
    demo: false, status: "onTheWay", times: { ...(o.times || {}), onTheWay: nowIso() },
    courier: { id: courier.id, name: courier.name, phone: courier.phone || "", pos: place?.pos || null, at: nowIso() },
  });
}
export const deliverOrder = (orgId, o) => patchOrder(orgId, o.id, { demo: false, status: "delivered", times: { ...(o.times || {}), delivered: nowIso() } });
// Yönetim'den elle durum: o adımın saati yazılır, sipariş gerçek olur
// (geri alınırsa sonraki adımların saatleri silinir)
export function setStatus(orgId, o, status) {
  const all = { ...(o.times || {}), ...(o.live?.times || {}) };
  const i = STATUSES.indexOf(status);
  const times = Object.fromEntries(Object.entries(all).filter(([k]) => status === "cancelled" || (k !== "cancelled" && STATUSES.indexOf(k) < i)));
  return patchOrder(orgId, o.id, { demo: false, status, times: { ...times, [status]: nowIso() } });
}
export const courierAt = (orgId, id, pos) => updateDoc(doc(ordersCol(orgId), id), { "courier.pos": pos, "courier.at": nowIso() });

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
