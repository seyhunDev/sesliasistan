// Açık sohbetin bağlamı (yapay zekaya her istekte giden kısa özet). Tam konuşma gitmez, kota az yenir:
// - son birkaç tur, kısaltılmış (toplam en çok HISTORY_MAX karakter; ön cevaplar "Tamam." gitmez)
// - bu sohbette hazırlanan son mesaj taslağı (alıcı, metin, durum): "şunu da ekle", "saati 10 yap" o taslağı değiştirir
// Sohbet kapanınca (kapat, panel kapanır) uygulama bunları sıfırlar.

export const HISTORY_MAX = 1500;
// Ekrandan kalkan konuşma (küreye yeniden basınca, kapatıp açınca) bu süre yapay zekaya geçmiş olarak gitmeye devam eder
export const PAST_MS = 15 * 60e3;
const TURN_MAX = 300;
export const DRAFT_TEXT_MAX = 1000;
// Taslak bu kadar kullanıcı cümlesinden sonra bağlamdan düşer (konu değişmiştir)
export const DRAFT_AGE = 6;

const cut = (s, n) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

// turns: [{ role, text, pre?, chip? }] → [{ role, text }]; en yeniler önce sığdırılır, eskiler düşer
export function historyFor(turns, { max = HISTORY_MAX, last = 6 } = {}) {
  const rows = (Array.isArray(turns) ? turns : []).filter((t) => t && !t.pre && String(t.text || "").trim()).slice(-last);
  const out = [];
  let used = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    const text = cut(rows[i].text, TURN_MAX);
    if (used + text.length > max && out.length) break;
    used += text.length;
    out.unshift({ role: rows[i].role === "assistant" ? "assistant" : "user", text });
  }
  return out;
}

// Taslağın durumu (yapay zekaya giden sözcükler)
export const DRAFT_STATE = { pending: "onay bekliyor", sent: "gönderildi", wa: "WhatsApp'ta açıldı", dropped: "vazgeçildi" };

// Telefondaki taslak kaydı → yapay zekaya giden küçük nesne
export function draftFor(d) {
  if (!d || !String(d.text || "").trim()) return null;
  return {
    to: cut(d.label || d.to, 60),
    text: cut(d.text, DRAFT_TEXT_MAX),
    state: DRAFT_STATE[d.state] || DRAFT_STATE.pending,
    ...(d.wa ? { wa: d.wa === "only" ? "only" : "also" } : {}),
  };
}

