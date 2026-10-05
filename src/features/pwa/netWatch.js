"use client";

import { waitForPendingWrites } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";

// Gönderilmeyi bekleyen yazma var mı: waitForPendingWrites yazma yoksa hemen (çevrimdışıyken de) biter; kısa sürede
// bitmezse bekleyen kayıt var demektir. Okuma yapmaz, yalnız cihazdaki sırayı sorar.
const GRACE = 1200; // bundan kısa süren gönderim şerit göstermez
let state = { pending: false, sent: false };
let waiting = false;
let sentTimer = 0;
const subs = new Set();
const emit = (next) => {
  state = { ...state, ...next };
  subs.forEach((f) => f());
};

export const subscribeNet = (f) => (subs.add(f), () => subs.delete(f));
export const netState = () => state;

// Yazmalardan sonra (ya da bağlantı değişince) çağrılır; aynı anda tek bekleyici
export function checkWrites() {
  if (typeof window === "undefined" || waiting) return;
  waiting = true;
  let done = false;
  const slow = setTimeout(() => !done && emit({ pending: true, sent: false }), GRACE);
  waitForPendingWrites(db)
    .catch(() => {})
    .then(() => {
      done = true;
      clearTimeout(slow);
      waiting = false;
      if (!state.pending) return;
      clearTimeout(sentTimer);
      emit({ pending: false, sent: true });
      sentTimer = setTimeout(() => emit({ sent: false }), 3000);
      checkWrites(); // bekleyici kurulduktan sonra gelen yazmalar için
    });
}
