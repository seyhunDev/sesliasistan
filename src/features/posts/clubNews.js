"use client";

// Afişi Dikili Yelken sitesindeki "Kulüpten haberler"e ekleme (Seyhun, 2026-10-12).
// Kayıt kulüp projesinde (dikili-c7cc8, sporcularla aynı bağlantı: athletes/dikili.js):
// news/{id} { title, body, date, published, cover, photoCount, createdAt, updatedAt, source: "afis-asistani", sourceId }
// news/{id}/photos/{"0".."7"} { data (JPEG dataURL), order }; 0 afişin kendisi.
// Yazma izni o projenin kurallarında: kulüp hesabıyla giriş + admins/{uid} belgesi. Kurallar burada değişmez.
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { dikiliAuth, dikiliDb } from "@/features/athletes/dikili";
import { NEWS_MAX_PHOTOS, newsFields } from "./newsModel";

const news = () => collection(dikiliDb(), "news");
const photos = (id) => collection(dikiliDb(), "news", id, "photos");

// Hata metni: yetki yoksa açık söylenir
export function newsError(e) {
  const code = e?.code || "";
  if (code === "permission-denied") return "Dikili Yelken sitesine yazma izni yok. Yönetici (admins) olarak kayıtlı kulüp hesabıyla giriş yapmalısın.";
  if (code === "unauthenticated") return "Dikili Yelken yönetici hesabıyla giriş yapın.";
  if (code === "unavailable" || /network|offline/i.test(e?.message || "")) return "İnternete ulaşılamadı, sonra tekrar dene.";
  return e?.message || "Haber kaydedilemedi.";
}

// Giriş + yönetici mi: { user, admin } (admin null: okunamadı, yazarken kurallar karar verir)
export async function newsAccess() {
  const auth = dikiliAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return { user: null, admin: false };
  try {
    const d = await getDoc(doc(dikiliDb(), "admins", user.uid));
    return { user, admin: d.exists() };
  } catch {
    return { user, admin: null };
  }
}

// Gönderinin haberi: önce kayıtlı newsId, yoksa sourceId = gönderi kimliği (aynı afiş ikinci kez eklenmesin)
export async function findNews(postId, newsId = "") {
  if (newsId) {
    const d = await getDoc(doc(news(), newsId));
    if (d.exists()) return { id: d.id, ...d.data() };
  }
  if (!postId) return null;
  const q = await getDocs(query(news(), where("sourceId", "==", postId), limit(1)));
  const d = q.docs[0];
  return d ? { id: d.id, ...d.data() } : null;
}

// Görseli JPEG dataURL'e çevir: en uzun kenar `max`, kalite `q`; `cap` bayttan büyükse kalite düşürülür
async function bitmapOf(src) {
  if (src instanceof HTMLCanvasElement) return src;
  if (src instanceof Blob) return createImageBitmap(src);
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
export async function jpegOf(src, max, q, cap = Infinity) {
  const im = await bitmapOf(src);
  const w0 = im.width || im.naturalWidth;
  const h0 = im.height || im.naturalHeight;
  const k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w0 * k));
  c.height = Math.max(1, Math.round(h0 * k));
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(im, 0, 0, c.width, c.height);
  let quality = q;
  let url = c.toDataURL("image/jpeg", quality);
  while (url.length * 0.75 > cap && quality > 0.3) {
    quality -= 0.1;
    url = c.toDataURL("image/jpeg", quality);
  }
  return url;
}

// Fotoğraflar: kaynak listesi (afiş tuvali + seçilen dosyalar), en çok 8
async function encode(list) {
  const out = [];
  for (const src of list.slice(0, NEWS_MAX_PHOTOS)) out.push(await jpegOf(src, 1280, 0.75, 900 * 1024));
  return out;
}
async function dropPhotos(id) {
  const q = await getDocs(photos(id));
  if (!q.size) return;
  const b = writeBatch(dikiliDb());
  q.docs.forEach((d) => b.delete(d.ref));
  await b.commit();
}
async function writePhotos(id, list) {
  for (let i = 0; i < list.length; i++) await setDoc(doc(photos(id), String(i)), { data: list[i], order: i });
}

// Yeni haber: belge + fotoğraflar; kimlik döner
export async function addNews(postId, draft, sources) {
  const list = await encode(sources);
  const cover = sources[0] ? await jpegOf(sources[0], 480, 0.6) : null;
  const ref = doc(news());
  await setDoc(ref, { ...newsFields(draft, postId), cover, photoCount: list.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await writePhotos(ref.id, list);
  return ref.id;
}

// Düzenle: yazılar; sources verilirse fotoğraflar baştan yazılır
export async function editNews(id, postId, draft, sources = null) {
  const data = { ...newsFields(draft, postId), updatedAt: serverTimestamp() };
  if (sources) {
    const list = await encode(sources);
    await dropPhotos(id);
    await writePhotos(id, list);
    data.cover = sources[0] ? await jpegOf(sources[0], 480, 0.6) : null;
    data.photoCount = list.length;
  }
  await updateDoc(doc(news(), id), data);
}

export const publishNews = (id, published) => updateDoc(doc(news(), id), { published: !!published });

// Haberden kaldır: önce fotoğraflar, sonra belge
export async function removeNews(id) {
  await dropPhotos(id);
  await deleteDoc(doc(news(), id));
}
