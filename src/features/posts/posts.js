"use client";

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { cleanPost } from "./postModel";

// Gönderiler: orgs/{orgId}/posts (yalnız ana hesap; mevcut kural ana hesaba orgs altındaki her koleksiyonu açıyor).
// Fotoğraf ayrı belgede (orgs/{orgId}/postPhotos/{id}): liste fotoğrafsız okunur, fotoğraf yalnız gönderi açılınca okunur.
const col = (orgId) => collection(db, "orgs", orgId, "posts");
const photoDoc = (orgId, id) => doc(db, "orgs", orgId, "postPhotos", id);

// Okuma: sayfa açılınca bir kez (canlı dinleme yok, kota için)
export async function loadPosts(orgId) {
  const snap = await getDocs(col(orgId));
  return snap.docs
    .map((d) => {
      const x = d.data();
      return { id: d.id, ...cleanPost(x), at: x.updatedAt?.toMillis?.() || x.createdAt?.toMillis?.() || 0 };
    })
    .sort((a, b) => b.at - a.at);
}

export async function loadPost(orgId, id) {
  const s = await getDoc(doc(col(orgId), id));
  return s.exists() ? { id, ...cleanPost(s.data()) } : null;
}

export async function loadPhoto(orgId, id) {
  const s = await getDoc(photoDoc(orgId, id));
  return s.exists() ? String(s.data().data || "") : "";
}

// photo: undefined → fotoğrafa dokunma; "" → sil; dataURL → yaz. Kimliği döndürür.
export async function savePost(orgId, uid, post, photo) {
  const data = { ...cleanPost({ ...post, hasPhoto: photo === undefined ? post.hasPhoto : !!photo }), updatedAt: serverTimestamp() };
  let id = post.id;
  if (id) await updateDoc(doc(col(orgId), id), data);
  else id = (await addDoc(col(orgId), { ...data, createdByUid: uid, createdAt: serverTimestamp() })).id;
  if (photo) await setDoc(photoDoc(orgId, id), { data: photo, updatedAt: serverTimestamp() });
  else if (photo === "" && post.hasPhoto) await deleteDoc(photoDoc(orgId, id)).catch(() => {});
  return id;
}

export async function deletePost(orgId, post) {
  await deleteDoc(doc(col(orgId), post.id));
  if (post.hasPhoto) await deleteDoc(photoDoc(orgId, post.id)).catch(() => {});
}

// Yapay zekayla görsel yazıları + açıklama + etiketler. Yalnız konu, tür, yarış bilgisi ve mevcut yazılar gider (fotoğraf gitmez).
// ask: ana asistana söylenen değişiklik ("daha kısa yaz", "Mete 2. oldu diye ekle")
export async function askCaption(post, ask = "") {
  const current = { headline: post.headline, sub: post.sub, people: post.people, wish: post.wish, tag: post.tag };
  const res = await authFetch("/api/post-caption", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: post.kind, topic: post.topic, race: post.race, today: todayStr(), caption: post.caption, ask, current }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Açıklama yazılamadı");
  return p;
}

// Yapay zekayla görsel (Gemini). Görselde yazı olmaz; yazılar telefonda üstüne çizilir. { image: dataURL, usage }
export async function askImage(post, wish) {
  const res = await authFetch("/api/post-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: post.kind, topic: post.topic, race: post.race, wish, format: post.format, pos: post.pos }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(p.error || "Görsel üretilemedi");
    e.usage = p.usage;
    throw e;
  }
  return p;
}

// Görsel sayacı: { model, today, limit, left, month, cost, price, resetAt }
export async function imageUsage() {
  const res = await authFetch("/api/post-image");
  return res.ok ? res.json() : null;
}

// Açık gönderi ekranı ana asistana kendini bildirir: asistan /posts sayfasında söyleneni buraya verir.
// handler.ask(metin) → { say } (yazıları ya da görseli değiştirir)
let handler = null;
export const setPostHandler = (h) => (handler = h);
export const postHandler = () => handler;
