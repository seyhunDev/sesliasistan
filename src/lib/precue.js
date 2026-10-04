// Ön cevap (yapay zekasız, anında): kullanıcı susar susmaz söylenecek kısa giriş cümlesi, bildiği alanları dolu
// taslak kart ve yapay zekaya gidecek ipucu. Yapay zeka cevabı gelene kadar beklemeyi anlamlı bir cümleyle doldurur;
// yapay zeka bu cümleyi bilir ve tekrar etmeden devam eder (ipucu: hint).
//
// Kural: yalnızca emin olunan şey söylenir. Tür belli değilse genel bir giriş ("Bir bakayım.") kullanılır,
// böylece yapay zekanın cevabıyla çelişmez. Gerçek veriden yardımcı bilgi eklenir (aynı saatte plan, o saatte rüzgâr).
import { interpretRules } from "@/lib/ai/rules";
import { dayLabel } from "@/lib/agenda";
import { normalizeSpeech } from "@/lib/speech/normalize";
import { isMulti, jobsIn, jobsText, wantsNote } from "@/lib/steps";

const lower = (s) => s.toLocaleLowerCase("tr-TR");
const QUESTION = /(\?|(^| )(neler|ne var|kaç|hangi|var mı|varmı|nedir|ne zaman|nerede|kim|nasıl|mi|mı|mu|mü)( |$)|göster|söyler misin|anlat)/;
const CREATE = /(ekle|oluştur|kaydet|koy(?!ul)|planla|hatırlat|not (al|düş|et)|takvime|ayarla)/;
const SEND = /(^| )(yaz|gönder|ilet|haber ver|mesaj (at|gönder|yaz))( |$)|('|’)?(e|a|ye|ya) (yaz|söyle)( |$)/;
const TYPE_W = [
  ["note", /(^| )(not al\S*|not düş\S*|not et|not ekle\S*|^not )/],
  ["task", /(^| )(görev\S*|hatırlat\S*|yapılacak\S*)( |$)/],
  ["plan", /(^| )(plan(ı|a)?|planla\S*|etkinli\S*|takvime)( |$)/],
];
const KIND_LINE = { plan: "plan", task: "görev", note: "not" };

const hm = (t) => (t ? t.slice(0, 5) : "");
const mins = (t) => (t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null);
// "yarın", "bugün", "cumartesi", "12 Ekim"
function when(date, today) {
  if (!date) return "";
  const l = dayLabel(date, today);
  return /^\d/.test(l) ? l : lower(l);
}

// guess: öğrenilmiş tahmin ({ label, score }) varsa türü güçlendirir. weatherRows(date): o günün saatlik rüzgârı.
export function precue(raw, { plans = [], today, guess = null, weatherRows = null } = {}) {
  const text = normalizeSpeech(String(raw || "")).trim();
  if (!text) return null;
  const t = lower(text);

  // Soru: yalnızca genel giriş (cevabı yapay zeka verir); bugün/yarın soruluyorsa kaç kayıt olduğu söylenir
  if (QUESTION.test(t) && !CREATE.test(t)) {
    const day = /(^| )yarın/.test(t) ? "yarın" : /(^| )bugün/.test(t) ? "bugün" : "";
    let line = "Bakıyorum.";
    if (day) {
      const d = day === "bugün" ? today : addDays(today, 1);
      const n = plans.filter((p) => p.date <= d && (p.endDate || p.date) >= d).length;
      line = n ? `Bakıyorum, ${day} ${n} plan görüyorum.` : `Bakıyorum, ${day} için takvim boş görünüyor.`;
    }
    return { kind: "query", line, hint: hintOf(line, { kind: "soru" }) };
  }

  // Birden çok iş ("Gökhan'a mesaj at, takvime ekle ve notlara liste hazırla"): tek bir türü söyleme, sırayı söyle
  if (isMulti(text)) {
    const jobs = jobsText(jobsIn(text));
    const line = `Tamam, sırayla yapıyorum: ${jobs}.`;
    return { kind: "multi", line, hint: hintOf(line, { kind: `birden çok iş (sırayla: ${jobs})` }) };
  }

  // Mesaj: kime ve ne yazılacağını yapay zeka çıkarır
  if (SEND.test(t) && !CREATE.test(t)) {
    const line = "Mesajı hazırlıyorum.";
    return { kind: "send", line, hint: hintOf(line, { kind: "mesaj" }) };
  }

  // Yeni kayıt: tür ve alanlar kurallarla
  const label = guess?.score >= 0.55 ? guess.label : "";
  const byWord = TYPE_W.find(([, re]) => re.test(t))?.[0] || "";
  // Not yalnız açıkça istenince söylenir ("not alıyorum"); öğrenilmiş tahmin ya da kuralın varsayılanı notu seçtirmez
  const byGuess = { "create:plan": "plan", "create:task": "task", "create:plan+note": "plan" }[label] || "";
  const hasTime = /saat \d|\d{1,2}[:.]\d{2}|\d{1,2}'?(de|da|te|ta)( |$)/.test(t);
  const wantsCreate = CREATE.test(t) || !!byWord || !!byGuess || (hasTime && !QUESTION.test(t));
  if (!wantsCreate) {
    if (t.split(/\s+/).length <= 3) return null; // "teşekkürler", "tamam sağ ol": ön cevaba gerek yok
    const line = "Bir bakayım.";
    return { kind: "other", line, hint: hintOf(line, {}) };
  }
  const item = interpretRules(text, today)[0] || {};
  const type = byWord || byGuess || (item.type === "note" && !wantsNote(text) ? "" : item.type) || "";
  if (!type) {
    const line = "Tamam, hazırlıyorum.";
    return { kind: "create", line, hint: hintOf(line, { kind: "yeni kayıt" }) };
  }
  const date = item.date || "";
  const time = type === "plan" ? hm(item.time) : "";
  const slots = { type, date, time, place: item.place || "" };

  let line;
  if (type === "plan") {
    const at = [when(date, today), time && `saat ${time}`].filter(Boolean).join(" ");
    line = at ? `Tamam, ${at} için bir plan hazırlıyorum.` : "Tamam, bir plan hazırlıyorum.";
    line += facts({ date, time, plans, weatherRows });
  } else if (type === "task") {
    line = date ? `Tamam, ${when(date, today)} için bir görev hazırlıyorum.` : "Tamam, görev olarak hazırlıyorum.";
  } else line = "Tamam, not alıyorum.";

  return {
    kind: KIND_LINE[type] ? type : "create",
    line,
    slots,
    hint: hintOf(line, { kind: KIND_LINE[type] || "yeni kayıt", date, time }),
  };
}

// Gerçek veriden tek yardımcı bilgi (cümle kısa kalsın, sesli okuması ~3 sn): önce aynı saatte (±90 dk) başka plan,
// yoksa saat belliyse o saatte rüzgâr, o da yoksa o günkü plan sayısı
function facts({ date, time, plans, weatherRows }) {
  if (!date) return "";
  const same = plans.filter((p) => p.date <= date && (p.endDate || p.date) >= date);
  const tm = mins(time);
  const clash = tm == null ? null : same.find((p) => p.time && Math.abs(mins(p.time) - tm) <= 90);
  if (clash) return ` O saatlerde “${clash.title}” planı da var.`;
  if (tm != null && weatherRows) {
    const rows = weatherRows(date) || [];
    const r = rows.find((x) => +x.hh === Math.round(tm / 60)) || rows.find((x) => +x.hh === Math.floor(tm / 60));
    if (r && r.wind != null) return ` O saatte rüzgâr ${Math.round(r.wind)} knot görünüyor.`;
  }
  return same.length ? ` O gün ${same.length} plan daha var.` : "";
}

// Yapay zekaya: kullanıcıya ne söylendiği ve telefonun ne anladığı (doğruysa tamamlasın, yanlışsa düzeltsin)
function hintOf(line, { kind = "", date = "", time = "" }) {
  const got = [kind && `tür=${kind}`, date && `tarih=${date}`, time && `saat=${time}`].filter(Boolean).join(", ");
  return `Kullanıcıya az önce şu söylendi: "${line}"${got ? `\nTelefonun ilk anladığı: ${got}` : ""}`;
}

function addDays(date, n) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
