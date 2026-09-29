import { interpretRules } from "@/lib/ai/rules";
import { addDate, weekRange } from "@/lib/ai/digest";
import { localNavigate, localReceipt } from "@/lib/assistantLocal";
import { todayStr } from "@/lib/utils/format";
import { spokenTime } from "@/lib/utils/speak";
import { normalizeSpeech } from "@/lib/speech/normalize";
import { guess } from "@/lib/brain/store";

// Hızlı komutlar: kısa ve kalıba uyan istekler yapay zekaya gitmeden burada çözülür.
// Uzun, birden fazla iş içeren veya kalıba uymayan cümlelerde null döner, yapay zekaya gider.
//
// Dönüş: { type: "receipt" } | { type: "navigate", page } | { type: "create", items, message }
//        | { type: "complete", id, title } | { type: "reply", message, show }

const lower = (s) => s.toLocaleLowerCase("tr-TR");
const norm = (s) => lower(s).replace(/[.,!?;:'’"“”]/g, " ").replace(/\s+/g, " ").trim();
const words = (t) => (t ? t.split(" ").length : 0);
const MULTI = /(^| )(ve|sonra|ayrıca|ardından|bir de|hem)( |$)/; // birden fazla iş: yapay zekaya
const QUESTION_W = /(^| )(mı|mi|mu|mü|neler|ne|kaç|hangi|nedir|nerede)( |$)/;

// ---- Yardım ----
const HELP = /^(yardım|komutlar|ne yapabilirsin|neler yapabilirsin|nasıl kullanırım|ne diyebilirim)( |$)/;
const HELP_MSG =
  "Şunları hemen yaparım: “fiş yükle” dersen kamerayı açarım. “Görevleri aç” gibi sayfa açarım. “Bugün neler var”, “bu hafta özeti”, “geciken görevler” diye sorabilirsin. “Yarın saat onda antrenman ekle”, “tekneleri hazırla görevi ekle”, “not al malzeme odası dolu” diye kayıt eklerim. “Tekneleri hazırla görevini tamamla” dersen tamamlarım. Daha karmaşık isteklerde yapay zekaya sorarım.";

// ---- Özet ----
const RANGES = [
  ["today", /(^| )(bugün\S*|günün|özet)( |$)/],
  ["tomorrow", /(^| )yarın\S*( |$)/],
  ["nextweek", /(haftaya|gelecek hafta\S*|önümüzdeki hafta\S*)/],
  ["week", /bu hafta\S*/],
  ["month", /bu ay(ın|ki|lık)?( |$)/],
];
// Özet cümlesinde bulunabilecek kelimeler; bunların dışında kelime varsa ("kaç antrenman") yapay zekaya gider
const SUM_W = new Set(
  "bugün bugünkü bugünün günün gün yarın yarınki yarının haftaya gelecek önümüzdeki bu hafta haftanın haftaki haftalık ay ayın ayki aylık ne neler var mı mi nedir neymiş program programım programı programımız özet özeti özetle özetini plan planlar planları planlarım planım görev görevler görevleri görevlerim işler işlerim yapılacaklar takvim takvimim göster söyle oku ver benim bana için bizim"
    .split(" "),
);
const DAY = (s) => new Date(`${s}T00:00`);
const wd = (s) => DAY(s).toLocaleDateString("tr-TR", { weekday: "long" });
const dm = (s) => DAY(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
const byStart = (a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`);
const cap = (s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}` : xs[0] || "");

function range(key, today) {
  if (key === "today") return [today, today, "bugün"];
  if (key === "tomorrow") return [addDate(today, 1), addDate(today, 1), "yarın"];
  if (key === "week") { const w = weekRange(today); return [w.start, w.end, "bu hafta"]; }
  if (key === "nextweek") { const w = weekRange(addDate(today, 7)); return [w.start, w.end, "gelecek hafta"]; }
  const ym = today.slice(0, 7);
  const last = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  return [`${ym}-01`, `${ym}-${last}`, "bu ay"];
}

function summary(t, { plans, tasks }, today) {
  const hit = RANGES.find(([, re]) => re.test(t));
  if (!hit || !t.split(" ").every((w) => SUM_W.has(w))) return null;
  const [a, b, label] = range(hit[0], today);
  const onlyTasks = /(görev|işler|yapılacak)/.test(t) && !/plan|program|takvim|özet/.test(t);
  const onlyPlans = /(plan|takvim)/.test(t) && !/(görev|işler|yapılacak)/.test(t);
  const multiDay = a !== b;
  const ps = onlyTasks ? [] : plans.filter((p) => p.date <= b && (p.endDate || p.date) >= a).sort(byStart);
  const ts = onlyPlans ? [] : tasks.filter((x) => !x.done && x.due && x.due >= a && x.due <= b).sort((x, y) => x.due.localeCompare(y.due));
  const late = onlyPlans ? [] : tasks.filter((x) => !x.done && x.due && x.due < today);

  const when = (p) => `${multiDay ? `${hit[0] === "month" ? dm(p.date) : wd(p.date)} ` : ""}${p.time ? spokenTime(p.time) : "tüm gün"}`;
  const parts = [];
  if (!ps.length && !ts.length) parts.push(`${cap(label)} için ${onlyTasks ? "görev" : onlyPlans ? "plan" : "kayıt"} görünmüyor.`);
  else {
    const cnt = [ps.length && `${ps.length} plan`, ts.length && `${ts.length} açık görev`].filter(Boolean);
    parts.push(`${cap(label)} ${list(cnt)} var.`);
    const say = [...ps.map((p) => `${when(p)} ${p.title}`), ...ts.map((x) => `${x.title} görevi`)];
    parts.push(`${cap(list(say.slice(0, 5)))}${say.length > 5 ? ` ve ${say.length - 5} tane daha` : ""}.`);
  }
  if (late.length) parts.push(late.length === 1 ? `Bir de geciken bir görev var: ${late[0].title}.` : `Bir de ${late.length} geciken görev var.`);
  const show = [...ps.map((p) => ({ kind: "plan", id: p.id })), ...ts.map((x) => ({ kind: "task", id: x.id })), ...late.slice(0, 10).map((x) => ({ kind: "task", id: x.id }))];
  return { type: "reply", message: parts.join(" "), show: show.slice(0, 30) };
}

// "geciken görevler", "açık görevlerim", "yapılacaklar"
const TASKLIST = /^(geciken|gecikmiş|açık|bekleyen|tamamlanmamış|yapılmamış)? ?(görevler|görevlerim|görevleri|işler|işlerim|yapılacaklar)( neler| ne| var mı| nedir)?$/;
function taskList(t, { tasks }, today) {
  const m = TASKLIST.exec(t);
  if (!m || (!m[1] && !m[3])) return null; // "görevler" tek başına sayfa açmadır
  const late = /gecik/.test(m[1] || "");
  const xs = tasks.filter((x) => !x.done && (!late || (x.due && x.due < today))).sort((x, y) => (x.due || "9").localeCompare(y.due || "9"));
  const what = late ? "geciken" : "açık";
  if (!xs.length) return { type: "reply", message: `Hiç ${what} görev yok.`, show: [] };
  const say = xs.slice(0, 5).map((x) => x.title);
  return {
    type: "reply",
    message: `${xs.length} ${what} görev var: ${list(say)}${xs.length > 5 ? ` ve ${xs.length - 5} tane daha` : ""}.`,
    show: xs.slice(0, 30).map((x) => ({ kind: "task", id: x.id })),
  };
}

// ---- Görev tamamlama ----
const DONE = /(^| )(tamamla\S*|bitir\S*|bitti|yapıldı|yaptım|hallettim|halledildi|tamamdır|işaretle)( |$)/;
const stem = (w) => w.slice(0, Math.max(3, Math.min(5, w.length - 1)));
function complete(t, { tasks }) {
  if (!DONE.test(t) || words(t) > 10 || MULTI.test(t)) return null;
  const target = t
    .replace(/(^| )(tamamla\S*|bitir\S*|bitti|yapıldı|yaptım|hallettim|halledildi|tamamdır|işaretle|olarak|görev\S*|lütfen|bu|şu)(?= |$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const ts = target.split(" ").filter((w) => w.length > 1).map(stem);
  if (!ts.length) return null;
  const hits = tasks.filter((x) => {
    if (x.done) return false;
    const tw = norm(x.title).split(" ").map(stem);
    return ts.every((s) => tw.some((w) => w.startsWith(s) || s.startsWith(w)));
  });
  return hits.length === 1 ? { type: "complete", id: hits[0].id, title: hits[0].title } : null; // yok ya da birden çok: yapay zeka sorsun
}

// ---- Yeni kayıt ----
const CREATE = /(^| )(ekle\S*|oluştur\S*|planla(?!r)\S*|kaydet\S*|hatırlat\S*|not al\S*|not düş\S*|not et)( |$)/;
const TYPE_W = [
  ["note", /(^| )(not al\S*|not düş\S*|not et|not ekle\S*|notu? ?ekle|not olarak ekle|notlara ekle)( |$)|^not /],
  ["task", /(^| )(görev\S*|hatırlat\S*|yapılacak\S*)( |$)|^görev /],
  ["plan", /(^| )(plan(ı|a)?|planla(?!r)\S*|etkinli\S*|takvime ekle)( |$)|^plan /],
];
// Tür söylendiyse başlıktan atılacak komut kelimeleri ("hatırlat" kalır, kural motoru "…mayı hatırlat" kalıbını çözer)
const STRIP = /(^|\s)(?:yeni|bir|olarak|diye|lütfen|ekle\S*|oluştur\S*|kaydet\S*|not al\S*|not düş\S*|not et|notlara|notu|not|görevlere|görevi|görev|planla(?!r)\S*|plana|planı|plan|takvime|listeye)(?=\s|$)/gi;
const KIND_W = { plan: "planı", task: "görevi", note: "notu" };

// "yükleyeceğimizi" -> "yükleme" (plan başlığı), "yükleyeceğiz" (not metni)
const FUT = /(\S+?)y?(eceğimizi|acağımızı|eceğimiz|acağımız|eceğiz|acağız|eceğini|acağını|ecek|acak)$/iu;
const back = (w) => /[aıou][^aeıioöuü]*$/iu.test(w);
function planTitle(title) {
  const ws = title.split(" ").filter((w) => !/^(tarihinde|tarihine|tarihli|günü|gününe)$/iu.test(w));
  if (ws[0]) ws[0] = ws[0].charAt(0).toLocaleUpperCase("tr-TR") + ws[0].slice(1);
  const m = FUT.exec(ws[ws.length - 1]);
  if (m) ws[ws.length - 1] = `${m[1]}${back(m[1]) ? "ma" : "me"}`;
  if (ws.length > 1 && /^(yapma|etme|olma)$/iu.test(ws[ws.length - 1])) ws.pop(); // "veli toplantısı yapma" -> "Veli toplantısı"
  return ws.join(" ");
}
const noteText = (s) => s.replace(/(\S+?)(y?)(eceğimizi|acağımızı)(?=\s|$)/giu, (x, st, y, suf) => `${st}${y}${/^e/i.test(suf) ? "eceğiz" : "acağız"}`);

export function localCreate(raw, today = todayStr()) {
  let text = normalizeSpeech(raw);
  // "yarın saat 10 antrenman var" de ekleme sayılır (saat varsa ve soru değilse)
  // "yarın saat 10'da tekne yükleyeceğiz" gibi gelecek zamanlı cümle de plan sayılır
  if (/saat \d/.test(text) && !QUESTION_W.test(norm(text))) text = text.replace(/(\s)var\s*[.!]?$/iu, "$1ekle").replace(/(\S+(?:eceğiz|acağız))\s*[.!]?$/iu, "$1 ekle");
  const t = norm(text);
  if (!CREATE.test(t) && !/^(not|görev|plan) /.test(t)) return null;
  if (words(t) > 14 || MULTI.test(t) || /[.;?]\s+\S/.test(text.trim().replace(/[.!?]+$/, ""))) return null;
  const typ = TYPE_W.find(([, re]) => re.test(t))?.[0];
  // Tür açıkça söylendiyse komut kelimelerini at ve kural motoruna o türle ver; söylenmediyse cümleyi olduğu gibi ver
  let body = text.replace(/[.!]+$/, "").replace(/^\s*(not|görev|plan)\s*[:\-]\s*/i, "");
  if (typ) for (let k = 0; k < 3; k++) body = body.replace(STRIP, "$1");
  body = body.replace(/\s+/g, " ").trim();
  if (!body.trim()) return null;

  // Tarihli/saatli not: hem takvime plan hem not ("yarın 10'da tekne yükleyeceğimizi not al")
  if (typ === "note") {
    const p = interpretRules(`plan: ${body}`, today)[0];
    if (p && (p.date || p.time)) {
      p.title = planTitle(p.title);
      if (!p.title || words(norm(p.title)) > 8) return null;
      if (!p.date) p.date = today;
      const nb = noteText(body.replace(/\ssaat (\d{2}):(\d{2})/, (x, h, m) => ` saat ${+h}${m === "00" ? "" : `.${m}`}`));
      const n = { type: "note", title: p.title, body: nb.charAt(0).toLocaleUpperCase("tr-TR") + nb.slice(1), date: "", endDate: "", time: "", place: "", link: true, cat: p.cat };
      const need = !p.time && !p.endDate ? " Saat kaçta olsun?" : " Kontrol edip kaydedebilirsin.";
      return { type: "create", items: [p, n], message: `Tamam, “${p.title}” için takvime plan ve not hazırladım.${need}` };
    }
  }

  const items = interpretRules(typ ? `${{ plan: "plan", task: "görev", note: "not" }[typ]}: ${body}` : body, today);
  if (items.length !== 1) return null;
  const d = items[0];
  if (d.type === "plan") d.title = planTitle(d.title);
  if (!d.title || words(norm(d.title)) > 8) return null;
  const need = d.type !== "plan" ? "" : !d.date ? " Hangi gün olsun?" : !d.time && !d.endDate ? " Saat kaçta olsun?" : "";
  return { type: "create", items, message: `Tamam, “${d.title}” ${KIND_W[d.type]} hazırladım.${need || " Kontrol edip kaydedebilirsin."}` };
}

// Yapay zekaya ulaşılamadığında: öğrenilmiş örneklerden en yakın niyeti tahmin et, komuta çevir.
// Güven düşükse null (uydurma yapmaz). Dönüşte brain: { label, score } bilgisi de var.
const MIN_SCORE = 0.55;
export function brainCommand(raw, today = todayStr()) {
  const text = normalizeSpeech(raw);
  const g = guess(text);
  if (!g || g.score < MIN_SCORE) return null;
  const brain = { label: g.label, score: +g.score.toFixed(2) };
  if (g.label === "receipt") return { type: "receipt", brain };
  if (g.label === "meeting") return { type: "meeting", brain };
  if (g.label.startsWith("nav:")) return { type: "navigate", page: g.label.slice(4), brain };
  const kind = { "create:plan": "plan", "create:task": "görev", "create:note": "not", "create:plan+note": "not" }[g.label];
  if (kind) {
    // Türü öğrenilmiş etikete göre zorla, alanları (tarih, saat, başlık) kural motoru çıkarsın
    const forced = localCreate(`${kind}: ${text.replace(/^\s*(not|görev|plan)\s*[:\-]\s*/i, "")}`, today);
    if (forced) return { ...forced, brain };
  }
  return null;
}

// "toplantı modunu aç", "toplantıyı kaydet", "toplantıyı dinle", "kayda başla" -> toplantı modu
// ("yarın toplantı kaydet/ekle" plan eklemedir, buraya girmez)
const MEETING = /(toplantı|görüşme) ?(modu|modunu|moduna|kaydı|kaydını|kaydına)|(toplantıyı|görüşmeyi) (kaydet|dinle|kayda al|başlat)|(^| )kayda (başla|al)|ses kaydı (başlat|al)/;
export const isMeeting = (t) => MEETING.test(norm(t)) && !/(yarın|bugün|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|saat \d)/.test(norm(t));

// Asistan için tüm hızlı komutlar (sıra önemli)
export function localCommand(raw, data, today = todayStr()) {
  const text = normalizeSpeech(raw);
  const t = norm(text);
  if (!t) return null;
  if (HELP.test(t)) return { type: "reply", message: HELP_MSG, show: [] };
  if (localReceipt(text)) return { type: "receipt" };
  if (isMeeting(text)) return { type: "meeting" };
  const done = complete(t, data);
  if (done) return done;
  const created = localCreate(text, today);
  if (created) return created;
  const tl = taskList(t, data, today);
  if (tl) return tl;
  const sum = summary(t, data, today);
  if (sum) return sum;
  const page = localNavigate(text);
  if (page) return { type: "navigate", page };
  return null;
}
