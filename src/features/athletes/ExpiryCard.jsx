"use client";

import { useState } from "react";
import Link from "next/link";
import { alertText, expiryList } from "@/lib/expiry";
import { todayStr } from "@/lib/utils/format";

// Sporcular sayfasının başında (tek satır, dokununca açılır): lisans vizesi, sağlık raporu ya da sigortası bitmiş / 30 gün içinde bitecek sporcular
export function ExpiryCard({ athletes }) {
  const [open, setOpen] = useState(false);
  const rows = expiryList(athletes, todayStr());
  if (!rows.length) return null;
  const gone = rows.filter((r) => r.items.some((x) => x.state === "expired")).length;
  const names = rows.map((r) => r.a.studentName);
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-press="row" className="flex min-h-[3.5rem] w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{rows.length} sporcunun belgesi {gone ? "bitti ya da bitiyor" : "bitiyor"}</b>
          <small className="block truncate text-[0.8125rem] font-semibold text-warn">{names.slice(0, 2).join(", ")}{names.length > 2 ? ` +${names.length - 2}` : ""}</small>
        </span>
        <span className="shrink-0 text-[0.875rem] font-semibold text-mut">{open ? "Kapat" : "Gör"}</span>
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line px-3.5">
          {rows.map(({ a, items }) => (
            <li key={a.id}>
              <Link href={`/athletes/${a.id}`} data-press="row" className="block py-2.5">
                <b className="block text-[0.875rem] font-semibold">{a.studentName}</b>
                {items.map((x) => (
                  <small key={x.key} className={`block text-[0.8125rem] ${x.state === "expired" ? "font-semibold text-warn" : "text-mut"}`}>
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
