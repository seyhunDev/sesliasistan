// Yarış sitesinden gelen belgeyi sunucuda kullanma (Seyhun 2026-11-03 "artık manuel yok, aldıklarımızı datamıza yükleyip kullanacağız"):
// uygulama açılmadan, belge gelir gelmez (netlify/functions/race-site-background.mjs).
//   renk listesi / final grupları → o günün grupları + kayıt listesi (orgs/{org}/raceLive/{yarış}/entries/list)
//   sporcu listesi               → kayıt listesi
//   yarış talimatı (ilan değil)   → yarışın programı ve sınıfları (yapay zeka, lib/ai/raceNoticeAi.js)
//   ek talimat / program          → programdaki değişiklikler (yapay zeka)
//   talimat / ek talimat / program → Yayın programı da (raceLive plan: daily, times, off, agenda; Seyhun 2026-11-04 "Yayın'a elle
//                                    yüklemeye gerek kalmasın"; lib/ai/raceProgramAi.js, Yayın › Program'daki okuyucu)
// Her biri öncesini (undo) saklar; yarış sayfasındaki "Geri al" (raceSite.js undoDoc) döndürür.
// PDF tablosu okunamazsa (taranmış PDF) null: telefon yarış sayfası açılınca yapay zekayla dener. Sonuçlar telefonda işlenir
// (sporcularımız ayrı projede).
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { tableOf } from "../pdfLines.js";
import { cleanEntries, mergeEntries } from "../roundSay.js";
import { cleanGroups, dayGroups } from "../roundScore.js";
import { cleanSchedule, dayOf, focusText, listGroups, mergeSchedule, scheduleDiff, sitePlan } from "../siteDocs.js";

// pdf.js Node'da DOMMatrix ister (yoksa @napi-rs/canvas'tan alır; Netlify işlevinde o yerel paket olmayabilir).
// Yalnız yazı okunur, çizim yok: yalın bir matris yeter.
class Matrix {
  constructor(m = [1, 0, 0, 1, 0, 0]) {
    [this.a, this.b, this.c, this.d, this.e, this.f] = Array.isArray(m) && m.length >= 6 ? m : [1, 0, 0, 1, 0, 0];
  }
  multiplySelf(o) {
    const { a, b, c, d, e, f } = this;
    this.a = a * o.a + c * o.b;
    this.b = b * o.a + d * o.b;
    this.c = a * o.c + c * o.d;
    this.d = b * o.c + d * o.d;
    this.e = a * o.e + c * o.f + e;
    this.f = b * o.e + d * o.f + f;
    return this;
  }
  preMultiplySelf(o) {
    const m = new Matrix([o.a, o.b, o.c, o.d, o.e, o.f]).multiplySelf(this);
    Object.assign(this, { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f });
    return this;
  }
  translate(x = 0, y = 0) {
    return new Matrix([this.a, this.b, this.c, this.d, this.e, this.f]).multiplySelf(new Matrix([1, 0, 0, 1, x, y]));
  }
  scale(x = 1, y = x) {
    return new Matrix([this.a, this.b, this.c, this.d, this.e, this.f]).multiplySelf(new Matrix([x, 0, 0, y, 0, 0]));
  }
  invertSelf() {
    const { a, b, c, d, e, f } = this;
    const det = a * d - b * c || 1;
    Object.assign(this, { a: d / det, b: -b / det, c: -c / det, d: a / det, e: (c * f - d * e) / det, f: (b * e - a * f) / det });
    return this;
  }
}

// PDF → sayfa sayfa yazı parçaları (pdf.js, Node). İşçi aynı süreçte çalışır.
export async function pdfPages(buf, max = 40) {
  if (!globalThis.DOMMatrix) globalThis.DOMMatrix = Matrix;
  if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
  const pages = [];
  try {
    for (let p = 1; p <= Math.min(doc.numPages, max); p++) pages.push((await (await doc.getPage(p)).getTextContent()).items);
  } finally {
    doc.destroy();
  }
  return pages;
}

const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const short = (day) => `${+day.slice(8)} ${MON[+day.slice(5, 7) - 1]}`;
const noGrp = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "grp")));

