// Ayarlar › Kullanım: sunucudaki sayaçların okunur hali (saf fonksiyonlar, test edilir)
export const AI_LABELS = {
  assistant: "Asistan",
  interpret: "Kayıt anlama",
  transcribe: "Ses tanıma",
  live: "Canlı yazı (bağlantı)",
  receipt: "Fiş okuma",
  replies: "Hazır yanıt",
  meeting: "Toplantı özeti",
  schedule: "Ders programı",
  word: "İngilizce kelime kartı",
  attendance: "Sesli yoklama",
  race: "Yarış (asistan)",
  "race-notice": "Yarış talimatı",
  "race-results": "Yarış sonuçları",
  "race-budget": "Yarış bütçesi",
  tasks: "Görev listesi (çoklu iş)",
  "race-around": "Yarış çevresi",
  "event-plan": "Etkinlik planı",
  "chat-plan": "Mesajdaki dosyadan plan",
  inventory: "Envanter",
  invoice: "Fatura okuma",
  "training-log": "Antrenman günlüğü",
  fitness: "Fitness",
  "fitness-intro": "Fitness tanıtım kartları",
  "fitness-import": "Fitness programı (PDF/metin)",
  "fitness-poster": "Afişten hareket fotoğrafları",
  food: "Beslenme (yemek okuma)",
  "bank-analyze": "Banka Excel incelemesi",
  "post-caption": "Instagram yazısı",
  person: "Kişi ekleme",
  "athlete-names": "Ses adları",
};

// { month, org, by, <iş>: n } → { rows: [[ad, n]], total }
export function usageRows(doc) {
  const rows = Object.entries(doc || {})
    .filter(([k, v]) => AI_LABELS[k] && Number(v) > 0)
    .map(([k, v]) => [AI_LABELS[k], Number(v)])
    .sort((a, b) => b[1] - a[1]);
  return { rows, total: rows.reduce((n, [, v]) => n + v, 0) };
}

// Gemini ses tanıma (Gemini 3.5 Transcribe): ses saniyesi sayılır, ücret dakika başına
export const STT_PRICE_MIN = 0.005;
// Gemini Live canlı yazı (dinlerken akan ses): ses girişi ~0,005 $/dk + kısa cevap payı, tahmini
export const LIVE_PRICE_MIN = 0.006;
export function sttUsage(doc) {
  const min = Math.round(((Number(doc?.["stt-sec"]) || 0) / 60) * 10) / 10;
  return { min, cost: min * STT_PRICE_MIN };
}

// Google seslendirme (Cloud Text-to-Speech): seslendirilen harf sayılır; ayda 1 milyon harf ücretsiz (Chirp 3 HD)
export const TTS_FREE = 1000000;
// Gemini-TTS (gemini-2.5-flash-tts): ses çıktısı 10 $ / 1 milyon token, saniyede 25 token; Türkçe ≈ 14 harf/sn
// → harf başı ≈ 0,000018 $ (1000 harf ≈ 2 sent), tahmini. Önbellekten gelen ses sayılmaz.
export const TTS_GEM_PRICE_CHR = 0.000018;
export function ttsUsage(doc) {
  const chars = Number(doc?.["tts-chr"]) || 0;
  const gem = Number(doc?.["tts-gem"]) || 0;
  return { chars, pct: Math.round((chars / TTS_FREE) * 100), gem, gemCost: gem * TTS_GEM_PRICE_CHR };
}

// Yaklaşık maliyet ($): metin istekleri × istek başı fiyat + görseller
export const usd = (n) => `$${(Math.round(n * 100) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const monthName = (ym) => (ym ? new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : "");

// Ayarlar › Harcamalar: kullanılan dış servisler, bu ayın tahmini tutarı (TL) ve servisin kendi fatura/kullanım sayfası.
// j: /api/usage?ai=1 cevabı. Gemini = token harcaması (usd) + görsel ve animasyon sayaçları; Google seslendirme ücretsiz kotayı
// aşarsa aşan harf ≈ 30 $ / 1 milyon (Chirp 3 HD). Firebase ve diğerlerini uygulama saymaz (tl null). Seyhun 2026-11-26.
export const SERVICE_LINKS = {
  gemini: "https://console.cloud.google.com/billing",
  tts: "https://console.cloud.google.com/apis/api/texttospeech.googleapis.com/metrics?project=sesliasistan-3e95a",
  firebase: "https://console.firebase.google.com/project/sesliasistan-3e95a/usage",
  netlify: "https://app.netlify.com/",
  anthropic: "https://console.anthropic.com/settings/billing",
  openai: "https://platform.openai.com/settings/organization/billing/overview",
  groq: "https://console.groq.com/settings/billing",
};
export const TTS_OVER_PRICE_CHR = 0.00003;
const IMG_KINDS = [
  ["postimg", "görsel"],
  ["engpic", "kalıp resmi"],
  ["fitpic", "hareket fotoğrafı"],
  ["fitanim", "animasyon"],
];
export function servicesOf(j) {
  const rate = Number(j?.rate) || 42;
  const month = j?.ai?.month;
  const textTl = (Number(month?.usd) || 0) * rate;
  const imgs = j?.imgs || (j?.img ? { postimg: j.img } : {});
  let imgTl = 0;
  const parts = [];
  for (const [k, label] of IMG_KINDS) {
    const n = Number(imgs[k]?.month) || 0;
    imgTl += (Number(imgs[k]?.cost) || 0) * rate;
    if (n) parts.push(`${n} ${label}`);
  }
  const tts = ttsUsage(month);
  const ttsTl = Math.max(0, tts.chars - TTS_FREE) * TTS_OVER_PRICE_CHR * rate;
  const keys = j?.keys || {};
  const rows = [{ id: "gemini", name: "Google Gemini", tl: textTl + imgTl, sub: ["yazı ve ses", ...parts].join(" · "), btn: "Fatura" }];
  if (keys.googleTts || tts.chars > 0) rows.push({ id: "tts", name: "Google seslendirme", tl: ttsTl, sub: `ücretsiz kotanın %${tts.pct}'i`, btn: "Konsol" });
  rows.push({ id: "firebase", name: "Firebase", tl: null, sub: "uygulama saymaz", btn: "Kullanım" });
  rows.push({ id: "netlify", name: "Netlify", tl: 0, sub: "ücretsiz plan", btn: "Kullanım", free: true });
  if (keys.anthropic) rows.push({ id: "anthropic", name: "Anthropic", tl: null, sub: "uygulama saymaz", btn: "Fatura" });
  if (keys.openai) rows.push({ id: "openai", name: "OpenAI", tl: null, sub: "uygulama saymaz", btn: "Fatura" });
  if (keys.groq) rows.push({ id: "groq", name: "Groq", tl: null, sub: "uygulama saymaz", btn: "Fatura" });
  for (const r of rows) r.href = SERVICE_LINKS[r.id];
  return { rows, total: rows.reduce((a, r) => a + (r.tl || 0), 0) };
}
