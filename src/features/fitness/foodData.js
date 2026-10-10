"use client";

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { soon } from "@/lib/soon";
import { addWeight, cleanDay, cleanFood, dayKey, dayOf, monthKey } from "@/lib/fitness/food";

// Beslenme kayıtları: ay başına tek belge orgs/{org}/fitFood/{uid}_{YYYY-MM} (ayı görmek 1 okuma; 3 dk bellekte).
// Gün yazılırken o günün tamamı birleştirerek yazılır (setDoc merge): çevrimdışı da çalışır, diğer günlere dokunmaz.
// Kilo users/{uid}.fitW'de (profil belgesi), son kilo profilin fit.weight'ine de yazılır (hedef ona göre).
const ref = (orgId, uid, ym) => doc(db, "orgs", orgId, "fitFood", `${uid}_${ym}`);
const TTL = 3 * 60_000;
const cache = new Map(); // `${uid}_${ym}` → { at, data }
export const FOOD_SAVED = "sa-food-saved";
const told = () => window.dispatchEvent(new CustomEvent(FOOD_SAVED));

export async function loadMonth(orgId, uid, ym, { force = false } = {}) {
  const k = `${uid}_${ym}`;
  const c = cache.get(k);
  if (!force && c && Date.now() - c.at < TTL) return c.data;
  const snap = await getDoc(ref(orgId, uid, ym)).catch(() => null);
  const data = snap?.exists() ? snap.data() : { days: {} };
  cache.set(k, { at: Date.now(), data });
  return data;
}
// Birden çok ay (son 7 gün iki aya yayılabilir): { "YYYY-MM": belge }
export async function loadMonths(orgId, uid, yms) {
  const list = await Promise.all([...new Set(yms)].map((ym) => loadMonth(orgId, uid, ym).then((d) => [ym, d])));
  return Object.fromEntries(list);
}

// Günü değiştirir: fn(gün) → yeni gün. Dönüş: yeni gün
export async function changeDay(orgId, uid, date, fn) {
  const ym = monthKey(date);
  const month = await loadMonth(orgId, uid, ym);
  const next = cleanDay(fn(dayOf(month, date)));
  const k = dayKey(date);
  const data = { ...month, days: { ...(month.days || {}), [k]: next } };
  cache.set(`${uid}_${ym}`, { at: Date.now(), data });
  told();
  await soon(setDoc(ref(orgId, uid, ym), { uid, days: { [k]: next }, updatedAt: new Date().toISOString() }, { merge: true }), 2500, "Beslenme");
  return next;
}

const stamp = () => new Date().toISOString();
export const addMeals = (orgId, uid, date, meals) =>
  changeDay(orgId, uid, date, (d) => ({ ...d, meals: [...d.meals, ...meals.map((m) => cleanFood({ ...m, id: "", at: stamp() })).filter(Boolean)] }));
export const updateMeal = (orgId, uid, date, meal) =>
  changeDay(orgId, uid, date, (d) => ({ ...d, meals: d.meals.map((m) => (m.id === meal.id ? { ...m, ...meal } : m)) }));
export const dropMeal = (orgId, uid, date, id) => changeDay(orgId, uid, date, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
export const setWater = (orgId, uid, date, n) => changeDay(orgId, uid, date, (d) => ({ ...d, water: Math.max(0, n) }));
export const addWater = (orgId, uid, date, n) => changeDay(orgId, uid, date, (d) => ({ ...d, water: Math.max(0, d.water + n) }));

// Kilo: aynı gün yeniden yazılırsa sonuncusu kalır
export async function saveWeight(uid, list, kg, date = todayStr()) {
  const fitW = addWeight(list, date, kg);
  const last = fitW[fitW.length - 1];
  await soon(updateDoc(doc(db, "users", uid), { fitW, "fit.weight": last.kg }), 2500, "Kilo");
  return fitW;
}

// Yapay zeka (/api/food): { text } ya da { image: { mimeType, data } } → { isFood, items, water, slot, date, note }
export async function askFood(payload) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const res = await authFetch("/api/food", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ today: todayStr(), time, ...payload }), timeout: 30000 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Yemek okunamadı");
  return data;
}
