"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AssistantSheet } from "./AssistantSheet";

const Ctx = createContext({ openAssistant() {}, open: false });

// openAssistant({ text?, voice?, listen? }) uygulamanın her yerinden çağrılabilir.
// Asistan yüzen bir paneldir: sayfalar arasında açık kalır, sohbet kullanıcı bitirene kadar sürer.
// Panel zaten açıkken çağrılırsa (ör. alttaki "Konuş") sohbet sıfırlanmaz, kaldığı yerden devam eder (cont).
export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const openRef = useRef(false);
  const openAssistant = useCallback((o = {}) => {
    window.dispatchEvent(new Event("sa-tts-prime")); // asistanı açan dokunuş: sesli yanıt açıksa ses açılsın (iOS)
    setSeed({ id: Date.now(), ...o, cont: openRef.current });
    openRef.current = true;
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
  }, []);

  return (
    <Ctx.Provider value={{ openAssistant, open }}>
      {children}
      <AssistantSheet open={open} onClose={close} seed={seed} />
    </Ctx.Provider>
  );
}

export const useAssistant = () => useContext(Ctx);
