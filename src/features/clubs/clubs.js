"use client";

// Resmi kulüp listesi (clubs/{id}; herkes okur, yalnız Velora ana hesabı yazar, firestore.rules) ve kullanıcının kulübü
// (users/{uid}.clubId, clubAsked). Seyhun 2026-11-27: serbest kulüp adı yok; listede yoksa "Kulüpsüz devam et".
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { deleteDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { CLUB, DIKILI, DIKILI_ID, cleanClub, clubKey, setClub } from "@/lib/club";
import { DIKILI_GSB, TYF_CLUBS } from "@/lib/clubsTyf";

let listMemo = null; // Promise<[{ id, ...club }]>
const subs = new Set();
const tell = () => subs.forEach((f) => f());

// Hazır liste: Dikili + TYF kulüpleri (lib/clubsTyf.js: lig kulüpleri ve federasyon portalındaki GSB numaralı kulüpler, 2026-11-27). Veritabanında kayıt olmasa da listede görünür (Seyhun 2026-11-27 "kulüp
// listesi neden çıkmıyor"); Admin › Kulüpler'de düzenlenen kulüp clubs/{id} kaydıyla üstüne yazılır (aynı kimlik ya da aynı TYF adı).
export const BASE_CLUBS = [{ id: DIKILI_ID, ...DIKILI, tfId: DIKILI_GSB }, ...TYF_CLUBS.map(([id, tyfName, name, city, tfId]) => ({ id, name, tyfName, city, district: "", tfId }))];
const withBase = (l) => {
  const ids = new Set(l.map((c) => c.id));
  const keys = new Set(l.map((c) => clubKey(c.tyfName || c.name)).filter(Boolean));
  return [...BASE_CLUBS.filter((c) => !ids.has(c.id) && !keys.has(clubKey(c.tyfName))), ...l];
};

export function loadClubs({ fresh = false } = {}) {
  if (fresh || !listMemo) {
    listMemo = getDocs(collection(db, "clubs")).then((s) => withBase(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    listMemo.catch(() => (listMemo = null));
  }
  return listMemo;
}

export async function loadClub(id) {
  if (!id) return null;
  const list = listMemo ? await listMemo.catch(() => null) : null;
  const hit = list?.find((c) => c.id === id);
  if (hit) return hit;
  const s = await getDoc(doc(db, "clubs", id)).catch(() => null);
  if (s?.exists()) return { id: s.id, ...s.data() };
  return BASE_CLUBS.find((c) => c.id === id) || null;
}

// Kullanıcının kulübünü seçer (id) ya da kulüpsüz geçer (""); soru bir daha sorulmaz
export async function chooseClub(uid, id) {
  if (!uid) return;
  await updateDoc(doc(db, "users", uid), { clubId: id || "", clubAsked: true });
  const c = id ? await loadClub(id) : null;
  setClub(c, CLUB.signer);
  tell();
}

// Admin › Kulüpler (yalnız Velora ana hesabı)
export async function saveClub(id, data) {
  await setDoc(doc(db, "clubs", id), { ...cleanClub(data), updatedAt: new Date().toISOString() }, { merge: true });
  listMemo = null;
  if (CLUB.id === id) setClub({ id, ...data }, CLUB.signer);
  tell();
}
export async function removeClub(id) {
  await deleteDoc(doc(db, "clubs", id));
  listMemo = null;
  tell();
}
// Dikili kaydı listede yoksa eklenir (eski koddaki antet bilgileriyle)
export async function seedDikili() {
  const s = await getDoc(doc(db, "clubs", DIKILI_ID));
  if (s.exists()) return false;
  await saveClub(DIKILI_ID, DIKILI);
  return true;
}

// Giriş yapan kişinin kulübünü belgelerin okuduğu yere (lib/club.js CLUB) yükler
export async function syncClub(profile) {
  const c = profile?.clubId ? await loadClub(profile.clubId).catch(() => null) : null;
  setClub(c, profile?.name || "");
  tell();
}

// Ekranda kulübün değişmesini izlemek için: { id, name, ... } (kulüpsüzde id boş)
export function useClub() {
  const [, set] = useState(0);
  useEffect(() => {
    const f = () => set((n) => n + 1);
    subs.add(f);
    return () => subs.delete(f);
  }, []);
  return CLUB;
}
