"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { canSeeAthletes } from "@/features/athletes/access";
import { PREVIEW_KIND, viewOf } from "@/lib/hesapGorunum";
import { isAthleteSide, isCoach } from "@/lib/kinds";

// Hangi görünümdeyiz (lib/hesapGorunum.js): ana sayfa, alt çubuk, sol menü, Tümü ve Ayarlar bunu kullanır.
// "… gibi gör" (Seyhun 2026-11-25, yalnız ana hesap): Ayarlar'dan Normal kullanıcı ya da Sporcu seçilince bu cihazda o hesabın
// düzeni görünür (ana sayfa, alt çubuk, menü, Ayarlar); veri yine ana hesabın. Üstteki şeritten "Geri dön" ile biter.
// Yalnız düzen değişir: sayfaların içi ve yetkiler (Firestore) ana hesapta kalır.
const KEY = "sa-gibi-gor";
const EV = "sa-gibi-gor";
const read = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};
const sub = (cb) => {
  window.addEventListener(EV, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EV, cb);
    window.removeEventListener("storage", cb);
  };
};
export function setGibiGor(view) {
  try {
    if (view) localStorage.setItem(KEY, view);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EV));
}

// Dönüş: { profile, view ("ana" | "normal" | "sporcu" | ""), kind, owner, staff, side, plain, athletes, coach, preview (önizlenen görünüm ya da "") }
export function useHesap() {
  const { profile } = useAuth();
  const realKind = useKind();
  const as = useSyncExternalStore(sub, read, () => "");
  const realOwner = profile?.role === "owner";
  const preview = realOwner && PREVIEW_KIND[as] ? as : "";
  const view = preview || viewOf(profile?.role, realKind);
  const kind = preview ? PREVIEW_KIND[preview] : realKind;
  const owner = view === "ana";
  return {
    profile,
    view,
    kind,
    owner,
    staff: !!profile && !owner && profile.role !== "courier",
    side: isAthleteSide(kind),
    plain: view === "normal",
    athletes: preview ? false : canSeeAthletes(profile?.email),
    coach: preview ? preview === "normal" : isCoach(profile), // "normal gibi gör"de Yönet kutusu da görünsün (çalışan gibi)
    preview,
  };
}
