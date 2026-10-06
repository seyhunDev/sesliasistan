// Antrenman günlüğü: antrenman planına (kategori Antrenman) eklenen kısa kayıt. Plan kaydının `log` alanında durur:
// log = { wind (kn), dir, topics [konu], min (süre dk), rating 1-3 (zor/iyi/çok iyi), note, at }
// Ayrıntı (yapay zekayla ya da elle): gust (sağanak kn), sea (deniz), place (yer), athletes [ad], boats [sınıf],
//   next (sonraki antrenmanda), details [{k, v}] (başka her şey), src "ai"
// Saf fonksiyonlar (test edilir); ekran AddSheet içindeki TrainingLog.jsx, liste /training.
export const TOPICS = ["Start", "Tramola", "Kavança", "Şamandıra dönüşü", "Rota", "Hız/trim", "Taktik", "Ağır hava", "Hafif hava", "Yarış provası", "Kondisyon", "Teori"];
export const DIRS = ["Poyraz", "Gündoğusu", "Keşişleme", "Kıble", "Lodos", "Kaba", "Batı", "Karayel"];
export const RATINGS = [
  [1, "Zor geçti"],
  [2, "İyi"],
  [3, "Çok iyi"],
];

// Kategorisi Antrenman ya da başlığında antrenman/idman geçen plan (elle "Genel" kategoride açılmış antrenmanlar da)
export const isTraining = (p) => (p?.cat || p?.category) === "Antrenman" || /antre?nman|idman/i.test(p?.title || "");
// Günlük, antrenmanın günü ya da sonrasında yazılır (iptal edilen hariç)
export const canLog = (p, today) => isTraining(p) && p.status !== "cancelled" && !!p.date && p.date <= today;

const num = (v, max) => {
  const n = Math.round(Number(String(v ?? "").replace(",", ".")));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};
const str = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const list = (v, n, max) => {
  const arr = Array.isArray(v) ? v : String(v ?? "").split(/[,;\n]/);
  const seen = new Set();
  return arr.map((x) => str(x, n)).filter((x) => x && !seen.has(x.toLocaleLowerCase("tr-TR")) && seen.add(x.toLocaleLowerCase("tr-TR"))).slice(0, max);
};
// Konu adı listedekine benziyorsa listedeki yazılışı alınır ("start" → "Start", "tramola çalışması" → "Tramola")
const fold = (s) => str(s, 40).toLocaleLowerCase("tr-TR");
export function topicOf(t) {
  const f = fold(t);
  if (!f) return "";
  return TOPICS.find((x) => fold(x) === f) || TOPICS.find((x) => f.startsWith(fold(x))) || str(t, 30).replace(/^./, (c) => c.toLocaleUpperCase("tr-TR"));
}
const dirOf = (d) => DIRS.find((x) => fold(x) === fold(d)) || "";

export function cleanLog(l, now = new Date()) {
  if (!l) return null;
  const out = {
    wind: num(l.wind, 60),
    dir: dirOf(l.dir),
    topics: list((l.topics || []).map(topicOf), 30, 12),
    min: num(l.min, 600),
    rating: [1, 2, 3].includes(Number(l.rating)) ? Number(l.rating) : null,
    note: String(l.note || "").trim().slice(0, 1500),
  };
  const extra = {
    gust: num(l.gust, 80),
    sea: str(l.sea, 40),
    place: str(l.place, 60),
    athletes: list(l.athletes, 40, 30),
    boats: list(l.boats, 30, 8),
    next: str(l.next, 300),
    details: (Array.isArray(l.details) ? l.details : [])
      .map((d) => ({ k: str(d?.k, 30), v: str(d?.v, 200) }))
      .filter((d) => d.k && d.v)
      .slice(0, 12),
  };
  for (const [k, v] of Object.entries(extra)) if (v && (!Array.isArray(v) || v.length)) out[k] = v;
  if (l.src === "ai") out.src = "ai";
  const empty = !out.wind && !out.dir && !out.topics.length && !out.min && !out.rating && !out.note && Object.keys(extra).every((k) => !(k in out));
  return empty ? null : { ...out, at: now.toISOString() };
}

// Eksik bilgi: günlüğün temel alanlarından boş kalanlar (kayıt yine yapılır; listede ve asistanda gösterilir)
export const MISSING = [
  ["wind", "rüzgâr"],
  ["dir", "rüzgâr yönü"],
  ["topics", "çalışılanlar"],
  ["min", "süre"],
  ["rating", "nasıl geçti"],
];
export function missingOf(l) {
  if (!l) return MISSING.map(([, t]) => t);
  return MISSING.filter(([k]) => (Array.isArray(l[k]) ? !l[k].length : !l[k])).map(([, t]) => t);
}

