"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { readTimer, useTimer } from "@/features/training/Countdown";
import { bindHaptics, iosApp, onOpen, showTimer, syncAlarms, takeOpen } from "@/lib/nativeIos";
import { alarmItems } from "@/lib/planAlarm";

// iPhone uygulamasının yerel parçalarını web'e bağlar (uygulama düzeninde bir kez durur; tarayıcıda hiçbir şey yapmaz):
// - bas-konuş: Siri / Eylem tuşu / Denetim Merkezi düğmesi → asistan açılır ve dinler
// - tek sayaç (training/Countdown.jsx) kilit ekranında ve Dynamic Island'da görünür; dokununca sayacın sayfası açılır
// - plan alarmları (lib/planAlarm.js) telefona kurulur, plan değişince yeniden eşitlenir
// - titreşim: navigator.vibrate yerel titreşime bağlanır (bindHaptics)
export function IosBridge() {
  const router = useRouter();
  const toast = useToast();
  const t = useTimer();
  const { profile } = useAuth();
  const { plans } = useData();
  const uid = profile?.uid;
  const ownerId = profile?.orgId;

  useEffect(() => {
    bindHaptics();
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

  // Alarmlar: plan listesi değişince ve uygulamaya dönünce (kısa bekleyip tek sefer). Yeni kurulan alarm ve izin
  // verilmemesi kısa yazıyla söylenir (Seyhun 2026-10-22: "alarm kurulmadı sanırım", kurulduğu görünmüyordu)
  const alarmKey = JSON.stringify(uid && ownerId ? alarmItems(plans, { uid, ownerId }) : []);
  useEffect(() => {
    if (!iosApp() || !uid) return;
    const run = async () => {
      const items = JSON.parse(alarmKey);
      const res = await syncAlarms(items);
      if (!res) return;
      if (res.count < 0) {
        if (!sessionStorage.getItem("sa-alarm-izin")) toast("Alarm izni yok: Settings › Apps › Velora › Alarms");
        sessionStorage.setItem("sa-alarm-izin", "1");
        return;
      }
      const seen = new Set(readKeys());
      const fresh = items.filter((x) => !seen.has(x.key));
      writeKeys(items.map((x) => x.key));
      if (fresh.length) toast(`${res.kind === "alarm" ? "Alarm" : "Bildirim"} kuruldu · ${fresh.map((x) => when(x.at)).join(", ")}`);
    };
    const id = setTimeout(run, 1500);
    const vis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", vis);
    return () => (clearTimeout(id), document.removeEventListener("visibilitychange", vis));
  }, [alarmKey, uid, toast]);

  return null;
}

// Daha önce kurulduğu söylenen alarmlar (her açılışta yeniden söylenmesin)
const KEYS = "sa-alarm-keys";
const readKeys = () => {
  try {
    return JSON.parse(localStorage.getItem(KEYS) || "[]");
  } catch {
    return [];
  }
};
const writeKeys = (k) => {
  try {
    localStorage.setItem(KEYS, JSON.stringify(k));
  } catch {}
};
// "Cum 18:00"
const when = (ms) => new Date(ms).toLocaleString("tr-TR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
