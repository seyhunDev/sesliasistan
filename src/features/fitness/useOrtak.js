"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { authFetch } from "@/lib/authFetch";
import { isVeloraAdmin } from "@/lib/hesapGorunum";
import { hazirList } from "@/lib/fitness/ortak";

// Velora'nın ortak hareketleri ve hazır programları (lib/fitness/ortak.js, /api/fitness-ortak). Sayfa başına bir okuma,
// 5 dakika bellekte. { org, lib, hazir (hepsi: koddakiler + yayınlananlar), velora (bu hesap Velora sahibi mi), yenile }
let mem = { at: 0, v: null, p: null };
const EV = "sa-fit-ortak";
async function pull(force) {
  if (!force && mem.v && Date.now() - mem.at < 300e3) return mem.v;
  if (!force && mem.p) return mem.p;
  mem.p = authFetch(`/api/fitness-ortak${force ? "?taze=1" : ""}`)
    .then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "alınamadı");
      mem = { at: Date.now(), v: j, p: null };
      window.dispatchEvent(new CustomEvent(EV));
      return j;
    })
    .catch((e) => {
      mem.p = null;
      throw e;
    });
  return mem.p;
}

export function useOrtak() {
  const { profile } = useAuth();
  const [v, setV] = useState(mem.v);
  useEffect(() => {
    let live = true;
    const on = () => live && setV(mem.v);
    window.addEventListener(EV, on);
    pull(false)
      .then((x) => live && setV(x))
      .catch(() => {});
    return () => {
      live = false;
      window.removeEventListener(EV, on);
    };
  }, []);
  return {
    org: v?.org || "",
    lib: v?.lib || null,
    hazir: hazirList(v?.hazir),
    published: v?.hazir || [],
    velora: isVeloraAdmin(profile?.email),
    yenile: () => pull(true).catch(() => null),
  };
}
