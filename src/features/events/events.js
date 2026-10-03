"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { cleanEvent } from "./eventModel";

// Etkinlikler: orgs/{orgId}/events (yalnız ana hesap; mevcut kural ana hesaba orgs altındaki her koleksiyonu açıyor)
const col = (orgId) => collection(db, "orgs", orgId, "events");

// Okuma: sayfa açılınca bir kez (canlı dinleme yok, kota için)
export async function loadEvents(orgId) {
  const snap = await getDocs(col(orgId));
  return snap.docs.map((d) => ({ id: d.id, ...cleanEvent(d.data()) })).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

// Yeni etkinliği ekler ya da var olanı günceller; kimliği döndürür
export async function saveEvent(orgId, uid, ev) {
  const data = { ...cleanEvent(ev), updatedAt: serverTimestamp() };
  if (ev.id) {
    await updateDoc(doc(col(orgId), ev.id), data);
    return ev.id;
  }
  const ref = await addDoc(col(orgId), { ...data, createdByUid: uid, createdAt: serverTimestamp() });
  return ref.id;
}

export const deleteEvent = (orgId, id) => deleteDoc(doc(col(orgId), id));

// Yapay zekayla plan: { ask: ["where"|"when"|"people"], question, event, message }
// general false: yer/zaman eksikse önce soru döner. Yalnız etkinlik bilgisi ve kullanıcının cümlesi gider.
export async function askPlan({ text = "", event = null, general = true }) {
  const res = await authFetch("/api/event-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      general,
      today: todayStr(),
      event: event ? { title: event.title, kind: event.kind, place: event.place, startDate: event.startDate, endDate: event.endDate, people: event.people } : null,
    }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Plan hazırlanamadı");
  return p;
}

// Formda girilen bilgiler yapay zekanın tahmininden önce gelir
export function mergeForm(form, ai) {
  const pick = (k) => form[k] || ai[k];
  return cleanEvent({
    ...ai,
    title: pick("title"),
    kind: form.kind && form.kind !== "diger" ? form.kind : ai.kind,
    place: pick("place"),
    startDate: pick("startDate"),
    endDate: form.startDate ? form.endDate : ai.endDate,
    people: form.people || ai.people,
    note: form.note || "",
    source: "ai",
  });
}

// Etkinliği planlara (takvime) yazar: tüm gün, çok günlü. saveDrafts: DataProvider'dan.
export async function addEventPlan(saveDrafts, ev, by) {
  const res = await saveDrafts(
    [{ type: "plan", title: ev.title.trim(), date: ev.startDate, endDate: ev.endDate || "", time: "", place: ev.place, cat: ev.kind === "kamp" ? "Kamp" : "Genel", assignees: [] }],
    { source: "manual", by },
  );
  return !res.error && res.plans > 0;
}
