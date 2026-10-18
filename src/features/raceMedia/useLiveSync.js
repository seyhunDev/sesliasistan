"use client";

import { useEffect, useRef } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { cleanLive, pickTimer as pick, takeTimer } from "@/lib/raceLive";
import { readTimer, writeTimer } from "@/features/training/Countdown";

// Kendi cihazlarım arasında canlı (Seyhun 2026-10-18): yarış multimedya sayfası açıkken raceLive belgesi dinlenir. Başka telefonda ya da
// bilgisayarda başlatılan, kaydırılan, iptal edilen ya da biten sayaç bu cihazın sayacına yazılır (bipler de çalar); yarışlar, rüzgâr ve
// çekimler de hemen görünür. Bu cihazda sayaç değişince belgenin `timer` alanına yazılır. Sayfa açılırken eski yerel sayaç gönderilmez.
const KEY = "sa-sayac";

export function useLiveSync({ orgId, raceId, setLive }) {
  const applying = useRef(false);
  const seen = useRef(0); // uygulanan son uzak yazışın anı
  useEffect(() => {
    if (!orgId || !raceId) return;
    const ref = doc(db, "orgs", orgId, "raceLive", raceId);
    const push = () => {
      if (applying.current) return;
      const t = readTimer();
      seen.current = Date.now();
      setDoc(ref, { timer: { ...pick(t), at: seen.current } }, { merge: true }).catch(() => {});
    };
    window.addEventListener(KEY, push);
    const off = onSnapshot(
      ref,
      (snap) => {
        if (snap.metadata.hasPendingWrites || !snap.exists()) return;
        const d = snap.data();
        setLive(cleanLive(d));
        const r = d.timer;
        if (!r || !(r.at > seen.current)) return;
        const go = takeTimer(r, readTimer(), seen.current === 0, Date.now());
        seen.current = r.at;
        if (!go) return;
        applying.current = true;
        try {
          writeTimer(pick(r));
        } finally {
          applying.current = false;
        }
      },
      () => {},
    );
    return () => {
      window.removeEventListener(KEY, push);
      off();
    };
  }, [orgId, raceId, setLive]);
}
