// Fitness: profil, program, antrenman sonucu ve takip hesapları (saf işlevler; testler de bunları sınar).
// Kayıtlar:
//   profil  users/{uid}.fit { goal, level, place, equip [], height, weight, age, sex, avoid }
//   program orgs/{org}/fitPrograms/{id} { uid, title, goal, level, place, equip, start, weeks, days [{ dow, time, min, name, items [] }], note, active, plansAt }
//   antrenman: her gün ayrı plan (cat "Fitness"), planda fit { prog, di, w, name, items [], res }
//     res (yapılan): { st done|skip, at, min, feel 1-3, note, ex [{ sets [{ reps, kg, sec, min, ok }] }] } (items ile aynı sırada)
// Takip ekranı planlardan hesaplanır (planlar zaten cihazda; ek okuma yok).
import { EXERCISES, exById, findExercise, fold } from "./exercises";

export const GOALS = [
  ["kilo", "Kilo vermek"],
  ["kas", "Kas yapmak"],
  ["guc", "Güç"],
  ["kondisyon", "Kondisyon"],
  ["saglik", "Genel sağlık"],
];
export const LEVELS = [
  ["yeni", "Yeni başlayan"],
  ["orta", "Orta"],
  ["ileri", "İleri"],
];
export const PLACES = [
  ["salon", "Spor salonu"],
  ["ev", "Ev"],
  ["dis", "Açık hava"],
];
export const FEELS = [
  [1, "Zor"],
  [2, "İyi"],
  [3, "Kolay"],
];
export const DOWS = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const DOW_LONG = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
export const FIT_CAT = "Fitness";

const keyOf = (list, v) => (list.some(([k]) => k === v) ? v : "");
const S = (v, n = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, min, max, step = 1) => {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < min) return 0;
  return Math.min(max, Math.round(n / step) * step);
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const padTime = (t) => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(t || "").trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};

// ---- Profil ----
export function cleanProfile(p = {}) {
  const equip = Array.isArray(p.equip) ? [...new Set(p.equip.map((x) => S(x, 20)).filter(Boolean))].slice(0, 12) : [];
  return {
    goal: keyOf(GOALS, p.goal),
    level: keyOf(LEVELS, p.level),
    place: keyOf(PLACES, p.place),
    equip,
    height: num(p.height, 100, 230),
    weight: num(p.weight, 30, 250, 0.5),
    age: num(p.age, 10, 100),
    sex: p.sex === "e" || p.sex === "k" ? p.sex : "",
    avoid: S(p.avoid, 300),
  };
}
export const profileReady = (p) => !!(p?.goal && p?.level && p?.place);
export const labelOf = (list, k) => list.find(([x]) => x === k)?.[1] || "";

