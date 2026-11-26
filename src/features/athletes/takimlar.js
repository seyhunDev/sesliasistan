"use client";

// Sporcu takımları (A, B; Seyhun 2026-11-26): orgs/{org}/takim/liste = { map: { sporcuId: "A" | "B" }, updatedAt }.
// Kulüp sitesinin sporcu kaydına dokunulmaz; yalnız ana hesap okur/yazar. Kurallar lib/kimler.js.
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { setDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { TEAMS } from "@/lib/kimler";

const ref = (org) => doc(db, "orgs", org, "takim", "liste");
let cache = null; // { org, map }
const subs = new Set();

export async function loadTeams(org) {
  if (!org) return {};
  if (cache?.org === org) return cache.map;
  const s = await getDoc(ref(org)).catch(() => null);
  cache = { org, map: (s?.exists() && s.data().map) || {} };
  return cache.map;
}

export async function setTeam(org, athleteId, team) {
  const map = { ...(await loadTeams(org)) };
  if (TEAMS.includes(team)) map[athleteId] = team;
  else delete map[athleteId];
  cache = { org, map };
  subs.forEach((f) => f(map));
  await setDoc(ref(org), { map, updatedAt: new Date().toISOString() });
  return map;
}

export function useTeams(org) {
  const [map, setMap] = useState(() => (cache?.org === org ? cache.map : {}));
  useEffect(() => {
    let on = true;
    loadTeams(org).then((m) => on && setMap(m));
    subs.add(setMap);
    return () => {
      on = false;
      subs.delete(setMap);
    };
  }, [org]);
  return map;
}
