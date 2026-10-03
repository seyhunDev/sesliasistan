"use client";

import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { joinAttendance, mergeLog, pickPlan, presentOn } from "@/lib/trainingLog";
import { loadAthletes } from "@/features/athletes/data";
import { applyAttendance } from "@/features/athletes/assistAttendance";

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

// Günlük ↔ yoklama (yalnız sporcu yetkisi olan): söylenen katılanlar o günün yoklamasında "geldi" olur, yoklamada
// gelenler günlüğe katılan olarak eklenir. Sporcu listesi bellekteki kopyadan (loadAthletes, 3 dk); yazma yalnız değişen sporculara.
// Sonuç { log, marked [ad], unknown [ad], fromAtt [ad] }; sporcular okunamazsa günlük olduğu gibi döner.
export async function syncAttendance(log, date, { orgId, members = [] }) {
  try {
    const { athletes } = await loadAthletes();
    const j = joinAttendance(log, date, athletes);
    if (Object.keys(j.changes).length) await applyAttendance(orgId, members, date, j.changes);
    return j;
  } catch {
    return { log, marked: [], unknown: [], fromAtt: [] };
  }
}

// Ekranda: o günün yoklamasında gelenler (sporcu yetkisi yoksa boş)
export async function presentNames(date) {
  try {
    const { athletes } = await loadAthletes();
    return presentOn(athletes, date);
  } catch {
    return [];
  }
}
