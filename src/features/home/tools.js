"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";

// Ana sayfaya isteğe bağlı eklenen bölümler (Plan, Görev, Not, Fiş her zaman var)
export const TOOLS = [
  { id: "birthday", label: "Doğum günü", icon: "cake", desc: "Aile ve arkadaşların doğum günleri, her yıl tekrar eder" },
  { id: "schedule", label: "Dersler", icon: "book", desc: "Haftalık ders programı; fotoğraftan, sesle ya da elle" },
];

// Seçili ekstralar kişinin profilinde (users/{uid}.homeTools) durur; her cihazda aynı görünür.
// Henüz seçim yapılmadıysa verisi olanlar seçili sayılır (eski kullanıcılar bir şey kaybetmesin).
export function useHomeTools() {
  const { profile } = useAuth();
  const { birthdays, lessons } = useData();
  const chosen = profile?.homeTools;
  const selected = chosen ?? TOOLS.filter((t) => (t.id === "birthday" ? birthdays.length : lessons.length) > 0).map((t) => t.id);
  const save = (ids) =>
    profile?.uid &&
    updateDoc(doc(db, "users", profile.uid), { homeTools: TOOLS.map((t) => t.id).filter((id) => ids.includes(id)) }).catch((e) =>
      console.warn("[home] seçim kaydedilemedi", e?.code),
    );
  return { selected, has: (id) => selected.includes(id), save };
}
