"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { ReceiptSheet } from "./ReceiptSheet";

const Ctx = createContext({ openReceipt: () => {} });

// openReceipt()                 -> yeni fiş (fotoğraf seçimiyle başlar)
// openReceipt({ manual: true }) -> doğrudan elle giriş
// openReceipt({ edit: id })     -> var olan fişi düzenle
export function ReceiptProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const openReceipt = useCallback((o = {}) => {
    setSeed({ id: Date.now(), ...o });
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Ctx.Provider value={{ openReceipt }}>
      {children}
      <ReceiptSheet open={open} onClose={close} seed={seed} />
    </Ctx.Provider>
  );
}

export const useReceipt = () => useContext(Ctx);
