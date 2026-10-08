"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { syncPush } from "@/lib/push";
import { wireNativePush } from "@/lib/nativePush";
import { applyTheme, readTheme, watchTheme } from "@/lib/theme";
import { netText, netTone } from "@/lib/netSync";
import { checkWrites, netState, subscribeNet } from "./netWatch";

// Service worker'ı kaydeder: yayında çevrimdışı açılış + bildirim; geliştirmede yalnızca bildirim (önbellek kapalı)
export function ServiceWorkerSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url).catch((e) => console.warn("[sw] kaydedilemedi:", e?.message));
  }, []);
  // Görünüm otomatikse telefonun açık/koyu ayarı değişince uygulama da değişir; elle seçimde durum çubuğu rengi tutar
  useEffect(() => {
    applyTheme(readTheme());
    return watchTheme();
  }, []);
  return null;
}

// Bildirim aboneliğini her açılışta (ve uygulamaya dönünce, en çok 30 dakikada bir) tazeler: bildirim izni verilmiş
// ama abonelik kaybolmuşsa (ana ekrana yeniden ekleme, iPhone'un yenilemesi) sessizce yeniden kaydeder.
export function PushSync({ profile }) {
  const uid = profile?.uid;
  const router = useRouter();
  // Android uygulaması: bildirime dokununca ilgili sayfa açılır
  useEffect(() => wireNativePush((url) => router.push(url)), [router]);
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

// Üstte ince şerit: internet yokken, kayıt sunucuya gitmeyi beklerken ve hepsi gidince kısa süre "gönderildi".
// Ekranın en üstünde sabit (iPhone durum çubuğunun altına kadar); açıkken sayfa ve yapışkan başlıklar aşağı kayar
// (body[data-net], globals.css). Kayıtlar cihazda (IndexedDB) sırada kalır, uygulama kapansa da bağlantı gelince gider.
export function OfflineBanner() {
  const online = useOnline();
  const net = useSyncExternalStore(subscribeNet, netState, netState);
  const text = netText({ online, ...net });

  // Bağlantı değişince, uygulamaya dönünce ve aralıklarla (çevrimdışıyken sık) bekleyen yazma var mı bakılır
  useEffect(() => {
    checkWrites();
    const t = setInterval(() => document.visibilityState === "visible" && checkWrites(), online ? 20e3 : 3e3);
    const vis = () => document.visibilityState === "visible" && checkWrites();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [online]);

  useEffect(() => {
    if (!text) return;
    document.body.dataset.net = "1";
    return () => delete document.body.dataset.net;
  }, [text]);

  if (!text) return null;
  const ok = netTone({ online, ...net }) === "ok";
  return (
    <div
      role="status"
      className={`fade-in fixed inset-x-0 top-0 z-[45] flex h-[calc(1.75rem+env(safe-area-inset-top))] items-end justify-center px-4 pb-1.5 text-center text-[0.8125rem] font-medium text-white ${ok ? "bg-[#1f7a4d]" : "bg-[#1f2a2e]"}`}
    >
      {text}
    </div>
  );
}
