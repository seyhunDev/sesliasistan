"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AddSheet } from "./AddSheet";

const Ctx = createContext({ openAdd: () => {} });

// openAdd({ text?, voice?, type? }) uygulamanın her yerinden çağrılabilir
export function AddProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  // Sayfa değişince kayıt ekranı kapanır: açık kalırsa yeni sayfanın üstünü örter, sayfa açılmamış gibi görünür
  // (ekranın açıldığı sayfa saklanır; bildirimden gelen /?open=… o sayfada açtığı için kapanmaz)
  const path = usePathname();
  const openedOn = useRef(path);
  const openAdd = useCallback((o = {}) => {
    openedOn.current = window.location.pathname;
    setSeed({ id: Date.now(), ...o });
    setOpen(true);
  }, []);
  useEffect(() => {
    if (path !== openedOn.current) setOpen(false);
  }, [path]);

  return (
    <Ctx.Provider value={{ openAdd }}>
      {children}
      <AddSheet open={open} onClose={() => setOpen(false)} seed={seed} />
    </Ctx.Provider>
  );
}

export const useAdd = () => useContext(Ctx);
