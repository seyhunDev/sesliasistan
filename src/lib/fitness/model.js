// Fitness: profil, program, antrenman sonucu ve takip hesapları (saf işlevler; testler de bunları sınar).
// Kayıtlar:
//   profil  users/{uid}.fit { goal, level, place, equip [], height, weight, age, sex, avoid }
//   program orgs/{org}/fitPrograms/{id} { uid, for, forName, title, goal, level, place, equip, start, weeks, days [{ dow, time, min, name, items [] }], note, active, plansAt, notifiedAt }
//     for: programın sahibi sporcu (boşsa ana hesabın kendi programı)
//   antrenman: her gün ayrı plan (cat "Fitness"), planda fit { prog, di, w, name, items [], res, for } (sporcunun planında people: [sporcu])
//     res (yapılan): { st done|skip, at, min, feel 1-3, note, ex [{ sets [{ reps, kg, sec, min, ok }] }] } (items ile aynı sırada)
// Takip ekranı planlardan hesaplanır (planlar zaten cihazda; ek okuma yok).
import { EXERCISES, exById, findExercise, fold } from "./exercises";
import { cleanYt } from "./youtube";

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
// Sporcunun branşı: program o sporu destekler (sporcu için varsayılan yelken)
export const SPORTS = [
  ["yelken", "Yelken"],
  ["kano", "Kano"],
  ["yuzme", "Yüzme"],
  ["kosu", "Koşu"],
  ["futbol", "Futbol"],
  ["basketbol", "Basketbol"],
  ["voleybol", "Voleybol"],
  ["tenis", "Tenis"],
  ["genel", "Genel"],
];
// Doğum tarihi bilinmezse yaş grubu seçilir (temsilî yaş yapay zekaya grup olarak gider)
export const AGE_GROUPS = [
  ["8-10", 9],
  ["11-12", 12],
  ["13-14", 14],
  ["15-17", 16],
  ["18+", 20],
];
export const ageGroupOf = (age) => (age ? AGE_GROUPS.find(([k]) => { const [a, b] = k.split(/[-+]/).map(Number); return age >= a && (!b || age <= b); })?.[0] || "" : "");
// Doğum tarihinden yaş (YYYY-MM-DD ya da ISO; bilinmezse 0)
export function ageFrom(birth, today = new Date().toISOString().slice(0, 10)) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(birth || ""));
  const t = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(today || ""));
  if (!m || !t) return 0;
  let a = +t[1] - +m[1];
  if (+t[2] < +m[2] || (+t[2] === +m[2] && +t[3] < +m[3])) a--;
  return a >= 4 && a <= 100 ? a : 0;
}
// Kulüp kartındaki cinsiyet ("Erkek"/"Kız") → profil ("e"/"k")
export const sexFrom = (g) => (/^(k|kız|kiz|kadın|f)/i.test(String(g || "").trim()) ? "k" : /^(e|erkek|m)/i.test(String(g || "").trim()) ? "e" : "");

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
    age: num(p.age, 6, 100),
    sex: p.sex === "e" || p.sex === "k" ? p.sex : "",
    avoid: S(p.avoid, 300),
    sport: keyOf(SPORTS, p.sport),
  };
}
export const profileReady = (p) => !!(p?.goal && p?.level && p?.place);
export const labelOf = (list, k) => list.find(([x]) => x === k)?.[1] || "";

