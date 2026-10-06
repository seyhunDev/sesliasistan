import { looksLikeLog } from "@/lib/trainingLog";

// Tek cümlede sıralı birden çok iş: "Gökhan'a mesaj at, aynı konuyu takvime ekle ve notlara malzeme listesi hazırla".
// Yapay zekasız, yalnızca sözcüklere bakar: hangi işler var ve hangi sırayla söylendi. Asistan sırayı buna göre kurar,
// ön cevap tek bir "plan hazırlıyorum" demez; yapay zekaya sırayı ipucu olarak verir.

const lower = (s) => s.toLocaleLowerCase("tr-TR");
// Kelime sınırı (Türkçe harfler dahil)
const W = "(?<![\\p{L}\\p{N}])";
const JOBS = [
  ["send", new RegExp(`${W}(mesaj\\p{L}*|yaz(?:sana|ar mısın|)(?![\\p{L}])|söyle\\p{L}*|haber ver\\p{L}*|ilet\\p{L}*|gönder(?!il)\\p{L}*)`, "u")],
  ["plan", new RegExp(`${W}(takvim\\p{L}*|plan(?:a|ı|la\\p{L}*)?(?![\\p{L}])|ajanda\\p{L}*)`, "u")],
  ["task", new RegExp(`${W}(görev\\p{L}*|hatırlat\\p{L}*|yapılacak\\p{L}*)`, "u")],
  ["note", new RegExp(`${W}(not(?:lar\\p{L}*|a|u|un|lara)?(?![\\p{L}])|not al\\p{L}*|not düş\\p{L}*)`, "u")],
];
// İşleri bağlayan sözler: "ve", "sonra", "ardından", virgül, "de/da"
const LINK = /(,|;|(^| )(ve|sonra|ardından|ayrıca|bir de|da|de|ondan sonra)( |$))/u;

// Cümledeki işler, söylendiği sırayla: ["send", "plan", "note"]. Her tür bir kez.
export function jobsIn(raw) {
  // Ses düzeltmesi (normalizeSpeech) uygulanmaz: sondaki "yaz"ı "ekle"ye çevirebiliyor
  const t = lower(String(raw || ""));
  const found = [];
  for (const [kind, re] of JOBS) {
    const m = re.exec(t);
    if (m) found.push([m.index, kind]);
  }
  return found.sort((a, b) => a[0] - b[0]).map(([, k]) => k);
}

// Birden çok iş isteniyor mu: en az bir mesaj ve bir kayıt (ya da iki farklı kayıt türü) ve aralarında bağlaç
export function isMulti(raw) {
  const jobs = jobsIn(raw);
  if (jobs.length < 2) return false;
  return LINK.test(lower(String(raw || "")));
}

// Mesaj, kayıtlardan önce mi söylendi ("Ali'ye yaz …, takvime de ekle")
export function sendFirst(raw) {
  const jobs = jobsIn(raw);
  const i = jobs.indexOf("send");
  return i === 0 || (i > 0 && jobs.slice(0, i).every((k) => k === "send"));
}

const LABEL = { send: "mesaj", plan: "takvim", task: "görev", note: "not" };
// "mesaj, takvim ve not" (sesli okunur)
export function jobsText(kinds) {
  const l = [...new Set(kinds)].map((k) => LABEL[k]).filter(Boolean);
  return l.length > 1 ? `${l.slice(0, -1).join(", ")} ve ${l.at(-1)}` : l[0] || "";
}

// Mesaj isteğinde kayıt da isteniyor mu (takvim, plan, görev, not ya da "ekle/oluştur/kaydet"). İstenmiyorsa mesajdaki
// gün ve saat kayıt değildir ("Perşembe 9.30'da antrenman var, sporculara gönder" plan açmaz).
const RECORD_VERB = new RegExp(`${W}(ekle\\p{L}*|oluştur\\p{L}*|kaydet\\p{L}*|kur(?:alım|ar mısın)?(?![\\p{L}]))`, "u");
export const wantsRecord = (raw) => jobsIn(raw).some((k) => k !== "send") || RECORD_VERB.test(lower(String(raw || "")));

