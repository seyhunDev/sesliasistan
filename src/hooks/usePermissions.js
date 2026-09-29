"use client";

import { useCallback, useEffect, useState } from "react";
import { PERM_NAMES, queryPermission, requestPermissions } from "@/lib/permissions";

// Kamera + mikrofon izin durumu. Ayarlardan dönünce (sekme tekrar görünür olunca) yenilenir.
export function usePermissions() {
  const [perms, setPerms] = useState({ camera: null, microphone: null });

  const refresh = useCallback(async () => {
    const out = {};
    for (const n of PERM_NAMES) out[n] = await queryPermission(n);
    setPerms(out);
  }, []);

  useEffect(() => {
    refresh();
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    // Tarayıcı destekliyorsa izin değişince anında güncelle
    const subs = [];
    for (const name of PERM_NAMES) {
      navigator.permissions?.query({ name }).then((st) => {
        st.onchange = refresh;
        subs.push(st);
      }).catch(() => {});
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      subs.forEach((st) => (st.onchange = null));
    };
  }, [refresh]);

  const request = useCallback(async (names) => {
    const r = await requestPermissions(names);
    setPerms((p) => ({ ...p, ...r }));
    return r;
  }, []);

  return { perms, request, refresh };
}
