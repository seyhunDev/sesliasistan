"use client";

import { useEffect, useState } from "react";
import { readMicFlow } from "@/lib/speech/meter";

// Dinlerken "ses geliyor" işareti: mikrofondan gerçekten ses verisi geliyorsa yeşil, gelmiyorsa gri (Seyhun, 2026-10-20).
// Ses yoksa mikrofon kendiliğinden yeniden açılır, yine gelmezse uyarı çıkar (useSpeech, micCheck.js).
export function MicDot() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setOn(readMicFlow()), 200);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      aria-label={on ? "Ses geliyor" : "Ses bekleniyor"}
      className={`size-2.5 shrink-0 rounded-full transition-colors ${on ? "bg-ok shadow-[0_0_0_4px_rgba(60,207,142,.18)]" : "bg-mut/50"}`}
    />
  );
}