// ---- Program ----
export function cleanItem(it = {}) {
  const ex = exById(it.ex) || findExercise(it.ex) || findExercise(it.name);
  const name = S(it.name || ex?.name, 60);
  if (!name) return null;
  const kind = ex?.kind || (num(it.sec, 1, 3600) ? "time" : num(it.min, 1, 300) && !num(it.reps, 1, 500) ? "cardio" : "reps");
  const out = { ex: ex?.id || "", name: ex && !it.name ? ex.name : name, kind, sets: kind === "cardio" ? num(it.sets, 1, 10) || 1 : num(it.sets, 1, 10) || 3 };
  if (kind === "reps") out.reps = num(it.reps, 1, 100) || 10;
  if (kind === "time") out.sec = num(it.sec, 5, 600, 5) || 30;
  if (kind === "cardio") out.min = num(it.min, 1, 180) || 10;
  const kg = num(it.kg, 0.5, 500, 0.5);
  if (kg && kind === "reps") out.kg = kg;
  const rest = num(it.rest, 0, 300, 5);
  if (rest) out.rest = rest;
  const note = S(it.note, 120);
  if (note) out.note = note;
  return out;
}
export function cleanDay(d = {}) {
  const dow = num(d.dow, 1, 7);
  if (!dow) return null;
  return {
    dow,
    time: TIME.test(padTime(d.time)) ? padTime(d.time) : "",
    min: num(d.min, 10, 240, 5) || 45,
    name: S(d.name, 40) || "Antrenman",
    items: (Array.isArray(d.items) ? d.items : []).map(cleanItem).filter(Boolean).slice(0, 20),
  };
}
export function cleanProgram(p = {}) {
  const days = (Array.isArray(p.days) ? p.days : []).map(cleanDay).filter(Boolean).slice(0, 7);
  const seen = new Set();
  const uniq = days.filter((d) => !seen.has(d.dow) && seen.add(d.dow)).sort((a, b) => a.dow - b.dow);
  return {
    title: S(p.title, 60) || "Fitness programı",
    goal: keyOf(GOALS, p.goal),
    level: keyOf(LEVELS, p.level),
    place: keyOf(PLACES, p.place),
    start: DAY.test(p.start || "") ? p.start : "",
    weeks: num(p.weeks, 1, 26) || 4,
    days: uniq,
    note: S(p.note, 600),
  };
}

const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const dowOf = (day) => ((new Date(`${day}T12:00:00`).getDay() + 6) % 7) + 1; // 1 Pzt … 7 Paz
export const mondayOf = (day) => addDays(day, 1 - dowOf(day));

// Programın günleri: başlangıçtan weeks hafta boyunca seçili gün adları → [{ date, di, w }]
export function sessionsOf(prog) {
  if (!prog?.start || !prog.days?.length) return [];
  const out = [];
  const total = prog.weeks * 7;
  for (let i = 0; i < total; i++) {
    const date = addDays(prog.start, i);
    const di = prog.days.findIndex((d) => d.dow === dowOf(date));
    if (di >= 0) out.push({ date, di, w: Math.floor(i / 7) + 1 });
  }
  return out;
}
export const sessionTitle = (day) => `${FIT_CAT} · ${day.name}`;
// Takvime yazılacak planlar (yalnız from gününden sonrası): [{ title, date, time, min, fit }]
export function planDrafts(prog, from = "") {
  return sessionsOf(prog)
    .filter((s) => !from || s.date >= from)
    .map(({ date, di, w }) => {
      const d = prog.days[di];
      return { title: sessionTitle(d), date, time: d.time, min: d.min, fit: { prog: prog.id || "", di, w, name: d.name, items: d.items } };
    });
}
export function programLine(prog) {
  const days = (prog?.days || []).map((d) => `${DOWS[d.dow]}${d.time ? ` ${d.time}` : ""}`).join(", ");
  return [days, prog?.weeks ? `${prog.weeks} hafta` : ""].filter(Boolean).join(" · ");
}

// ---- Hareket satırı ----
const kgText = (kg) => `${String(kg).replace(".", ",")} kg`;
export function itemLine(it) {
  if (!it) return "";
  if (it.kind === "cardio") return `${it.min} dk`;
  const per = it.kind === "time" ? `${it.sec} sn` : `${it.reps}`;
  return `${it.sets} × ${per}${it.kg ? ` · ${kgText(it.kg)}` : ""}`;
}

