// Mesajdaki dosyadan plan (Seyhun 2026-11-12: "mesajlaşmada gönderilen dosya plan, program gibi bir şeyse planlara
// ekleyebilmeliyiz; eklememi ister misin diye sorsun, ben hallediyorum dediğimde de doğrudan eklesin").
// Saf işlevler: hangi dosya okunur, yapay zekanın cevabı nasıl temizlenir, plan taslağı, sesli/yazılı komut.
// Okuma /api/chat-plan, ekran src/features/chat/chatPlan.js (ChatPlanHint).
import { CATEGORIES } from "@/lib/ai/schema";

export const PLAN_MAX_BYTES = 12 * 1024 * 1024; // sunucu dosyayı Storage'dan alır; Gemini'ye base64 gider (~16 MB)
export const PLAN_DAYS = 14; // sohbette bundan eski dosyalar kendiliğinden okunmaz (mesaj menüsünden okunur)
export const PLAN_MAX_ITEMS = 20;

// Okunabilen ek: PDF ya da fotoğraf (sesli mesaj, Word, Excel okunmaz)
export function planFile(f) {
  if (!f || !f.url || f.kind === "voice") return false;
  if ((Number(f.size) || 0) > PLAN_MAX_BYTES) return false;
  const t = String(f.type || "").toLowerCase();
  return f.kind === "photo" || t === "application/pdf" || t.startsWith("image/") || /\.pdf$/i.test(f.name || "");
}

const D = /^\d{4}-\d{2}-\d{2}$/;
const T = /^([01]\d|2[0-3]):[0-5]\d$/;
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Yapay zekanın cevabı → { kind, items: [{ title, date, endDate, time, place, cat }] }. Geçmiş günler atlanır,
// aynı ad + gün bir kez, en çok 20, tarihe göre sıralı.
export function cleanPlanItems(raw, today) {
  const seen = new Set();
  const items = [];
  for (const x of Array.isArray(raw?.items) ? raw.items : []) {
    const title = S(x?.title, 100);
    const date = D.test(x?.date || "") ? x.date : "";
    if (!title || !date) continue;
    let endDate = D.test(x?.endDate || "") && x.endDate > date ? x.endDate : "";
    if ((endDate || date) < today) continue;
    const time = T.test(x?.time || "") && !endDate ? x.time : "";
    const key = `${title.toLocaleLowerCase("tr-TR")}|${date}|${time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ title, date, endDate, time, place: S(x?.place, 80), cat: CATEGORIES.includes(x?.category) ? x.category : "Genel" });
  }
  items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return { kind: S(raw?.kind, 40), items: items.slice(0, PLAN_MAX_ITEMS) };
}

// saveDrafts'a giden plan taslakları; fromMsg: hangi mesajdan eklendiği (başka cihazda "Planlara eklendi" görünsün)
export const planDrafts = (items, fromMsg = "") =>
  (items || []).map((x) => ({ type: "plan", title: x.title, date: x.date, endDate: x.endDate || "", time: x.time || "", place: x.place || "", cat: x.cat || "Genel", assignees: [], ...(fromMsg ? { fromMsg } : {}) }));

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const ADD = /(?<![\p{L}])(plan(?:a|lara|larıma|ıma|ımıza|larımıza)?|takvim(?:e|ime)?)\s+(ekle\p{L}*|ekler\s+mi\p{L}*|yaz\p{L}*|kaydet\p{L}*|işle\p{L}*|at\p{L}*)/u;

// Sohbette yazılan kısa komut: "plana ekle", "bunu planlara ekle", "takvime ekle", "planlara ekler misin". Uzun cümle mesajdır.
const CMD = /^((bunu|bunları|şunu|dosyayı|belgeyi|programı)\s+)?(plana|planlara|planlarıma|takvime|takvimime)\s+(ekle|ekler misin|ekleyelim|ekleyebilir misin|ekle lütfen|yaz|kaydet)$/u;
export const chatPlanCommand = (text) => CMD.test(low(text).replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim());

const FILE_WORD = /(?<![\p{L}])(dosya\p{L}*|belge\p{L}*|pdf\p{L}*|fotoğraf\p{L}*|resm\p{L}*|resim\p{L}*|ek\b|eki|ekteki|mesajdaki|mesajda\p{L}*|attığı\p{L}*|attığın\p{L}*|gelen|gönderdiği\p{L}*|yolladığı\p{L}*|paylaştığı\p{L}*)/u;
const WHO = /([\p{L}]+)[’'](?:n[ıiuü]n|[ıiuü]n|d[ae]n|t[ae]n)\s+(?:att|gönder|gel|yolla|paylaş|mesaj|dosya|belge|program|talimat|pdf|fotoğraf)/u;

// Ana asistan: "Ali'nin attığı programı planlara ekle", "son dosyayı plana ekle", "mesajdaki belgeyi takvime ekle".
// Dönen: { who: "Ali" | "" } ya da null
export function chatPlanAsk(text) {
  const t = low(text);
  if (!t || t.split(/\s+/).length > 14) return null;
  if (!ADD.test(t) || !FILE_WORD.test(t)) return null;
  const m = String(text).match(WHO);
  const who = m ? m[1] : "";
  return { who: who && !/^(son|bu|şu|o)$/iu.test(who) ? who.charAt(0).toLocaleUpperCase("tr-TR") + who.slice(1) : "" };
}

// Kısa sesli/yazılı cevap: "3 plan: 15 Kas Optimist antrenman, 16 Kas …"
const dm = (s) => new Date(`${s}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
export function planSummary(items, n = 3) {
  const list = (items || []).slice(0, n).map((x) => `${dm(x.date)}${x.endDate ? `–${dm(x.endDate)}` : ""} ${x.title}`);
  const more = (items || []).length - list.length;
  return `${list.join(", ")}${more > 0 ? ` ve ${more} plan daha` : ""}`;
}
