"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

export { daysTo, upcoming } from "@/lib/raceDays";

// Sporcunun kayıtlı olduğu yarışlar (/api/my-races): ana sayfa yarış kartı ve Yarışlarım sayfası. Oturum boyunca 10 dk bellekte.
let cache = null; // { at, races }
const KEEP = 10 * 60e3;

export function useMyRaces(on = true) {
  const [races, setRaces] = useState(() => (cache ? cache.races : null));
  useEffect(() => {
    if (!on) return;
    if (cache && Date.now() - cache.at < KEEP) return;
    let live = true;
    authFetch("/api/my-races", { timeout: 15000 })
      .then((r) => (r.ok ? r.json() : { races: [] }))
      .then((d) => {
        cache = { at: Date.now(), races: Array.isArray(d.races) ? d.races : [] };
        if (live) setRaces(cache.races);
      })
      .catch(() => live && setRaces((x) => x || []));
    return () => {
      live = false;
    };
  }, [on]);
  return races;
}
