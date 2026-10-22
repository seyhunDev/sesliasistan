"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { readTimer, useTimer } from "@/features/training/Countdown";
import { iosApp, onOpen, showTimer, syncAlarms, takeOpen } from "@/lib/nativeIos";
import { alarmItems } from "@/lib/planAlarm";

// iPhone uygulamasının yerel parçalarını web'e bağlar (uygulama düzeninde bir kez durur; tarayıcıda hiçbir şey yapmaz):
// - bas-konuş: Siri / Eylem tuşu / Denetim Merkezi düğmesi → asistan açılır ve dinler
// - tek sayaç (training/Countdown.jsx) kilit ekranında ve Dynamic Island'da görünür; dokununca sayacın sayfası açılır
// - plan alarmları (lib/planAlarm.js) telefona kurulur, plan değişince yeniden eşitlenir
export function IosBridge() {
  const router = useRouter();
  const t = useTimer();
  const { profile } = useAuth();
  const { plans } = useData();
  const uid = profile?.uid;
  const ownerId = profile?.orgId;

  useEffect(() => {
    if (!iosApp()) return;
    const go = (what) => {
      if (what === "talk") window.dispatchEvent(new CustomEvent("sa-open-assistant", { detail: { listen: true } }));
      else if (what === "timer") {
        const own = readTimer().own;
        if (own) router.push(own.startsWith("/athletes/races/") ? `${own}?tab=sure` : own);
      }
    };
    takeOpen().then(go);
    return onOpen(go);
  }, [router]);

  // Sayaç: çalışıyor (end), durdu (left) ya da kapalı. Aynı durum iki kez gönderilmez.
  const sent = useRef("");
  const state = t.end != null ? { end: t.end, paused: false, left: 0 } : t.left != null ? { end: 0, paused: true, left: Math.round(t.left) } : null;
  const title = t.mode === "start" ? "Yarış startı" : "Antrenman";
  const key = state ? JSON.stringify({ ...state, title }) : "";
  useEffect(() => {
    if (!iosApp() || key === sent.current) return;
    sent.current = key;
    showTimer(key ? JSON.parse(key) : null);
  }, [key]);

  // Alarmlar: plan listesi değişince ve uygulamaya dönünce (kısa bekleyip tek sefer)
  const alarmKey = JSON.stringify(uid && ownerId ? alarmItems(plans, { uid, ownerId }) : []);
  useEffect(() => {
    if (!iosApp() || !uid) return;
    const run = () => syncAlarms(JSON.parse(alarmKey));
    const id = setTimeout(run, 1500);
    const vis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", vis);
    return () => (clearTimeout(id), document.removeEventListener("visibilitychange", vis));
  }, [alarmKey, uid]);

  return null;
}
