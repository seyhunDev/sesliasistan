"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { JobPill } from "./JobPill";

const NONE = () => {};
const Ctx = createContext(NONE);

// toast("Mesaj") ya da toast("Silindi", { action: { label: "Geri al", onClick }, duration: 5000 })
// Bildirim ile arka plan işleri (lib/jobs.js) aynı yerde, tek hapta görünür (JobPill; Seyhun 2026-11-13 "Yap").
export function ToastProvider({ children }) {
  // İç içe (canlı ekran kendi bildirimini açar): işler yalnız en dıştaki göstergede, iki hap olmaz
  const nested = useContext(Ctx) !== NONE;
  const [t, setT] = useState({ msg: "", action: null, n: 0 });
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  const toast = useCallback((msg, opts = {}) => {
    setT((o) => ({ msg, action: opts.action || null, n: o.n + 1 }));
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), opts.duration || (opts.action ? 5000 : 2200));
  }, []);

  // Arkada gönderilen kayıt sunucuda reddedildi (lib/soon.js)
  useEffect(() => {
    const on = (e) => toast(`${e.detail?.what || "Kayıt"} sunucuya kaydedilemedi, yeniden dene`, { duration: 5000 });
    window.addEventListener("sa-save-failed", on);
    return () => window.removeEventListener("sa-save-failed", on);
  }, [toast]);

  const act = useCallback(() => {
    clearTimeout(timer.current);
    setShow(false);
    t.action?.onClick();
  }, [t]);
  const hide = useCallback(() => (clearTimeout(timer.current), setShow(false)), []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <JobPill note={show ? t : null} onNote={act} onHide={hide} jobs={!nested} />
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
