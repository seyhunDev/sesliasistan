"use client";

// Velora Yemek verisi (Firestore). Şimdilik ana hesabın işletmesi altında (orgs/{org}/…, kural değişikliği gerekmez);
// ayrı projeye taşınınca kök koleksiyonlar olur, adlar aynı kalır:
//   yemekSiparisler/{id}  sipariş (order.js'deki yapı)
//   yemek/me              { addresses: [{ id, name, text, note, pos }], lastAddressId }   (müşteri)
//   yemek/ayar            { demo, closed: { [restoran]: true }, couriers: [{ id, name, phone }] }   (Yönetim)
// Restoranlar şimdilik koddaki örnek veri (sample.js): okuma yok. Geçmiş sayfa açılınca bir kez (en çok 30 okuma),
// açık sipariş canlı izlenir (tek belge).
import { useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { addDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { SAMPLE_PLACES } from "./sample";
import { STATUSES, isOpenAt, cartTotals, etaFrom } from "./order";
import { fetchRoute, roadMin } from "./route";
import { liveView } from "./demo";
import { courierOnOrder, pickCourier } from "./couriers";
import { distanceKm } from "./address";
import { deliverPatch, pickupPatch } from "./steps";

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
// Sayfasız okuma (asistan): bellekte varsa o, yoksa bir kez okunur
let loading = null;
export function loadFood(orgId) {
  if (memo?.orgId === orgId) return Promise.resolve(memo);
  if (loading?.orgId === orgId) return loading.p;
  const p = Promise.all([
    getDocs(query(ordersCol(orgId), orderBy("at", "desc"), limit(30))).then((s) => s.docs.map((d) => ({ ...d.data(), id: d.id }))).catch(() => []),
    getDoc(meRef(orgId)).then((d) => d.data() || {}).catch(() => ({})),
    getDoc(setRef(orgId)).then((d) => d.data() || {}).catch(() => ({})),
  ]).then(([history, me, settings]) => {
    memo = { orgId, history, me, settings };
    loading = null;
    subs.forEach((on) => on(memo));
    return memo;
  });
  loading = { orgId, p };
  return p;
}
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
    loadFood(orgId).then((m) => !off && setState(m));
    return () => { off = true; };
  }, [orgId]);
  return state;
}
const touch = (fn) => {
  if (!memo) return;
  memo = { ...memo, ...fn(memo) };
  subs.forEach((on) => on(memo));
};

// Tek sipariş, canlı. "Bulunamadı" (false) yalnız sunucu "yok" deyince: telefon uygulamayı arkada bekletip açınca
// dinleyici hata verebilir ya da önbellek boş gelebilir (Seyhun 2026-10-23); o zaman eldeki kayıt kalır, yeniden dinlenir.
export function useOrder(orgId, id) {
  const [order, setOrder] = useState(() => memo?.history.find((o) => o.id === id) || null);
  const [round, setRound] = useState(0);
  const fails = useRef(0);
  useEffect(() => {
    if (!orgId || !id) return;
    let t;
    const off = onSnapshot(doc(ordersCol(orgId), id), { includeMetadataChanges: true }, (d) => {
      if (d.exists()) {
        fails.current = 0;
        const o = { ...d.data(), id: d.id };
        setOrder(o);
        // Bellekteki geçmiş de tazelenir (Ne yiyelim › Siparişin oradan okur)
        if (memo?.orgId === orgId && memo.history.some((h) => h.id === o.id)) touch((m) => ({ history: m.history.map((h) => (h.id === o.id ? o : h)) }));
      } else if (!d.metadata.fromCache) setOrder(false);
    }, () => {
      if (++fails.current >= 5) return setOrder((o) => o || false);
      t = setTimeout(() => setRound((n) => n + 1), 3000);
    });
    return () => { off(); clearTimeout(t); };
  }, [orgId, id, round]);
  // Uygulama öne gelince yeniden dinle (arkadayken kopan bağlantı)
  useEffect(() => {
    const on = () => {
      if (document.visibilityState !== "visible") return;
      fails.current = 0;
      setRound((n) => n + 1);
    };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return order;
}

export async function placeOrder(orgId, uid, data) {
  const at = new Date().toISOString();
  const order = { ...data, uid, at, status: "sent", times: { sent: at } };
  const ref = await addDoc(ordersCol(orgId), order);
  touch((m) => ({ history: [{ ...order, id: ref.id }, ...m.history] }));
  return ref.id;
}

// Siparişin durumu şu an (deneme siparişleri kendiliğinden ilerler)
export const withLiveNow = (list, now = Date.now()) => (list || []).map((o) => ({ ...o, live: liveView(o, placeById(o.placeId), now) }));

// Siparişi ver (sepet ve asistan aynı yoldan): yollardan rota, süre = hazırlık + yol, deneme modu ayardan.
// Restorana en yakın müsait kurye (yoksa en yakın kurye) hemen atanır (Seyhun 2026-10-23); kurye restoranda kare kodu okutunca ya da
// restoran "Kuryeye ver" deyince yola çıkar.
export async function orderNow(orgId, uid, { place, lines, address, pay = "kapıda-kart", name = "", demo = true }) {
  const totals = cartTotals(place, lines);
  const km = distanceKm(place.pos, address.pos);
  const food = await loadFood(orgId).catch(() => null);
  const near = pickCourier(food?.settings?.couriers || [], withLiveNow(food?.history), place.pos);
  const route = await fetchRoute(place.pos, address.pos);
  const road = roadMin({ route, address }, place);
  const id = await placeOrder(orgId, uid, {
    placeId: place.id, placeName: place.name, cuisines: place.cuisines, lines, subtotal: totals.subtotal, fee: totals.fee, total: totals.total,
    pay, address, customer: name || "", demo, eta: etaFrom({ status: "sent" }, place, Number.isFinite(km) ? km : 2, new Date(), road).toISOString(), courier: near ? courierOnOrder(near) : null, route,
  });
  saveMe(orgId, { lastAddressId: address.id }).catch(() => {});
  return id;
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

// Ana sayfa kartı: son 3 saatin siparişleri canlı (birkaç belge), açık olan (deneme siparişi saatten) ilki
export function useActiveOrder(orgId) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!orgId) return;
    const from = new Date(Date.now() - 3 * 3600000).toISOString();
    return onSnapshot(query(ordersCol(orgId), where("at", ">=", from)),
      (s) => setList(s.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => b.at.localeCompare(a.at))),
      () => setList([]));
  }, [orgId]);
  return list;
}

// Restoranın ve kuryenin işleri. Deneme siparişine dokunulunca gerçek olur (demo: false).
const nowIso = () => new Date().toISOString();
export function acceptOrder(orgId, o, place) {
  const t = nowIso();
  const road = roadMin(o, place);
  return patchOrder(orgId, o.id, { demo: false, status: "preparing", times: { ...(o.times || {}), accepted: t, preparing: t }, eta: new Date(Date.now() + ((place?.prepMin || 20) + road) * 60000).toISOString() });
}
export const rejectOrder = (orgId, o) => patchOrder(orgId, o.id, { demo: false, status: "cancelled", times: { ...(o.times || {}), cancelled: nowIso() } });
export const giveToCourier = (orgId, o, place, courier) => patchOrder(orgId, o.id, pickupPatch(o, place, courier));
export const deliverOrder = (orgId, o) => patchOrder(orgId, o.id, deliverPatch(o));
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
