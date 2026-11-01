"use client";

import { useState } from "react";
import { ActionGrid } from "@/components/ui/ActionGrid";
import { Icon } from "@/components/ui/Icon";
import { Row } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { isTraining } from "@/lib/trainingLog";
import { attHref, linkKey } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";

// Kokpitin altındaki iş düğmeleri (Seyhun 2026-10-21 "C": "bütün özellikleri rahatlıkla tuşlayabileceği"): en sık işler adıyla, en çok 8; 2 sütun, solda büyük soluk camgöbeği ikon (Seyhun 2026-10-25 "B").
// Ana hesap: Yoklama (bugün antrenman varsa o günün yoklaması; diğerleri gibi vurgusuz), Not, Plan, Fiş, Mesaj (Sporcular grubu), Toplantı, Görev,
// sonunda Tümü (Süre kokpitteki sıradaki antrenmanın yanında) (bütün sayfalar penceresi; eskiden en alttaki küçük düğmelerdi). Yetkisi olmayan düğme çıkmaz.
// Aynı iş kartlarda tekrar yazmaz (Notlar kartında "Not ekle", Sporcular kartında Yoklama/Mesaj yok).
export function HomeGrid({ pages, side, athletes, receipts, owner }) {
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openMeeting } = useMeeting();
  const { plans } = useData();
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(""); // Tümü penceresinde açık grup (bir anda tek; Seyhun 2026-11-01 "A · Açılır gruplar")
  const today = todayStr();
  const sail = plans.some((p) => p.date === today && p.status !== "cancelled" && isTraining(p));
  const items = [
    athletes && !side && { key: "att", icon: "checks", label: "Yoklama", href: (sail && attHref(today, today)) || "/athletes/attendance" },
    side && { key: "my-att", icon: "checks", label: "Yoklama", href: "/my-attendance" },
    { key: "note", icon: "note", label: "Not", onClick: () => openAdd({ type: "note" }) },
    { key: "plan", icon: "cal", label: "Plan", onClick: () => openAdd({ type: "plan" }) },
    receipts && { key: "receipt", icon: "receipt", label: "Fiş", onClick: () => openReceipt() },
    athletes && owner && { key: "msg", icon: "chat", label: "Mesaj", href: "/messages?c=athletes" },
    !side && { key: "meeting", icon: "users", label: "Toplantı", onClick: openMeeting },
    { key: "task", icon: "task", label: "Görev", onClick: () => openAdd({ type: "task" }) },
  ]
    .filter(Boolean)
    .slice(0, 7);
  const groups = (pages || []).filter((g) => g.items.length);
  return (
    <>
      <ActionGrid icons items={[...items, { key: "all", icon: "grid", label: "Tümü", onClick: () => setAll(true) }]} />
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