// Liste belgesi: dönüş kaydın yeni alanları { state: "used", note, undo } ya da tablo okunamazsa null
export async function takeList({ db, orgId, raceId, d, buf }) {
  const rows = cleanEntries(tableOf(await pdfPages(buf)));
  if (rows.length < 3) return null;
  const ref = db.collection("orgs").doc(orgId).collection("raceLive").doc(raceId).collection("entries").doc("list");
  const snap = await ref.get();
  const cur = snap.exists ? snap.data() : {};
  const old = cleanEntries(cur.rows);
  const groups = cleanGroups(cur.groups);
  const undo = { rows: noGrp(old) };
  let note = "";
  // Sporcu listesinde grup sütunu ya da grup başlıkları varsa (Optimist'te ilk günün grupları sporcu listesinde) o da grup listesi
  const start = d.kind === "entries" || !dayOf(d.name, d.at) ? (await db.collection("orgs").doc(orgId).collection("races").doc(raceId).get()).data()?.startDate || "" : "";
  const lg = listGroups(rows, d, start);
  if (lg) {
    const { day, list } = lg;
    const prev = groups[day] || null;
    undo.day = day;
    undo.groups = prev ? Object.fromEntries(prev) : null;
    const next = Object.fromEntries(cleanGroups({ [day]: dayGroups(prev, list) })[day] || []);
    await ref.set({ groups: { [day]: next } }, { mergeFields: [new FieldPath("groups", day)] });
    note = `${list.length} teknenin grubu · ${short(day)}`;
  }
  const next = mergeEntries(old, rows);
  await ref.set({ rows: noGrp(cleanEntries(next)), at: new Date().toISOString() }, { merge: true });
  const n = next.length - old.length;
  return { state: "used", note: note || `${rows.length} tekne${n > 0 ? `, ${n} yeni` : ""}`, undo };
}

// ---- Talimat ve ek talimat (yapay zeka) ----
const s = { type: "string" };
export const AMEND_SYSTEM = `Sen bir yelken kulübünün antrenörüne yardım eden asistansın. Sana bir yelken yarışının ek talimatı (değişiklik, amendment) ya da programı verilir.
Belgede yarışın programında, saatlerinde, günlerinde, parkurunda, kurallarında ne değiştiyse çıkar. Yalnızca belgede yazanı yaz, uydurma.
- summary: değişikliğin 1-2 kısa Türkçe cümlesi ("İlk start 11:00'den 12:00'ye alındı. 5 Kasım'da 3 yarış yapılacak.").
- schedule: belgede geçen program satırlarının YENİ hali; her satır { date YYYY-MM-DD, time HH:MM ya da boş, title kısa Türkçe ("İlk start", "Antrenör toplantısı", "Kaptanlar toplantısı", "Ödül töreni", "Son start saati") }. Toplantıları (antrenör, koç, kaptanlar, yarışçı) atlama. O gün planlanan yarış sayısı yazıyorsa ayrı satır { date, time boş, title "3 yarış planlandı" }. Programla ilgisi yoksa boş dizi.`;
export const AMEND_SCHEMA = {
  type: "object",
  properties: { summary: s, schedule: { type: "array", items: { type: "object", properties: { date: s, time: s, title: s }, required: ["date", "title"] } } },
  required: ["summary", "schedule"],
};
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const pdfImage = (buf) => [{ mimeType: "application/pdf", data: Buffer.from(buf).toString("base64") }];

// Talimat / ek talimat / program: yarışın notice alanı güncellenir. ai: { callGemini, readNoticeAi }
// ilan: yarış ilanı (Seyhun 2026-11-07 "yarış talimatında program var, onu kullanalım"): program yalnız yarışta ve Yayın'da
// program yoksa yazılır (sonradan gelen ek talimatların değişikliği ezilmez)
export async function takeNotice({ db, orgId, raceId, d, buf, ai, cls = "", ilan = false }) {
  const focus = focusText(cls);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return null;
  if (buf.length > 15 * 1024 * 1024) return { state: "kept", note: "Belge çok büyük" };
  const ref = db.collection("orgs").doc(orgId).collection("races").doc(raceId);
  const race = (await ref.get()).data() || {};
  const notice = race.notice && typeof race.notice === "object" ? race.notice : {};
  const today = new Date().toISOString().slice(0, 10);
  let next;
  let note;
  if (d.kind === "notice") {
    // Yarış talimatı: programı ve (boşsa) sınıflar, iletişim
    const n = await ai.readNoticeAi({ images: pdfImage(buf), today, focus, timeoutMs: 120000 });
    const had = cleanSchedule(notice.schedule);
    next = { ...notice, schedule: n.schedule.length && !(ilan && had.length) ? n.schedule : had };
    if (!Array.isArray(notice.classes) || !notice.classes.length) next.classes = n.classes;
    if (!Array.isArray(notice.contacts) || !notice.contacts.length) next.contacts = n.contacts;
    note = ilan ? (n.schedule.length && !had.length ? `Yarış ilanı · Program ${n.schedule.length} satır` : "Yarış ilanı") : n.schedule.length ? `Program ${n.schedule.length} satır` : "Programı yok";
  } else {
    const raw = await ai.callGemini({ model: process.env.GEMINI_MODEL, system: AMEND_SYSTEM, user: `Bugün: ${today}. Yarış: ${S(race.name, 120)} (${race.startDate || ""}). Yıl yazmayan tarihlerde yarışın yılını kullan.${focus ? ` ${focus}` : ""} Bu belgeyi oku.`, schema: AMEND_SCHEMA, images: pdfImage(buf), maxTokens: 3000, timeoutMs: 90000 });
    const add = cleanSchedule(raw?.schedule);
    next = { ...notice, schedule: mergeSchedule(notice.schedule, add) };
    // Not: ne değişti (eski → yeni saat, eklenen madde); yoksa yapay zekanın özeti. Bildirimde ve Dokümanlar'da görünür.
    note = scheduleDiff(notice.schedule, add) || S(raw?.summary, 200) || (add.length ? "Programda değişiklik yok" : "Değişiklik okunamadı");
  }
  await ref.update({ notice: next, updatedAt: FieldValue.serverTimestamp() });
  const undo = { notice };
  // Yayın programı: okunamazsa talimat yine kullanılmış sayılır
  if (ai.readProgramAi)
    try {
      const plan = await takePlan({ db, orgId, raceId, race, d, buf, ai, today, focus, ilan });
      if (plan) {
        undo.plan = plan.old;
        note = `${note} · Yayın programı ${plan.days} gün`;
      }
    } catch (e) {
      console.warn("[yarış sitesi] yayın programı", d.name, e.message);
    }
  return { state: "used", note, undo };
}

