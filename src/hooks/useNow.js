"use client";

import { useEffect, useState } from "react";

// Şu anki zaman; her dakika yenilenir (planların "geçti / şu an" durumu kendiliğinden güncellensin)
export function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