// Yeni bilgi eskisinin üstüne: boş gelen alan eskisini silmez; konular ve kişiler birleşir, not eklenir
export function mergeLog(old, neu, now = new Date()) {
  if (!old) return cleanLog(neu, now);
  if (!neu) return cleanLog(old, now);
  const out = { ...old };
  for (const [k, v] of Object.entries(neu)) {
    if (v == null || v === "" || (Array.isArray(v) && !v.length) || k === "at") continue;
    if (["topics", "athletes", "boats"].includes(k)) out[k] = [...(old[k] || []), ...v];
    else if (k === "note" && old.note && !old.note.includes(v)) out.note = `${old.note}\n${v}`;
    else if (k === "details") {
      const keys = new Set(v.map((d) => fold(d.k)));
      out.details = [...(old.details || []).filter((d) => !keys.has(fold(d.k))), ...v];
    } else out[k] = v;
  }
  return cleanLog(out, now);
}

// Günün antrenman planı: saat söylendiyse en yakın saatli, yoksa günün ilki (iptaller hariç)
export function pickPlan(plans, date, time = "") {
  const day = (plans || []).filter((p) => isTraining(p) && p.status !== "cancelled" && p.date === date);
  if (!day.length) return null;
  const mins = (t) => (/^\d{1,2}:\d{2}$/.test(t || "") ? Number(t.slice(0, -3)) * 60 + Number(t.slice(-2)) : null);
  const want = mins(time);
  const by = (p) => (want == null ? mins(p.time) ?? 9999 : Math.abs((mins(p.time) ?? 720) - want));
  return [...day].sort((a, b) => by(a) - by(b))[0];
}

// Asistanda günlük isteği: "antrenman günlüğüne yaz: …", "bugünkü antrenman çok iyi geçti, 12 knot poyraz…",
// "dünkü antrenmanda start çalıştık". Sayfa açma ("antrenman günlüğünü aç") ve yeni plan ("yarın 10'da antrenman") değil.
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?;:"“”()]/g, " ").replace(/\s+/g, " ").trim();
const LOG_W = /(^|\s)(günlü(k|ğ)\S*)(?=\s|$)/;
const TRAIN_W = /(^|\s)antre?nman\S*|(^|\s)idman\S*/; // ses tanıma "antreman" da yazar
// geldi/gelmedi tek başına yoklamadır ("Ali antrenmana gelmedi"); günlük sözcüğüyle birlikteyse günlüğe yazılır
const PAST = /(geçti|çalıştık|çalıştı|yaptık|vardı|esti|çıktık|bitti|sürdü|tamamladık|zorlandı|zorlandık|döndük)(?=\s|$)/;
const OPEN_ONLY = /^(antrenman )?günlü\S* (sayfa\S* )?(aç|göster|getir|gir|git|bak)\S*$/;
const FUTURE = /(ekle|planla|oluştur|kur|hatırlat)\S*$|(^|\s)(yarın|haftaya|gelecek)(?=\s|$)/;
// Günlük yazıldıktan sonra gelen ek bilgi mi ("çok iyi geçti", "90 dakika sürdü", "Ali de vardı", "rüzgâr 12 knot")?
// Yeni kayıt, mesaj ya da sayfa isteği değilse ve günlük sözcükleri geçiyorsa aynı günlüğe eklenir.
const INFO = new RegExp(
  `(knot|\\d+ ?(not|nat|kt)|(^|\\s)kn(?=\\s|$)|rüzg|sağanak|dakika|saat sürdü|sürdü|geçti|çalıştık|deniz|dalga|katıldı|geldi|vardı|gelmedi|iyi|zor|kötü|harika|süper|${[...DIRS, ...TOPICS].map((x) => x.toLocaleLowerCase("tr-TR").split(/[ /]/)[0]).join("|")})`,
);
export function wantsLog(text) {
  const t = low(text);
  if (!t || t.split(" ").length > 120 || OPEN_ONLY.test(t)) return false;
  if (/(aç|göster|getir)\S*$/.test(t) && t.split(" ").length <= 5) return false;
  if (/\?\s*$/.test(String(text).trim()) || (/(^|\s)(m[ıiuü]|m[ıiuü]s[ıiuü]n|ne zaman|nasıl|kaç)(\s|$)/.test(t) && !LOG_W.test(t))) return false;
  if (LOG_W.test(t) && TRAIN_W.test(t)) return t.split(" ").length >= 3;
  if (LOG_W.test(t) && /(yaz|ekle|kaydet|işle|gir)/.test(t) && t.split(" ").length >= 4) return true;
  if (FUTURE.test(t)) return false;
  // "bugünkü antrenmanı kaydet 12 knot poyraz", "antrenman notu: start ve tramola"
  if (TRAIN_W.test(t) && /(kaydet|kayd[ıi]|notu(?=\s|$))/.test(t) && INFO.test(t)) return true;
  // "antrenman" denmeden anlatılan antrenman: geçmiş zaman + rüzgâr (knot ya da yön) + çalışılan konu
  // ("dün 14 knot poyrazda start çalıştık, 2 saat sürdü")
  if (PAST.test(t) && WIND_W.test(t) && TOPIC_W.test(t)) return true;
  return TRAIN_W.test(t) && PAST.test(t);
}
const WIND_W = new RegExp(`(\\d+ ?(knot|not|nat|kt|kn)(?=\\s|$)|(^|\\s)(${DIRS.filter((d) => !["Kaba", "Batı"].includes(d)).map((d) => d.toLocaleLowerCase("tr-TR")).join("|")})\\S*)`);
const TOPIC_W = new RegExp(`(^|\\s)(${TOPICS.filter((x) => x !== "Yarış provası").map((x) => x.toLocaleLowerCase("tr-TR").split(/[ /]/)[0]).join("|")})\\S*|(^|\\s)çalıştık(?=\\s|$)`);

