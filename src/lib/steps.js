// Tek cümlede sıralı birden çok iş: "Gökhan'a mesaj at, aynı konuyu takvime ekle ve notlara malzeme listesi hazırla".
// Yapay zekasız, yalnızca sözcüklere bakar: hangi işler var ve hangi sırayla söylendi. Asistan sırayı buna göre kurar,
// ön cevap da "sırayla yapıyorum" der (tek bir "plan hazırlıyorum" demez).

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

// Yapay zekanın kayıtları (plan/görev/not) ve mesajı: söylenen sırayla adımlar
// Kayıtlar tek adımda birlikte kaydedilir; mesaj onay istediği için ayrı adımdır.
export function orderSteps(raw, { send = null, items = [] } = {}) {
  const steps = [];
  const rec = items.length ? { items } : null;
  const msg = send?.text ? { send } : null;
  if (msg && rec) return sendFirst(raw) ? [msg, rec] : [rec, msg];
  if (msg) steps.push(msg);
  if (rec) steps.push(rec);
  return steps;
}
