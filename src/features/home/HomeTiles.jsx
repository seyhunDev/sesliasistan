"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { addDate } from "@/lib/ai/digest";
import { nextPlan, pendingPlans, upcomingBirthdays } from "@/lib/agenda";
import { totalOf } from "@/lib/receipts";
import { todayStr } from "@/lib/utils/format";
import { useHomeTools } from "./tools";

const money = (k) => ((k || 0) / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

// Tek kutu: simge + ad, büyük sayı, tek kısa satır. Dokununca o sayfa.
function Tile({ href, icon, label, value, line, tone }) {
  return (
    <Link href={href} className="flex min-w-0 flex-col rounded-2xl bg-card px-3.5 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)] transition active:scale-[.98]">
      <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-mut">
        <Icon name={icon} className="size-4 text-acc" />
        <span className="truncate">{label}</span>
      </span>
      <b className="mt-1 text-[1.5rem] font-semibold leading-none tracking-tight tabular-nums">{value}</b>
      <span className={`mt-1.5 truncate text-[0.75rem] ${tone === "late" ? "font-medium text-rec" : "text-mut"}`}>{line || "\u00a0"}</span>
    </Link>
  );
}

// Ana sayfanın alt bölümü: her tür için bir kutu (2 sütun). Ayrıntı sayfasında; burada yalnızca sayı ve tek satır.
export function HomeTiles() {
  const { plans, tasks, notes, receipts, members, isStaff, myUid, birthdays, lessons } = useData();
  const tools = useHomeTools();
  const now = useNow();
  const today = todayStr();
  const week = addDate(today, 6);

  const next = nextPlan(plans, now);
  const open = tasks.filter((t) => !t.done && !t.doneBy?.[myUid]);
  const late = open.filter((t) => t.due && t.due < today).length;
  const dueToday = open.filter((t) => t.due === today).length;
  const lastNote = [...notes].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  const month = today.slice(0, 7);
  const spend = receipts.filter((r) => (r.date || "").startsWith(month)).reduce((a, r) => a + totalOf(r), 0);
  const toPay = receipts.filter((r) => r.payStatus === "pending").length;
  const weekPlans = plans.filter((p) => p.date >= today && p.date <= week).length;
  const staffOpen = tasks.filter((t) => !t.done && (t.assignees || []).some((u) => members.some((m) => m.uid === u))).length;
  const bdays = upcomingBirthdays(birthdays, today, 30);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Tile href="/plans" icon="cal" label="Planlar" value={pendingPlans(plans, now)} line={next ? `${next.state === "now" ? "Şu an" : "Sıradaki"}: ${next.plan.title}` : ""} />
      <Tile
        href="/tasks"
        icon="task"
        label="Görevler"
        value={open.length}
        line={late ? `${late} geciken` : dueToday ? `${dueToday} tanesi bugün` : open.length ? "açık" : "Hepsi tamam"}
        tone={late ? "late" : ""}
      />
      <Tile href="/notes" icon="note" label="Notlar" value={notes.length} line={lastNote ? lastNote.title || lastNote.body : ""} />
      <Tile href="/receipts" icon="receipt" label="Fişler" value={money(spend)} line={toPay && !isStaff ? `${toPay} ödeme bekliyor` : "bu ay"} tone={toPay && !isStaff ? "late" : ""} />
      {!isStaff && <Tile href="/staff" icon="users" label="Kişiler" value={members.length} line={members.length ? `${staffOpen} açık iş` : "Kişi ekle"} />}
      {!isStaff && <Tile href="/calendar" icon="cal" label="Takvim" value={weekPlans} line="bu hafta plan" />}
      {tools.selected.includes("birthday") && (
        <Tile href="/calendar" icon="cake" label="Doğum günü" value={bdays.length} line={bdays[0] ? `${bdays[0].name} · ${bdays[0].date === today ? "bugün" : bdays[0].date.slice(8, 10) + "." + bdays[0].date.slice(5, 7)}` : ""} />
      )}
      {tools.selected.includes("schedule") && <Tile href="/schedule" icon="book" label="Dersler" value={lessons.length} line="haftalık program" />}
    </div>
  );
}