// Yayın programı (raceLive/{yarış}.plan): talimatta bütünü, ek talimatta yalnız geçen günler. Dönüş { old, days } ya da null
const PLAN_KEYS = ["daily", "times", "off", "agenda"];
async function takePlan({ db, orgId, raceId, race, d, buf, ai, today, focus = "", ilan = false }) {
  const ref = db.collection("orgs").doc(orgId).collection("raceLive").doc(raceId);
  if (ilan && Object.keys((await ref.get()).data()?.plan?.agenda || {}).length) return null;
  const days = await ai.readProgramAi({ images: pdfImage(buf), today, race: [race.name, race.place].filter(Boolean).join(" · "), focus, timeoutMs: 120000 });
  if (!days?.length) return null;
  const plan = (await ref.get()).data()?.plan || {};
  const next = sitePlan(plan, days, d.kind === "notice");
  if (!next) return null;
  const old = Object.fromEntries(PLAN_KEYS.map((k) => [k, plan[k] ?? (k === "daily" ? "" : k === "off" ? [] : {})]));
  await ref.set({ plan: next }, { mergeFields: PLAN_KEYS.map((k) => new FieldPath("plan", k)) });
  return { old, days: days.length };
}

// Belge türüne göre kullanma (raceSiteSync.syncRace use): null → telefon işler (sonuçlar, okunamayan tablo)
export const isIlan = (name) => /\bILANI?\b|İLANI?\b/.test(String(name || "").toLocaleUpperCase("tr-TR"));
export function makeTake({ db, orgId, raceId, ai, cls = "" }) {
  return async (d, buf) => {
    if (["groups", "fleets", "entries"].includes(d.kind)) return takeList({ db, orgId, raceId, d, buf });
    if (d.kind === "results") return null;
    // Yarış ilanı: yarış ondan açıldı (Siteden yarış al); programı yarışta ya da Yayın'da yoksa ondan
    if (d.kind === "notice" && isIlan(d.name)) return (await takeNotice({ db, orgId, raceId, d, buf, ai, cls, ilan: true })) || { state: "kept", note: "Yarış ilanı" };
    if (["notice", "amend", "program"].includes(d.kind)) return (await takeNotice({ db, orgId, raceId, d, buf, ai, cls })) || null;
    return { state: "kept" };
  };
}

// Önceden alınmış belgeleri bir kez yeniden kullanma (Seyhun 2026-11-07): eskiden yarış ilanı yalnız saklanıyordu, sporcu listesindeki
// gruplar okunmuyordu. Yayın programı boşsa ilan, grup getirmemiş sporcu listeleri yeniden işlenir (yarışta başka günün grupları olsa da;
// Seyhun 2026-11-08 "grupları göremiyorum": birleştirilen yarışta Junior'ın eski grupları vardı, Senior listesi atlanmıştı). Dönüş işlenen belge sayısı.
export const FILL = "2026-11-08";
export async function fillOld({ db, bucket, orgId, raceId, take }) {
  const live = db.collection("orgs").doc(orgId).collection("raceLive").doc(raceId);
  const [docs, liveSnap] = await Promise.all([live.collection("site").get(), live.get()]);
  const hasPlan = Object.keys(liveSnap.data()?.plan?.agenda || {}).length > 0;
  const recs = docs.docs.map((x) => ({ id: x.id, ...x.data() })).filter((r) => r.file?.path).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const todo = [
    ...(hasPlan ? [] : recs.filter((r) => r.kind === "notice" && isIlan(r.name) && r.state === "kept").slice(-1)),
    ...recs.filter((r) => r.kind === "entries" && r.state === "used" && !/grubu/.test(r.note || "")),
  ];
  let n = 0;
  for (const r of todo) {
    try {
      const [buf] = await bucket.file(r.file.path).download();
      const done = await take(r, buf);
      if (!done || done.state === "kept") continue;
      await live.collection("site").doc(r.id).set({ state: done.state, note: done.note || "", ...(done.undo ? { undo: done.undo } : {}), at2: new Date().toISOString() }, { merge: true });
      n++;
    } catch (e) {
      console.warn("[yarış sitesi] yeniden", r.name, e.message);
    }
  }
  return n;
}
