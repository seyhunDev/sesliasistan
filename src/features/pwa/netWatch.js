"use client";

import { waitForPendingWrites } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { pendingGrace } from "@/lib/netSync";

// Gönderilmeyi bekleyen kayıt var mı: waitForPendingWrites yazma yoksa hemen biter, varsa hepsi sunucuya ulaşınca.
// Okuma yapmaz, yalnız telefondaki sırayı sorar. Yalnız kullanıcı kaydettiğinde onay gecikirse (lib/soon.js "sa-write-wait")
// ve internet geri gelince çağrılır; uygulamaya dönüşte ya da aralıklarla bakılmaz (eskiden arka plandaki "son görülme"
// yazması yeniden bağlanırken 1,2 sn'yi geçince internet varken "Bağlantı zayıf" şeridi açılıyordu).
let state = { pending: false, sent: false };
let waiting = false;
let again = false; // beklerken yeni kayıt geldi: bitince bir kez daha bakılır
let sentTimer = 0;
const subs = new Set();
const emit = (next) => {
  state = { ...state, ...next };
  subs.forEach((f) => f());
};

export const subscribeNet = (f) => (subs.add(f), () => subs.delete(f));
export const netState = () => state;

// Aynı anda tek bekleyici
export function checkWrites() {
  if (typeof window === "undefined") return;
  if (waiting) return void (again = true);
  waiting = true;
  let done = false;
  const online = navigator.onLine !== false;
  const slow = setTimeout(() => !done && emit({ pending: true, sent: false }), pendingGrace(online));
  // İnternet giderse bekleyen kayıt hemen görünsün
  const off = () => !done && emit({ pending: true, sent: false });
  window.addEventListener("offline", off);
  waitForPendingWrites(db)
    .catch(() => {})
    .then(() => {
      done = true;
      clearTimeout(slow);
      window.removeEventListener("offline", off);
      waiting = false;
      if (again) {
        again = false;
        return checkWrites(); // şerit açıksa açık kalır, sonrakiler de gidince "gönderildi"
      }
      if (!state.pending) return;
      clearTimeout(sentTimer);
      emit({ pending: false, sent: true });
      sentTimer = setTimeout(() => emit({ sent: false }), 3000);
    });
}
