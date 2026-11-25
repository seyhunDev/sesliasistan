"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Row } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { linkKey } from "@/lib/homeTiles";

// Ana sayfanın üst satırındaki "Tümü" düğmesi ve açtığı "Tüm sayfalar" penceresi (sol menü yokken; telefon ve dik iPad).
// pages: homeActions grupları (yetkiye göre). Gruplar kapalı başlar, dokununca tek grup açılır (Seyhun 2026-11-01 "A · Açılır gruplar");
// seyrek sayfalar en sondaki "Gizli" grubunda (Seyhun 2026-11-25). Eski 8 düğmelik iş satırı 2026-11-25'te kalktı (kullanılmıyordu).
export function HomeGrid({ pages }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(""); // açık grup (bir anda tek)
  const groups = (pages || []).filter((g) => g.items.length);
  return (
    <>
      <button type="button" data-press onClick={() => setAll(true)} className="btn btn-secondary btn-sm">
        Tümü
      </button>
      <Sheet open={all} onClose={() => setAll(false)} title="Tüm sayfalar">
        <div className="space-y-2 pb-1" data-all-groups>
          {groups.map((g) => {
            const on = open === g.title;
            return (
              <section key={g.title} className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
                <button type="button" data-press="row" aria-expanded={on} onClick={() => setOpen(on ? "" : g.title)} className="flex min-h-[3.25rem] w-full items-center gap-2.5 px-3.5 text-left">
                  <b className="shrink-0 text-[0.9375rem] font-semibold">{g.title}</b>
                  <small className="min-w-0 flex-1 truncate text-[0.8125rem] text-mut">{g.items.map((a) => a.label).join(", ")}</small>
                  <Icon name="chev" className={`size-4 shrink-0 text-mut transition-transform ${on ? "rotate-90" : ""}`} />
                </button>
                {on && (
                  <div className="border-t border-line pl-4 pr-3.5">
                    {g.items.map((a) => (
                      <Row key={linkKey(a)} title={a.label} href={a.href} onClick={a.href ? undefined : () => (setAll(false), a.onClick?.())} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