// ---- Program ----
export function cleanItem(it = {}) {
  // ex: "" açıkça boş ve ad varsa kulübün kendi hareketidir (kütüphanede "c:ad"); listedeki benzer harekete çevrilmez
  const own = it.ex === "" && !!String(it.name || "").trim();
  const ex = own ? null : exById(it.ex) || findExercise(it.ex) || findExercise(it.name);
  const name = S(it.name || ex?.name, 60);
  if (!name) return null;
  const kind = ex?.kind || (num(it.sec, 1, 3600) ? "time" : num(it.min, 1, 300) && !num(it.reps, 1, 500) ? "cardio" : "reps");
  const out = { ex: ex?.id || "", name: ex && !it.name ? ex.name : name, kind, sets: kind === "cardio" ? num(it.sets, 1, 10) || 1 : num(it.sets, 1, 10) || 3 };
  if (kind === "reps") out.reps = num(it.reps, 1, 100) || 10;
  if (kind === "time") out.sec = num(it.sec, 5, 600, 5) || 30;
  if (kind === "cardio") out.min = num(it.min, 1, 180) || 10;
  // Aralık (8–12 tekrar, 20–30 sn): üst sınır yalnız alttan büyükse
  const repsTo = kind === "reps" ? num(it.repsTo, 1, 100) : 0;
  if (repsTo > out.reps) out.repsTo = repsTo;
  const secTo = kind === "time" ? num(it.secTo, 5, 600, 5) : 0;
  if (secTo > out.sec) out.secTo = secTo;
  if (it.side === true || it.side === "true" || it.side === 1) out.side = true; // tek taraf: her yan için (8/yan)
  const kg = num(it.kg, 0.5, 500, 0.5);
  if (kg && kind === "reps") out.kg = kg;
  const bag = num(it.bag, 0.5, 100, 0.5); // sırt çantasına konan ağırlık (her türde olabilir)
  if (bag) out.bag = bag;
  const rest = num(it.rest, 0, 300, 5);
  if (rest) out.rest = rest;
  const part = PARTS.some(([k]) => k === it.part) ? it.part : "";
  if (part) out.part = part;
  for (const [k, n] of [["breath", 60], ["tempo", 30], ["rpe", 20], ["alt", 120]]) {
    const v = S(it[k], n);
    if (v) out[k] = v;
  }
  const note = S(it.note, 200);
  if (note) out.note = note;
  const media = cleanMedia(it.media);
  if (media.length) out.media = media;
  const yt = cleanYt(it.yt);
  if (yt) out.yt = yt;
  return out;
}
// Bağlantıyla eklenen fotoğraf/video: https adresi; video uzantısı (mp4, mov, webm, m4v) videodur, gerisi fotoğraf
export function linkMedia(text) {
  const url = String(text || "").trim();
  if (!/^https:\/\/[^\s]+$/i.test(url) || url.length > 1200) return null;
  const kind = /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i.test(url) ? "video" : "photo";
  return { id: `lnk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind, url, link: true };
}
// Hareketin fotoğraf/video künyesi (dosyalar fitMedia.js): [{ id, kind photo|video, type, size, parts, url }], en çok 3.
// Bağlantıyla eklenen: { id, kind, url, link: true } (dosya bizde değil, adres olduğu gibi açılır)
export function cleanMedia(list, max = 3) {
  return (Array.isArray(list) ? list : [])
    .filter((m) => m && typeof m.id === "string" && m.id && (m.kind === "photo" || m.kind === "video"))
    .slice(0, max)
    .map((m) => {
      if (m.link) return typeof m.url === "string" && /^https:\/\/\S+$/.test(m.url) && m.url.length <= 1200 ? { id: m.id.slice(0, 40), kind: m.kind, url: m.url, link: true } : null;
      const o = { id: m.id.slice(0, 40), kind: m.kind, type: String(m.type || "").slice(0, 40), size: Math.max(0, +m.size || 0), parts: Math.min(40, Math.max(1, Math.round(+m.parts) || 1)) };
      // Storage'daki dosya: indirme adresi (https, firebasestorage) künyede durur, video oradan akarak oynar
      if (typeof m.url === "string" && /^https:\/\/firebasestorage\.googleapis\.com\//.test(m.url) && m.url.length < 1200) o.url = m.url;
      return o;
    })
    .filter(Boolean);
}
// Antrenmanın bölümü: hazırlık/ısınma, ana bölüm, soğuma (boşsa ana)
export const PARTS = [
  ["isinma", "Hazırlık"],
  ["ana", "Ana bölüm"],
  ["soguma", "Soğuma"],
];
export const DAY_ITEMS = 30;
export function cleanDay(d = {}) {
  const dow = num(d.dow, 1, 7);
  if (!dow) return null;
  const out = {
    dow,
    time: TIME.test(padTime(d.time)) ? padTime(d.time) : "",
    min: num(d.min, 5, 240, 5) || 45,
    name: S(d.name, 40) || "Antrenman",
    items: (Array.isArray(d.items) ? d.items : []).map(cleanItem).filter(Boolean).slice(0, DAY_ITEMS),
  };
  const note = S(d.note, 300); // ör. "2 tur, geçiş 20 sn · yalnız yeşil günde"
  if (note) out.note = note;
  return out;
}
// Haftalara göre evre: { from, to, name, sets (yüzde 30-100; hafif haftada setler azalır), note }
export function cleanPhases(list, weeks = 26) {
  return (Array.isArray(list) ? list : [])
    .map((x) => {
      const from = num(x?.from, 1, weeks);
      if (!from) return null;
      const to = Math.max(from, num(x?.to, 1, weeks) || from);
      const o = { from, to, name: S(x?.name, 40) || `${from}. hafta` };
      const sets = num(x?.sets, 30, 100, 5);
      if (sets && sets < 100) o.sets = sets;
      const note = S(x?.note, 200);
      if (note) o.note = note;
      return o;
    })
    .filter(Boolean)
    .sort((a, b) => a.from - b.from)
    .slice(0, 12);
}
export const phaseOf = (prog, w) => (prog?.phases || []).find((p) => w >= p.from && w <= p.to) || null;
// Evrenin set yüzdesine göre hareketler (en az 1 set; kardiyo değişmez)
export function phaseItems(items = [], ph) {
  if (!ph?.sets || ph.sets >= 100) return items;
  return items.map((it) => (it.kind === "cardio" ? it : { ...it, sets: Math.max(1, Math.round(((+it.sets || 1) * ph.sets) / 100)) }));
}
// Belgeden okunan programda nefes/mobilite/reset gibi rutinler antrenman değildir:
// bölüm başlığı hareket olarak gelmişse (ör. "Nefes ve mobilite 6 dk") çıkarılır; yalnız rutinden oluşan gün eklenmez.
const HEAD = /^(\d+ (dk|dakika) )?(nefes( ve)? mobilite|mobilite( ve)? nefes|mobilite|hazirlik|isinma|soguma|ana bolum|reset|toparlanma)( \d+ (dk|dakika))?$/;
const ROUTINE = /reset|nefes|mobilite|toparlanma|esneme|yelken sonrasi/;
export const isHeading = (name) => HEAD.test(fold(name).replace(/\s+/g, " ").trim());
export function dropRoutines(days = []) {
  return (Array.isArray(days) ? days : [])
    .map((d) => ({ ...d, items: (Array.isArray(d?.items) ? d.items : []).filter((it) => !isHeading(it?.name)) }))
    .filter((d) => d.items.length && !(ROUTINE.test(fold(d.name)) && d.items.every((it) => !(+it.sets >= 2))));
}
// Haftalık takip listesi (değerlendirme sayfası, review.js): { rows [{ label, goal, unit }], ask [soru] }; boşsa null
export const REVIEW_ROWS = 12;
export const REVIEW_ASK = 8;
export function cleanTrack(r = {}) {
  const rows = (Array.isArray(r?.rows) ? r.rows : [])
    .map((x) => ({ label: S(x?.label, 40), goal: S(x?.goal, 80), unit: S(x?.unit, 20) }))
    .filter((x) => x.label)
    .slice(0, REVIEW_ROWS);
  const ask = (Array.isArray(r?.ask) ? r.ask : []).map((q) => S(q, 160)).filter(Boolean).slice(0, REVIEW_ASK);
  return rows.length || ask.length ? { rows, ask } : null;
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
    phases: cleanPhases(p.phases, num(p.weeks, 1, 26) || 4),
    rules: String(p.rules ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1500), // ilerleme, güvenlik, trafik ışığı…
    ...(cleanTrack(p.review) ? { review: cleanTrack(p.review) } : {}),
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
      const ph = phaseOf(prog, w);
      const fit = { prog: prog.id || "", di, w, name: d.name, items: phaseItems(d.items, ph) };
      if (ph) fit.phase = ph.name;
      if (d.note || ph?.note) fit.note = [d.note, ph?.note].filter(Boolean).join(" · ");
      return { title: sessionTitle(d), date, time: d.time, min: d.min, fit };
    });
}
// Programı seviye artırarak devam ettir: her seviye tekrarlı harekete +2 tekrar (en çok 5 seviye).
// Süreli ve kardiyo hareketler aynı kalır. Kimlik ve tarih alanları atılır, yeni program olarak kaydedilir.
export const LEVEL_MAX = 5;
export function levelUp(prog, n = 1) {
  const k = Math.min(LEVEL_MAX, Math.max(1, Math.round(+n) || 1));
  const days = (prog?.days || []).map((d) => ({ ...d, items: (d.items || []).map((it) => (it.kind === "reps" ? { ...it, reps: Math.min(100, (+it.reps || 10) + 2 * k) } : { ...it })) }));
  const { id, notifiedAt, plansAt, createdAt, updatedAt, active, ...rest } = prog || {};
  return { ...rest, days };
}
// Programın bittiği gün (son haftadan sonraki gün)
export const progEnd = (prog) => (prog?.start && DAY.test(prog.start) ? addDays(prog.start, (+prog.weeks || 4) * 7) : "");
// Aynı programı başka sporcuya ver: hareketler aynı, kimin için ve başlangıç yeni
export function copyFor(prog, athlete, start = "", today = new Date().toISOString().slice(0, 10)) {
  const { id, notifiedAt, plansAt, createdAt, updatedAt, active, ...rest } = prog || {};
  return {
    ...rest,
    days: (prog?.days || []).map((d) => ({ ...d, items: (d.items || []).map((it) => ({ ...it })) })),
    for: athlete?.uid || "",
    forName: athlete?.name || "",
    forAge: ageFrom(athlete?.birth, today) || 0,
    start: DAY.test(start || "") ? start : today,
  };
}
export function programLine(prog) {
  const days = (prog?.days || []).map((d) => `${DOWS[d.dow]}${d.time ? ` ${d.time}` : ""}`).join(", ");
  return [days, prog?.weeks ? `${prog.weeks} hafta` : ""].filter(Boolean).join(" · ");
}

// Programın düz yazı listesi (kopyalamak için): kime, yaşı, ne için, gün gün hareketler
export function programText(prog, { age = 0, sport = "" } = {}) {
  if (!prog) return "";
  const who = prog.forName ? `${prog.forName} için fitness programı` : prog.title || "Fitness programı";
  const yas = age || prog.forAge || 0;
  const spor = labelOf(SPORTS, sport || prog.sport || "");
  const head = [
    who,
    prog.forName && prog.title && !prog.title.startsWith(prog.forName) ? prog.title : "",
    [yas ? `${yas} yaş` : "", spor ? `Spor: ${spor}` : ""].filter(Boolean).join(" · "),
    [prog.goal && `Hedef: ${labelOf(GOALS, prog.goal)}`, prog.level && `Seviye: ${labelOf(LEVELS, prog.level)}`, prog.place && `Yer: ${labelOf(PLACES, prog.place)}`].filter(Boolean).join(" · "),
    [`Haftada ${(prog.days || []).length} gün`, prog.weeks ? `${prog.weeks} hafta` : "", prog.start ? `başlangıç ${new Date(`${prog.start}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}` : ""].filter(Boolean).join(" · "),
  ].filter(Boolean);
  const days = (prog.days || []).map((d) => {
    const top = `${DOW_LONG[d.dow]}${d.time ? ` ${d.time}` : ""} · ${d.name}${d.min ? ` (${d.min} dk)` : ""}`;
    const items = (d.items || []).map((it, i) => {
      const more = [itemMore(it), it.note, it.alt ? `alternatif: ${it.alt}` : ""].filter(Boolean).join(" · ");
      return `${i + 1}. ${it.name || exById(it.ex)?.name || "Hareket"} — ${itemLine(it)}${more ? ` (${more})` : ""}`;
    });
    return [top, ...(d.note ? [d.note] : []), ...items].join("\n");
  });
  const phases = (prog.phases || []).map((p) => `${p.from === p.to ? `${p.from}. hafta` : `${p.from}-${p.to}. hafta`}: ${p.name}${p.sets ? ` (setler %${p.sets})` : ""}${p.note ? ` · ${p.note}` : ""}`);
  return [head.join("\n"), ...days, phases.length ? phases.join("\n") : "", prog.note ? `Not: ${prog.note}` : "", prog.rules || ""].filter(Boolean).join("\n\n");
}

// ---- Dinlenme ----
// Antrenmanda setten sonraki geri sayım hareketin rest alanından; boşsa REST_DEFAULT. Kardiyoda (tek blok) dinlenme yok.
export const REST_DEFAULT = 60;
const restable = (it) => it && it.kind !== "cardio";
// Programın ortak dinlenmesi: en çok kullanılan değer (boşlar REST_DEFAULT sayılır)
export function restOf(prog) {
  const c = new Map();
  for (const d of prog?.days || []) for (const it of d.items || []) if (restable(it)) { const r = +it.rest || REST_DEFAULT; c.set(r, (c.get(r) || 0) + 1); }
  let best = REST_DEFAULT, n = 0;
  for (const [r, k] of c) if (k > n) [best, n] = [r, k];
  return best;
}
// Toplu: bütün günlerdeki (ya da yalnız dow günündeki) hareketlerin dinlenmesi sec olur (5–300 sn, 5'in katı)
export function setRestAll(prog, sec, dow = null) {
  const r = Math.min(300, Math.max(5, Math.round((+sec || REST_DEFAULT) / 5) * 5));
  return { ...prog, days: (prog?.days || []).map((d) => (dow != null && d.dow !== dow ? d : { ...d, items: (d.items || []).map((it) => (restable(it) ? { ...it, rest: r } : it)) })) };
}

// ---- Hareket satırı ----
const kgText = (kg) => `${String(kg).replace(".", ",")} kg`;
export function itemLine(it) {
  if (!it) return "";
  if (it.kind === "cardio") return `${it.min} dk`;
  const side = it.side ? "/yan" : "";
  const per = it.kind === "time" ? `${it.sec}${it.secTo ? `–${it.secTo}` : ""} sn${side}` : `${it.reps}${it.repsTo ? `–${it.repsTo}` : ""}${side}`;
  return `${it.sets} × ${per}${it.kg ? ` · ${kgText(it.kg)}` : ""}${it.bag ? ` · çanta ${kgText(it.bag)}` : ""}`;
}
// Hareketin ayrıntıları (satır altında): dinlenme, tempo, zorluk, nefes
export function itemMore(it) {
  if (!it) return "";
  return [it.rest ? `dinlenme ${it.rest} sn` : "", it.tempo ? `tempo ${it.tempo}` : "", it.rpe ? `RPE ${it.rpe}` : "", it.breath ? `nefes: ${it.breath}` : ""].filter(Boolean).join(" · ");
}

// Tahmini süre (dk): set başına tekrar ~4 sn ya da süre + dinlenme, kardiyo dakikası; başa 5 dk ısınma, 5'e yuvarlanır
export function estMinutes(items = []) {
  const sec = (items || []).reduce((t, it) => {
    if (!it) return t;
    if (it.kind === "cardio") return t + (+it.min || 0) * 60;
    const sets = +it.sets || 1;
    const work = it.kind === "time" ? +it.sec || 30 : (+it.reps || 10) * 4;
    return t + sets * (work + (+it.rest || 60));
  }, 0);
  if (!sec) return 0;
  return Math.max(10, Math.round((sec / 60 + 5) / 5) * 5);
}
// Antrenmanda çalışılan kas grupları (sırayla, tekrarsız)
export const groupsOf = (items = []) => [...new Set((items || []).map((it) => exById(it?.ex)?.group).filter(Boolean))];

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
      // Süreli sette geri sayım kaydı: kaç saniye yapıldı, süre dolana kadar mı (full) yoksa erken mi geçildi
      const took = num(s.took, 1, 36000);
      if (took) o.took = took;
      if (s.full) o.full = true;
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

// "Ali Kaya" → "Ali'ye", "Zeynep" → "Zeynep'e", "Mete" → "Mete'ye" (ilk ad, yönelme eki)
export function toName(full) {
  const w = String(full || "").trim().split(/\s+/)[0] || "";
  if (!w) return "";
  const low = w.toLocaleLowerCase("tr-TR");
  const v = [...low].reverse().find((c) => "aeıioöuü".includes(c)) || "e";
  const e = "aıou".includes(v) ? "a" : "e";
  return `${w}'${"aeıioöuü".includes(low.at(-1)) ? "y" : ""}${e}`;
}
// Sporcunun planı mı (ana hesap hazırladı, sporcu yapar). Ana hesabın kendi takvimi ve takibi bunları saymaz.
export const isOthers = (p, me) => !!p?.fit?.for && p.fit.for !== me;
// Sporcu listesi (Fitness › Sporcular): her sporcunun etkin programı ve bu haftası.
// progs: tüm programlar; plans: sporcuların fitness planları (fitOthers); people: [{ uid, name }]
export function athleteRows(progs = [], plans = [], people = [], today) {
  const out = [];
  for (const a of people) {
    // Etkin program; hiçbiri etkin görünmüyorsa sporcunun en son programı (progs yeniden eskiye sıralı)
    const prog = progs.find((p) => p.for === a.uid && p.active) || progs.find((p) => p.for === a.uid) || null;
    const mine = plans.filter((p) => p.fit?.for === a.uid);
    if (!prog && !mine.length) continue;
    const w = weekStats(mine, today);
    const last = fitPlans(mine).filter((p) => p.fit?.res?.st === "done").at(-1) || null;
    const next = fitPlans(mine).find((p) => p.date >= today && !p.fit?.res?.st) || null;
    out.push({ uid: a.uid, name: a.name, prog, week: w, last, next, plans: mine });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

// Sporcu sayfasındaki antrenman listesi: bugünden ileriye, yakından uzağa; ilk hafta (7 gün), "Daha fazla" her dokunuşta bir hafta.
// Dönüş: { list, more } (more: sonrasında da antrenman var)
export function upcomingList(plans = [], today, weeks = 1) {
  const all = fitPlans(plans).filter((p) => p.date >= today);
  const to = addDays(today, 7 * Math.max(1, weeks) - 1);
  const list = all.filter((p) => p.date <= to);
  return { list, more: all.length > list.length };
}
// Bir günün sporcu antrenmanları (Fitness › Sporcular › gün): her antrenman bir satır, durumuyla.
// Sıra: yapılmayanlar/bekleyenler önce, sonra yapılanlar; ad sırasıyla.
export function dayRows(plans = [], people = [], date, today) {
  const nameOf = (uid) => people.find((a) => a.uid === uid)?.name || "Sporcu";
  const rank = { missed: 0, today: 1, next: 1, skip: 2, done: 3 };
  return fitPlans(plans)
    .filter((p) => p.fit?.for && p.date === date)
    .map((p) => ({ uid: p.fit.for, name: nameOf(p.fit.for), plan: p, st: statusOf(p, today) }))
    .sort((a, b) => rank[a.st] - rank[b.st] || a.name.localeCompare(b.name, "tr"));
}
// "Bugün 3 sporcu: 1 yaptı, 2 bekliyor" (satır yoksa boş)
export function dayLine(rows = [], when = "Bugün") {
  if (!rows.length) return "";
  const c = (k) => rows.filter((r) => r.st === k).length;
  const wait = c("today") + c("next");
  return `${when} ${rows.length} sporcu: ${[c("done") ? `${c("done")} yaptı` : "", wait ? `${wait} bekliyor` : "", c("missed") ? `${c("missed")} yapmadı` : "", c("skip") ? `${c("skip")} atladı` : ""].filter(Boolean).join(", ")}`;
}

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
// ---- Süreli hareket (geri sayım) ----
// Hedef saniye: süreli harekette set süresi, kardiyoda dakika × 60
export function goalSec(it = {}, set = {}) {
  if (it.kind === "time") return +(set.sec || it.sec) || 30;
  if (it.kind === "cardio") return (+(set.min || it.min) || 1) * 60;
  return 0;
}
export const isTimed = (it) => it?.kind === "time" || it?.kind === "cardio";
// 0:30 · 5:00 · 1:02:05
export function clockText(sec) {
  const t = Math.max(0, Math.round(+sec || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
// Setin süre kaydı: "Tamamlandı · 0:30" ya da "0:18'de geçildi (hedef 0:30)"; kayıt yoksa boş
export function setTimeText(it, s = {}) {
  if (!isTimed(it) || !s.took) return "";
  return s.full ? `Tamamlandı · ${clockText(s.took)}` : `${clockText(s.took)}'de geçildi (hedef ${clockText(goalSec(it, s))})`;
}
// Süresi dolmadan geçilen setler: "2. set 0:18'de geçildi"
function earlyText(it, sets = []) {
  return sets
    .map((s, k) => (s.ok && s.took && !s.full ? `${k + 1}. set ${clockText(s.took)}'de geçildi` : ""))
    .filter(Boolean)
    .join(", ");
}

export function resLine(fit) {
  const parts = (fit?.items || [])
    .map((it, i) => {
      const sets = fit.res?.ex?.[i]?.sets?.filter((s) => s.ok) || [];
      if (!sets.length) return "";
      const s = sets.at(-1);
      const per = it.kind === "cardio" ? `${s.min || it.min} dk` : it.kind === "time" ? `${sets.length} × ${s.sec || it.sec} sn` : `${sets.length} × ${s.reps || it.reps}${s.kg ? ` · ${kgText(s.kg)}` : ""}`;
      const early = earlyText(it, fit.res?.ex?.[i]?.sets || []);
      return `${it.name} ${per}${early ? ` (${early})` : ""}`;
    })
    .filter(Boolean);
  return parts.join(", ");
}

// Biten antrenmanın ekranı: hareket başına özet satırı ve süreli setlerin geçen süresi; toplam set ve süre
// sets[].state: "full" süresi doldu, "early" erken geçildi, "ok" yapıldı (süre kaydı yok), "no" yapılmadı
export function resRows(fit) {
  let done = 0;
  let total = 0;
  let active = 0;
  const rows = (fit?.items || []).map((it, i) => {
    const all = fit.res?.ex?.[i]?.sets || [];
    const ok = all.filter((s) => s.ok);
    done += ok.length;
    total += all.length || it.sets || 1;
    const last = ok.at(-1) || {};
    const line = !ok.length ? "Yapılmadı" : it.kind === "cardio" ? `${last.min || it.min} dk` : it.kind === "time" ? `${ok.length} × ${clockText(goalSec(it, last))}` : `${ok.length} × ${last.reps || it.reps}${last.kg ? ` · ${kgText(last.kg)}` : ""}`;
    const sets = isTimed(it)
      ? all.map((s, k) => {
          if (s.took) active += s.took;
          const goal = goalSec(it, s);
          const state = !s.ok ? "no" : !s.took ? "ok" : s.full ? "full" : "early";
          return { n: k + 1, state, text: state === "early" ? `${clockText(s.took)} / ${clockText(goal)}` : clockText(s.took || goal) };
        })
      : [];
    return { name: it.name, line, sets, none: !ok.length };
  });
  return { rows, done, total, active };
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

// Programın kaçıncı haftası: { n, of } (başlamadıysa n 0, bittiyse n = of + 1)
export function progWeek(prog, today) {
  if (!prog?.start || !prog.weeks) return null;
  const ms = new Date(`${mondayOf(today)}T12:00:00`) - new Date(`${mondayOf(prog.start)}T12:00:00`);
  const n = Math.floor(Math.round(ms / 864e5) / 7) + 1;
  return { n: today < prog.start ? 0 : Math.min(n, prog.weeks + 1), of: prog.weeks };
}

// Adım adım antrenman: (i, k) hareket/set konumundan başlayarak yapılmamış ilk set; hepsi yapıldıysa null
export function nextOpen(sets = [], i = 0, k = 0) {
  for (let a = Math.max(0, i); a < sets.length; a++) {
    const s = sets[a] || [];
    for (let b = a === i ? Math.max(0, k) : 0; b < s.length; b++) if (!s[b]?.ok) return { i: a, k: b };
  }
  return null;
}

// Adım adım ekranda değerin − / + adımı: tekrar 1, kilo 2,5, saniye 5, dakika 1
export const STEP = { reps: 1, kg: 2.5, sec: 5, min: 1 };
export function bump(v, key, dir) {
  const n = Number(String(v ?? "").replace(",", ".")) || 0;
  const out = Math.max(0, Math.round((n + dir * (STEP[key] || 1)) * 2) / 2);
  return out ? String(out) : "";
}

// Sporcunun antrenmanları (antrenörün hazırladığı, fit.for = sporcu)
export const myFit = (plans = [], uid = "") => fitPlans(plans.filter((p) => p.fit?.for === uid));

// Ana sayfa kartı: bugünkü yapılmamış antrenman, yoksa sıradaki; hiç yoksa null
export function athleteNext(plans, uid, today) {
  const all = myFit(plans, uid);
  const now = all.find((p) => p.date === today && !p.fit?.res?.st);
  if (now) return { plan: now, today: true };
  const next = all.find((p) => p.date > today && !p.fit?.res?.st);
  return next ? { plan: next, today: false } : null;
}