// ---- Fitness planları ve sonuçlar ----
export const isFit = (p) => (p?.cat || p?.category) === FIT_CAT || !!p?.fit;
export function cleanRes(r = {}, items = []) {
  const st = r.st === "done" || r.st === "skip" ? r.st : "";
  const ex = items.map((it, i) => {
    const sets = (Array.isArray(r.ex?.[i]?.sets) ? r.ex[i].sets : []).slice(0, 12).map((s) => {
      const o = { ok: !!s.ok };
      const reps = num(s.reps, 1, 500);
      const kg = num(s.kg, 0.5, 500, 0.5);
      const sec = num(s.sec, 1, 3600);
      const min = num(s.min, 1, 600);
      if (reps) o.reps = reps;
      if (kg) o.kg = kg;
      if (sec) o.sec = sec;
      if (min) o.min = min;
      return o;
    });
    return { sets };
  });
  const out = { st, ex };
  if (r.at) out.at = S(r.at, 30);
  const min = num(r.min, 1, 600);
  if (min) out.min = min;
  const feel = num(r.feel, 1, 3);
  if (feel) out.feel = feel;
  const note = S(r.note, 500);
  if (note) out.note = note;
  return out;
}
// Planın durumu: done (yapıldı) · skip (atlandı) · missed (günü geçti, işaretlenmedi) · today · next
export function statusOf(p, today) {
  const st = p?.fit?.res?.st;
  if (st === "done" || st === "skip") return st;
  if (p.date < today) return "missed";
  return p.date === today ? "today" : "next";
}
export const STATUS = { done: "Yapıldı", skip: "Atlandı", missed: "Yapılmadı", today: "Bugün", next: "Sırada" };

export const fitPlans = (plans = []) => plans.filter((p) => isFit(p) && p.status !== "cancelled" && p.date).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));

// Sette yapılan iş: kg × tekrar
const setsOf = (p, i) => p.fit?.res?.ex?.[i]?.sets?.filter((s) => s.ok) || [];
export function volumeOf(p) {
  if (p?.fit?.res?.st !== "done") return 0;
  return (p.fit.items || []).reduce((t, it, i) => t + setsOf(p, i).reduce((a, s) => a + (s.kg || 0) * (s.reps || 0), 0), 0);
}
// Yapılan süre: yazılan süre, yoksa planlanan
export const minutesOf = (p) => (p?.fit?.res?.st === "done" ? p.fit.res.min || p.durationMin || 0 : 0);

// Hafta özeti (pazartesiden): { planned, done, skip, missed, left, minutes, streak (aralıksız hafta) }
export function weekStats(plans, today) {
  const all = fitPlans(plans);
  const mon = mondayOf(today);
  const sun = addDays(mon, 6);
  const wk = all.filter((p) => p.date >= mon && p.date <= sun);
  const st = wk.map((p) => statusOf(p, today));
  const count = (k) => st.filter((x) => x === k).length;
  // Seri: bu hafta (ya da bir şey yapıldıysa) ve geriye doğru en az bir antrenman yapılan hafta sayısı
  const doneWeeks = new Set(all.filter((p) => p.fit?.res?.st === "done").map((p) => mondayOf(p.date)));
  let streak = 0;
  let w = doneWeeks.has(mon) ? mon : addDays(mon, -7);
  while (doneWeeks.has(w)) {
    streak++;
    w = addDays(w, -7);
  }
  return {
    planned: wk.length,
    done: count("done"),
    skip: count("skip"),
    missed: count("missed"),
    left: count("today") + count("next"),
    minutes: wk.reduce((t, p) => t + minutesOf(p), 0),
    streak,
    days: wk.map((p) => ({ id: p.id, date: p.date, name: p.fit?.name || p.title, st: statusOf(p, today) })),
  };
}
// Ay özeti: { planned, done, missed, skip, minutes, volume, rate (%) }
export function monthStats(plans, ym, today) {
  const m = fitPlans(plans).filter((p) => p.date.startsWith(ym));
  const st = m.map((p) => statusOf(p, today));
  const count = (k) => st.filter((x) => x === k).length;
  const past = count("done") + count("missed") + count("skip");
  return {
    planned: m.length,
    done: count("done"),
    missed: count("missed"),
    skip: count("skip"),
    minutes: m.reduce((t, p) => t + minutesOf(p), 0),
    volume: Math.round(m.reduce((t, p) => t + volumeOf(p), 0)),
    rate: past ? Math.round((count("done") / past) * 100) : 0,
  };
}

