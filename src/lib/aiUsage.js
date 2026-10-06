// Ayarlar › Kullanım: sunucudaki sayaçların okunur hali (saf fonksiyonlar, test edilir)
export const AI_LABELS = {
  assistant: "Asistan",
  interpret: "Kayıt anlama",
  transcribe: "Ses tanıma",
  receipt: "Fiş okuma",
  replies: "Hazır yanıt",
  meeting: "Toplantı özeti",
  schedule: "Ders programı",
  attendance: "Sesli yoklama",
  race: "Yarış (asistan)",
  "race-notice": "Yarış talimatı",
  "race-budget": "Yarış bütçesi",
  "race-around": "Yarış çevresi",
  "event-plan": "Etkinlik planı",
  inventory: "Envanter",
  invoice: "Fatura okuma",
  "training-log": "Antrenman günlüğü",
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
export function sttUsage(doc) {
  const min = Math.round(((Number(doc?.["stt-sec"]) || 0) / 60) * 10) / 10;
  return { min, cost: min * STT_PRICE_MIN };
}

// Yaklaşık maliyet ($): metin istekleri × istek başı fiyat + görseller
export const usd = (n) => `$${(Math.round(n * 100) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const monthName = (ym) => (ym ? new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : "");
