"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { flush, initBrain } from "@/lib/brain/store";

// Oturum açılınca öğrenme verisini hazırlar (çalışan: kendi öğrenmesi, ana hesap: ekibin tamamı);
// uygulama arka plana geçince bekleyenleri gönderir
export function BrainSync() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const orgId = profile?.orgId;
  const role = profile?.role;
  useEffect(() => {
    if (!uid || !orgId) return;
    initBrain({ uid, orgId, role });
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [uid, orgId, role]);
  return null;
}
