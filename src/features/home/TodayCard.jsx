"use client";

import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { planState } from "@/lib/agenda";
import { db } from "@/lib/firebase/clientApp";
import { activeSummary, addDay, dayItems } from "@/lib/summary";
import { todayStr } from "@/lib/utils/format";

const hmOf = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// Bugün (ya da sabah/akşam özeti saati geldiyse "Günün özeti" / "Yarının özeti"; ✕ ile o gün kapanır, "Bugün"e döner).
// Üstte ilerleme çubuğu; satırlar: geciken görevler, planlar (saat, yer, o saatteki rüzgâr), görevler, bugün bitenler.
// Görev satırındaki daireye dokunmak tamamlar; satırın kendisi kaydı açar.
export function TodayCard() {
  const { profile } = useAuth();
  const { plans, tasks, myUid, toggleTask } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  if (!profile) return null;
  const today = todayStr();
  const tomorrow = addDay(today);
  const active = activeSummary(profile, hmOf(now));
  const kind = active && profile.summaryHidden !== `${today}:${active}` ? active : "today";
  const evening = kind === "evening";
  const day = evening ? tomorrow : today;
  const heading = kind === "today" ? "BUGÜN" : evening ? "YARININ ÖZETİ" : "GÜNÜN ÖZETİ";
  const d = dayItems({ plans, tasks, date: day, uid: myUid, late: !evening });
  const doneToday = evening ? [] : tasks.filter((t) => (t.done && (t.doneAt || "").startsWith(today)) || (t.doneBy?.[myUid] || "").startsWith(today));
  // Tamamlanan görevler ve saati geçen planlar listede görünmez (arşive geçer); ilerleme çubuğunda sayılır
  const pastPlans = evening ? [] : d.plans.filter((p) => planState(p, now) === "past");
  const rows = [
    ...d.late.map((t) => ({ kind: "task", r: t, late: true })),
    ...d.plans.filter((p) => !pastPlans.includes(p)).map((p) => ({ kind: "plan", r: p })),
    ...d.due.map((t) => ({ kind: "task", r: t })),
  ];
  const finished = doneToday.length + pastPlans.length;
  const total = rows.length + finished;
  const next = !evening ? dayItems({ plans, tasks, date: tomorrow, uid: myUid }) : null;
  const hide = () => updateDoc(doc(db, "users", profile.uid), { summaryHidden: `${today}:${kind}` }).catch(() => {});

  return (
    <section aria-label={heading}>
      <div className="mb-2.5 flex items-center justify-between px-1">
        <span className="text-[0.75rem] font-bold tracking-[.08em] text-mut">{heading}</span>
        <span className="flex items-center gap-2 text-[0.75rem] tabular-nums text-mut">
          {total > 0 && !evening && `${finished}/${total} tamam`}
          {kind !== "today" && (
            <button type="button" onClick={hide} aria-label="Özeti bugünlük kapat" className="grid size-7 place-items-center rounded-full active:bg-card">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </span>
      </div>
      {total > 0 && !evening && (
        <div className="mb-2.5 flex gap-1 px-1" aria-hidden="true">
          {[...Array(finished).fill({ done: true }), ...rows].map((x, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${x.done ? "bg-ok" : x.late ? "bg-rec/60" : "bg-line"}`} />
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
        {rows.length === 0 ? (
          <p className="flex items-center justify-between gap-3 px-4 py-4 text-[0.875rem] text-mut">
            {finished ? "Bugünün hepsi tamam." : evening ? "Yarın için plan ya da görev yok." : "Bugün için plan ya da görev yok."}
            {finished > 0 && (
              <Link href="/archive" className="shrink-0 text-[0.8125rem] font-semibold text-acc">
                Arşivde gör
              </Link>
            )}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ kind: k, r, late, done, past }) => {
              const sub =
                k === "plan"
                  ? [r.time || "Gün boyu", r.place].filter(Boolean).join(" · ")
                  : late
                    ? `${Math.round((Date.parse(today) - Date.parse(r.due)) / 864e5)} gün gecikti`
                    : done
                      ? "Tamamlandı"
                      : "Görev";
              return (
                <li key={`${k}${r.id}${done ? "d" : ""}`} className={`flex items-center gap-3 px-3.5 py-3 ${past ? "opacity-50" : ""}`}>
                  {k === "task" ? (
                    <button
                      type="button"
                      onClick={() => toggleTask(r.id)}
                      aria-label={done ? "Yeniden aç" : "Tamamla"}
                      className={`grid size-[1.625rem] shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${done ? "border-ok bg-ok text-white" : late ? "border-rec" : "border-line"}`}
                    >
                      {done && <Icon name="check" className="size-3.5 [stroke-width:3]" />}
                    </button>
                  ) : (
                    <span className="grid size-[1.625rem] shrink-0 place-items-center text-acc">
                      <Icon name="cal" className="size-[1.125rem]" />
                    </span>
                  )}
                  <button type="button" onClick={() => openAdd({ edit: { kind: k, id: r.id } })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="min-w-0 flex-1">
                      <b className={`block truncate text-[0.9375rem] font-semibold ${done ? "text-mut line-through" : ""}`}>{r.title}</b>
                      <small className={`block truncate text-[0.75rem] ${late ? "font-medium text-rec" : done ? "text-ok" : "text-mut"}`}>{sub}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {next && (next.plans.length > 0 || next.due.length > 0) && (
          <p className="truncate border-t border-line px-4 py-2.5 text-[0.8125rem] text-mut">
            <b className="font-semibold text-fg">Yarın</b> · {[next.plans.length && `${next.plans.length} plan`, next.due.length && `${next.due.length} görev`].filter(Boolean).join(" · ")}
            {next.plans[0] ? ` · ilki ${next.plans[0].time || ""} ${next.plans[0].title}` : ""}
          </p>
        )}
      </div>
    </section>
  );
}
