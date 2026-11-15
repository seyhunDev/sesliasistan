"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { setDoc } from "@/lib/firebase/write";
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

export function sendMsg(org, text) {
  const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, MSG_MAX);
  if (!t) return Promise.resolve(false);
  return saveBilgi(org, { msg: { id: newId(), text: t, at: Date.now() } }).then(() => true);
}

const b64 = (blob) =>
  new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = no;
    r.readAsDataURL(blob);
  });

// Ses kaydı belgeye base64 yazılır (20 sn, ~32 kbit/sn ≈ 100 KB; Storage kuralı gerekmez)
export async function sendSes(org, blob, dur) {
  const data = await b64(blob);
  if (!data || data.length > 700000) return false;
  await setDoc(ref(org, "ses"), { id: newId(), at: Date.now(), type: (blob.type || "audio/mp4").split(";")[0], dur: Math.round(dur), data });
  return true;
}
