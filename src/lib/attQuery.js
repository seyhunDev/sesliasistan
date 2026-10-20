// Yoklama soruları (yapay zekasız, telefondaki yoklamadan): "bugünkü antrenmana kimler katıldı", "dün kim gelmedi",
// "Ali bugün geldi mi", "bu ay Ali kaç antrenmana katıldı", "bu hafta en çok kim gelmedi".
// Seyhun (2026-10-20): "kimler katıldı diye soruyorum, bana antrenman planlarını getiriyor". Saf işlevler, test edilir.
//   attQueryAsk(söz, bugün)            soru mu? { from, to, label, state, range } ya da null
//   attQueryAnswer(soru, sporcular)    cevap yazısı (sporcu: { studentName, att: { "2026": { "10-20": "present" } } })
import { fold } from "@/lib/brain/seedMatch";

const ATT = /(?<![\p{L}])(geldi|gelmedi|gelen\p{L}*|gelmeyen\p{L}*|katil\p{L}*|devam\p{L}*|izinli\p{L}*|yoklama\p{L}*)(?![\p{L}])/u;
const ASK = /(?<![\p{L}])(kim|kimler|kimlerin|kimdi|kimlerdi|kac|hangi|hangileri|nasil)(?![\p{L}])|(geldi|gelmedi|katildi|katilmadi|izinli|alindi|alinmis)\s*(mi|mu|miydi|muydu)(?![\p{L}])|(?<![\p{L}])(gelen|gelmeyen|katilan|katilmayan|izinli)\p{L}*\s+(say|soyle|goster|listele|oku|ne)\p{L}*/u;
// Yoklama almak, haber vermek ya da yoklama sayfası: soru değil
const NOT = /(haber ver|bildir|yoklama(yi)? (al|ac)|yoklamaya ekle|velilerine|diye)/u;
const ABSENT = /(gelmedi|gelmeyen|katilmadi|katilmayan|devamsiz|yoktu|eksik)/u;
const EXCUSED = /izinli/u;