// WhatsApp da isteniyor mu ("sporculara ve WhatsApp grubuna gönder"); ses tanıma "vatsap", "whats app" yazabilir
export const wantsWhatsApp = (raw) => /(whats\s?app|w?vats\s?app?|wats\s?app?|vatsap)/i.test(String(raw || ""));
const WA_WORD = "(?:whats\\s?app|w?vats\\s?app?|wats\\s?app?|vatsap)";
// Yalnız WhatsApp mı ("WhatsApp grubuna gönder"), yoksa uygulamadaki gruba da mı ("sporculara ve WhatsApp grubuna da", "hem uygulamaya hem WhatsApp'a")
export function waMode(raw) {
  const s = String(raw || "").toLocaleLowerCase("tr-TR");
  if (!wantsWhatsApp(s)) return "";
  const also =
    /\b(hem|uygulama\S*|mesajlar\S*|sohbet\S*)\b/.test(s) ||
    new RegExp(`\\b(ve|da|de|ayrıca)\\s+${WA_WORD}`).test(s) ||
    new RegExp(`${WA_WORD}\\S*(\\s+\\S+)?\\s+(da|de|dahil)\\b`).test(s);
  return also ? "also" : "only";
}

// Görev listesi: yapay zekanın yanıtındaki işler, onay gerekip gerekmediğine göre.
// now: hemen yapılan işlemler (görev tamamlama/yeniden açma, güncelleme); items: yeni kayıtlar (bilgisi tamamsa hemen kaydedilir);
// confirm: onay isteyen adımlar sırayla (önce silmeler tek kartta, sonra her mesaj ayrı kartta); open: düzenleme/iptal ekranı.
const NOW_OPS = ["complete_task", "reopen_task", "done_note", "reopen_note", "update"];
export function taskList(r = {}) {
  const acts = Array.isArray(r.actions) ? r.actions : [];
  const sends = r.sends?.length ? r.sends : r.send?.text ? [r.send] : [];
  const items = ["create", "message", "action"].includes(r.intent) && Array.isArray(r.items) ? r.items : [];
  const deletes = acts.filter((a) => a.op === "delete");
  return {
    now: acts.filter((a) => NOW_OPS.includes(a.op)),
    items,
    confirm: [...(deletes.length ? [{ actions: deletes }] : []), ...sends.filter((x) => x?.text).map((send) => ({ send }))],
    open: acts.find((a) => a.op === "open" || (a.op === "cancel" && a.kind === "plan")) || null,
  };
}

// Not yalnız açıkça istenince: "not al", "not düş", "nota ekle", "notlara yaz", "not olarak kaydet", "not: …".
// Plan, görev, mesaj, yoklama ya da antrenman günlüğü isteğinin yanına kendiliğinden ayrıca not eklenmez (Seyhun'un kuralı).
// "12 not poyraz" (ses tanımanın "knot" yazışı) not isteği sayılmaz.
const NOTE_ASK = new RegExp(`${W}(?<!\\d\\s?)(not(?:lar\\p{L}*|la\\p{L}*|u\\p{L}*|a|ta|tan)?)(?![\\p{L}])`, "u");
export const wantsNote = (raw) => NOTE_ASK.test(lower(String(raw || "")));
// Ana iş yoklama ya da antrenman günlüğü ise not hiç oluşmaz (açıkça istenmedikçe)
const MAIN_JOB = /(yoklama|günlü(k|ğ))/u;

// Asistanın hazırladığı kayıtlar: not istenmediyse başka bir kaydın yanındaki notlar atılır (tek başına not, ana iş
// olduğu için kalır; yoklama/günlük cümlesinden çıkan not da atılır). keep: önceden taslakta olan notlar (dokunulmaz).
export function keepNotes(items, raw, keep = 0) {
  const list = Array.isArray(items) ? items : [];
  if (wantsNote(raw)) return list;
  const others = list.some((d) => d?.type !== "note");
  if (!others && !MAIN_JOB.test(lower(String(raw || ""))) && !looksLikeLog(raw)) return list;
  let left = keep;
  return list.filter((d) => d?.type !== "note" || left-- > 0);
}

// Bilgisi tamam kayıt sormadan eklenir; "Ekledim: …" cümlesinin önüne yapay zekanın yalnız ek bilgisi gelir (çakışma, rüzgâr, sorumlu).
// Soru cümleleri ("onaylıyor musun?", "kaydedeyim mi?") ve işi anlatan cümleler ("planı oluşturuyorum", "ekledim") atılır:
// kayıt zaten yapıldı, hem sorup hem eklemek çelişir.
const DOING = /(ekle|kaydet|oluştur|hazırla|planla|ayarla|onay|kaydedebilirsin|kontrol edip)/i;
export function extraNote(m) {
  const parts = String(m || "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*/g) || [];
  const keep = parts.map((x) => x.trim()).filter((x) => x && !/\?\s*$/.test(x) && !DOING.test(x) && !/^(tamam|tamamdır|peki|olur)[.!]?$/i.test(x));
  return keep.length ? `${keep.join(" ")} ` : "";
}
