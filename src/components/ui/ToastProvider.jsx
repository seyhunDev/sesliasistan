"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const Ctx = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  const toast = useCallback((m) => {
    setMsg(m);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2200);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div
        role="status"
        className={`pointer-events-none fixed left-1/2 top-[calc(14px_+_env(safe-area-inset-top))] z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-fg px-[18px] py-2.5 text-sm font-medium text-bg transition duration-300 ${
          show ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
        }`}
      >
        {msg}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
