"use client";

import { useEffect, useSyncExternalStore } from "react";
import { syncPush } from "@/lib/push";

// Service worker'ı kaydeder: yayında çevrimdışı açılış + bildirim; geliştirmede yalnızca bildirim (önbellek kapalı)
export function ServiceWorkerSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url).catch((e) => console.warn("[sw] kaydedilemedi:", e?.message));
  }, []);
  return null;
}

// Bildirim aboneliğini her açılışta (ve uygulamaya dönünce, en çok 30 dakikada bir) tazeler: bildirim izni verilmiş
// ama abonelik kaybolmuşsa (ana ekrana yeniden ekleme, iPhone'un yenilemesi) sessizce yeniden kaydeder.
export function PushSync({ profile }) {
  const uid = profile?.uid;
  useEffect(() => {
    if (!uid) return;
    let last = 0;
    const run = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 30 * 60e3) return;
      last = Date.now();
      syncPush(profile).catch((e) => console.warn("[push] abonelik yenilenemedi:", e?.message));
    };
    run();
    document.addEventListener("visibilitychange", run);
    return () => document.removeEventListener("visibilitychange", run);
    // profil alanları değişince yeniden çalışmasın; kimlik yeter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
  return null;
}

const subscribe = (cb) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

// İnternet var mı (sunucuda her zaman var sayılır)
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

// Bağlantı yokken üstte ince şerit: veriler telefonda, değişiklikler bağlantı gelince gönderilir
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="fade-in sticky top-0 z-30 bg-fg px-4 py-2 text-center text-[0.8125rem] font-medium text-bg">
      Çevrimdışısın · değişikliklerin bağlantı gelince kaydedilir
    </div>
  );
}
