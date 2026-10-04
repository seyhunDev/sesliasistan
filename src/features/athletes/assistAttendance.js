"use client";

// Asistandan yoklama ("bugün Mustafa ile Enes antrenmana katıldı"): sayfa değiştirmeden panelde yapılır.
// Adımlar: sporcuları yükle → söyleneni yapay zekayla eşleştir → kaydet (ve uygulamadaki sporcuların kopyası).
// Geri almak için her sporcunun önceki durumu tutulur.
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { byId, isActive, loadAthletes, saveAttendance } from "./data";
import { aliasesOf } from "./names";
import { mirrorChanges } from "./mirror";

export const ATT_LABEL = { present: "geldi", absent: "gelmedi", excused: "izinli" };

// Yoklama sayfası açıkken ekrandaki gün ve sınıf: cümlede gün söylenmezse yoklama bu güne yazılır,
// sınıf seçiliyse yalnız o sınıfın sporcuları ("kalanlar gelmedi" öbür sınıfları işaretlemesin)
let screen = { day: "", cls: "" };
export const setAttDay = (day, cls) => (screen = { day: day || "", cls: cls || "" });

// onStep(label): her adım başlarken çağrılır (panelde "yapılıyor" olarak görünür)
export async function parseAttendance(text, idx, onStep = () => {}) {
  onStep("Sporcular yükleniyor");
  const data = await loadAthletes();
  const list = data.athletes.filter((a) => isActive(a) && (!screen.cls || a.currentClassId === screen.cls));
  if (!list.length) throw Object.assign(new Error("Aktif sporcu yok."), { code: "empty" });
  const classes = byId(data.classes);
  onStep("Söylediklerin sporcularla eşleştiriliyor");
  const res = await authFetch("/api/attendance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      today: todayStr(),
      day: screen.day,
      athletes: list.map((a) => ({ id: a.id, name: a.studentName, cls: classes[a.currentClassId] || "", aliases: aliasesOf(idx, a.id) })),
      notes: idx?.notes || [],
    }),
  });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(r.error || "Yoklama anlaşılamadı");
  const changes = {};
  r.marks.forEach((m) => (changes[m.id] = m.state === "clear" ? null : m.state));
  if (r.others) list.forEach((a) => !(a.id in changes) && (changes[a.id] = r.others));
  const y = r.date.slice(0, 4);
  const md = r.date.slice(5);
  const prev = Object.fromEntries(Object.keys(changes).map((id) => [id, list.find((a) => a.id === id)?.att?.[y]?.[md] || null]));
  const names = Object.fromEntries(list.map((a) => [a.id, a.studentName]));
  return { date: r.date, changes, prev, names, unknown: r.unknown || [], message: r.message || "", total: list.length, others: r.others || "" };
}

// Kaydet (kulüp verisi + uygulamadaki sporcuların yoklama kopyası)
export async function applyAttendance(orgId, members, date, changes) {
  await saveAttendance(date, changes);
  await mirrorChanges(orgId, members, date, changes);
  window.dispatchEvent(new CustomEvent("sa-att-saved", { detail: { date, changes } })); // açık yoklama sayfası güncellensin
}

// "1 Ekim: Mustafa, Enes geldi; 12 kişi gelmedi"
export function attSummary(r) {
  const by = {};
  for (const [id, v] of Object.entries(r.changes)) (by[v || "clear"] = by[v || "clear"] || []).push(r.names[id]?.split(" ")[0] || "?");
  const day = new Date(`${r.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  const part = (k) => (by[k] ? (by[k].length > 4 ? `${by[k].length} kişi ${ATT_LABEL[k] || "temizlendi"}` : `${by[k].join(", ")} ${ATT_LABEL[k] || "temizlendi"}`) : "");
  return `${day}: ${["present", "excused", "absent", "clear"].map(part).filter(Boolean).join("; ")}`;
}
