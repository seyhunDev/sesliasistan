"use client";

import { cleanResults } from "@/lib/raceResults";
import { cleanFollow } from "@/lib/resultSheet";
import { arrayUnion, collection, doc, getDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { deleteDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { soon } from "@/lib/soon";
import { cleanDocs, nextNo } from "./raceDocs";
import { cleanBudget, cleanRooms } from "./budget";
import { rememberRaceNames } from "./raceNames";
import { cleanAround } from "./raceAround";
import { cleanSpot, cleanWeather } from "./raceWeather";
import { storedOf } from "@/lib/storedFile";

// Yarışlar: orgs/{orgId}/races. Yalnızca yarış bilgisi ve sporcu kimlikleri tutulur;
// T.C., veli gibi kişisel bilgiler kopyalanmaz, belge üretilirken sporcu kartından okunur.
export const RACE_FIELDS = [
  // abroad: yurt dışı yarışı (city = ülke, district = şehir; Türkiye'de yapılacaklar listesi açılır), skips: listeden çıkarılan hazır işler
  "abroad", "skips", "done",
  "name", "federation", "city", "district", "startDate", "endDate", "leaveStart", "leaveEnd", "letterDate", "docsAt",
  "signer", "signerTitle", "travel", "vehicle", "drivers", "athleteIds", "note", "checks", "planAdded",
  // Yolculuk: çıkış günü/saati, çıkış yeri, buluşma noktası (boşsa çıkış yeri), dönüş günü/saati (tripText)
  "departDate", "departTime", "departFrom", "meetPoint", "returnDate", "returnTime",
  // Kulüp izin yazısı (boş olanlar yarıştan gelir; bkz. raceDocs clubInfo)
  "clubNo", "clubDate", "clubFrom", "clubTo", "clubEvent", "clubPlace", "clubSigner", "clubTitle",
  // Otel konaklama izni (otel adı boşsa belgede elle yazılacak yer kalır)
  "hotelName", "hotelFrom", "hotelTo",
  // Oteller [{ name, phone, note, rooms }]: elle düzenlenince burada; düzenlenmediyse talimattakiler (raceHotels)
  "hotels",
  // TYF antrenör ve katılım formlarında sınıf (boşsa sporcuların sınıfına göre ayrı formlar)
  "entryClass",
  // Yarış talimatından okunanlar (program, son tarihler, ücretler, oteller, iletişim; raceNotice.js)
  "notice",
  // Talimatın kendisi (PDF) noticeFiles'ta; burada künyesi { id, name, size, parts, at } (noticeFile.js)
  "noticeFile",
  // Elle eklenen evrak (Storage'da orgs/{org}/raceFiles/{id}); burada künyesi [{ id, name, type, size, at, url }] (raceStore.js)
  "files",
  // Elle eklenen işler [{ title, date }]
  "todos",
  // Bütçe (budget.js)
  "budget",
  // Çevre: yarış alanı/otel konumu, yol, yakındaki yerler, gezilecek yerler (raceAround.js)
  "around",
  // Yarış günlerinin hava tahmini, rüzgâr önde (raceWeather.js)
  "weather",
  // Hava ve ölçülen rüzgâr için yarışın yeri { name, lat, lon }: ilk havada ilçeden bulunur ya da haritadan seçilir (raceWeather.racePlace)
  "spot",
  // Sonuçlar { fleet, rows: { sporcuId: { place, note } } } (raceResults.js)
  "results",
  // Evrak'ta seçili belgeler (DOCS anahtarları; yoksa DOC_DEFAULT)
  "docs",
  // Sonuçlarda ☆ ile takip edilen başka kulüplerin sporcuları ["ilca 4|216382", …] (resultSheet.followKey)
  "follow",
  // Ortak yarış bağı (lib/sharedRace.js): sharedRaces/{shared}; sharedAt ortaktan son alınan sürüm
  "shared", "sharedAt",
];

const NOTICE_KEYS = ["organizer", "venue", "classes", "schedule", "deadlines", "tasks", "fees", "hotels", "contacts", "notes", "summary", "at", "planned"];

// Talimat bilgisi: kayıtta yalnız bilinen alanlar kalır
export function cleanNotice(n) {
  if (!n || typeof n !== "object") return null;
  const out = {};
  for (const k of NOTICE_KEYS) {
    const v = n[k];
    if (Array.isArray(v)) out[k] = v.filter((x) => (x && typeof x === "object") || typeof x === "string").slice(0, 40);
    else if (typeof v === "boolean") out[k] = v;
    else out[k] = String(v ?? "");
  }
  return out;
}

// Oteller: talimattan gelir, elle eklenir/düzeltilir (ad, telefon, not; oda fiyatları talimattan)
const T = (v, n) => String(v ?? "").trim().slice(0, n);
export const cleanHotel = (h) =>
  h && typeof h === "object" && T(h.name, 100) ? { name: T(h.name, 100), phone: T(h.phone, 40), note: T(h.note, 240), rooms: cleanRooms(h.rooms) } : null;
export const cleanHotels = (a) => (Array.isArray(a) ? a.map(cleanHotel).filter(Boolean).slice(0, 12) : null);
// Yarışın otelleri: elle düzenlendiyse onlar, yoksa talimattakiler
export const raceHotels = (r) => (Array.isArray(r?.hotels) ? r.hotels : r?.notice?.hotels || []).filter((h) => h?.name);
// Telefonla aranabilir mi (en az 7 rakam)
export const telOf = (p) => {
  const t = String(p || "").replace(/[^\d+]/g, "");
  return t.replace(/\D/g, "").length >= 7 ? `tel:${t}` : "";
};
// Yeni talimatın otelleri elle düzenlenmiş listeye katılır: aynı adlı otelin oda fiyatları yenilenir,
// boş telefon/not talimattan dolar; yeni otel eklenir, elle eklenen ya da düzeltilen silinmez.
const hk = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
export function mergeHotels(own, incoming) {
  if (!Array.isArray(own)) return null;
  const out = own.map((h) => ({ ...h }));
  for (const n of incoming || []) {
    if (!n?.name) continue;
    const h = out.find((x) => hk(x.name) === hk(n.name));
    if (!h) out.push(n);
    else {
      if (cleanRooms(n.rooms).length) h.rooms = n.rooms;
      if (!h.phone && n.phone) h.phone = n.phone;
      if (!h.note && n.note) h.note = n.note;
    }
  }
  return cleanHotels(out);
}

export const cleanNoticeFile = (f) =>
  f && typeof f === "object" && /^[\w-]{1,40}$/.test(f.id || "")
    ? { id: f.id, name: String(f.name || "talimat.pdf").slice(0, 120), size: Number(f.size) || 0, parts: Math.max(1, Number(f.parts) || 1), at: String(f.at || ""), ...storedOf(f) }
    : null;

// Elle eklenen evrakın künyesi (dosya Storage'da); en çok 40, yalnız Firebase Storage adresi
export const cleanRaceFiles = (l) =>
  (Array.isArray(l) ? l : [])
    .filter((f) => f && /^[\w-]{1,40}$/.test(f.id || "") && /^https:\/\/firebasestorage\.googleapis\.com\//.test(f.url || ""))
    .slice(0, 40)
    .map((f) => ({ id: f.id, name: String(f.name || "evrak").slice(0, 120), type: String(f.type || "").slice(0, 80), size: Number(f.size) || 0, at: String(f.at || ""), url: String(f.url).slice(0, 600) }));

// Yarış öncesi yapılacaklar: tek düz liste. Her iş: { key, label, date?, detail?, group }.
// İşaretleme yok: yapılan ya da gerekmeyen iş × ile listeden çıkarılır (skips; elle eklenen iş silinir).
// Eski yarışlarda işaretlenmiş işler (checks[key]) de çıkarılmış sayılır; "Evrakları hazırla" belgeler hazırlanınca kendiliğinden çıkar.
// Evrak işleri (kulüp tarafı) her yarışta aynı. Kayıt/ödeme/konaklama işleri talimattan gelir (talimat yüklenince);
// her yarışa elle iş de eklenir (todos). Hazır standart liste yok.
export const DOC_STEPS = [
  ["docs", "Evrakları hazırla"],
  ["parents", "Velilere imzalat"],
  ["schools", "Okullara ver"],
  ["gsim", "GSİM'e ver (il dışı çıkış oluru)"],
];
// Yurt dışı yarışta Türkiye'de yapılacaklar (hazır liste; gerekmeyen × ile çıkarılır, skips). Talimattaki ve elle işler ayrıca eklenir.
export const ABROAD_STEPS = [
  ["a:pasaport", "Pasaportları kontrol et", "Dönüşten sonra en az 6 ay geçerli olmalı; yoksa erkenden randevu al"],
  ["a:davet", "Davet ve kayıt onay mektubunu al", "Organizasyondan, sporcu ve antrenör adlarıyla (vize için)"],
  ["a:vize", "Vize başvurusunu yap", "Gerekiyorsa; Schengen için en az 1-2 ay önce"],
  ["a:federasyon", "Federasyondan yurt dışı yarış izni al", "TYF'ye kafile listesiyle başvur"],
  ["a:gsim", "Gençlik ve Spor İl Müdürlüğünden yurt dışı görev oluru al", "Kafile onayı, yurt dışı çıkış"],
  ["a:veli", "Velilerden noter onaylı yurt dışı çıkış izni al", "18 yaş altı, velisi yanında olmayan sporcular için"],
  ["a:sigorta", "Seyahat sağlık sigortası yaptır", "Yarış süresini ve yolculuğu kapsasın"],
  ["a:wsid", "World Sailing Sailor ID'leri hazırla", "Kayıtta istenir"],
  ["a:nakliye", "Tekne ve ekipman nakliyesini ayarla", "Ya da yerinde kiralık tekne (charter) ayır; gümrük belgelerini sor"],
  ["a:ucus", "Uçak biletlerini al", "Ekipman ve fazla bagaj hakkını kontrol et"],
  ["a:konaklama", "Konaklamayı ayarla", ""],
  ["a:ulasim", "Havalimanı ve yarış alanı ulaşımını ayarla", ""],
  ["a:doviz", "Kayıt ücretini döviz olarak öde", "Kart ya da havale; dekontu sakla"],
  ["a:harc", "Yurt dışı çıkış harcını kontrol et", "Antrenör ve 18 yaş üstü için; muafiyetlere bak"],
];
const slug = (s, p = "t:") =>
  p + String(s || "").toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40);

// Talimattaki işler; eski talimatlarda (tasks yoksa) son tarihlerden, ücretten ve otelden çıkarılır
export function noticeTasks(n) {
  if (!n) return [];
  let list = (n.tasks || []).filter((t) => t?.title);
  if (!list.length) {
    list = (n.deadlines || []).map((d) => ({ title: d.title, date: d.date, detail: d.detail }));
    if (n.fees?.length && !list.some((t) => /ücret|ödeme/i.test(t.title))) list.push({ title: "Kayıt ücretini öde", detail: n.fees[0].amount });
    if (n.hotels?.length) list.push({ title: "Konaklamayı ayarla", detail: n.hotels[0].name });
  }
  const seen = new Set();
  return list
    .map((t) => ({ key: slug(t.title), label: t.title, date: t.date || "", detail: t.detail || "", group: "notice" }))
    .filter((t) => t.key.length > 2 && !seen.has(t.key) && seen.add(t.key));
}

// Elle eklenen işler
export const cleanTodos = (a) =>
  (Array.isArray(a) ? a : [])
    .map((t) => ({ title: String(t?.title || "").replace(/\s+/g, " ").trim().slice(0, 100), date: /^\d{4}-\d{2}-\d{2}$/.test(t?.date || "") ? t.date : "" }))
    .filter((t) => t.title)
    .slice(0, 30);
export const todoKey = (title) => slug(title, "m:");
// Listeden çıkarılan işler: yurt dışı hazır işleri (a:), talimat işleri (t:), evrak işleri
const SKIP_RE = /^(a:[a-z]{1,20}|t:[\p{L}\p{N}-]{1,40}|docs|parents|schools|gsim)$/u;
export const cleanSkips = (a) => [...new Set((Array.isArray(a) ? a : []).filter((k) => typeof k === "string" && SKIP_RE.test(k)))].slice(0, 60);

// Bütün işler (çıkarılanlar dahil)
function allSteps(r) {
  const seen = new Set();
  const own = cleanTodos(r?.todos)
    .map((t) => ({ key: todoKey(t.title), label: t.title, date: t.date, detail: "", group: "own" }))
    .filter((t) => t.key.length > 2 && !seen.has(t.key) && seen.add(t.key));
  const abroad = r?.abroad ? ABROAD_STEPS.map(([key, label, detail]) => ({ key, label, detail, date: "", group: "abroad" })) : [];
  const docs = DOC_STEPS.filter(([key]) => !(r?.abroad && key === "gsim")).map(([key, label]) => ({ key, label, group: "docs" }));
  return [...noticeTasks(r?.notice), ...own, ...abroad, ...docs];
}
const gone = (r, s) => !!r?.checks?.[s.key] || cleanSkips(r?.skips).includes(s.key);
// Yapıldı işaretlenen işler (Seyhun: "bir tanesini yaptım, yapıldı olarak gösterilebilir mi", 2026-10-12): listede soluk ✓ kalır
const DONE_RE = /^(a:[a-z]{1,20}|[tm]:[\p{L}\p{N}-]{1,40}|docs|parents|schools|gsim)$/u;
export const cleanDone = (a) => [...new Set((Array.isArray(a) ? a : []).filter((k) => typeof k === "string" && DONE_RE.test(k)))].slice(0, 80);
const isDone = (r, s) => cleanDone(r?.done).includes(s.key);
const byDate = (list) => [...list.filter((s) => s.date).sort((a, b) => a.date.localeCompare(b.date)), ...list.filter((s) => !s.date)];
// Yapılacaklar: çıkarılmayan ve yapılmayanlar; son tarihlisi önde (tarih sırasıyla), sonra tarihsizler eklendiği sırayla
export function stepsOf(r) {
  return byDate(allSteps(r).filter((s) => !gone(r, s) && !isDone(r, s)));
}
// Yapıldı işaretlenenler (listede altta soluk görünür)
export const doneSteps = (r) => byDate(allSteps(r).filter((s) => !gone(r, s) && isDone(r, s)));
// Bütün iş sayısı (yapılan/çıkarılan dahil): yarış listesindeki hazırlık çubuğu için
export const stepTotal = (r) => allSteps(r).length;
// Listeden çıkarılan (ya da eskiden işaretlenen) iş sayısı ("geri getir" için)
export const hiddenCount = (r) => allSteps(r).filter((s) => gone(r, s)).length;
// Benzerlik için kelime kökleri (ilk 3 harf); "son, gün, tarih, yap" gibi her işte geçen sözler sayılmaz
const STEM_SKIP = new Set(["son", "gün", "tar", "yap", "içi", "ile", "kad", "edi", "olu", "bel", "the", "and", "for"]);
const stems = (t) => [...new Set(String(t || "").toLocaleLowerCase("tr-TR").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3).map((w) => w.slice(0, 3)).filter((w) => !STEM_SKIP.has(w)))];
// Bir son tarih ya da iş yapıldı mı: aynı anahtar ya da aynı günlü yapılmış iş (talimattaki "Online kayıt son gün" = "Online kaydı yap")
export function doneFor(r, title, date = "") {
  const ds = doneSteps(r);
  if (ds.some((s) => s.key === slug(title) || s.key === slug(title, "m:"))) return true;
  // Adı benzeyen iş ("Online kayıt son gün" ↔ "Online kaydı yap"; tarihleri farklı olsa da): en çok benzeyen iş yapıldıysa
  const want = new Set(stems(title));
  if (want.size) {
    const scored = allSteps(r).filter((s) => !gone(r, s)).map((s) => ({ s, n: stems(s.label).filter((w) => want.has(w)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
    if (scored.length && isDone(r, scored[0].s) && !scored.some((x) => x.n === scored[0].n && !isDone(r, x.s))) return true;
  }
  // Aynı günün işlerinin hepsi yapıldıysa o günün son tarihi de yapılmış sayılır
  const same = date ? allSteps(r).filter((s) => s.date === date && !gone(r, s)) : [];
  return same.length > 0 && same.every((s) => isDone(r, s));
}
// Yarışın son tarihinden açılan plan ("Foça Kupası: Online kayıt son gün", raceNotice addNoticePlans) ya da yarışın kendi planı (adı aynı):
// hangi yarış ve hangi iş. list: loadRaces. Dönüş { race, step (bitmemiş iş ya da null), whole (yarışın kendi planı) } ya da null
export function planRaceStep(plan, list = []) {
  const t = String(plan?.title || "").trim();
  if (!t) return null;
  const race = [...list].sort((a, b) => String(b.name || "").length - String(a.name || "").length).find((r) => {
    const n = String(r.name || "").trim();
    return n && (t === n || t.startsWith(`${n}:`));
  });
  if (!race) return null;
  const n = String(race.name).trim();
  if (t === n) return { race, step: null, whole: true };
  const rest = t.slice(n.length + 1).trim();
  const open = stepsOf(race);
  const step = open.find((s) => s.key === slug(rest) || s.key === slug(rest, "m:")) || matchStep(race, rest, open);
  return { race, step: step || null, whole: false };
}
// İşi yapıldı işaretler (yarışın "Yapılanlar"ına yazılır); dönüş yeni yarış kaydı
export const withStepDone = (r, key) => ({ ...r, done: cleanDone([...cleanDone(r.done).filter((k) => k !== key), key]) });
// Sesle: "vize başvurusu yapıldı" → listedeki en uygun iş (kelime köklerinin örtüşmesi; eşitlikte ya da hiç yoksa null)
export function matchStep(r, words, list = stepsOf(r)) {
  const roots = (s) => String(s || "").toLocaleLowerCase("tr-TR").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3).map((w) => w.slice(0, 4));
  const want = new Set(roots(words));
  if (!want.size) return null;
  const scored = list.map((s) => ({ s, n: roots(s.label).filter((w) => want.has(w)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  if (!scored.length || (scored[1] && scored[1].n === scored[0].n)) return null;
  return scored[0].s;
}

const col = (orgId) => collection(db, "orgs", orgId, "races");
const clean = (r) =>
  Object.fromEntries(
    RACE_FIELDS.map((k) => [
      k,
      k === "athleteIds"
        ? r[k] || []
        : k === "checks"
          ? Object.fromEntries(Object.entries(r.checks || {}).filter(([c, v]) => typeof v === "boolean" && /^[\p{L}\p{N}:-]{1,48}$/u.test(c)).slice(0, 60))
          : k === "planAdded" || k === "abroad"
            ? !!r[k]
            : k === "notice"
              ? cleanNotice(r[k])
            : k === "noticeFile"
              ? cleanNoticeFile(r[k])
            : k === "files"
              ? cleanRaceFiles(r[k])
            : k === "skips"
              ? cleanSkips(r[k])
            : k === "done"
              ? cleanDone(r[k])
            : k === "todos"
              ? cleanTodos(r[k])
            : k === "budget"
              ? cleanBudget(r[k])
            : k === "around"
              ? cleanAround(r[k])
            : k === "weather"
              ? cleanWeather(r[k])
            : k === "spot"
              ? cleanSpot(r[k])
            : k === "results"
              ? cleanResults(r[k])
            : k === "docs"
              ? cleanDocs(r[k])
            : k === "hotels"
              ? cleanHotels(r[k])
            : k === "follow"
              ? cleanFollow(r[k])
            : String(r[k] || "").trim(),
    ]),
  );

// Yeni yarışın boş hali (evrak tarihi boş: belgeler ilk hazırlanınca o gün yazılır, sonra değişmez): yetkili, il, federasyon gibi bilgiler son yarıştan gelir.
// Kulüp izin yazısının sayısı son yarışın son sayısından devam eder.
export function freshRace(last = {}, today = "") {
  return {
    abroad: false, skips: [], done: [],
    name: "", federation: last.federation || "Yelken", city: last.city || "İzmir", district: "",
    startDate: "", endDate: "", leaveStart: "", leaveEnd: "", letterDate: "", docsAt: "",
    signer: last.signer || "", signerTitle: last.signerTitle || "Başkan",
    travel: last.travel || "Kendi İmkanları İle", vehicle: "-", drivers: "-", athleteIds: [],
    departDate: "", departTime: "", departFrom: last.departFrom || "", meetPoint: "", returnDate: "", returnTime: "", note: "", checks: {}, planAdded: false,
    clubNo: last.clubNo ? nextNo(last.clubNo, Math.max(1, last.athleteIds?.length || 0)) : "", clubDate: "", clubFrom: "", clubTo: "", clubEvent: "", clubPlace: "",
    clubSigner: last.clubSigner || "", clubTitle: last.clubTitle || "Antrenör", hotelName: "", hotelFrom: "", hotelTo: "", hotels: null, entryClass: "", docs: null, notice: null, noticeFile: null, files: [], todos: [], budget: null, around: null, weather: null, spot: null, results: null, shared: "", sharedAt: "",
  };
}

// Yarışı planlara yazar (tüm gün, çok günlü, "Yarış" kategorisi). saveDrafts: DataProvider'dan.
// Yolculuk yazıldıysa plan çıkış gününde, çıkış saatinde başlar, dönüş gününde biter; yeri buluşma noktası (tek plan, ayrı kayıt yok).
export async function addRacePlan(saveDrafts, r, by) {
  const date = r.departDate || r.startDate;
  const end = r.returnDate || r.endDate || "";
  const time = /^\d{2}:\d{2}$/.test(r.departTime || "") ? r.departTime : "";
  const res = await saveDrafts(
    [{ type: "plan", title: r.name.trim(), date, endDate: end && end > date ? end : "", time, place: (r.meetPoint || r.departFrom || "").trim() || [r.district, r.city].filter(Boolean).join(", "), cat: "Yarış", assignees: [] }],
    { source: "manual", by },
  );
  return !res.error && res.plans > 0;
}

// Yolculuk özeti (bütçe çıktısı, kopyalanan metin): ["Çıkış: 11 Eki Cmt 07:00 · Dikili Marina · buluşma Belediye önü", "Dönüş: 16 Eki Prş 18:00"]
const tripDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
export function tripText(r) {
  const go = [r?.departDate && tripDay(r.departDate), r?.departTime].filter(Boolean).join(" ");
  const from = [r?.departFrom, r?.meetPoint && r.meetPoint !== r.departFrom && `buluşma ${r.meetPoint}`].filter(Boolean).join(" · ");
  const back = [r?.returnDate && tripDay(r.returnDate), r?.returnTime].filter(Boolean).join(" ");
  return [(go || from) && `Çıkış: ${[go, from].filter(Boolean).join(" · ")}`, back && `Dönüş: ${back}`].filter(Boolean);
}

// Bütçe çıktısındaki "Tahmini plan" satırları: [etiket, değer]; boş olanlar yazılmaz
export function tripRows(r) {
  const at = (d, t) => [d && tripDay(d), t].filter(Boolean).join(" · ");
  return [
    ["Çıkış", at(r?.departDate, r?.departTime)],
    ["Çıkış yeri", r?.departFrom],
    ["Buluşma noktası", r?.meetPoint !== r?.departFrom && r?.meetPoint],
    ["Dönüş", at(r?.returnDate, r?.returnTime)],
  ].filter(([, v]) => v && String(v).trim());
}

// Tek yarış (multimedya sayfası); yoksa null
export async function loadRace(orgId, id) {
  const snap = await getDoc(doc(col(orgId), id));
  return snap.exists() ? { id: snap.id, ...clean(snap.data()) } : null;
}

// Yalnız sonuçlar (multimedya sayfasından yükleme): yarışın diğer alanlarına dokunulmaz; bulunan yeni sporcular yarışa eklenir
export async function saveRaceResults(orgId, id, results, addIds = []) {
  const data = { results: cleanResults(results), updatedAt: serverTimestamp() };
  stale();
  if (addIds.length) data.athleteIds = arrayUnion(...addIds);
  await soon(updateDoc(doc(col(orgId), id), data), 2500, "Yarış");
}

// Son okunan liste bellekte: geri dönünce Yarışlar listesi "yükleniyor" göstermeden hemen çizilir (arkada tazelenir),
// listeden açılan yarış yeniden okunmadan açılır. Yazınca eskimiş sayılır (yalnız liste anında çizmek için kullanır).
let last = null; // { orgId, at, list }
export const racesNow = (orgId, maxAge = Infinity) => (last?.orgId === orgId && Date.now() - last.at < maxAge ? last.list : null);
const stale = () => last && (last.at = 0);

// Ortak yarış bağı (sharedRaces.js publishRace): yalnız bağ alanları yazılır, bellekteki liste de güncellenir
export async function linkRace(orgId, id, link) {
  const r = last?.orgId === orgId && last.list.find((x) => x.id === id);
  if (r) Object.assign(r, { shared: link.shared, sharedAt: link.sharedAt || "" });
  await updateDoc(doc(col(orgId), id), { shared: link.shared, sharedAt: link.sharedAt || "" });
}

export async function loadRaces(orgId) {
  const snap = await getDocs(col(orgId));
  const list = snap.docs.map((d) => ({ id: d.id, ...clean(d.data()) })).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  rememberRaceNames(list.map((r) => r.name));
  last = { orgId, at: Date.now(), list };
  return list;
}

// Yeni yarışı ekler ya da var olanı günceller; kimliği döndürür
export async function saveRace(orgId, uid, r) {
  const data = { ...clean(r), updatedAt: serverTimestamp() };
  rememberRaceNames([data.name]);
  stale();
  // Sunucu onayı en çok 2,5 sn beklenir; yazma cihazda yapılmıştır, arkada gider (lib/soon.js, denetim B11)
  if (r.id) {
    await soon(updateDoc(doc(col(orgId), r.id), data), 2500, "Yarış");
    return r.id;
  }
  const ref = doc(col(orgId));
  await soon(setDoc(ref, { ...data, createdByUid: uid, createdAt: serverTimestamp() }), 2500, "Yarış");
  return ref.id;
}

// Yalnız takip edilen sporcular (Sonuçlar ☆); diğer alanlara dokunulmaz
export const saveRaceFollow = (orgId, id, follow) => (stale(), updateDoc(doc(col(orgId), id), { follow: cleanFollow(follow), updatedAt: serverTimestamp() }));

// Yalnız yarışın yeri (multimedya Hava sekmesinden); diğer alanlara dokunulmaz
export const saveRaceSpot = (orgId, id, spot) => (stale(), updateDoc(doc(col(orgId), id), { spot: cleanSpot(spot), updatedAt: serverTimestamp() }));

export const deleteRace = (orgId, id) => (stale(), deleteDoc(doc(col(orgId), id)));

// Gün ekle: "2026-10-07", -1 → "2026-10-06"
export function shiftDay(s, n) {
  if (!s) return "";
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
