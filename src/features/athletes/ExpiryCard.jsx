"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { alertText, expiryList } from "@/lib/expiry";
import { todayStr } from "@/lib/utils/format";

// Sporcular sayfasının başında: lisans vizesi, sağlık raporu ya da sigortası bitmiş / 30 gün içinde bitecek sporcular
export function ExpiryCard({ athletes }) {
  const [open, setOpen] = useState(false);
  const rows = expiryList(athletes, todayStr());
  if (!rows.length) return null;
  const gone = rows.filter((r) => r.items.some((x) => x.state === "expired")).length;
  return (
    <div className={`mt-3 rounded-2xl ${gone ? "bg-rec/10" : "bg-amber-500/10"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Icon name="alert" className={`size-5 shrink-0 ${gone ? "text-rec" : "text-amber-700"}`} />
        <span className="min-w-0 flex-1 text-[0.875rem] leading-snug">
          <b className="block font-semibold">{rows.length} sporcunun belgesi {gone ? "bitti ya da bitiyor" : "yakında bitiyor"}</b>
          <span className="text-mut">Lisans vizesi, sağlık raporu, sigorta</span>
        </span>
        <Icon name="chev" className={`size-4 text-mut transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <ul className="divide-y divide-line/70 px-4 pb-2">
          {rows.map(({ a, items }) => (
            <li key={a.id}>
              <Link href={`/athletes/${a.id}`} className="block py-2 active:opacity-60">
                <b className="block text-[0.875rem] font-semibold">{a.studentName}</b>
                {items.map((x) => (
                  <small key={x.key} className={`block text-[0.75rem] ${x.state === "expired" ? "font-medium text-rec" : "text-amber-800"}`}>
                    {alertText(x)}
                  </small>
                ))}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
