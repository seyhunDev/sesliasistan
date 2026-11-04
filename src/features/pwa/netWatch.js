"use client";

import { disableNetwork, enableNetwork, waitForPendingWrites } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { FLASH_MS, FLASH_GAP, RESUME_KICK_MS, pendingGrace } from "@/lib/netSync";

// Gönderilmeyi bekleyen kayıt var mı: waitForPendingWrites yazma yoksa hemen biter, varsa hepsi sunucuya ulaşınca.
// Okuma yapmaz, yalnız telefondaki sırayı sorar. Yalnız kullanıcı kaydettiğinde onay gecikirse (lib/soon.js "sa-write-wait")
// ve internet geri gelince çağrılır; uygulamaya dönüşte ya da aralıklarla bakılmaz (eskiden arka plandaki "son görülme"
// yazması yeniden bağlanırken 1,2 sn'yi geçince internet varken "Bağlantı zayıf" şeridi açılıyordu).
// İnternet varken uzun bekleyen kayıt: şerit yalnız bir kez kısa görünür (FLASH_MS, en çok FLASH_GAP'te bir), sonra kapanır;
// gönderim arkada sürer (Seyhun 2026-10-23: "bir kere gösterip kapatalım"). Takılmanın nedeni çoğunlukla iPhone'da uygulama
// arkadan dönünce Firestore bağlantısının asılı kalması: bu durumda bağlantı bir kez kapatılıp açılır (kick), kayıt gider.
let state = { pending: false, sent: false, hush: false };
let waiting = false;
let again = false; // beklerken yeni kayıt geldi: bitince bir kez daha bakılır
let sentTimer = 0;
let hushTimer = 0;
let lastFlash = 0;
let wasOff = false; // bekleyen kayıt internet yokken görüldü: gidince "gönderildi" denir (internet varken denmez)
const subs = new Set();
const emit = (next) => {
  state = { ...state, ...next };
  subs.forEach((f) => f());
};

export const subscribeNet = (f) => (subs.add(f), () => subs.delete(f));
export const netState = () => state;

// Asılı bağlantıyı yeniler (okuma yapmaz; dinleyiciler kaldığı yerden sürer). Sunucuyu bekleyip cevap alamayan okuma da çağırır (lib/firebase/fastRead.js)
let kicking = false;
export function kickNet() {
  kick();
}
function kick() {
  if (kicking) return;
  kicking = true;
  disableNetwork(db)
    .catch(() => {})
    .then(() => enableNetwork(db))
    .catch(() => {})
    .finally(() => (kicking = false));
}

// Bağlantı dönünce veriler kendiliğinden yenilensin (Seyhun 2026-11-04: "internet geri gelse bile hemen alınıyor mu bilmiyorum,
// sayfayı yenilemek ya da uygulamayı kapatıp açmak zorunda kalıyorum"). iPhone uygulamayı arkaya alınca Firestore'un açık bağlantısını
// sessizce keser; Firestore bunu çoğu zaman uzun süre fark etmez, dinleyiciler eski veride kalır. Uygulama RESUME_KICK_MS'ten uzun
// arkada kaldıysa öne gelince ve internet geri gelince bağlantı bir kez kapatılıp açılır: dinleyiciler kaldığı yerden sürer,
// yalnız aradaki değişiklikler gelir (fazladan tam okuma yok).
export function watchReconnect() {
  if (typeof window === "undefined") return () => {};
  let hiddenAt = 0;
  const vis = () => {
    if (document.visibilityState === "hidden") return void (hiddenAt = Date.now());
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    if (away > RESUME_KICK_MS && navigator.onLine !== false) kick();
  };
  const back = (e) => e.persisted && kick(); // Safari sayfayı önbellekten geri getirdi
  window.addEventListener("online", kick);
  window.addEventListener("pageshow", back);
  document.addEventListener("visibilitychange", vis);
  return () => {
    window.removeEventListener("online", kick);
    window.removeEventListener("pageshow", back);
    document.removeEventListener("visibilitychange", vis);
  };
}

// Aynı anda tek bekleyici
export function checkWrites() {
  if (typeof window === "undefined") return;
  if (waiting) {
    again = true;
    // İnternet geri geldi ama kayıtlar hâlâ gitmedi: biraz sonra bağlantı yenilenir, şerit kapanır (gönderim arkada sürer)
    if (state.pending && navigator.onLine !== false) {
      clearTimeout(hushTimer);
      hushTimer = setTimeout(() => {
        if (!state.pending || navigator.onLine === false) return;
        kick();
        emit({ hush: true });
      }, FLASH_MS * 2);
    }
    return;
  }
  waiting = true;
  let done = false;
  const online = navigator.onLine !== false;
  const slow = setTimeout(() => {
    if (done || state.pending) return;
    if (navigator.onLine === false) {
      wasOff = true;
      return emit({ pending: true, sent: false, hush: false });
    }
    kick();
    const flash = Date.now() - lastFlash > FLASH_GAP;
    if (flash) lastFlash = Date.now();
    emit({ pending: true, sent: false, hush: !flash });
    clearTimeout(hushTimer);
    if (flash) hushTimer = setTimeout(() => navigator.onLine !== false && emit({ hush: true }), FLASH_MS);
  }, pendingGrace(online));
  // İnternet giderse bekleyen kayıt hemen görünsün
  const off = () => {
    if (done) return;
    clearTimeout(hushTimer);
    wasOff = true;
    emit({ pending: true, sent: false, hush: false });
  };
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
      clearTimeout(hushTimer);
      clearTimeout(sentTimer);
      // Şerit kapanmışsa (kısa gösterildi) ya da internet hiç gitmediyse "gönderildi" denmez
      const loud = wasOff && !state.hush;
      wasOff = false;
      if (!loud) return emit({ pending: false, sent: false, hush: false });
      emit({ pending: false, sent: true, hush: false });
      sentTimer = setTimeout(() => emit({ sent: false }), 3000);
    });
}
