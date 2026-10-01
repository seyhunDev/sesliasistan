"use client";

// Sporcunun kendi yoklamasını uygulamada görebilmesi için kulüp verisinden yalnızca ad ve yoklama geçmişi
// bizim projeye kopyalanır: orgs/{ana hesap}/athleteAtt/{sporcunun kişi kimliği} = { name, athleteId, att: { "YYYY-MM-DD": durum }, parents: [veli kimlikleri] }
// Yalnızca uygulamada hesabı olan sporcular için. Okuyabilenler: ana hesap, sporcunun kendisi, bağlı velileri (firestore.rules).
// Sağlık, T.C., adres gibi kulüp bilgileri kopyalanmaz.
import { arrayUnion, deleteField, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";

const ref = (orgId, mid) => doc(db, "orgs", orgId, "athleteAtt", mid);

// { 2026: { "09-29": "present" } } -> { "2026-09-29": "present" }
export function flatAtt(att = {}) {
  const out = {};
  for (const [y, days] of Object.entries(att)) for (const [md, v] of Object.entries(days || {})) if (v) out[`${y}-${md}`] = v;
  return out;
}

// Tüm geçmişi yazar (hesap açılınca ya da "eşitle")
export const syncAthleteAtt = (orgId, mid, a, parents) =>
  setDoc(ref(orgId, mid), { name: a.studentName, athleteId: a.id, att: flatAtt(a.att), ...(parents ? { parents } : {}), updatedAt: new Date().toISOString() }, { merge: true });

// Veliyi bağla
export const linkParent = (orgId, mid, parentId) => setDoc(ref(orgId, mid), { parents: arrayUnion(parentId) }, { merge: true });

// Yoklama kaydedilince: değişen sporculardan hesabı olanların kopyası güncellenir
// members: ana hesabın kişileri; changes: { kulüp sporcu kimliği: durum | null }
export async function mirrorChanges(orgId, members, date, changes) {
  const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m]));
  const jobs = Object.entries(changes)
    .filter(([id]) => linked.has(id))
    .map(([id, v]) => setDoc(ref(orgId, linked.get(id).uid), { att: { [date]: v || deleteField() }, updatedAt: new Date().toISOString() }, { merge: true }));
  await Promise.allSettled(jobs);
}
