"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { BUILD, buildWhen, commitOf } from "@/lib/buildInfo";

// Yeni sürüm bu cihazda ilk açılınca üstte küçük not: "Güncellendi · 9 Ekim 18:15" + son değişiklik.
// Bir kez gösterilir (sa-build), 12 sn sonra ya da × ile kapanır. Sürüm bilgisi her zaman Ayarlar › Sürüm'de.
const KEY = "sa-build";

export function UpdateNote() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!BUILD.sha || !BUILD.at) return;
    let seen = "";
    try {
      seen = localStorage.getItem(KEY) || "";
    } catch {
      return;
    }
    if (seen === BUILD.sha) return;
    // Açılış ekranı geçsin diye kısa gecikmeyle çıkar
    const a = setTimeout(() => {
      setShow(true);
      try {
        localStorage.setItem(KEY, BUILD.sha);
      } catch {}
    }, 800);
    const b = setTimeout(() => setShow(false), 13e3);
    return () => (clearTimeout(a), clearTimeout(b));
  }, []);

  if (!show) return null;
  const { pr, text } = commitOf(BUILD.msg);
  return (
    <div role="status" className="fade-in fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[46] flex justify-center px-4">
      <div className="flex max-w-[26.25rem] items-start gap-2.5 rounded-2xl bg-card px-3.5 py-2.5 shadow-[0_4px_16px_rgba(38,40,44,.14)]">
        <span className="mt-[0.3rem] size-2 shrink-0 rounded-full bg-ok" />
        <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
          <span className="font-semibold">Güncellendi · {buildWhen()}</span>
          {text && <span className="line-clamp-2 block text-mut">{pr ? `#${pr} · ` : ""}{text}</span>}
        </span>
        <button type="button" aria-label="Kapat" onClick={() => setShow(false)} className="-mr-1 grid size-6 shrink-0 place-items-center rounded-full text-mut">
          <Icon name="x" className="size-4" />
        </button>
      </div>
    </div>
  );
}
