"use client";

import { useState } from "react";
import { ActionGrid } from "@/components/ui/ActionGrid";
import { Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { isTraining } from "@/lib/trainingLog";
import { attHref, linkKey } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";

// Kokpitin altındaki iş düğmeleri (Seyhun 2026-10-21 "C": "bütün özellikleri rahatlıkla tuşlayabileceği"): en sık işler adıyla, en çok 8; 2 sütun, solda büyük soluk camgöbeği ikon (Seyhun 2026-10-25 "B").
// Ana hesap: Yoklama (bugün antrenman varsa o günün yoklaması, alındıysa yeşil tik), Not, Plan, Fiş, Mesaj (Sporcular grubu), Toplantı, Görev,
// sonunda Tümü (Süre kokpitteki sıradaki antrenmanın yanında) (bütün sayfalar penceresi; eskiden en alttaki küçük düğmelerdi). Yetkisi olmayan düğme çıkmaz.
// Aynı iş kartlarda tekrar yazmaz (Notlar kartında "Not ekle", Sporcular kartında Yoklama/Mesaj yok).
export function HomeGrid({ pages, side, athletes, receipts, owner }) {
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openMeeting } = useMeeting();
  const { plans } = useData();
  const { profile } = useAuth();
  const [all, setAll] = useState(false);
  const today = todayStr();
  const sail = plans.some((p) => p.date === today && p.status !== "cancelled" && isTraining(p));
  const taken = profile?.attLast === today;
  const items = [
    athletes && !side && { key: "att", icon: "checks", label: "Yoklama", href: (sail && attHref(today, today)) || "/athletes/attendance", main: sail && !taken, done: sail && taken },
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
        <div className="space-y-4 pb-1">
          {groups.map((g) => (
            <section key={g.title}>
              <h3 className="mb-1.5 px-1 text-[0.75rem] font-bold tracking-[.06em] text-mut">{g.title.toLocaleUpperCase("tr-TR")}</h3>
              <RowList>
                {g.items.map((a) => (
                  <Row key={linkKey(a)} title={a.label} href={a.href} onClick={a.href ? undefined : () => (setAll(false), a.onClick?.())} />
                ))}
              </RowList>
            </section>
          ))}
        </div>
      </Sheet>
    </>
  );
}