const DAYS = ["pazar", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi"];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const at = (today) => new Date(`${today}T12:00:00`);
const plus = (today, n) => {
  const d = at(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

// Hangi gün ya da aralık: bugün (varsayılan), dün, evvelsi gün, haftanın günü (geçen), bu/geçen hafta, bu/geçen ay
function span(t, today) {
  if (/(^| )(evvelsi gun|onceki gun)/.test(t)) return { from: plus(today, -2), to: plus(today, -2), label: "Evvelsi gün" };
  if (/(^| )dun(ku|kü)?( |$)/.test(t)) return { from: plus(today, -1), to: plus(today, -1), label: "Dün" };
  const dow = at(today).getDay();
  if (/(^| )bu hafta/.test(t)) return { from: plus(today, -((dow + 6) % 7)), to: today, label: "Bu hafta", range: true };
  if (/(^| )gecen hafta/.test(t)) {
    const mon = plus(today, -((dow + 6) % 7) - 7);
    return { from: mon, to: plus(mon, 6), label: "Geçen hafta", range: true };
  }
  if (/(^| )bu ay/.test(t)) return { from: `${today.slice(0, 8)}01`, to: today, label: "Bu ay", range: true };
  if (/(^| )gecen ay/.test(t)) {
    const d = at(today);
    d.setDate(0);
    const last = iso(d);
    return { from: `${last.slice(0, 8)}01`, to: last, label: "Geçen ay", range: true };
  }
  const i = DAYS.findIndex((x) => new RegExp(`(^| )${x}(ki|ku|kü|gunu)?( |$)`).test(t));
  if (i >= 0) {
    const back = (dow - i + 7) % 7;
    const d = plus(today, -back);
    return { from: d, to: d, label: back ? DAY_TR[i] : "Bugün" };
  }
  return { from: today, to: today, label: "Bugün" };
}
const DAY_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function attQueryAsk(s, today) {
  const t = fold(s).replace(/[.!?;]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || !ATT.test(t) || !ASK.test(t) || NOT.test(t)) return null;
  const state = ABSENT.test(t) ? "absent" : EXCUSED.test(t) ? "excused" : /(^| )yoklama/.test(t) && !/(geldi|gelen|katil)/.test(t) ? "all" : "present";
  return { ...span(t, today), state, count: /(^| )kac( |$)/.test(t), text: t };
}

const WORD = { present: "geldi", absent: "gelmedi", excused: "izinli" };
const days = (from, to) => {
  const out = [];
  for (let d = from; d <= to; d = plus(d, 1)) out.push(d);
  return out;
};
const stateOn = (a, d) => a.att?.[d.slice(0, 4)]?.[d.slice(5)] || "";
const first = (n) => String(n || "").trim().split(/\s+/)[0];
// Kısa adlar (aynı ilk ad iki sporcudaysa tam ad)
function shortNames(list) {
  const c = {};
  for (const a of list) c[first(a.studentName)] = (c[first(a.studentName)] || 0) + 1;
  return (a) => (c[first(a.studentName)] > 1 ? a.studentName : first(a.studentName));
}
const join = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}`);
const cap = (s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);

// Sorudaki sporcu (ilk ad ya da tam ad); sesle yanlış duyulmayı yapay zekaya bırakmadan tam eşleşme arar
export function whoIn(t, list) {
  const full = list.filter((a) => a.studentName && t.includes(fold(a.studentName)));
  if (full.length === 1) return full[0];
  const byFirst = list.filter((a) => a.studentName && new RegExp(`(^| )${fold(first(a.studentName))}(nin|nun|in|un|ye|ya|e|a|yi|yu|i|u)?( |$)`).test(t));
  return byFirst.length === 1 ? byFirst[0] : null;
}

export function attQueryAnswer(q, athletes = []) {
  const list = athletes.filter((a) => a && a.studentName);
  const nm = shortNames(list);
  const who = whoIn(q.text, list);
  const ds = days(q.from, q.to);
  const taken = ds.filter((d) => list.some((a) => stateOn(a, d)));
  const when = q.label;
  const low = when.toLocaleLowerCase("tr-TR");

  if (!taken.length) return q.range ? `${when} hiç yoklama alınmamış.` : `${when} için yoklama alınmamış.`;

  if (who) {
    const n = nm(who);
    if (!q.range) {
      const st = stateOn(who, q.from);
      return st ? `${n} ${low} ${WORD[st]}.` : `${n} için ${low} yoklama yazılmamış.`;
    }
    const c = { present: 0, absent: 0, excused: 0 };
    for (const d of taken) if (stateOn(who, d)) c[stateOn(who, d)]++;
    if (!c.present && !c.absent && !c.excused) return `${n} için ${low} yoklama yazılmamış.`;
    const parts = [c.present && `${c.present} gün geldi`, c.absent && `${c.absent} gün gelmedi`, c.excused && `${c.excused} gün izinli`].filter(Boolean);
    return `${n} ${low} ${join(parts)} (yoklama alınan ${taken.length} gün).`;
  }

  if (!q.range) {
    const by = { present: [], absent: [], excused: [] };
    for (const a of list) {
      const st = stateOn(a, q.from);
      if (by[st]) by[st].push(nm(a));
    }
    const line = (st) => (by[st].length ? `${by[st].length} sporcu ${WORD[st]}: ${join(by[st])}.` : "");
    if (q.state === "absent") return by.absent.length ? `${when} ${line("absent")}` : `${when} gelmedi yazılan sporcu yok.`;
    if (q.state === "excused") return by.excused.length ? `${when} ${line("excused")}` : `${when} izinli yazılan sporcu yok.`;
    if (q.count) return `${when} ${by.present.length} sporcu geldi${by.absent.length ? `, ${by.absent.length} gelmedi` : ""}${by.excused.length ? `, ${by.excused.length} izinli` : ""}.`;
    const rest = [by.absent.length && `Gelmeyen: ${join(by.absent)}.`, by.excused.length && `İzinli: ${join(by.excused)}.`].filter(Boolean).join(" ");
    return `${when} ${by.present.length ? line("present") : "gelen sporcu yazılmamış."}${rest ? ` ${rest}` : ""}`;
  }

  // Aralık, kişi yok: en çok gelen ya da gelmeyen
  const st = q.state === "all" ? "present" : q.state;
  const rows = list.map((a) => ({ a, n: taken.filter((d) => stateOn(a, d) === st).length })).filter((r) => r.n).sort((x, y) => y.n - x.n);
  if (!rows.length) return `${when} ${taken.length} gün yoklama alındı; ${WORD[st]} yazılan sporcu yok.`;
  const top = rows.slice(0, 6).map((r) => `${nm(r.a)} ${r.n}`);
  const head = st === "present" ? "en çok gelenler" : st === "absent" ? "en çok gelmeyenler" : "en çok izinli olanlar";
  return cap(`${low} ${taken.length} gün yoklama alındı; ${head}: ${top.join(", ")}.`);
}
