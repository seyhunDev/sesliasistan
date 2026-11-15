"use client";

// Kalıp resimleri (lib/englishPics.js): orgs/{orgId}/englishPic/{kalıp id} = { img: JPEG data adresi (512 px), at }.
// Bir kez çizilir (/api/english-pic), telefonda küçültülüp yazılır; okunan resim bellekte kalır (sayfa açıkken tekrar okunmaz).
// Belge yoksa ve ana hesapsa kalıp açılınca kendiliğinden çizilir. Kural: ana hesap orgs altını okur/yazar (değişiklik yok).
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { setDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";

const mem = new Map(); // id → data adresi ya da "" (yok)
const busy = new Map(); // id → çizim sözü
const ref = (orgId, id) => doc(db, "orgs", orgId, "englishPic", id);
const ping = (id) => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("sa-en-pic", { detail: id }));

export const cachedPic = (id) => mem.get(id);

export async function loadPic(orgId, id) {
  if (!orgId || !id) return "";
  if (mem.has(id)) return mem.get(id);
  const snap = await getDoc(ref(orgId, id)).catch(() => null);
  const img = snap?.exists() ? String(snap.data().img || "") : "";
  mem.set(id, img);
  return img;
}

// Hepsi (Resimler listesi): { id: img }
export async function loadPics(orgId) {
  if (!orgId) return {};
  const snap = await getDocs(collection(db, "orgs", orgId, "englishPic"));
  const all = {};
  snap.forEach((d) => {
    all[d.id] = String(d.data().img || "");
    mem.set(d.id, all[d.id]);
  });
  return all;
}

function shrink(src, size = 512) {
  return new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const s = Math.min(im.width, im.height);
      c.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size);
      ok(c.toDataURL("image/jpeg", 0.8));
    };
    im.onerror = () => no(new Error("Resim açılamadı"));
    im.src = src;
  });
}

// Çiz ve kaydet; aynı kalıp için ikinci istek ilkini bekler
export function makePic(orgId, id) {
  if (busy.has(id)) return busy.get(id);
  const p = (async () => {
    const res = await authFetch("/api/english-pic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.image) throw new Error(data.error || "Resim çizilemedi, tekrar dene.");
    const img = await shrink(data.image);
    await setDoc(ref(orgId, id), { img, at: new Date().toISOString() });
    mem.set(id, img);
    ping(id);
    return img;
  })().finally(() => busy.delete(id));
  busy.set(id, p);
  return p;
}

export const drawing = (id) => busy.has(id);
