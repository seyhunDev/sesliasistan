"use client";

// Sporcu iki yerde durur: kulüp projesinde (dikili-c7cc8, asıl kart) ve bizim projede Kişiler › Sporcular
// (orgs/{ana hesap}/members, kind "athlete", athleteId ile kulüp kartına bağlı). Ekleme ve silme ikisini birlikte günceller.
import { addDoc, collection, deleteField, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { createAthlete, loadAthletes } from "./data";

const low = (s) => String(s || "").trim().toLocaleLowerCase("tr-TR");
const day = (d) => (d ? String(d).slice(0, 10) : "");

// Kulüpte açılan sporcuyu Kişiler'e bağlar: aynı adlı, bağsız sporcu kişisi varsa ona bağlanır, yoksa hesapsız kişi açılır.
// Dönüş: kişi kimliği
export async function linkMember(orgId, members, { id, name, birth = "", phone = "" }) {
  const same = members.find((m) => m.kind === "athlete" && m.status !== "left" && !m.athleteId && low(m.name) === low(name));
  if (same) {
    await updateDoc(doc(db, "orgs", orgId, "members", same.uid), { athleteId: id, updatedAt: new Date().toISOString() });
    return same.uid;
  }
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "orgs", orgId, "members"), {
    name: name.trim(), kind: "athlete", athleteId: id, birth: day(birth), phone, email: "", account: false, status: "active", createdAt: now, updatedAt: now,
  });
  await updateDoc(ref, { uid: ref.id });
  return ref.id;
}

// Kulüpten silinen sporcunun Kişiler'deki kaydı: hesapsızsa silinir (Kişiler'deki silme gibi "left"),
// uygulama hesabı varsa hesap kalır, yalnız kulüp bağı kaldırılır. Dönüş: hesabı kalan kişiler
export async function unlinkMembers(orgId, members, athleteId) {
  const kept = [];
  for (const m of members.filter((x) => x.athleteId === athleteId && x.status !== "left")) {
    const ref = doc(db, "orgs", orgId, "members", m.uid);
    if (m.account === false) await updateDoc(ref, { status: "left", leftAt: new Date().toISOString() });
    else {
      await updateDoc(ref, { athleteId: deleteField(), updatedAt: new Date().toISOString() });
      kept.push(m);
    }
  }
  return kept;
}

// Kişiler'den eklenen sporcu: kulüpte aynı adlı ve başka kişiye bağlı olmayan sporcu varsa o, yoksa kulübe yeni sporcu açılır.
// Dönüş: kulüp sporcu kimliği
export async function clubAthleteFor({ name, birth = "", phone = "" }, members = []) {
  const { athletes } = await loadAthletes({ fresh: true });
  const taken = new Set(members.filter((m) => m.athleteId && m.status !== "left").map((m) => m.athleteId));
  const same = athletes.find((a) => low(a.studentName) === low(name) && !taken.has(a.id));
  if (same) return same.id;
  return createAthlete({ studentName: name.trim(), studentBirthDate: day(birth), studentPhone: phone });
}
