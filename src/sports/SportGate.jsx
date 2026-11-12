"use client";

import { useCallback, useState } from "react";
import { doc } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { needsSport } from "./index";
import { SportPick } from "./SportPick";

// Spor seçmemiş hesaplara (eski hesaplar, ana hesap dahil) uygulama açılınca bir kez "Hangi spor?" sorulur.
// Seçim users/{uid}.sport'a yazılır, bir daha çıkmaz. Yeni kayıtta spor kayıt sırasında seçilir.
export function SportGate() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const [done, setDone] = useState(false);

  const finish = useCallback(
    (sport) => {
      setDone(true);
      if (uid) updateDoc(doc(db, "users", uid), { sport }).catch(() => {});
    },
    [uid],
  );

  if (done || !needsSport(profile)) return null;
  return <SportPick onDone={finish} />;
}
