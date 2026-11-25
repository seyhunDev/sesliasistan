"use client";

// Arka plan işleri (Seyhun 2026-11-12 "arka planda çalışıyor ama göstermemiz lazım"): uzun süren her iş buraya yazılır,
// ekranın üstündeki tek iş göstergesi (components/ui/JobPill.jsx, üst bildirimle aynı yer) bunu gösterir.
// Sayfadan bağımsızdır: sayfa kapansa da iş görünür kalır, bitince yeşil ✓ (+ "Aç"), hata olunca kırmızı nokta (+ "Tekrar").
// Bitenler 4 sn sonra kendiliğinden kalkar; bunun için tek zamanlayıcı var (yalnız biten iş varken kurulu).
//
//   const id = startJob({ name: "Sonuçlar", steps: ["PDF okunuyor", "Sporcularımız bulunuyor"] });
//   jobStep(id, 1)                       adım (sayı) ya da kısa yazı
//   jobDone(id, { text, href })          href: "Aç" düğmesi oraya gider
//   jobFail(id, { text, retry })         retry: "Tekrar" düğmesi
//   await runJob({ name, steps }, (step) => iş(step))   hepsi tek seferde; hata yeniden fırlatılır
import { useSyncExternalStore } from "react";

const KEEP = 4000; // bitmiş işin ekranda kalma süresi (ms)
let jobs = [];
let seq = 0;
let timer = 0;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const subscribe = (f) => (subs.add(f), () => subs.delete(f));
const EMPTY = [];
export const useJobs = () => useSyncExternalStore(subscribe, () => jobs, () => EMPTY);
export const getJobs = () => jobs;

function patch(id, p) {
  if (!jobs.some((j) => j.id === id)) return;
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...p } : j));
  sweep();
  emit();
}

// Tek zamanlayıcı: en erken bitecek işe göre kurulur
function sweep() {
  clearTimeout(timer);
  const now = Date.now();
  const left = jobs.filter((j) => !(j.state === "done" && j.until <= now));
  if (left.length !== jobs.length) jobs = left;
  const next = Math.min(...jobs.filter((j) => j.state === "done").map((j) => j.until));
  if (Number.isFinite(next)) timer = setTimeout(() => (sweep(), emit()), Math.max(50, next - now));
}

export function startJob({ name, steps = [], step = 0, key = "" } = {}) {
  // Aynı iş (key) zaten sürüyorsa yenisi açılmaz
  const had = key && jobs.find((j) => j.key === key && j.state === "run");
  if (had) return had.id;
  const id = `j${++seq}`;
  jobs = [...jobs.filter((j) => !(key && j.key === key)), { id, key, name, steps, step, text: "", got: 0, total: 0, state: "run", at: Date.now() }];
  emit();
  return id;
}

export const jobStep = (id, s, extra = {}) => patch(id, typeof s === "number" ? { step: s, text: "", ...extra } : { text: String(s || ""), ...extra });
export const jobDone = (id, { text = "", href = "" } = {}) => patch(id, { state: "done", text, href, until: Date.now() + KEEP });
export const jobFail = (id, { text = "", retry = null } = {}) => patch(id, { state: "fail", text: text || "Olmadı", retry });
export function jobClose(id) {
  jobs = jobs.filter((j) => j.id !== id);
  sweep();
  emit();
}

export async function runJob(opts, fn, { done = () => ({}), fail = (e) => ({ text: e?.message }) } = {}) {
  const id = startJob(opts);
  try {
    const out = await fn((s, extra) => jobStep(id, s, extra));
    jobDone(id, done(out) || {});
    return out;
  } catch (e) {
    jobFail(id, fail(e) || {});
    throw e;
  }
}

// Göstergede öne çıkan iş: hata > süren (en yeni) > biten (en yeni)
export function leadJob(list = jobs) {
  return list.findLast((j) => j.state === "fail") || list.findLast((j) => j.state === "run") || list.findLast((j) => j.state === "done") || null;
}

// İşin o anki yazısı: biten/hatalıda sonucu, sürende adımın adı (belge sayısı varsa "3/7")
export function jobLine(j) {
  if (!j) return "";
  if (j.state !== "run") return j.text;
  const s = j.text || j.steps[Math.min(j.step, j.steps.length - 1)] || "";
  return j.total ? `${s} ${j.got}/${j.total}` : s;
}
