"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "./access";
import { isPast } from "./RaceList";
import { loadRaces } from "./races";

// Ana sayfadaki Yarışlar düğmesi. Tercih hesapta: users/{uid}.races = "on" | "off" (yoksa karar verilmemiş).
// Karar yoksa kulüpte yarış varsa düğme kendiliğinden görünür; yarış da yoksa bir kerelik tanıtım kartı çıkar.
// Yalnız sporcu yetkisi olanlar (yarışlar kulübün sporcu verisine bağlı).
// Sayı oturumda 5 dakika saklanır; yarış yoksa saklanmaz (ilk yarış eklenince tanıtım hemen kalksın)
let cache = null; // { orgId, at, p }

function countRaces(orgId) {
  if (!cache || cache.orgId !== orgId || Date.now() - cache.at > 5 * 60e3) {
    const p = loadRaces(orgId)
      .then((list) => ({ all: list.length, up: list.filter((r) => !isPast(r)).length }))
      .catch(() => null)
      .then((c) => {
        if (!c?.all && cache?.p === p) cache = null;
        return c;
      });
    cache = { orgId, at: Date.now(), p };
  }
  return cache.p;
}

export function useRaceHome() {
  const { profile } = useAuth();
  const allowed = canSeeAthletes(profile?.email) && !!profile?.orgId;
  const pref = profile?.races === "on" || profile?.races === "off" ? profile.races : "";
  const [n, setN] = useState(null);

  useEffect(() => {
    if (!allowed || pref === "off") return;
    let live = true;
    countRaces(profile.orgId).then((c) => {
      if (live && c) setN(c);
    });
    return () => {
      live = false;
    };
  }, [allowed, pref, profile?.orgId]);

  const has = (n?.all || 0) > 0;
  return {
    allowed,
    on: allowed && (pref === "on" || (!pref && has)),
    intro: allowed && !pref && n !== null && !has,
    up: n?.up || 0,
    set: (on) => updateDoc(doc(db, "users", profile.uid), { races: on ? "on" : "off" }),
  };
}
