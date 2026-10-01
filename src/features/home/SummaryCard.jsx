"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { db } from "@/lib/firebase/clientApp";
import { activeSummary, addDay, dayItems } from "@/lib/summary";
import { todayStr } from "@/lib/utils/format";

const dateLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
const hmOf = (now) => `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
const SHOW = 4; // kapalıyken en çok bu kadar satır

// Günün satırları: gecikenler, planlar (saate göre), görevler. Her satır: sol sütun (saat ya da simge), başlık, sağ etiket.
function rowsOf(d, nowHM, live) {
  return [
    ...d.late.map((t) => ({ kind: "task", id: t.id, title: t.title, icon: "alert", right: "Gecikti", tone: "late" })),
    ...d.plans.map((p) => ({ kind: "plan", id: p.id, title: p.title, time: p.time || "Gün boyu", allDay: !p.time, right: p.place || "", tone: live && p.time && p.time < nowHM ? "past" : "" })),
    ...d.due.map((t) => ({ kind: "task", id: t.id, title: t.title, icon: "task", right: "Görev" })),
  ];
}

// Ana ekranda günlük özet (bildirimle gelen sabah/akşam özetinin kartı). Ayarlardaki saat geçince görünür.
// Özet saati gelmediyse ya da özet kapatıldıysa aynı görünümde "Bugün" kartı: bugünün planları, görevleri, gecikenler + yarın satırı.
//   Sabah: bugünün gecikenleri, planları, görevleri (+ istenirse yarının kısa satırı) · Akşam: yarın
// Sade gündem görünümü: tek satır başlık, tek satır sayılar, sabit yükseklikte satırlar (yazılar kaymaz, tek satırda kesilir).
// × ile o özet o gün için kapanır (users.summaryHidden = "YYYY-MM-DD:morning|evening"; her cihazda aynı).
export function SummaryCard() {
  const { profile } = useAuth();
  const { plans, tasks, myUid } = useData();
  const { openAdd } = useAdd();
  const now = useNow();
  const [all, setAll] = useState(false);
  if (!profile) return null;

  const today = todayStr();
  const nowHM = hmOf(now);
  const active = activeSummary(profile, nowHM);
  // Özet saati gelmediyse ya da özet kapatıldıysa aynı görünümde sade "Bugün" kartı (kapatılamaz)
  const kind = active && profile.summaryHidden !== `${today}:${active}` ? active : "today";
  const plain = kind === "today";

  const evening = kind === "evening";
  const tomorrow = addDay(today);
  const day = evening ? tomorrow : today;
  const d = dayItems({ plans, tasks, date: day, uid: myUid, late: !evening });
  const rows = rowsOf(d, nowHM, !evening);
  const shown = all ? rows : rows.slice(0, SHOW);
  const next = !evening && (plain || profile.summaryTomorrow) ? dayItems({ plans, tasks, date: tomorrow, uid: myUid }) : null;
  const hide = () => updateDoc(doc(db, "users", profile.uid), { summaryHidden: `${today}:${kind}` }).catch(() => {});

  const counts = [
    d.plans.length && `${d.plans.length} plan`,
    d.due.length && `${d.due.length} görev`,
    d.late.length && <b className="font-semibold text-rec">{`${d.late.length} geciken`}</b>,
  ].filter(Boolean);
  const accent = plain ? "text-acc bg-acc/10" : evening ? "text-violet-600 bg-violet-500/10" : "text-amber-600 bg-amber-500/10";
  const heading = plain ? "Bugün" : evening ? "Yarının özeti" : "Günün özeti";

  return (
    <section className="fade-in overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]" aria-label={heading}>
      {/* Başlık: tek satır */}
      <header className="flex h-14 items-center gap-2.5 pl-4 pr-2">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${accent}`}>
          <Icon name={plain ? "cal" : evening ? "moon" : "sun"} className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[1rem] font-semibold tracking-tight">{heading}</b>
          <span className="block truncate text-[0.75rem] capitalize text-mut">{dateLabel(day)}</span>
        </span>
        {!plain && (
          <button type="button" onClick={hide} aria-label="Özeti bugünlük kapat" className="grid size-10 shrink-0 place-items-center rounded-full text-mut active:bg-bg">
            <Icon name="x" className="size-[1.125rem]" />
          </button>
        )}
      </header>

      {/* Sayılar: tek satır */}
      <p className="truncate border-t border-line px-4 py-2 text-[0.8125rem] text-mut">
        {counts.length
          ? counts.map((c, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {c}
              </span>
            ))
          : evening
            ? "Yarın için plan ya da görev yok"
            : "Bugün boş"}
      </p>

      {/* Satırlar: sabit yükseklik, tek satır */}
      {rows.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {shown.map((r) => (
            <li key={`${r.kind}${r.id}${r.right}`}>
              <button type="button" onClick={() => openAdd({ edit: { kind: r.kind, id: r.id } })} className={`flex h-11 w-full items-center gap-3 px-4 text-left active:bg-bg ${r.tone === "past" ? "opacity-45" : ""}`}>
                {/* Sol sütun sabit genişlikte ve tek satır: "Gün boyu" da saatlerle hizalı kalır, alta kaymaz */}
                <span className="flex w-[3.75rem] shrink-0 items-center whitespace-nowrap">
                  {r.time ? (
                    <span className={`font-semibold tabular-nums text-acc ${r.allDay ? "text-[0.75rem]" : "text-[0.875rem]"}`}>{r.time}</span>
                  ) : (
                    <Icon name={r.icon} className={`size-[1.125rem] ${r.tone === "late" ? "text-rec" : "text-mut"}`} />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{r.title}</span>
                {r.right && <span className={`max-w-[35%] shrink-0 truncate text-[0.75rem] font-medium ${r.tone === "late" ? "text-rec" : "text-mut"}`}>{r.right}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Alt satır: fazlası ve yarın */}
      {(rows.length > SHOW || next) && (
        <div className="flex h-10 items-center gap-3 border-t border-line px-4 text-[0.8125rem]">
          {next && (
            <span className="min-w-0 flex-1 truncate text-mut">
              <b className="font-semibold text-fg">Yarın</b> · {[next.plans.length && `${next.plans.length} plan`, next.due.length && `${next.due.length} görev`].filter(Boolean).join(" · ") || "boş"}
              {next.plans[0] ? ` · ilki ${next.plans[0].time || ""} ${next.plans[0].title}` : ""}
            </span>
          )}
          {rows.length > SHOW && (
            <button type="button" onClick={() => setAll((v) => !v)} className="ml-auto shrink-0 font-semibold text-acc">
              {all ? "Daha az" : `+${rows.length - SHOW} daha`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
