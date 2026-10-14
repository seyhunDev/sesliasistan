"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { flush, initBrain } from "@/lib/brain/store";
import { flushScore, initScore } from "@/lib/brain/scoreStore";

// Oturum açılınca öğrenme verisini hazırlar (çalışan: kendi öğrenmesi, ana hesap: ekibin tamamı);
// uygulama arka plana geçince bekleyenleri gönderir
export function BrainSync() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const orgId = profile?.orgId;
  const role = profile?.role;
  const brainOff = !!profile?.brainOff;
  const brainResetAt = profile?.brainResetAt || 0;
  useEffect(() => {
    if (!uid || !orgId) return;
    initBrain({ uid, orgId, role, brainOff, brainResetAt });
    initScore({ uid, orgId, brainOff });
    const onHide = () => document.visibilityState === "hidden" && (flush(), flushScore(true));
    const tick = setInterval(() => flushScore(), 2 * 60e3);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [uid, orgId, role, brainOff, brainResetAt]);
  return null;
}
