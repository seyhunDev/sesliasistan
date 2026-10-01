"use client";

// Ortak alışveriş listesi: orgs/{ana hesap}/shop/{madde} = { text, list: "family" | "team", done, by, at, doneBy, doneAt }
// Aile listesini ana hesap + aile bireyleri, Ekip listesini ana hesap + çalışanlar görür (firestore.rules).
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { kindOf } from "@/lib/kinds";

export const LISTS = { family: { name: "Aile", icon: "home" }, team: { name: "Ekip", icon: "users" } };

// Kişinin görebildiği listeler. Ana hesap: aile bireyi varsa (ya da hiç çalışan yoksa) Aile, çalışan varsa Ekip.
export function listsFor(kind, members = []) {
  if (kind === "family") return ["family"];
  if (kind === "staff") return ["team"];
  if (kind !== "owner") return [];
  const hasStaff = members.some((m) => kindOf(m) === "staff");
  const hasFamily = members.some((m) => kindOf(m) === "family");
  return [...(hasFamily || !hasStaff ? ["family"] : []), ...(hasStaff ? ["team"] : [])];
}

const col = (orgId) => collection(db, "orgs", orgId, "shop");

export function useShop(orgId, list) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!orgId || !list) return;
    return onSnapshot(
      query(col(orgId), where("list", "==", list)),
      (s) => setItems(s.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => (a.done - b.done) || String(b.at).localeCompare(String(a.at)))),
      () => setItems([]),
    );
  }, [orgId, list]);
  return items;
}

// "süt, ekmek ve 2 kg domates" → ["Süt", "Ekmek", "2 kg domates"]
export function splitItems(text) {
  return String(text || "")
    .split(/\s*(?:,|;|\n|\s+ve\s+|\s+ile\s+)\s*/i)
    .map((s) => s.replace(/^(bir de|bi de|ayrıca)\s+/i, "").trim().replace(/[.!]+$/, ""))
    .filter((s) => s.length > 0 && s.length <= 80)
    .map((s) => s[0].toLocaleUpperCase("tr-TR") + s.slice(1))
    .slice(0, 30);
}

export async function addItems(orgId, list, uid, texts) {
  const at = new Date().toISOString();
  await Promise.all(texts.map((text) => addDoc(col(orgId), { text, list, done: false, by: uid, at })));
}
export const toggleItem = (orgId, it, uid) =>
  updateDoc(doc(col(orgId), it.id), it.done ? { done: false, doneBy: null, doneAt: null } : { done: true, doneBy: uid, doneAt: new Date().toISOString() });
export const removeItem = (orgId, it) => deleteDoc(doc(col(orgId), it.id));
export async function clearDone(orgId, items) {
  const b = writeBatch(db);
  items.filter((i) => i.done).forEach((i) => b.delete(doc(col(orgId), i.id)));
  await b.commit();
}
