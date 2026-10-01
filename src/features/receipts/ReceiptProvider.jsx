"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { ReceiptSheet } from "./ReceiptSheet";
import { useKind } from "@/features/auth/useKind";
import { canReceipts } from "@/lib/kinds";

const Ctx = createContext({ openReceipt: () => {} });

// openReceipt()                 -> yeni fiş (fotoğraf seçimiyle başlar)
// openReceipt({ camera: true }) -> kamera hemen açılır ("fiş aç / fiş yükle" komutları)
// openReceipt({ manual: true }) -> doğrudan elle giriş
// openReceipt({ edit: id })     -> var olan fişi düzenle
export function ReceiptProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const kind = useKind();
  const allowed = !kind || canReceipts(kind); // sporcu, öğrenci, veli fiş eklemez
  const openReceipt = useCallback(
    (o = {}) => {
      if (!allowed) return;
      setSeed({ id: Date.now(), ...o });
      setOpen(true);
    },
    [allowed],
  );
  const close = useCallback(() => setOpen(false), []);

  return (
    <Ctx.Provider value={{ openReceipt }}>
      {children}
      <ReceiptSheet open={open} onClose={close} seed={seed} />
    </Ctx.Provider>
  );
}

export const useReceipt = () => useContext(Ctx);
