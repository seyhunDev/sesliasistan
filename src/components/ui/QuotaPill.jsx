"use client";

import { useNow } from "@/hooks/useNow";
import { untilText, useQuota } from "@/lib/quota";

// Kişinin bugünkü hakkı: "Bugün 7/10" ya da bitince "Yenilenmesine 5 sa 12 dk". Ana hesapta görünmez.
export function QuotaPill({ kind, className = "" }) {
  const q = useQuota(kind);
  const now = useNow(q && q.left <= 0 ? 1000 : 60000);
  if (!q) return null;
  const out = q.left <= 0;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-medium tabular-nums ${out ? "bg-rec/10 text-rec" : "bg-bg text-mut ring-1 ring-line"} ${className}`}
      title={out ? "Günlük hakkın bitti" : "Bugünkü kalan hakkın"}
    >
      {out ? `Yenilenmesine ${untilText(q.resetAt, now.getTime())}` : `Bugün ${q.left}/${q.limit}`}
    </span>
  );
}
