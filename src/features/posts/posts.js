"use client";

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getBlob, getDownloadURL, getStorage, ref as sref, uploadBytes } from "firebase/storage";
import { app, db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { cleanPost } from "./postModel";

// Gönderiler: orgs/{orgId}/posts (yalnız ana hesap; mevcut kural ana hesaba orgs altındaki her koleksiyonu açıyor).
// Fotoğraf Firebase Storage'da: orgs/{orgId}/postPhotos/{id}_{zaman}.jpg (storage.rules, yalnız ana hesap); gönderide photoPath + photoUrl.
// Eski gönderilerin fotoğrafı ayrı Firestore belgesinde (orgs/{orgId}/postPhotos/{id}) kalır, oradan okunur; yeniden kaydedilince Storage'a geçer.
// Yükleme olmazsa (internet yok) fotoğraf yine eski yere yazılır. Liste fotoğrafsız okunur, fotoğraf yalnız gönderi açılınca okunur.
const col = (orgId) => collection(db, "orgs", orgId, "posts");
const photoDoc = (orgId, id) => doc(db, "orgs", orgId, "postPhotos", id);
const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 30e3;
  s.maxOperationRetryTime = 10e3;
  return s;
};
const photoPath = (orgId, id) => `orgs/${orgId}/postPhotos/${id}_${Date.now().toString(36)}.jpg`;

async function dropStored(path) {
  if (!path) return;
  try {
    await deleteObject(sref(store(), path));
  } catch (e) {
    if (e?.code !== "storage/object-not-found") console.warn("[posts] fotoğraf silinemedi", e?.code || e);
  }
}

const dataUrlOf = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });

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

// Bir işi en çok ms bekler (Storage ağ hatasında kendi kendine dakikalarca yeniden dener, sayfa "yükleniyor"da kalmasın)
const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("zaman aşımı")), ms))]);

// Sunucudan (yönetici erişimi): kural/CORS sorunu olsa da okur, kaydı yarıda kalmış fotoğrafı da bulur
async function serverPhoto(id) {
  const res = await authFetch(`/api/post-photo?id=${encodeURIComponent(id)}`, { timeout: 20e3 });
  if (!res.ok) throw new Error(String(res.status));
  return String((await res.json()).data || "");
}

// Fotoğraf dataURL olarak (görsel telefonda çizilir). post: { id, photoPath }. Bulunamazsa "" (hiç takılmaz).
export async function loadPhoto(orgId, post) {
  if (post.photoPath) {
    try {
      return await within(getBlob(sref(store(), post.photoPath)).then(dataUrlOf), 8e3);
    } catch (e) {
      console.warn("[posts] Storage'dan okunamadı", e?.code || e?.message || e);
    }
  } else {
    try {
      const s = await within(getDoc(photoDoc(orgId, post.id)), 8e3);
      const data = s.exists() ? String(s.data().data || "") : "";
      if (data) return data;
    } catch (e) {
      console.warn("[posts] eski fotoğraf okunamadı", e?.message || e);
    }
  }
  try {
    return await serverPhoto(post.id);
  } catch (e) {
    console.warn("[posts] sunucudan da okunamadı", e?.message || e);
    return "";
  }
}

// photo: undefined → fotoğrafa dokunma; "" → sil; dataURL → yaz. Kimliği döndürür.
export async function savePost(orgId, uid, post, photo) {
  const keep = photo === undefined;
  // Fotoğraf adresine yalnız fotoğraf değişince dokunulur (ekrandaki kopya eski adresi taşıyabilir)
  const { photoPath: _p, photoUrl: _u, ...clean } = cleanPost({ ...post, hasPhoto: keep ? post.hasPhoto : !!photo });
  // Yeni fotoğrafta eski adres yüklenene kadar kalır (kayıt yarıda kalırsa gönderi eski fotoğrafla açılır)
  const data = { ...clean, ...(keep || photo ? {} : { photoPath: "", photoUrl: "" }), updatedAt: serverTimestamp() };
  let id = post.id;
  // Değişen fotoğrafın eski yeri kayıttan (tek okuma)
  const cur = !keep && id ? (await getDoc(doc(col(orgId), id)).catch(() => null))?.data() || {} : {};
  if (id) await updateDoc(doc(col(orgId), id), data);
  else id = (await addDoc(col(orgId), { ...data, createdByUid: uid, createdAt: serverTimestamp() })).id;
  if (keep) return id;
  const old = cur.photoPath || "";
  if (photo) {
    let put = null;
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("çevrimdışı");
      const path = photoPath(orgId, id);
      const r = sref(store(), path);
      const blob = await (await fetch(photo)).blob();
      await uploadBytes(r, blob, { contentType: blob.type || "image/jpeg", cacheControl: "private, max-age=31536000" });
      put = { photoPath: path, photoUrl: await getDownloadURL(r) };
    } catch (e) {
      console.warn("[posts] Storage'a yüklenemedi, eski yere yazılıyor", e?.code || e);
    }
    if (put) {
      await updateDoc(doc(col(orgId), id), put);
      if (cur.hasPhoto) await deleteDoc(photoDoc(orgId, id)).catch(() => {});
    } else {
      await setDoc(photoDoc(orgId, id), { data: photo, updatedAt: serverTimestamp() });
      await updateDoc(doc(col(orgId), id), { photoPath: "", photoUrl: "" });
    }
  } else if (cur.hasPhoto) await deleteDoc(photoDoc(orgId, id)).catch(() => {});
  if (old) await dropStored(old);
  return id;
}

export async function deletePost(orgId, post) {
  // Ekrandaki kopya eski adresi taşıyabilir: fotoğrafın yeri kayıttan
  const cur = (await getDoc(doc(col(orgId), post.id)).catch(() => null))?.data() || post;
  await deleteDoc(doc(col(orgId), post.id));
  if (cur.hasPhoto) await deleteDoc(photoDoc(orgId, post.id)).catch(() => {});
  await dropStored(cur.photoPath);
}

// Arşive kaldır / arşivden çıkar (gönderi silinmez; sırası değişmesin diye updatedAt'a dokunulmaz)
export async function archivePost(orgId, id, archived) {
  await updateDoc(doc(col(orgId), id), { archived: !!archived, archivedAt: archived ? serverTimestamp() : null });
}

// "Kulüpten haberler" bağlantısı (sırası değişmesin diye updatedAt'a dokunulmaz)
export const setPostNews = (orgId, id, newsId) => updateDoc(doc(col(orgId), id), { newsId: newsId || "" });

// Yapay zekayla görsel yazıları + açıklama + etiketler. Yalnız konu, tür, yarış bilgisi ve mevcut yazılar gider (fotoğraf gitmez).
// ask: ana asistana söylenen değişiklik ("daha kısa yaz", "Mete 2. oldu diye ekle")
export async function askCaption(post, ask = "") {
  const current = { headline: post.headline, sub: post.sub, people: post.people, wish: post.wish, tag: post.tag, info: post.info };
  const res = await authFetch("/api/post-caption", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: post.kind, day: post.day, year: post.year, topic: post.topic, race: post.race, today: todayStr(), caption: post.caption, ask, current }),
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
    body: JSON.stringify({ kind: post.kind, day: post.day, year: post.year, topic: post.topic, race: post.race, wish, format: post.format, pos: post.pos }),
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