// Sunucu: gelen taslağı temizler ve istemdeki bölümü yazar (yoksa "")
export function draftBlock(raw) {
  if (!raw || typeof raw !== "object") return "";
  const to = String(raw.to ?? "").replace(/[^\p{L}\p{N} .'()-]/gu, "").trim().slice(0, 60);
  const text = String(raw.text ?? "").replace(/"""/g, "”").trim().slice(0, DRAFT_TEXT_MAX);
  if (!text) return "";
  const state = Object.values(DRAFT_STATE).includes(raw.state) ? raw.state : DRAFT_STATE.pending;
  const via = raw.wa === "only" ? " (yalnız WhatsApp grubu)" : raw.wa === "also" ? " (uygulama + WhatsApp)" : "";
  return `## AÇIK MESAJ TASLAĞI (bu sohbette hazırlandı)\nAlıcı: ${to || "(belirsiz)"}${via}\nDurum: ${state}\nMetin:\n"""\n${text}\n"""`;
}

// Sunucu: geçmişi istem satırlarına çevirir, toplam uzunluk sınırlı (eski uygulama sürümü uzun geçmiş gönderse de)
export function historyBlock(list, max = HISTORY_MAX + 300) {
  const rows = (Array.isArray(list) ? list : []).slice(-6).map((h) => `${h?.role === "assistant" ? "Asistan" : "Kullanıcı"}: ${String(h?.text ?? "").slice(0, 400)}`);
  while (rows.length > 1 && rows.join("\n").length > max) rows.shift();
  return rows.join("\n").slice(-max);
}

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
// Açıkça mesajın kendisinden söz ediliyor
const MSG_WORD = /(^|\s)(mesaj\S*|metn\S*|metin\S*|yazıy\S*|yazıya|yazıda|taslağ\S*|taslak)(\s|$)/;
// Değişiklik isteği ("şunu da ekle", "daha kısa yaz", "saati 10 yap", "yarın yerine cuma olsun")
const EDIT_WORD =
  /(ekle\S*|değiştir\S*|çıkar\S*|kaldır\S*|düzelt\S*|kısalt\S*|uzat\S*|daha (kısa|uzun|kibar|resmi|samimi|net|sade|sıcak|anlaşılır|düzgün)|yerine|olsun|(^|\s)yap(\s|$)|sonuna|başına|ayrıca|bir de|unutma|(şöyle|diye|de|da) yaz|(bunu|şunu|onu) da|belirt|vurgula)/;
// Başka bir iş: kayıt, sayfa, liste… (bunlar taslak değişikliği sayılmaz, her zamanki yoldan gider)
const OTHER_JOB =
  /(takvim\S*|(^|\s)plan(ı|a|la\S*)?(\s|$)|görev\S*|(^|\s)not(\s+(al|düş|et)|lar\S*|a\s)|listey?e|listeden|envanter\S*|yoklama\S*|sayfa\S*|fatura\S*|(^|\s)fiş\S*|yarış\S*|doğum gün\S*|kişi(lere|yi)? ekle)/;

// Bekleyen/az önce hazırlanan mesaj taslağı varken bu cümle o taslağı değiştirme isteği mi
export function isDraftEdit(s) {
  const t = low(s).trim();
  if (!t) return false;
  if (MSG_WORD.test(t)) return !OTHER_JOB.test(t) || /mesaj/.test(t);
  return EDIT_WORD.test(t) && !OTHER_JOB.test(t);
}

// Taslak değişikliğinde ön cevap: yalnız "Tamam."; yapay zekaya "yeni kayıt değil, taslağı değiştir" ipucu
// (önceki ipucu "tür=plan" diyordu, yapay zeka mesajı değiştirmek yerine plan açıyordu)
export function editPrecue() {
  const line = "Tamam.";
  return { kind: "edit", line, work: "Mesaj düzenleniyor", hint: `Kullanıcıya az önce şu söylendi: "${line}"\nTelefonun ilk anladığı: AÇIK MESAJ TASLAĞINDA değişiklik (yeni kayıt değil)` };
}

// Aynı alıcı mı (yeni taslak eskisinin WhatsApp seçimini korusun diye)
export function sameTo(a, b) {
  const n = (x) => low(x).replace(/\s*\(.*\)\s*$/, "").replace(/\s+(grubu|grubuna)$/, "").trim();
  return !!n(a) && n(a) === n(b);
}

// ---- Sohbet hafızası (inceleme adım 4): bu sohbette az önce konuşulan yarış, kişi, sporcu, gönderi, kayıt ----
// Akışlar ayrı yapay zeka istekleri kullandığı için "o yarış", "ona yaz", "onu arşive al" gibi göndermeler tek yerden
// çözülür: telefon hafızayı tutar, ana yapay zekaya ve görev listesi planlayıcısına küçük bir blok olarak gider.
export const MEMO_KEYS = { race: "Yarış", person: "Kişi", athlete: "Sporcu", post: "Gönderi", record: "Kayıt" };
export const newMemo = () => ({});
export function remember(memo, key, value) {
  const v = cut(value, 80);
  if (!MEMO_KEYS[key] || !v) return memo || {};
  return { ...(memo || {}), [key]: v, last: key };
}
// Telefon → sunucu: yalnız bilinen alanlar, kısaltılmış
export function memoFor(memo) {
  const out = {};
  for (const k of Object.keys(MEMO_KEYS)) if (memo?.[k]) out[k] = cut(memo[k], 80);
  if (memo?.last && out[memo.last]) out.last = memo.last;
  return Object.keys(out).length ? out : null;
}
// Sunucu: istem bölümü (yoksa "")
export function memoBlock(raw) {
  if (!raw || typeof raw !== "object") return "";
  const clean = (v) => String(v ?? "").replace(/["`#\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const rows = Object.entries(MEMO_KEYS).filter(([k]) => clean(raw[k])).map(([k, label]) => `- ${label}: ${clean(raw[k])}${raw.last === k ? " (en son bu)" : ""}`);
  return rows.length ? `## SOHBETTE AZ ÖNCE KONUŞULANLAR\n"o", "onu", "ona", "bunun için", "aynı yarış" gibi göndermeler bunlardır (en son konuşulan önce).\n${rows.join("\n")}` : "";
}
// "onu arşive al", "bunu sil": ad yerine gönderme sözü
export function isPronoun(name) {
  return /^(o|bu|şu|onu|bunu|şunu|ona|buna|onun|bunun|o kişi\p{L}*|bu kişi\p{L}*|o sporcu\p{L}*|bu sporcu\p{L}*|aynı kişi\p{L}*|aynı sporcu\p{L}*)$/u.test(String(name ?? "").toLocaleLowerCase("tr-TR").replace(/[.,!?'’]/g, "").trim());
}

// ---- Tek bekleyen soru: asistan bir soru sorunca (yarış seçimi, alıcı, onay, kişi, günlük tarihi…) öncekiler kapanır ----
// Böylece sonraki cümle yalnız EN SON sorulan soruya cevap sayılır. Bekleyen sorunun boş hâli:
export const ASK_EMPTY = { attName: null, raceChoice: [], to: null, log: null, person: null, invoice: null, ok: null, athlete: false, raceFollow: null, event: null, inv: null, planTime: null };
// kind dışındaki bütün soruların sıfırlanacak listesi (kind boşsa hepsi)
export function asksToClear(kind = "") {
  return Object.keys(ASK_EMPTY).filter((k) => k !== kind);
}

// ---- Son sohbetler (Seyhun, 2026-10-14: "son 5 oturumu tutalım, gerektiğinde yapay zekaya gönderelim"): asistan her
// kapanınca o oturumun kısa özeti (son birkaç tur + hafıza) bu cihazda saklanır, en çok SESSIONS_MAX; her istekte küçük bir
// blok olarak gider. "Az önceki yarışın tarihini değiştir" saatler sonra da anlaşılır.
export const SESSIONS_MAX = 5;
const SESSION_TURNS = 6;
const SESSION_LINE = 160;
const SESSIONS_TOTAL = 1800;
// Bir oturumun özeti: { id, at, lines: ["K: …", "A: …"], memo? }; kullanıcı hiç konuşmadıysa null
export function sessionOf(turns, memo, { id = 0, at = Date.now() } = {}) {
  const rows = (Array.isArray(turns) ? turns : []).filter((t) => t && !t.pre && String(t.text || "").trim());
  if (!rows.some((t) => t.role === "user")) return null;
  const lines = rows.slice(-SESSION_TURNS).map((t) => `${t.role === "assistant" ? "A" : "K"}: ${cut(t.text, SESSION_LINE)}`);
  const m = memoFor(memo);
  return { id, at, lines, ...(m ? { memo: m } : {}) };
}
// Listeye ekler: aynı açılışın (id) parçaları birleşir, en eskiler düşer
export function addSession(list, s, max = SESSIONS_MAX) {
  const prev = (Array.isArray(list) ? list : []).filter((x) => x && Array.isArray(x.lines));
  if (!s) return prev.slice(-max);
  const same = s.id ? prev.find((x) => x.id === s.id) : null;
  const merged = same ? { ...s, lines: [...same.lines, ...s.lines].slice(-SESSION_TURNS), memo: s.memo || same.memo } : s;
  return [...prev.filter((x) => x !== same), merged].sort((a, b) => a.at - b.at).slice(-max);
}
// "az önce", "25 dk önce", "3 saat önce", "dün 14:30", "12 Eki 09:05"
export function whenText(at, now = Date.now()) {
  const min = Math.max(0, Math.round((now - at) / 60e3));
  if (min < 2) return "az önce";
  if (min < 60) return `${min} dk önce`;
  if (min < 6 * 60) return `${Math.round(min / 60)} saat önce`;
  const d = new Date(at);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const day = (x) => new Date(x).toDateString();
  if (day(at) === day(now)) return `bugün ${hm}`;
  if (day(at) === day(now - 864e5)) return `dün ${hm}`;
  return `${d.getDate()} ${["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][d.getMonth()]} ${hm}`;
}
// Telefon → sunucu: eskiden yeniye; skipAt: zaten konuşma geçmişi olarak giden (PAST_MS içindeki) oturum
export function sessionsFor(list, now = Date.now(), skipAt = 0) {
  return (Array.isArray(list) ? list : [])
    .filter((s) => s && Array.isArray(s.lines) && s.lines.length && s.at !== skipAt)
    .slice(-SESSIONS_MAX)
    .map((s) => ({ when: whenText(s.at, now), lines: s.lines.slice(-SESSION_TURNS).map((l) => cut(l, SESSION_LINE + 3)), ...(s.memo ? { memo: s.memo } : {}) }));
}
// Sunucu: istem bölümü (yoksa ""); en yeniler önce sığdırılır
export function sessionsBlock(raw) {
  if (!Array.isArray(raw) || !raw.length) return "";
  const clean = (v, n) => String(v ?? "").replace(/"""/g, "”").replace(/[\n\r#]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
  const parts = [];
  let used = 0;
  for (const s of raw.slice(-SESSIONS_MAX).reverse()) {
    const lines = (Array.isArray(s?.lines) ? s.lines : []).slice(-SESSION_TURNS).map((l) => clean(l, SESSION_LINE + 3)).filter(Boolean);
    if (!lines.length) continue;
    const memo = s?.memo && typeof s.memo === "object" ? Object.entries(MEMO_KEYS).filter(([k]) => clean(s.memo[k], 80)).map(([k, label]) => `${label}: ${clean(s.memo[k], 80)}`) : [];
    const text = `### ${clean(s?.when, 30) || "önceki"}\n${lines.map((l) => l.replace(/^K:/, "Kullanıcı:").replace(/^A:/, "Asistan:")).join("\n")}${memo.length ? `\n(${memo.join(", ")})` : ""}`;
    if (used + text.length > SESSIONS_TOTAL && parts.length) break;
    used += text.length;
    parts.unshift(text);
  }
  return parts.length
    ? `## SON SOHBETLER (asistan kapatılıp açılmadan önceki oturumlar, eskiden yeniye)\nKullanıcı önceki bir işe dönerse ("az önce eklediğim", "geçen seferki yarış", "onun saatini değiştir") buradan anla. Aksi halde YOK SAY: buradaki işleri yeniden yapma, cevabında anma.\n${parts.join("\n")}`
    : "";
}
