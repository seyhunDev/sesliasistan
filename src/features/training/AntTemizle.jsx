"use client";

import { useEffect } from "react";
import { collection, deleteField, documentId, getDocs, query, where } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { dropLive } from "@/features/athletes/raceLiveStore";
import { dropKept, dropPending, listAllPending, listKept } from "@/features/raceMedia/pendingStore";

// Eski antrenman sayfasının verisi bir kez silinir (Seyhun 2026-11-23 "Hepsini sil"; antrenman sayfası, yarışlar ve sıralama kalktı):
// planlardaki antrenman yarışları ve sonuçları (races; aylık sıralama bunlardan hesaplanıyordu), antrenmanların canlı kaydı
// (raceLive/ant-<plan>: video/fotoğraf künyeleri ve buluttaki dosyaları, parkur, kamera linkleri) ve bu telefonda saklanan antrenman
// videoları. iPhone Fotoğraflar'daki asılları silinmez. Yalnız ana hesapta, her cihazda bir kez (videolar cihazda); başarınca işaret konur.
const KEY = "sa-ant-temiz-1";
const done = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
};

export async function antTemizle(org) {
  const plans = await getDocs(query(collection(db, "orgs", org, "plans"), where("races", "!=", null)));
  for (const d of plans.docs) await updateDoc(d.ref, { races: deleteField() });
  const live = await getDocs(query(collection(db, "orgs", org, "raceLive"), where(documentId(), ">=", "ant-"), where(documentId(), "<", "ant.")));
  for (const d of live.docs) await dropLive(org, d.id);
  for (const x of await listKept()) if (String(x.raceId || "").startsWith("ant-")) await dropKept(x.id);
  for (const x of await listAllPending()) if (String(x.raceId || "").startsWith("ant-")) await dropPending(x.id);
  return { plans: plans.size, live: live.size };
}

export function AntTemizle() {
  const { profile } = useAuth();
  const org = profile?.role === "owner" ? profile?.orgId || "" : "";
  useEffect(() => {
    if (!org || done()) return;
    const id = setTimeout(() => {
      antTemizle(org).then(
        () => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
        },
        () => {},
      );
    }, 8000); // açılışı yavaşlatmasın
    return () => clearTimeout(id);
  }, [org]);
  return null;
}
