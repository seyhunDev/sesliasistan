"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AssistantSheet } from "./AssistantSheet";

const Ctx = createContext({ openAssistant() {}, open: false });

// openAssistant({ text?, voice?, listen? }) uygulamanın her yerinden çağrılabilir
export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const openAssistant = useCallback((o = {}) => {
    setSeed({ id: Date.now(), ...o });
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Ctx.Provider value={{ openAssistant, open }}>
      {children}
      <AssistantSheet open={open} onClose={close} seed={seed} />
    </Ctx.Provider>
  );
}

export const useAssistant = () => useContext(Ctx);