// Bir hareketin geçmişi (yapılan antrenmanlardan): [{ date, kg, reps, sec, min, sets }] eskiden yeniye; en iyi set alınır
const exKey = (it) => it.ex || fold(it.name);
export function exerciseHistory(plans, key) {
  const out = [];
  for (const p of fitPlans(plans)) {
    if (p.fit?.res?.st !== "done") continue;
    (p.fit.items || []).forEach((it, i) => {
      if (exKey(it) !== key) return;
      const sets = setsOf(p, i);
      if (!sets.length) return;
      const best = sets.reduce((a, s) => ((s.kg || 0) * 1000 + (s.reps || 0) + (s.sec || 0) + (s.min || 0) > (a.kg || 0) * 1000 + (a.reps || 0) + (a.sec || 0) + (a.min || 0) ? s : a));
      out.push({ date: p.date, kg: best.kg || 0, reps: best.reps || 0, sec: best.sec || 0, min: best.min || 0, sets: sets.length });
    });
  }
  return out;
}
// Rekorlar: hareket başına en iyi değer (kilo, yoksa tekrar/süre) ve ilk değere göre artış → en çok çalışılan 8 hareket
export function records(plans) {
  const keys = new Map();
  for (const p of fitPlans(plans)) {
    if (p.fit?.res?.st !== "done") continue;
    (p.fit.items || []).forEach((it) => keys.set(exKey(it), it));
  }
  return [...keys.entries()]
    .map(([key, it]) => {
      const h = exerciseHistory(plans, key);
      if (!h.length) return null;
      const val = (x) => (x.kg ? x.kg : x.reps || x.sec || x.min);
      const best = h.reduce((a, x) => (val(x) > val(a) || (val(x) === val(a) && x.reps > a.reps) ? x : a));
      return { key, name: exById(it.ex)?.name || it.name, kind: it.kind, best, first: h[0], times: h.length, last: h.at(-1).date };
    })
    .filter(Boolean)
    .sort((a, b) => b.times - a.times || b.last.localeCompare(a.last))
    .slice(0, 8);
}
export function bestText(r) {
  const b = r.best;
  if (b.kg) return `${kgText(b.kg)} × ${b.reps}`;
  if (b.sec) return `${b.sec} sn`;
  if (b.min) return `${b.min} dk`;
  return `${b.reps} tekrar`;
}

// Sıradaki hedef (otomatik ilerleme): hareket son yapıldığında bütün setler hedefe ulaştıysa biraz artırılır
// (kilo varsa +2,5 kg, 20 kg altında +1 kg; kilosuzda +1 tekrar; süreli harekette +5 sn). Yoksa son yapılanla aynı.
// Dönüş: { reps, kg, sec, min, up } (up: artırıldı)
export function targetFor(it, plans, before) {
  const base = { reps: it.reps || 0, kg: it.kg || 0, sec: it.sec || 0, min: it.min || 0, up: false };
  const key = exKey(it);
  const past = fitPlans(plans)
    .filter((p) => p.date < before && p.fit?.res?.st === "done")
    .reverse();
  for (const p of past) {
    const i = (p.fit.items || []).findIndex((x) => exKey(x) === key);
    if (i < 0) continue;
    const sets = p.fit.res.ex?.[i]?.sets || [];
    const done = sets.filter((s) => s.ok);
    if (!done.length) return base;
    const last = done.at(-1);
    const all = done.length >= (p.fit.items[i].sets || 1) && done.every((s) => (it.kind === "time" ? (s.sec || 0) >= (p.fit.items[i].sec || 0) : (s.reps || 0) >= (p.fit.items[i].reps || 0)));
    const kg = Math.max(...done.map((s) => s.kg || 0), 0);
    if (it.kind === "time") return { ...base, sec: all ? (last.sec || base.sec) + 5 : last.sec || base.sec, up: all };
    if (it.kind === "cardio") return { ...base, min: last.min || base.min };
    if (kg) return { ...base, kg: all ? kg + (kg < 20 ? 1 : 2.5) : kg, reps: base.reps, up: all };
    const reps = Math.max(...done.map((s) => s.reps || 0));
    return { ...base, reps: all ? reps + 1 : reps || base.reps, up: all };
  }
  return base;
}

