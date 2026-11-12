"use client";

import Link from "next/link";
import { useState } from "react";
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
export function HomeGrid({ pages, side, athletes, receipts, owner, allOnly = false }) {
  const { openAdd } = useAdd();
  const { openReceipt } = useReceipt();
  const { openMeeting } = useMeeting();
  const { plans } = useData();
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(""); // Tümü penceresinde açık grup (bir anda tek; Seyhun 2026-11-01 "A · Açılır gruplar")
  const today = todayStr();
  const sail = plans.some((p) => p.date === today && p.status !== "cancelled" && isTraining(p));
  const items = [
    athletes && !side && { key: "att", icon: "checks", label: "Yoklama", main: sail, href: (sail && attHref(today, today)) || "/athletes/attendance" },
    side && { key: "my-att", icon: "checks", label: "Yoklama", href: "/my-attendance" },
    { key: "note", icon: "note", label: "Not", onClick: () => openAdd({ type: "note" }) },
    { key: "plan", icon: "cal", label: "Plan", onClick: () => openAdd({ type: "plan" }) },
    receipts && { key: "receipt", icon: "receipt", label: "Fiş", onClick: () => openReceipt() },
    athletes && owner && { key: "msg", icon: "chat", label: "Mesaj", href: "/messages?c=athletes" },
    !side && { key: "meeting", icon: "users", label: "Toplantı", onClick: openMeeting },
    { key: "task", icon: "task", label: "Görev", onClick: () => openAdd({ type: "task" }) },
  ]
    .filter(Boolean);
  const groups = (pages || []).filter((g) => g.items.length);
  const allItem = { key: "all", icon: "grid", label: "Tümü", onClick: () => setAll(true) };
  // İki satır, sekiz düğme (Seyhun 2026-11-06 "daha çok buton, yarışlar falan, 2 satır"): Yarışlar, Antrenman, sonra iş düğmeleri, sonunda Tümü. Sayfa düğmeleri homeActions'tan (yetkiye göre)
  const flat = groups.flatMap((g) => g.items);
  const page = (label, key, icon) => {
    const a = flat.find((x) => x.label === label && x.href);
    return a && { key, icon, label, href: a.href };
  };
  const lead = [page("Yarışlar", "races", "flag"), page("Antrenman", "train", "clock")].filter(Boolean);
  const body = items.filter((i) => ["att", "my-att", "plan", "note", "receipt", "msg"].includes(i.key));
  const rest = items.filter((i) => !body.includes(i));
  const quickItems = [...lead, ...body, ...rest].slice(0, 7);
  return (
    <>
      {/* iPad ana sayfada (IpadHome, sol menü yokken) yalnız "Tümü" düğmesi */}
      {allOnly ? (
        <button type="button" data-press onClick={() => setAll(true)} className="iph-add iph-ghost">
          Tümü
        </button>
      ) : (
        <QuickRow items={[...quickItems, allItem]} />
      )}
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

// Sade iş düğmeleri (Seyhun 2026-11-05 "karman çorman, daha canlı"; 2026-11-06 iki satır, sekiz düğme; telefon ve iPad aynı): renkli yuvarlak simge, kısa ad;
// diğer işler (Toplantı, Görev) Tümü penceresinde. Renk yalnız iş türünü ayırır (Yoklama mavi, Not yeşil, Plan turuncu, Fiş mor).
const QCOL = { races: "#2563eb", train: "#16a34a", att: "#2563eb", "my-att": "#2563eb", note: "#16a34a", plan: "#e58a2b", receipt: "#7c3aed", all: "#64748b", msg: "#0891b2", meeting: "#0891b2", task: "#16a34a" };
function QuickRow({ items }) {
  const cls = "hq-tile";
  return (
    <nav aria-label="İşler" className="hq">
      {items.map((a) => {
        const body = (
          <>
            <i style={{ "--c": QCOL[a.key] || "#64748b" }} className="hq-ic">
              <Icon name={a.icon} className="size-[1.125rem]" />
            </i>
            <span className="truncate">{a.label}</span>
          </>
        );
        return a.href ? (
          <Link key={a.key} href={a.href} data-press className={cls}>
            {body}
          </Link>
        ) : (
          <button key={a.key} type="button" data-press onClick={a.onClick} className={cls}>
            {body}
          </button>
        );
      })}
    </nav>
  );
}
