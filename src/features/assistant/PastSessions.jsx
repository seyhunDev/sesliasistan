"use client";
import { whenText } from "@/lib/convoContext";

// Önceki sohbetler (son 3 oturum, cihazda saklanan kısa özet): yeni konuşmanın üstünde soluk, sade satırlar.
// Kullanıcının sözü sağda, asistanınki solda; her oturumun başında ne zaman olduğu.
export function PastSessions({ list = [] }) {
  if (!list.length) return null;
  return (
    <div data-past="" className="mb-4 space-y-4 text-[0.875rem] leading-snug text-mut" aria-label="Önceki sohbetler">
      {list.map((s) => (
        <section key={s.id || s.at} className="space-y-1.5">
          <p className="text-center text-[0.75rem] text-mut/70">{whenText(s.at)}</p>
          {s.lines.map((l, i) => {
            const me = l.startsWith("K:");
            return (
              <p key={i} className={me ? "ml-12 text-right text-fg/70" : "mr-12"}>
                {l.replace(/^[KA]:\s*/, "")}
              </p>
            );
          })}
        </section>
      ))}
    </div>
  );
}
