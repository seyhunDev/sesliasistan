"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { libAttach, libDrop, libEntry, libMerge, libRename, libSetMedia } from "@/lib/fitness/library";
import { FIT_LIB, loadLib, peekLib, saveLib, spreadLib } from "./fitnessData";

// Hareket kütüphanesi (yalnız ana hesap okur/yazar): { lib, setMedia(item, { yt, media } ya da güncel kayıt => { yt, media }), merge(keep, keys), attach(key, künyeler), rename(key, ad), drop(key) }
// setMedia hareketin fotoğraf/videosunu kütüphaneye yazar ve hemen programlara ve sporcuların antrenmanlarına taşır
// (pencere kapanmasını beklemez; sayfadan çıkılsa da video sporcuya gider).
export function useFitLib() {
  const { profile } = useAuth();
  const { plans = [], fitOthers = [] } = useData();
  const all = useRef([]);
  useEffect(() => {
    all.current = [...plans, ...fitOthers];
  }, [plans, fitOthers]);
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
      // İşlev verilirse güncel kayıttan hesaplanır: arada yapılan başka bir ekleme ezilmez
      const val = typeof v === "function" ? v(libEntry(cur, it) || {}) : v;
      const saved = await saveLib(orgId, libSetMedia(cur, it, val));
      spreadLib(orgId, all.current).catch((e) => console.warn("[fitness] video sporculara aktarılamadı", e));
      return saved;
    },
    [orgId],
  );
  // Aynı adlı kopyaları birleştirir; programlar ve antrenmanlar kalanın fotoğraf/videosunu alır
  const merge = useCallback(
    async (keep, keys) => {
      if (!orgId) return null;
      const cur = await loadLib(orgId, { force: true });
      const saved = await saveLib(orgId, libMerge(cur, keep, keys));
      spreadLib(orgId, all.current).catch((e) => console.warn("[fitness] birleştirme sporculara aktarılamadı", e));
      return saved;
    },
    [orgId],
  );
  // Bağlı olmayan dosyaları harekete geri ekler
  const attach = useCallback(
    async (key, metas) => {
      if (!orgId) return null;
      const cur = await loadLib(orgId, { force: true });
      const saved = await saveLib(orgId, libAttach(cur, key, metas));
      spreadLib(orgId, all.current).catch((e) => console.warn("[fitness] dosya sporculara aktarılamadı", e));
      return saved;
    },
    [orgId],
  );
  // Adını değiştirir (programlara ve sporcuların antrenmanlarına da gider); hata varsa Error fırlatır
  const rename = useCallback(
    async (key, name) => {
      if (!orgId) return null;
      const cur = await loadLib(orgId, { force: true });
      const { lib: next, err } = libRename(cur, key, name);
      if (err) throw new Error(err);
      const saved = await saveLib(orgId, next);
      spreadLib(orgId, all.current).catch((e) => console.warn("[fitness] ad sporculara aktarılamadı", e));
      return saved;
    },
    [orgId],
  );
  const drop = useCallback(
    async (key) => {
      if (!orgId) return null;
      const cur = await loadLib(orgId, { force: true });
      return saveLib(orgId, libDrop(cur, key));
    },
    [orgId],
  );
  return { lib, setMedia, merge, attach, rename, drop };
}
