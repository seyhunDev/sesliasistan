"use client";

import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { mergeLog, pickPlan } from "@/lib/trainingLog";

// Yapay zekayla günlük: anlatılan → { date, time, log }. date boşsa tarih sorulur.
// Yapay zekaya yalnız anlatılan metin ve bilinen tarih gider.
export async function askLog({ text, date = "" }) {
  const res = await authFetch("/api/training-log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, date, today: todayStr() }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Günlük çıkarılamadı");
  return p;
}

// Günlüğü günün antrenman planına yazar (var olan günlükle birleşir); o gün antrenman yoksa yeni Antrenman planı açılır.
// data: useData() (plans, updateRecord, saveDrafts, isLocked). Sonuç: { id, log, fresh } ya da { error }
// planId: açık plan ekranından söylendiyse o plana yazılır.
export async function saveLog(data, { date, time, log, planId = "" }, by, source = "manual") {
  const { plans, updateRecord, saveDrafts, isLocked } = data;
  const plan = (planId && plans.find((p) => p.id === planId)) || pickPlan(plans, date, time);
  if (plan) {
    if (isLocked?.("plan", plan.id)) return { error: "Bu antrenmanı başkası eklemiş; günlüğünü o ya da ana hesap yazabilir." };
    const merged = mergeLog(plan.log, log);
    await updateRecord("plan", plan.id, { log: merged }, by);
    return { id: plan.id, log: merged, fresh: false };
  }
  const merged = mergeLog(null, log);
  const r = await saveDrafts([{ type: "plan", title: "Antrenman", cat: "Antrenman", date, time: time || "", place: merged?.place || "", assignees: [], log: merged }], { source, by });
  if (r.error) return { error: "Kaydedilemedi, tekrar dene." };
  return { id: r.ids?.[0]?.[1] || "", log: merged, fresh: true };
}
