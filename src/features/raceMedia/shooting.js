"use client";

import { useSyncExternalStore } from "react";

// Çekilen kayıt hazırlanırken (Seyhun 2026-10-28: "videoyu çektim, galeriye gittim, bomboş"): iPhone "Videoyu Kullan"dan sonra
// aslını Fotoğraflar'a kaydedip buluta gidecek kopyayı hazırlarken Medya'da hemen "Kaydediliyor" karesi görünür. Kayıt listeye
// girince (MediaTab keep) ya da vazgeçilince kalkar; bir şey ters giderse 3 dk sonra kendiliğinden kalkar.
let cur = null; // { kind, at }
const subs = new Set();
let timer = 0;
export function setShooting(v) {
  cur = v ? { kind: v.kind || "video", at: Date.now() } : null;
  clearTimeout(timer);
  if (cur) timer = setTimeout(() => setShooting(null), 180e3);
  subs.forEach((f) => f());
}
const sub = (f) => (subs.add(f), () => subs.delete(f));
export const useShooting = () => useSyncExternalStore(sub, () => cur, () => null);
