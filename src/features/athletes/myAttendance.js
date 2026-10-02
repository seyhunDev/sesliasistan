"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { todayStr } from "@/lib/utils/format";

// Sporcu kendi yoklamasını, veli bağlı olduğu sporcuların yoklamasını okur (orgs/{orgId}/athleteAtt).
// Yoklamam sayfası ve ana sayfadaki Yoklama kartı aynı kaydı kullanır. { recs: null (yükleniyor) | [...], err }
export function useMyAttendance(kind, on = true) {
  const { profile } = useAuth();
  const [recs, setRecs] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!on || !profile?.uid || !profile.orgId) return;
    const col = collection(db, "orgs", profile.orgId, "athleteAtt");
    const job =
      kind === "parent"
        ? getDocs(query(col, where("parents", "array-contains", profile.uid))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))
        : getDoc(doc(col, profile.uid)).then((d) => (d.exists() ? [{ id: d.id, ...d.data() }] : []));
    job.then(setRecs).catch((e) => {
      setErr(e.code === "permission-denied" ? "Yoklama bilgisine erişim yok." : "Yoklama yüklenemedi.");
      setRecs([]);
    });
  }, [on, profile?.uid, profile?.orgId, kind]);
  return { recs, err };
}

// Bu ayın özeti (ana sayfa): geldi, gelmedi, izinli, devam % (izinli sayılmaz), son kayıt [tarih, durum]
export function monthOf(rec, ym = todayStr().slice(0, 7)) {
  const days = Object.entries(rec.att || {}).sort((a, b) => b[0].localeCompare(a[0]));
  const month = days.filter(([d]) => d.startsWith(ym));
  const n = (s) => month.filter(([, v]) => v === s).length;
  const present = n("present");
  const absent = n("absent");
  return { present, absent, excused: n("excused"), rate: present + absent ? Math.round((present / (present + absent)) * 100) : null, last: days[0] || null };
}