// Söylenen sonucu (yapay zekadan ya da elle) plana uygular: { ex: [{ ex|name, sets: [{ reps, kg, sec, min }] }] }
// Söylenen hareket planda yoksa sona eklenir. Dönüş: yeni fit (items, res)
export function applyLog(fit, log = {}) {
  const items = [...(fit.items || [])];
  const ex = items.map((_, i) => ({ sets: [...(fit.res?.ex?.[i]?.sets || [])] }));
  for (const e of Array.isArray(log.items) ? log.items : []) {
    const found = exById(e.ex) || findExercise(e.ex) || findExercise(e.name);
    let i = items.findIndex((it) => (found ? it.ex === found.id : fold(it.name) === fold(e.name)));
    if (i < 0) {
      const it = cleanItem({ ex: found?.id, name: found?.name || e.name, sets: e.sets?.length || 1, reps: e.sets?.[0]?.reps, sec: e.sets?.[0]?.sec, min: e.sets?.[0]?.min, kg: e.sets?.[0]?.kg });
      if (!it) continue;
      items.push(it);
      ex.push({ sets: [] });
      i = items.length - 1;
    }
    const sets = (Array.isArray(e.sets) ? e.sets : []).map((s) => ({ ...s, ok: true }));
    if (sets.length) ex[i] = { sets };
  }
  const res = cleanRes({ ...(fit.res || {}), ex, st: log.st || fit.res?.st || "done", min: log.min || fit.res?.min, feel: log.feel || fit.res?.feel, note: [fit.res?.note, log.note].filter(Boolean).join(" ") }, items);
  if (!res.at) res.at = new Date().toISOString();
  return { ...fit, items, res };
}
// Sonucun kısa yazısı: "Squat 3 × 10 · 60 kg, Şınav 3 × 12"
export function resLine(fit) {
  const parts = (fit?.items || [])
    .map((it, i) => {
      const sets = fit.res?.ex?.[i]?.sets?.filter((s) => s.ok) || [];
      if (!sets.length) return "";
      const s = sets.at(-1);
      const per = it.kind === "cardio" ? `${s.min || it.min} dk` : it.kind === "time" ? `${sets.length} × ${s.sec || it.sec} sn` : `${sets.length} × ${s.reps || it.reps}${s.kg ? ` · ${kgText(s.kg)}` : ""}`;
      return `${it.name} ${per}`;
    })
    .filter(Boolean);
  return parts.join(", ");
}

// Asistana gidecek kısa özet (son 3 hafta + gelecek hafta): "2026-10-06 Pzt Üst vücut: yapıldı (Squat 3 × 10 · 60 kg)"
export function recentText(plans, today) {
  const from = addDays(today, -21);
  const to = addDays(today, 7);
  return fitPlans(plans)
    .filter((p) => p.date >= from && p.date <= to)
    .map((p) => `${p.date} ${DOWS[dowOf(p.date)]} ${p.fit?.name || p.title}: ${STATUS[statusOf(p, today)].toLocaleLowerCase("tr-TR")}${resLine(p.fit) ? ` (${resLine(p.fit)})` : ""}`)
    .join("\n");
}

// Günün fitness planı: o gün (yoksa günü geçmiş, işaretlenmemiş en yakın) plan
export function planOf(plans, date) {
  const all = fitPlans(plans);
  return all.find((p) => p.date === date) || all.filter((p) => p.date < date && !p.fit?.res?.st).at(-1) || null;
}

export const EXERCISE_COUNT = EXERCISES.length;
export { addDays };