// Anlatılan bir antrenman mı ("bugünkü antrenmanda 14 knot poyraz, start ve tramola"): günlük sözcüğü ya da geçmiş zaman
// olmasa da antrenman + günlük bilgisi (rüzgâr, konu, süre…) geçiyorsa. Gelecek, soru, mesaj/görev isteği sayılmaz.
// Yapay zeka (ya da yedek kurallar) böyle bir cümleden yalnız not çıkarırsa not açılmaz, günlüğe yazılır.
export function looksLikeLog(text) {
  const t = low(text);
  if (!t || /(mesaj|görev|hatırlat|söyle|haber ver|gönder)/.test(t)) return false;
  if (wantsLog(text)) return true;
  if (!TRAIN_W.test(t) || FUTURE.test(t) || /\?\s*$/.test(String(text).trim()) || t.split(" ").length > 120) return false;
  return INFO.test(t);
}

// Notlar'da duran ama antrenman günlüğüne benzeyen not (eski sürümler günlük anlatımını ayrıca not olarak da kaydediyordu).
// "Not olarak kalsın" denmiş (keepNote) ya da arşivlenmiş not sayılmaz. Notlar sayfasında ayrı kartta, ana sayfada hiç görünmez.
export function isLogNote(n) {
  if (!n || n.archived || n.keepNote) return false;
  if (n.cat === "Antrenman") return true;
  const t = low(`${n.title || ""} ${n.body || ""}`);
  return TRAIN_W.test(t) && (LOG_W.test(t) || INFO.test(t));
}

// Yalnız "günlük oluştur / antrenman günlüğü ekle" (anlatım yok): asistan anlatmasını ister, sonraki cümle günlüğe gider
export const bareLog = (text) => low(text).split(" ").length <= 6 && !INFO.test(low(text));

const dayName = (d, today) => {
  if (d === today) return "Bugünkü";
  const y = new Date(`${today}T12:00:00`);
  y.setDate(y.getDate() - 1);
  if (d === y.toISOString().slice(0, 10)) return "Dünkü";
  return `${new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`;
};
// Asistanın cevabı: "Dünkü antrenmanın günlüğünü yazdım: 12 kn Poyraz · Start · 90 dk. Eksik: nasıl geçti. Söylersen eklerim."
export function logReply(log, date, today, fresh = false) {
  const line = logLine(log);
  const miss = missingOf(log);
  const d = dayName(date, today);
  return [
    `${d}${/^\d/.test(d) ? " antrenmanının" : " antrenmanın"} günlüğünü ${fresh ? "yazdım (takvimde antrenman yoktu, ekledim)" : "yazdım"}${line ? `: ${line}` : ""}.`,
    miss.length ? `Eksik: ${miss.join(", ")}. Söylersen eklerim.` : "",
  ].filter(Boolean).join(" ");
}

// Kısa satır: "12 kn Poyraz · Start, Rota · 90 dk"
export function logLine(l) {
  if (!l) return "";
  return [l.wind ? `${l.wind} kn${l.dir ? ` ${l.dir}` : ""}` : l.dir, (l.topics || []).join(", "), l.min ? `${l.min} dk` : ""].filter(Boolean).join(" · ");
}

