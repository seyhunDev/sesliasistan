"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { MeetingSheet } from "./MeetingSheet";

const Ctx = createContext({ openMeeting: () => {} });

// openMeeting() uygulamanın her yerinden toplantı modunu açar
export function MeetingProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openMeeting = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Ctx.Provider value={{ openMeeting }}>
      {children}
      <MeetingSheet open={open} onClose={close} />
    </Ctx.Provider>
  );
}

export const useMeeting = () => useContext(Ctx);
