"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/features/auth/AuthProvider";

// Sporcu "ses adları" dizini: yoklamada yapay zeka adları buna göre eşleştirir.
// Profilde durur (users/{uid}.athleteIndex): { at, notes: [..], list: { sporcuId: { n: ad, a: [söylenişler], m: elle düzenlendi } } }
// Yalnızca ad ve söylenişler; T.C., sağlık gibi bilgi yok.
const EMPTY = { list: {}, notes: [] };

export function useNameIndex() {
  const { profile } = useAuth();
  const idx = profile?.athleteIndex || EMPTY;
  const save = (next) => updateDoc(doc(db, "users", profile.uid), { athleteIndex: { list: next.list || {}, notes: next.notes || [], at: new Date().toISOString() } });
  return { idx, save };
}

export const aliasesOf = (idx, id) => idx?.list?.[id]?.a || [];

// Dizini olmayan ya da adı değişmiş sporcular
export const missing = (idx, athletes) => athletes.filter((a) => idx?.list?.[a.id]?.n !== a.studentName);

// Yapay zekayla hazırla. need: yalnızca bu sporcular (boşsa hepsi). Elle düzenlenenlere dokunulmaz.
export async function generate(idx, athletes, classes, need) {
  const keep = (id) => idx?.list?.[id]?.m && idx.list[id].n === athletes.find((a) => a.id === id)?.studentName;
  const ids = (need || athletes).map((a) => a.id).filter((id) => !keep(id));
  if (!ids.length) return idx;
  const res = await authFetch("/api/athlete-names", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ athletes: athletes.map((a) => ({ id: a.id, name: a.studentName, cls: classes[a.currentClassId] || "" })), need: ids }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ses adları hazırlanamadı");
  const list = { ...(idx?.list || {}) };
  const name = Object.fromEntries(athletes.map((a) => [a.id, a.studentName]));
  data.items.forEach((x) => (list[x.id] = { n: name[x.id], a: x.aliases }));
  // Artık olmayan sporcuları at
  Object.keys(list).forEach((id) => !(id in name) && delete list[id]);
  return { list, notes: data.notes?.length ? data.notes : idx?.notes || [] };
}
