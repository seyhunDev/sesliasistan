// Ön cevap (yapay zekasız, anında): kullanıcı susar susmaz söylenecek kısa giriş cümlesi, bildiği alanları dolu
// taslak kart ve yapay zekaya gidecek ipucu. Yapay zeka cevabı gelene kadar beklemeyi anlamlı bir cümleyle doldurur;
// yapay zeka bu cümleyi bilir ve tekrar etmeden devam eder (ipucu: hint).
//
// Kural: yalnızca emin olunan şey söylenir. Tür belli değilse genel bir giriş ("Bir bakayım.") kullanılır,
// böylece yapay zekanın cevabıyla çelişmez. Gerçek veriden yardımcı bilgi eklenir (aynı saatte plan, o saatte rüzgâr).
import { interpretRules } from "@/lib/ai/rules";
import { dayLabel } from "@/lib/agenda";
import { normalizeSpeech } from "@/lib/speech/normalize";
import { isMulti, jobsIn, jobsText, wantsNote, wantsWhatsApp } from "@/lib/steps";
import { cueOf } from "@/lib/assistTasks";

const lower = (s) => s.toLocaleLowerCase("tr-TR");
const QUESTION = /(\?|(^| )(neler|ne var|kaç|hangi|var mı|varmı|nedir|neydi|ne zaman|nerede|kim|nasıl|ne durumda|mi|mı|mu|mü)( |$)|göster|söyler misin|anlat)/;
// "eklediğim", "ayarları" ekleme isteği değildir
const CREATE = /(ekle(?!diğ|dim|din|di )|oluştur|kaydet|koy(?!ul)|planla|hatırlat|not (al|düş|et)|takvime|ayarla(?!r))/;
const SEND = /(^| )(yaz|gönder|ilet|haber ver|mesaj (at|gönder|yaz))( |$)|('|’)?(e|a|ye|ya) (yaz|söyle)( |$)/;
const TYPE_W = [
  ["note", /(^| )(not al\S*|not düş\S*|not et|not ekle\S*|^not )/],
  ["task", /(^| )(görev\S*|hatırlat\S*|yapılacak\S*)( |$)/],
  ["plan", /(^| )(plan(ı|a)?|planla\S*|etkinli\S*|takvime)( |$)/],
];
const KIND_LINE = { plan: "plan", task: "görev", note: "not" };
// Mesajın alıcısı: "Ali'ye", "Gökhan'a", "ekibe", "sporculara", "velilere", "gruba" (listeye/takvime/nota gibi yerler alıcı değil)
const NOT_TO = /^(liste|takvim|not|plan|görev|defter|envanter|günlü|ajanda|program|saat|gün|hafta|ay|yarın|bugün|sabah|akşam)/;
const TO_WORD = /(?<![\p{L}])(\p{L}+)(?:['’](?:y?[ae])|(?:[ae]|lar[ae]|ler[ae]|ye|ya))(?![\p{L}])/gu;
const GROUP_TO = /(?<![\p{L}])(ekibe|ekiptekilere|sporculara|velilere|ailelere|aileye|herkese|gruba|grubuna|çalışanlara|antrenörlere|öğrencilere)(?![\p{L}])/u;
function recipientIn(t) {
  if (GROUP_TO.test(t)) return "group";
  for (const m of t.matchAll(TO_WORD)) if (/['’]/.test(m[0]) && !NOT_TO.test(m[1])) return "person";
  return "";
}
// Var olan kayıtta işlem (yeni kayıt değil): tamamla, yeniden aç, iptal, sil, değiştir/ertele
const ACTIONS = [
  ["reopen", /(yeniden|tekrar|geri) aç\p{L}*/u],
  // Not: "notu yapıldı yap", "şu not yapıldı", "notu arşivle", "notu arşive at" (görev tamamlamadan önce bakılır)
  ["noteDone", /(?<![\p{L}\d])not(u|un|unu|lar\p{L}*)?(?![\p{L}]).*(yapıldı|bitti|tamamlandı|arşiv\p{L}*)|arşivle\p{L}*|arşive (at|kaldır|taşı)\p{L}*/u],
  ["complete", /(tamamla\p{L}*|(^| )bitti(?![\p{L}])|yapıldı olarak|tamamlandı)/u],
  ["cancel", /iptal (et|edelim|ediyoruz|oldu)/u],
  ["delete", /(^| )(sil|silelim|siler misin|sil\p{L}*|kaldır\p{L}*)( |$)/u],
  ["update", /(ertele\p{L}*|değiştir\p{L}*|güncelle\p{L}*|kaydır\p{L}*|(saatini|saati|tarihini|gününü) \S+|(\d+['’]?|\p{L}+['’])(e|a|ye|ya) (al|çek)(?![\p{L}]))/u],
];
const pcOf = (id, extra = {}) => ({ kind: id, ...cueOf(id), ...extra });

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

  const rawLow = lower(String(raw || ""));
  const jobs = jobsIn(raw);
  // Mesaj: kime ve ne yazılacağını yapay zeka çıkarır. Ham cümleye bakılır (ses düzeltmesi sondaki "yaz"ı "ekle" yapıyor).
  // "Ali'ye WhatsApp'tan yaz", "Gökhan'a mesaj atar mısın", "sporculara söyle antrenman iptal"
  const to = recipientIn(rawLow);
  const sendOnly = jobs.includes("send") && jobs.every((k) => k === "send") && (to || /mesaj|whats|vatsap/u.test(rawLow) || SEND.test(rawLow)) && !CREATE.test(rawLow);
  if (sendOnly) {
    const id = wantsWhatsApp(raw) ? "whatsapp" : to === "group" ? "group" : "send";
    return pcOf(id, { kind: "send", hint: hintOf(cueOf(id).line, { kind: id === "whatsapp" ? "WhatsApp mesajı" : "mesaj" }) });
  }
  // Soru: yalnızca genel giriş (cevabı yapay zeka verir); bugün/yarın soruluyorsa kaç kayıt olduğu söylenir
  if (QUESTION.test(t) && !CREATE.test(t)) {
    const day = /(^| )yarın/.test(t) ? "yarın" : /(^| )bugün/.test(t) ? "bugün" : "";
    let line = "Bakıyorum.";
    const wx = /hava|rüzgar|rüzgâr|yağmur|knot|sağanak/.test(t);
    if (day && !wx) {
      const d = day === "bugün" ? today : addDays(today, 1);
      const n = plans.filter((p) => p.date <= d && (p.endDate || p.date) >= d).length;
      line = n ? `Bakıyorum, ${day} ${n} plan görüyorum.` : `Bakıyorum, ${day} için takvim boş görünüyor.`;
    }
    return { kind: "query", line, work: wx ? cueOf("weather").work : cueOf("query").work, hint: hintOf(line, { kind: "soru" }) };
  }

  // Birden çok iş ("Gökhan'a mesaj at, takvime ekle ve notlara liste hazırla"): tek bir türü söyleme, sırayı söyle
  if (isMulti(raw)) {
    const list = jobsText(jobs);
    // Ne yapıldığı kısaca söylenir ("Tamam, sırayla yapıyorum: mesaj, takvim ve not."); sonucu yine uygulama söyler
    const line = `Tamam, sırayla yapıyorum: ${list}.`;
    return { kind: "multi", line, work: cueOf("multi").work, hint: hintOf(line, { kind: `birden çok iş (sırayla: ${list})` }) };
  }

  // Var olan kayıtta işlem ("motor yağı görevini tamamla", "antrenmanı 11'e al", "yarınki toplantıyı sil"): plan hazırlanmaz
  const act = !CREATE.test(rawLow) && ACTIONS.find(([, re]) => re.test(rawLow))?.[0];
  if (act) {
    const c = cueOf(act);
    return { kind: "action", line: c.line, work: c.work, hint: hintOf(c.line, { kind: `işlem (${act})` }) };
  }

  // Yeni kayıt: tür ve alanlar kurallarla
  const label = guess?.score >= 0.55 ? guess.label : "";
  // Not açıkça istendiyse ("notlara ekle …", "Not: …") tür nottur
  const byWord = (wantsNote(text) && !SEND.test(rawLow) && "note") || TYPE_W.find(([, re]) => re.test(t))?.[0] || "";
  // Not yalnız açıkça istenince söylenir ("not alıyorum"); öğrenilmiş tahmin ya da kuralın varsayılanı notu seçtirmez
  const byGuess = { "create:plan": "plan", "create:task": "task", "create:plan+note": "plan" }[label] || "";
  const hasTime = /saat \d|\d{1,2}[:.]\d{2}|\d{1,2}'?(de|da|te|ta)( |$)/.test(t);
  const wantsCreate = CREATE.test(t) || !!byWord || !!byGuess || (hasTime && !QUESTION.test(t));
  if (!wantsCreate) {
    if (t.split(/\s+/).length <= 3) return null; // "teşekkürler", "tamam sağ ol": ön cevaba gerek yok
    const line = "Bir bakayım.";
    return { kind: "other", line, work: "Bakıyorum", hint: hintOf(line, {}) };
  }
  const item = interpretRules(text, today)[0] || {};
  const type = byWord || byGuess || (item.type === "note" && !wantsNote(text) ? "" : item.type) || "";
  if (!type) {
    const c = cueOf("record");
    return { kind: "create", line: c.line, work: c.work, hint: hintOf(c.line, { kind: "yeni kayıt" }) };
  }
  const date = item.date || "";
  const time = type === "plan" ? hm(item.time) : "";
  const slots = { type, date, time, place: item.place || "" };

  // Ne yapıldığı kısaca söylenir ("Tamam, planı hazırlıyorum."; Seyhun: "tamam değil, şunu yapıyorum desin", 2026-10-06).
  // Ayrıntıyı ("Ekledim: Antrenman, yarın, 10:00") sonuçta uygulama söyler; aynı şey iki kez okunmaz.
  // Planda veriden tek yardımcı bilgi kalır (aynı saatte plan, o saatte rüzgâr).
  const cue = cueOf(type === "plan" && /(^| )(her|haftada bir) /u.test(t) ? "repeat" : type);
  const line = `${cue.line}${type === "plan" ? facts({ date, time, plans, weatherRows }) : ""}`;

  return {
    kind: KIND_LINE[type] ? type : "create",
    line,
    work: cue.work,
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
