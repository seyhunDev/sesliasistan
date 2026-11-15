"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTimer } from "@/features/training/Countdown";
import { saveBilgi } from "./bilgiStore";

// Ana hesabın telefonundaki ortak sayaç (Yayın › Süre, antrenman, Bilgi ekranı yönetimi aynı sayaç) bilgi ekranına aynen gider.
// Yönetimde "Start: Açık" seçiliyse (bu telefonda saklı) ve sayaç değişince yazılır; değişmeyen sayaç yeniden yazılmaz.
export const ON_KEY = "sa-bilgi-on";
const LAST = "sa-bilgi-son";
const get = (k) => {
  try {
    return localStorage.getItem(k) || "";
  } catch {
    return "";
  }
};
const put = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};
export const bilgiOn = () => get(ON_KEY) === "1";
export const setBilgiOn = (on) => (put(ON_KEY, on ? "1" : "0"), put(LAST, ""));

export function BilgiSync() {
  const { profile } = useAuth();
  const t = useTimer();
  const org = profile?.role === "owner" ? profile?.orgId || "" : "";
  useEffect(() => {
    if (!org || !bilgiOn()) return;
    const timer = { dur: t.dur ?? 300, end: t.end ?? null, left: t.left ?? null, mode: t.mode || "" };
    const k = JSON.stringify(timer);
    if (k === get(LAST)) return;
    const id = setTimeout(() => {
      put(LAST, k);
      saveBilgi(org, { timer }).catch(() => put(LAST, ""));
    }, 250);
    return () => clearTimeout(id);
  }, [org, t]);
  return null;
}
