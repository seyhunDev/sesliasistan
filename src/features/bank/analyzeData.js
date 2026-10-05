"use client";

import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { applyAi, forAi } from "@/lib/bankAnalyze";

// Yapay zeka incelemesi (/api/bank-analyze): 120'şer satır, en çok 3 istek aynı anda. Bir parça yanıt vermezse o parçanın
// türleri yerel kurala göre yazılır (localCat); sonuç yine gösterilir → { moves, failed (yanıtsız parça sayısı) }
const PART = 120;
export async function analyzeMoves(moves, self, onStep) {
  const rows = forAi(moves);
  const parts = [];
  for (let i = 0; i < rows.length; i += PART) parts.push(rows.slice(i, i + PART));
  const got = [];
  let failed = 0;
  let done = 0;
  let error = "";
  const run = async (part) => {
    try {
      const res = await authFetch("/api/bank-analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: part, self }) });
      const p = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(p.error || "İncelenemedi");
      got.push(...(p.rows || []));
    } catch (e) {
      failed++;
      error ||= e.message;
    }
    onStep?.(++done, parts.length);
  };
  for (let i = 0; i < parts.length; i += 3) await Promise.all(parts.slice(i, i + 3).map(run));
  return { moves: applyAi(moves, got), failed, parts: parts.length, error };
}

// Günlük maillerin en eskisinin günü (Excel ile mailler arasında boşluk var mı; tek okuma)
export async function firstMailDay(uid) {
  const snap = await getDocs(query(collection(db, "orgs", uid, "mails"), orderBy("at", "asc"), limit(1)));
  const at = snap.docs[0]?.data()?.at;
  return at ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(at)) : "";
}
