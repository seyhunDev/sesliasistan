"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { libSetMedia } from "@/lib/fitness/library";
import { FIT_LIB, loadLib, peekLib, saveLib } from "./fitnessData";

// Hareket kütüphanesi (yalnız ana hesap okur/yazar): { lib, setMedia(item, { yt, media }) }
// setMedia hareketin fotoğraf/videosunu kütüphaneye yazar; programlara ve sporcuların antrenmanlarına spreadLib taşır.
export function useFitLib() {
  const { profile } = useAuth();
  const orgId = profile?.orgId;
  const [lib, setLib] = useState(() => (orgId ? peekLib(orgId) : null));
  useEffect(() => {
    if (!orgId) return;
    let live = true;
    const pull = () => live && setLib(peekLib(orgId));
    loadLib(orgId).then((l) => live && setLib(l)).catch(() => {});
    window.addEventListener(FIT_LIB, pull);
    return () => {
      live = false;
      window.removeEventListener(FIT_LIB, pull);
    };
  }, [orgId]);
  const setMedia = useCallback(
    async (it, v) => {
      if (!orgId) return null;
      const cur = peekLib(orgId) || (await loadLib(orgId));
      return saveLib(orgId, libSetMedia(cur, it, v));
    },
    [orgId],
  );
  return { lib, setMedia };
}
