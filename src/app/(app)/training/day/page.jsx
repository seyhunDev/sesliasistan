"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes } from "@/features/athletes/data";
import { RollPanel } from "@/features/athletes/RollPanel";
import { TrainingLog } from "@/features/add/TrainingLog";
import { Countdown } from "@/features/training/Countdown";
import { Races } from "@/features/training/Races";
import { canLog, isTraining, pickPlan } from "@/lib/trainingLog";
import { standings } from "@/lib/raceScore";
import { todayStr } from "@/lib/utils/format";

// Antrenman sayfası (kulüp antrenmanı günü): sayaç, yoklama, yarışlar (bitiş sırası + puan durumu), günlük.
// Açılış: ?id=<antrenman planı> (plan penceresinden) ya da bugünün antrenmanı. Yoklama ve günlük mevcut ekranların
// aynısı (RollPanel, TrainingLog), aynı yere yazar; yarışlar planın `races` alanında (lib/raceScore.js).
// Sesle: "antrenman sayfasını aç" (nav.js). Sayacı ve sonuçları sesle girmek sonraki iş.
const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });

export default function TrainingDayPage() {
  return (
    <Suspense>
      <Day />
    </Suspense>
  );
}

function Day() {
  const id = useSearchParams().get("id") || "";
  const { plans, updateRecord, saveDrafts, isLocked } = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const racer = canSeeAthletes(profile?.email);
  const today = todayStr();
  const plan = (id && plans.find((p) => p.id === id)) || (!id ? pickPlan(plans, today) : null);
  const date = plan?.date || today;
  const by = { name: profile?.name ?? "Kullanıcı" }; // plan penceresindeki gibi (updatedBy)
  const [athletes, setAthletes] = useState([]);
  const [att, setAtt] = useState({}); // bu sayfada değişen yoklama: { "gün|id": durum | null }
  const [sheet, setSheet] = useState(""); // roll | races | log
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!racer) return;
    let live = true;
    loadAthletes()
      .then((d) => live && setAthletes((d.athletes || []).filter(isActive)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [racer]);

  const stateOf = (a) => (`${date}|${a.id}` in att ? att[`${date}|${a.id}`] : a.att?.[date.slice(0, 4)]?.[date.slice(5)] || null);
  const byName = (a, b) => a.name.localeCompare(b.name, "tr");
  const present = athletes.filter((a) => stateOf(a) === "present").map((a) => ({ id: a.id, name: a.studentName })).sort(byName);
  const others = athletes.filter((a) => stateOf(a) !== "present").map((a) => ({ id: a.id, name: a.studentName })).sort(byName);
  const blank = athletes.filter((a) => !stateOf(a)).length;
  const races = plan?.races || [];
  const table = standings(races, present);
  const locked = plan && isLocked?.("plan", plan.id);

  async function addPlan() {
    setAdding(true);
    const r = await saveDrafts([{ type: "plan", title: "Antrenman", cat: "Antrenman", date: today, time: "", place: "", assignees: [] }], { source: "manual", by: profile?.uid });
    setAdding(false);
    if (r.error) toast("Kaydedilemedi, tekrar dene.");
  }

  const sub = plan ? [date === today ? "Bugün" : "", dayText(date), plan.time, plan.place].filter(Boolean).join(" · ") : `Bugün · ${dayText(today)}`;
  const row = "flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-bg";
  const leader = table.rows[0]?.name.split(" ")[0];

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+6rem)]">
      <PageHeader title={plan && plan.title !== "Antrenman" ? plan.title : "Antrenman"} sub={sub} back="/training" />
      <Countdown />

      {!plan ? (
        <button onClick={addPlan} disabled={adding} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5 text-left disabled:opacity-50">
          <span className="text-[0.9375rem] text-fg2">Bugün antrenman planı yok</span>
          <span className="text-[0.9375rem] font-semibold text-acc">Ekle</span>
        </button>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {racer && (
            <li>
              <button onClick={() => setSheet("roll")} className={row}>
                <span className="flex-1 text-[1rem] font-medium">Yoklama</span>
                <span className={`text-[0.9375rem] ${present.length && !blank ? "font-semibold text-acc" : "text-mut"}`}>
                  {athletes.length ? [present.length ? `${present.length} geldi` : "", blank ? `${blank} boş` : ""].filter(Boolean).join(" · ") : "Aç"}
                </span>
              </button>
            </li>
          )}
          {racer && !locked && (
            <li>
              <button onClick={() => setSheet("races")} className={row}>
                <span className="flex-1 text-[1rem] font-medium">Yarışlar</span>
                <span className="text-[0.9375rem] text-mut">{races.length ? `${races.length} yarış${leader && races.some((r) => r.finishes.length) ? ` · ${leader} önde` : ""}` : "Yok"}</span>
              </button>
            </li>
          )}
          {canLog(plan, today) && !locked && (
            <li>
              <button onClick={() => setSheet("log")} className={row}>
                <span className="flex-1 text-[1rem] font-medium">Günlük</span>
                <span className={`text-[0.9375rem] ${plan.log ? "font-semibold text-acc" : "text-mut"}`}>{plan.log ? "Yazıldı" : "Yazılmadı"}</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {racer && (
        <Sheet open={sheet === "roll"} onClose={() => setSheet("")} title="Yoklama">
          {sheet === "roll" && <RollPanel inSheet day={date} onSaved={(d, ch) => setAtt((x) => ({ ...x, ...Object.fromEntries(Object.entries(ch).map(([k, v]) => [`${d}|${k}`, v])) }))} />}
        </Sheet>
      )}
      {plan && racer && (
        <Races open={sheet === "races"} onClose={() => setSheet("")} races={races} present={present} others={others} onSave={(list) => updateRecord("plan", plan.id, { races: list }, by)} />
      )}
      {plan && isTraining(plan) && (
        <Sheet open={sheet === "log"} onClose={() => setSheet("")} title="Günlük">
          {sheet === "log" && <TrainingLog rec={plan} by={by} startOpen onDone={() => setSheet("")} />}
        </Sheet>
      )}
    </main>
  );
}
