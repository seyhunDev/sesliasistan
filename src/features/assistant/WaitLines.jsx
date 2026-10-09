"use client";

import { useEffect, useState } from "react";
import { waitLines } from "@/lib/assistTasks";

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

// Tek satır: yalnız şu an ne yapıldığı (parlayarak). Bitti denen sahte satırlar gösterilmez: bekleme sırasında gerçekte
// tamamlanmış bir adım yok, "Takvim kontrol edildi" yazmak yanlış olurdu (inceleme 2026-10-09).
export function WaitLines({ lines, onCancel }) {
  if (!lines) return null;
  return (
    <div className="fade-in mt-3 flex items-end gap-3" role="status" aria-live="polite">
      <p key={lines.now} className="wait-now min-w-0 flex-1 truncate text-[0.875rem] font-medium">
        <span className="work-text">{lines.now}…</span>
      </p>
      {onCancel && (
        <button type="button" onClick={onCancel} className="shrink-0 text-[0.75rem] font-semibold text-acc">
          Vazgeç
        </button>
      )}
    </div>
  );
}
