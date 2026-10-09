import { addDate, weekRange } from "@/lib/ai/digest";
import { short, todayStr } from "@/lib/utils/format";

export { PAGES } from "./nav";
export const KIND = { plan: "Plan", task: "Görev", note: "Not" };
const lower = (s) => s.toLocaleLowerCase("tr-TR");

const QUESTION = /(neler|ne var|kaç|hangi|var mı|nedir|ne zaman|nerede|kim)/;

// "fiş aç", "fiş yükle", "faturayı çek", "yeni fiş" gibi istekler yapay zekaya gitmeden fiş kamerasını açar.
// "fişleri aç/göster" (çoğul) sayfaya gider, soru cümleleri yapay zekaya kalır.
const RECEIPT_ADD = /(^|\s)(yükle|ekle|çek|tara|okut|gir|kaydet|oluştur|gönder)/;
const RECEIPT_OPEN = /(^|\s)(aç|açsana|açar|açalım|açın|yeni)(?=$|\s)/;
export function localReceipt(text) {
  const t = lower(text).replace(/[.,!?'’]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.split(" ").length > 7 || QUESTION.test(t)) return false;
  if (/(^|\s)kamera/.test(t) && /(aç|başlat)/.test(t)) return true;
  const m = t.match(/(^|\s)(fiş|fatura)(\S*)/);
  if (!m) return false;
  if (RECEIPT_ADD.test(t)) return true;
  return !/^(ler|lar)/.test(m[3]) && RECEIPT_OPEN.test(t);
}

// Evet/hayırdan sonra değişiklik isteniyorsa ("evet ama saati 11 yap", "hayır yarın değil cuma") onay ya da ret değildir
const EDIT_TAIL = (s) => {
  const t = lower(String(s || "")).trim();
  return t.split(/\s+/).length >= 3 && /(^|\s)(ama|fakat|ancak|değil)(\s|$)|\s(da|de)\s/.test(t);
};
export const isYes = (s) => !EDIT_TAIL(s) && /^(he|hı hı|evt|evet|tamam|olur|onayla|onayladım|onaylıyorum|onay veriyorum|sil|yap|aynen|kesinlikle|tabii|tabi)(?=$|[\s.,!?])/.test(lower(s).trim());
export const isNo = (s) => !EDIT_TAIL(s) && /^(hayır|hayir|vazgeç|iptal|yapma|olmasın|istemiyorum|dur)(?=$|[\s.,!?])/.test(lower(s).trim());

// Yapay zekanın önerdiği değişikliği kayda uygulanacak alanlara çevirir (takvim uyumlu alanlar dahil)
export function buildPatch(kind, p = {}, rec = {}) {
  const o = {};
  if (p.title) o.title = p.title.trim();
  if (kind === "plan") {
    if (p.date) o.date = p.date;
    if (p.endDate) o.endDate = p.endDate;
    if (p.place) o.place = p.place.trim();
    if (p.time) Object.assign(o, { time: p.time, allDay: false, durationMin: rec.durationMin || 60, timeSource: "user" });
    else if (p.allDay === true) Object.assign(o, { time: "", allDay: true, durationMin: null, timeSource: "none" });
  } else if (kind === "task") {
    if (p.date) o.due = p.date;
  } else if (p.body) o.body = p.body.trim();
  return o;
}

export function describeAction(a, rec) {
  const name = rec?.title || "kayıt";
  if (a.op === "delete") return `Sil: ${name} (${KIND[a.kind]})`;
  const p = a.patch || {};
  const parts = [];
  if (p.title) parts.push(`başlık “${p.title}”`);
  if (p.date) parts.push(`gün ${short(p.date)}`);
  if (p.endDate) parts.push(`bitiş ${short(p.endDate)}`);
  if (p.time) parts.push(`saat ${p.time}`);
  else if (p.allDay) parts.push("tüm gün");
  if (p.place) parts.push(`yer ${p.place}`);
  if (p.body) parts.push("not metni");
  if (Array.isArray(p.assignTo)) parts.push(p.assignTo.length ? `sorumlu ${p.assignTo.join(", ")}` : "sorumlu yok");
  return `Güncelle: ${name} → ${parts.join(", ") || "değişiklik"}`;
}

// Yapay zeka çalışmazsa basit tarih sorularını yerel veriden cevaplar
export function localQuery(text, { plans, tasks }, today = todayStr()) {
  const t = lower(text);
  let a, b, label;
  if (/bugün/.test(t)) [a, b, label] = [today, today, "bugün"];
  else if (/yarın/.test(t)) [a, b, label] = [addDate(today, 1), addDate(today, 1), "yarın"];
  else if (/(haftaya|gelecek hafta|önümüzdeki hafta)/.test(t)) {
    const w = weekRange(addDate(today, 7));
    [a, b, label] = [w.start, w.end, "gelecek hafta"];
  } else if (/bu hafta/.test(t)) {
    const w = weekRange(today);
    [a, b, label] = [w.start, w.end, "bu hafta"];
  } else if (/bu ay/.test(t)) [a, b, label] = [`${today.slice(0, 7)}-01`, `${today.slice(0, 7)}-31`, "bu ay"];
  else return null;
  const ps = plans.filter((p) => p.date <= b && (p.endDate || p.date) >= a).sort((x, y) => `${x.date}${x.time || ""}`.localeCompare(`${y.date}${y.time || ""}`));
  const ts = tasks.filter((x) => !x.done && x.due && x.due >= a && x.due <= b);
  const message = ps.length || ts.length ? `${label} için ${ps.length} plan ve ${ts.length} açık görev var. Yapay zekaya ulaşamadığım için basit bir liste gösteriyorum.` : `${label} için kayıt görünmüyor.`;
  return { message, show: [...ps.map((p) => ({ kind: "plan", id: p.id })), ...ts.map((x) => ({ kind: "task", id: x.id }))] };
}

// Yapay zeka yanıt vermezse: cümle yeni kayıt isteğine benziyor mu? (soru değilse)
const CREATE_W = /(ekle|oluştur|kaydet|koy(?!ul)|planla|hatırlat|not (al|düş|et)|yaz(?!ıl))/;
const ASK_W = /(\?|neler|ne var|kaç|hangi|var mı|göster|nedir|ne zaman)/;
export function looksLikeCreate(text) {
  const t = text.toLocaleLowerCase("tr-TR");
  return CREATE_W.test(t) && !ASK_W.test(t);
}

// Konuşmayı bitirme sözü ("kapat", "teşekkürler", "asistanı kapat", "tamamdır sağ ol", "görüşürüz"…): asistan kapanır.
// Kısa cümlelerde (en çok 5 kelime) aranır; bir şeyi kapatma isteği ("görevi kapat", "bildirimleri kapat") sayılmaz.
const END_START = /^(?:tamam(?:dır)?\s+|peki\s+|çok\s+)?(bitir|bitti|kapat|yeter|teşekkürler|teşekkür ederim|sağ ?ol(?:un)?|eyvallah|görüşürüz|şimdilik bu kadar|bu kadar|çıkış|iyi (?:günler|akşamlar|geceler))(?=$|[\s.,!?])/;
const END_ANY = /(^| )(asistan(ı)? kapat|kapatabilirsin|kapat(ır)? mısın|teşekkürler|teşekkür ederim|sağ ?ol(un)?|eyvallah|görüşürüz|iyi (günler|akşamlar|geceler)|konuşmayı (bitir|kapat)|bu kadar yeter)( |$)/;
const END_NOT = /(görev|plan|not|bildirim|sohbet|mesaj|alarm|hatırlat|ışık|kapı|sayfa)\S*\s+kapat/;
export function isEnd(text) {
  const t = lower(String(text || "")).replace(/[.,!?…]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.split(" ").length > 5 || END_NOT.test(t)) return false;
  // Birine söylenecek söz kapatma değildir: "Ali'ye söyle teşekkürler", "Ali'ye teşekkürler de"
  if (/\p{L}['’](y?[ae])(?![\p{L}])/u.test(t) || /(^| )(söyle\S*|yaz|ilet|de)$/.test(t)) return false;
  return END_START.test(t) || END_ANY.test(t);
}

// Dinlerken canlı yazıda duyulan söz yalnız kapatma isteğiyse ("kapat", "tamam kapat", "asistanı kapat", "kapatabilirsin"):
// konuşma bitişini beklemeden dinleme durur, asistan sessizce kapanır. Bütün söz bu olmalı (devamı gelebilecek cümle sayılmaz).
const CLOSE_NOW = /^(?:tamam(?:dır)?\s+|peki\s+)?(?:asistan(?:ı)?\s+)?(?:kapat(?:abilirsin)?|kapan)(?:\s+(?:tamam|lütfen|artık))?$/;
export function isCloseNow(text) {
  const t = lower(String(text || "")).replace(/[.,!?…]+/g, " ").replace(/\s+/g, " ").trim();
  return CLOSE_NOW.test(t);
}

// "Başka bir isteğin var mı?" sorusuna olumsuz kısa cevap ("yok", "hayır", "başka yok", "gerek yok", "yok sağ ol"): asistan kapanır.
// Yalnız bu soru sorulduysa bakılır; kısa cümle (en çok 4 kelime), içinde iş isteyen söz yoksa.
const NO_MORE = /^(?:yok|hayır|başka (?:bir şey |bir isteğim )?yok|gerek yok|istemiyorum|olmaz|şimdilik yok|yok yok)(?=$|[\s.,!?])/;
const NO_MORE_NOT = /(ekle|yaz|gönder|sil|kaydet|aç|planla|hatırlat|ama|fakat|olsun|yap|değil|\d|saat|yarın|bugün|pazartesi|salı|çarşamba|perşembe|cuma|pazar)/;
export function isNoMore(text) {
  const t = lower(String(text || "")).replace(/[.,!?…]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.split(" ").length > 4 || NO_MORE_NOT.test(t)) return false;
  return NO_MORE.test(t) || isEnd(t);
}

// "Son kaydı geri al", "az önce eklediğim görevi sil", "geri al": en son eklenen kaydı (onayla) silme isteği.
// Dönüş: { kind: "plan" | "task" | "note" | "" } (boş: tür fark etmez) ya da null
const UNDO_WHEN = "(?:son|sonuncu|en son|az önce\\S*|demin\\S*|biraz önce\\S*|şimdi)";
const UNDO_WHAT = "(?:(?:eklediğim|kaydettiğim|eklenen|oluşturduğum|yazdığım)\\s+)?(kayd\\S*|plan\\S*|görev\\S*|not\\S*|şey\\S*|ekle\\S*)";
const UNDO_DO = "(?:geri al\\S*|sil\\S*|iptal et\\S*|kaldır\\S*)";
const UNDO = new RegExp(`^(?:${UNDO_WHEN}\\s+${UNDO_WHAT}\\s+${UNDO_DO}|${UNDO_WHAT}\\s+geri al\\S*|geri al|son\\S* işlemi geri al\\S*)$`);
export function undoLast(text) {
  const t = lower(String(text || "")).replace(/[.,!?]+/g, " ").replace(/\s+/g, " ").trim();
  const m = UNDO.exec(t);
  if (!m) return null;
  const w = m[1] || m[2] || "";
  return { kind: /^plan/.test(w) ? "plan" : /^görev/.test(w) ? "task" : /^not/.test(w) ? "note" : "" };
}

// Kişinin en son eklediği kayıt (plan, görev, not): { kind, rec } ya da null
export function lastCreated({ plans = [], tasks = [], notes = [] }, uid, kind = "") {
  const all = [
    ...plans.map((rec) => ({ kind: "plan", rec })),
    ...tasks.map((rec) => ({ kind: "task", rec })),
    ...notes.map((rec) => ({ kind: "note", rec })),
  ].filter((x) => (!kind || x.kind === kind) && x.rec.createdByUid === uid && x.rec.createdAt);
  return all.sort((a, b) => String(b.rec.createdAt).localeCompare(String(a.rec.createdAt)))[0] || null;
}
