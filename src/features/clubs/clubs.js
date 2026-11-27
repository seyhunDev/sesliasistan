"use client";

// Resmi kulüp listesi (clubs/{id}; herkes okur, yalnız Velora ana hesabı yazar, firestore.rules) ve kullanıcının kulübü
// (users/{uid}.clubId, clubAsked). Seyhun 2026-11-27: serbest kulüp adı yok; listede yoksa "Kulüpsüz devam et".
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { deleteDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { CLUB, DIKILI, DIKILI_ID, cleanClub, setClub } from "@/lib/club";

let listMemo = null; // Promise<[{ id, ...club }]>
const subs = new Set();
const tell = () => subs.forEach((f) => f());

export function loadClubs({ fresh = false } = {}) {
  if (fresh || !listMemo) {
    listMemo = getDocs(collection(db, "clubs")).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
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
  return s?.exists() ? { id: s.id, ...s.data() } : null;
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
export async function seedDikili(list) {
  if ((list || []).some((c) => c.id === DIKILI_ID)) return false;
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
