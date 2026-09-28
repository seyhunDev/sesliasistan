"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AddSheet } from "./AddSheet";

const Ctx = createContext({ openAdd: () => {} });

// openAdd({ text?, voice?, type? }) uygulamanın her yerinden çağrılabilir
export function AddProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const openAdd = useCallback((o = {}) => {
    setSeed({ id: Date.now(), ...o });
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ openAdd }}>
      {children}
      <AddSheet open={open} onClose={() => setOpen(false)} seed={seed} />
    </Ctx.Provider>
  );
}

export const useAdd = () => useContext(Ctx);