// Ay özeti (YYYY-MM): antrenman sayısı, günlüğü yazılan, toplam süre, ortalama rüzgâr, en çok çalışılan konular
export function monthLog(plans, month) {
  const all = plans.filter((p) => isTraining(p) && p.status !== "cancelled" && (p.date || "").startsWith(month));
  const logged = all.filter((p) => p.log).sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  const winds = logged.map((p) => p.log.wind).filter(Boolean);
  const count = {};
  for (const p of logged) for (const t of p.log.topics || []) count[t] = (count[t] || 0) + 1;
  return {
    total: all.length,
    logged,
    minutes: logged.reduce((s, p) => s + (p.log.min || 0), 0),
    avgWind: winds.length ? Math.round(winds.reduce((a, b) => a + b, 0) / winds.length) : null,
    topics: Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr")),
  };
}

export function isLogAnswer(text) {
  const t = low(text);
  if (!t || t.split(" ").length > 60) return false;
  if (FUTURE.test(t) || /(mesaj|görev|hatırlat|not al|sayfa|aç$|göster)/.test(t)) return false;
  return INFO.test(t);
}

// ---- Yoklamayla eşleştirme: günlükte söylenen katılanlar ↔ o günün yoklaması ----
// athletes: kulüp sporcuları { id, studentName, status, att: { 2026: { "10-03": "present" } } }
const plainName = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâî]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i" })[c])
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const stateOn = (a, date) => a?.att?.[date.slice(0, 4)]?.[date.slice(5, 10)] || "";

// O gün yoklamada "geldi" olanların adları
export const presentOn = (athletes, date) => (athletes || []).filter((a) => stateOn(a, date) === "present").map((a) => a.studentName).filter(Boolean);

// Söylenen adları etkin sporculara eşler: tam ad, ya da her sözcük sporcunun adında sözcük başı olarak geçiyorsa ve tek sporcu uyuyorsa
// ("Ali" → Ali Kaya, iki Ali varsa bulunamadı sayılır). Sonuç { ids, names (tam adlar), unknown }
export function matchNames(names, athletes) {
  const list = (athletes || []).filter((a) => a.status === "active" && a.studentName);
  const ids = [];
  const unknown = [];
  for (const raw of names || []) {
    const q = plainName(raw).split(" ").filter(Boolean);
    if (!q.length) continue;
    const full = list.filter((a) => plainName(a.studentName) === q.join(" "));
    const hits = full.length
      ? full
      : list.filter((a) => {
          const parts = plainName(a.studentName).split(" ");
          return q.every((w) => parts.some((p) => p === w || (w.length >= 3 && p.startsWith(w))));
        });
    if (hits.length === 1) !ids.includes(hits[0].id) && ids.push(hits[0].id);
    else unknown.push(String(raw));
  }
  return { ids, names: ids.map((id) => list.find((a) => a.id === id).studentName), unknown };
}

// Günlük ↔ yoklama: söylenen katılanlar yoklamada "geldi" olur (gelmedi/izinli de olsa söylenen geçerli); günlükteki katılanlar
// yoklamada gelenlerle birleşir (yoklama alındıysa sorulmaz). Sonuç { log, changes { sporcuId: "present" }, marked [ad], unknown [ad] }
export function joinAttendance(log, date, athletes) {
  const m = matchNames(log?.athletes || [], athletes);
  const changes = {};
  const marked = [];
  for (const id of m.ids) {
    const a = athletes.find((x) => x.id === id);
    if (stateOn(a, date) !== "present") {
      changes[id] = "present";
      marked.push(a.studentName);
    }
  }
  const present = presentOn(athletes, date);
  const all = [...new Set([...present, ...m.names, ...m.unknown])];
  return { log: all.length ? { ...(log || {}), athletes: all } : log, changes, marked, unknown: m.unknown, fromAtt: !m.ids.length && !m.unknown.length ? present : [] };
}

// Asistan cevabına ek: "Yoklamada geldi olarak işaretledim: Ali Kaya, Ayşe Şahin. Bulamadım: Mehmet."
// ya da (katılan söylenmediyse) "Katılanları yoklamadan aldım: 6 sporcu."
const few = (arr) => (arr.length > 4 ? `${arr.length} sporcu` : arr.join(", "));
export function attLine({ marked = [], unknown = [], fromAtt = [] } = {}) {
  return [
    marked.length ? `Yoklamada geldi olarak işaretledim: ${few(marked)}.` : "",
    unknown.length ? `Sporcularda bulamadım: ${unknown.join(", ")}.` : "",
    fromAtt.length ? `Katılanları yoklamadan aldım: ${few(fromAtt)}.` : "",
  ].filter(Boolean).join(" ");
}
