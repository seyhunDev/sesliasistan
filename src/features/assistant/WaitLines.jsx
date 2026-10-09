"use client";

import { useEffect, useState } from "react";
import { pastTense, waitLines } from "@/lib/assistTasks";

// Yapay zeka (ya da yazıya çevirme) beklenirken sıralı durum yazıları. Hızlı yanıtta yalnız işin adı görünür; gecikince
// hazır yazılar sırayla eklenir (lib/assistTasks.js `waitLines`). Yanıt gelince bileşen kaybolur, cevap hemen gösterilir.
export function useWaitLines(active, work, transcribing) {
  const key = active ? `${transcribing ? 1 : 0}|${work || ""}` : "";
  const [t, setT] = useState({ key: "", ms: 0 });
  useEffect(() => {
    if (!key) return;
    const at = Date.now();
    const tick = () => setT({ key, ms: Date.now() - at });
    const iv = setInterval(tick, 400);
    return () => clearInterval(iv);
  }, [key]);
  if (!key) return null;
  return waitLines(work, t.key === key ? t.ms : 0, { transcribing });
}

// Sade görünüm: biten yazılar soluk (ilki işin adı, olduğu gibi; sonrakiler geçmiş zamanla), şimdiki yazı parlayarak
export function WaitLines({ lines, onCancel }) {
  if (!lines) return null;
  const done = lines.done.slice(-3);
  const skip = lines.done.length - done.length;
  return (
    <div className="fade-in mt-3 flex items-end gap-3" role="status" aria-live="polite">
      <ol className="min-w-0 flex-1 space-y-1 text-[0.875rem]">
        {done.map((x, i) => (
          <li key={`${skip + i}`} className="wait-done truncate">{skip + i === 0 ? x : pastTense(x)}</li>
        ))}
        <li key={lines.now} className="wait-now truncate font-medium">
          <span className="work-text">{lines.now}…</span>
        </li>
      </ol>
      {onCancel && (
        <button type="button" onClick={onCancel} className="shrink-0 text-[0.75rem] font-semibold text-acc">
          Vazgeç
        </button>
      )}
    </div>
  );
}
