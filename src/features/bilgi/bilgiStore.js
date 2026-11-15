"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { addDoc, setDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { cleanBilgi, MSG_MAX } from "@/lib/bilgi";

// Bilgi ekranı verisi: orgs/{org}/bilgi/ekran (sayaç, parkur, mesaj) ve orgs/{org}/bilgi/ses (son bas-konuş kaydı).
// Ekranlar belgeyi dinler (onSnapshot): okuma yalnız belge değişince olur, kaç sporcu açarsa açsın sürekli sorma yok.
const ref = (org, name) => doc(db, "orgs", org, "bilgi", name);
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useBilgiDoc(org, name) {
  const [v, setV] = useState({ key: "", d: undefined });
  const key = org ? `${org}/${name}` : "";
  useEffect(() => {
    if (!org) return;
    return onSnapshot(
      ref(org, name),
      (s) => setV({ key, d: s.exists() ? s.data() : null }),
      () => setV({ key, d: null }),
    );
  }, [org, name, key]);
  return v.key === key ? v.d : undefined; // undefined: yükleniyor
}

export function useBilgi(org) {
  const d = useBilgiDoc(org, "ekran");
  return d === undefined ? undefined : cleanBilgi(d || {});
}

export const saveBilgi = (org, patch) => setDoc(ref(org, "ekran"), { ...patch, at: Date.now() }, { merge: true });

// Gönderilen her mesaj ve ses kaydı ayrıca günlüğe yazılır (Seyhun 2026-11-15 "mesajlar kaydedilsin, ne zaman, ne için"):
// orgs/{org}/bilgiLog { kind: "msg" | "ses", text, dur, at, label (start yazısı), state (parkur durumu), course }
function logSent(org, item, ctx = {}) {
  return addDoc(collection(db, "orgs", org, "bilgiLog"), { ...item, at: Date.now(), label: ctx.label || "", state: ctx.state || "", course: ctx.course || "" }).catch(() => {});
}

export function sendMsg(org, text, ctx) {
  const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, MSG_MAX);
  if (!t) return Promise.resolve(false);
  return saveBilgi(org, { msg: { id: newId(), text: t, at: Date.now() } }).then(() => (logSent(org, { kind: "msg", text: t }, ctx), true));
}

// Son gönderilenler (yönetimde açılınca bir kez okunur)
export async function loadLog(org, n = 30) {
  const s = await getDocs(query(collection(db, "orgs", org, "bilgiLog"), orderBy("at", "desc"), limit(n)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Pusula kaydı: ekran açıkken telefonun yönü ve yatışı saniyede bir alınır, dakikada bir tek belge olarak yazılır
// orgs/{org}/bilgiPusula { uid, name, at (ilk örnek), pts: [[sn, yön, yatış, baş-kıç], …] }
export const savePusula = (org, data) => addDoc(collection(db, "orgs", org, "bilgiPusula"), data);
export async function loadPusula(org, n = 60) {
  const s = await getDocs(query(collection(db, "orgs", org, "bilgiPusula"), orderBy("at", "desc"), limit(n)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const b64 = (blob) =>
  new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = no;
    r.readAsDataURL(blob);
  });

// Ses kaydı belgeye base64 yazılır (20 sn, ~32 kbit/sn ≈ 100 KB; Storage kuralı gerekmez)
export async function sendSes(org, blob, dur, ctx) {
  const data = await b64(blob);
  if (!data || data.length > 700000) return false;
  await setDoc(ref(org, "ses"), { id: newId(), at: Date.now(), type: (blob.type || "audio/mp4").split(";")[0], dur: Math.round(dur), data });
  logSent(org, { kind: "ses", dur: Math.round(dur) }, ctx);
  return true;
}
