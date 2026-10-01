"use client";

import { useEffect, useState } from "react";

// Kişilerin günlük hakları (sunucu her yapay zeka yanıtında "x-quota" ile bildirir). Ana hesap sınırsız: kayıt tutulmaz.
// { assistant: { limit, left, resetAt }, receipt: {...} }
const KEY = "sa-quota";
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

export function saveQuota(q) {
  if (!q?.kind || q.unlimited) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [q.kind]: q }));
  } catch {}
  window.dispatchEvent(new Event(KEY));
}

// Gece yarısı geçtiyse hak dolmuş sayılır
const fresh = (q) => (q && Date.parse(q.resetAt) <= Date.now() ? { ...q, left: q.limit } : q);

// Sunucudan güncel hakları al (uygulama açılınca)
export async function loadQuota(authFetch) {
  try {
    const res = await authFetch("/api/usage");
    if (!res.ok) return;
    const d = await res.json();
    for (const k of ["assistant", "receipt"]) if (d[k] && !d[k].unlimited) saveQuota(d[k]);
  } catch {}
}

export function useQuota(kind) {
  const [q, setQ] = useState(null);
  useEffect(() => {
    const on = () => setQ(fresh(read()[kind]) || null);
    on();
    window.addEventListener(KEY, on);
    return () => window.removeEventListener(KEY, on);
  }, [kind]);
  return q;
}

// "5 sa 12 dk" / "12 dk" / "40 sn"
export function untilText(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((Date.parse(iso) - now) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} sa ${m} dk` : m ? `${m} dk` : `${s} sn`;
}
