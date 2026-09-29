"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const Ctx = createContext(() => {});

// toast("Mesaj") ya da toast("Silindi", { action: { label: "Geri al", onClick }, duration: 5000 })
export function ToastProvider({ children }) {
  const [t, setT] = useState({ msg: "", action: null });
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  const toast = useCallback((msg, opts = {}) => {
    setT({ msg, action: opts.action || null });
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), opts.duration || (opts.action ? 5000 : 2200));
  }, []);

  const act = () => {
    clearTimeout(timer.current);
    setShow(false);
    t.action?.onClick();
  };

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div
        role="status"
        className={`fixed left-1/2 top-[calc(14px_+_env(safe-area-inset-top))] z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-full bg-fg py-2 pl-[18px] text-sm font-medium text-bg shadow-lg transition duration-300 ${
          t.action ? "pr-2" : "pr-[18px]"
        } ${show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-6 opacity-0"}`}
      >
        <span className="truncate py-0.5">{t.msg}</span>
        {t.action && (
          <button onClick={act} className="shrink-0 rounded-full bg-bg/15 px-3 py-1 text-[13px] font-semibold text-bg transition active:scale-95">
            {t.action.label}
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
