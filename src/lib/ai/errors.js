// Yapay zeka hatalarını sınıflar: sunucu günlüğünde tek satırda neden ve telefonda anlaşılır mesaj.
// code: quota (kota doldu) · busy (servis yoğun) · timeout (zamanında yanıt yok) · network (ulaşılamadı)
//       · unclear (yanıt anlaşılamadı) · nokey (anahtar/model tanımlı değil) · other
const LABEL = {
  quota: "KOTA DOLDU",
  busy: "SERVİS YOĞUN",
  timeout: "ZAMAN AŞIMI",
  network: "ULAŞILAMADI",
  unclear: "YANIT ANLAŞILAMADI",
  nokey: "ANAHTAR YOK",
  other: "BİLİNMEYEN HATA",
};

export function aiErrorKind(e) {
  const m = String(e?.message || e || "");
  if (e?.status === 429 || /429|kota|quota|RESOURCE_EXHAUSTED/i.test(m)) return "quota";
  if (e?.status === 503 || /yoğun|503|UNAVAILABLE|overloaded/i.test(m)) return "busy";
  if (e?.name === "AbortError" || /zaman aşımı|timeout|timed out|aborted/i.test(m)) return "timeout";
  if (/fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|network/i.test(m)) return "network";
  if (/boş yanıt|geçersiz JSON|Araç çıktısı gelmedi|parse|Unexpected token/i.test(m)) return "unclear";
  if (/anahtar|API key|api_key|401|403|PERMISSION_DENIED|GEMINI_MODEL boş/i.test(m)) return "nokey";
  return "other";
}

// Telefonda gösterilecek açıklama (ne oldu, ne yapmalı)
export function aiErrorText(kind, e) {
  if (kind === "quota") return e?.daily ? "Yapay zekanın günlük kotası doldu (sabah 10 civarı yenilenir)." : `Yapay zekanın kotası şu an dolu${e?.retryAfter ? `, ${e.retryAfter} saniye sonra tekrar dene` : ""}.`;
  if (kind === "busy") return "Yapay zeka servisi şu an çok yoğun; biraz sonra tekrar dene.";
  if (kind === "timeout") return "Yapay zeka zamanında yanıt vermedi (zaman aşımı); tekrar dene.";
  if (kind === "network") return "Yapay zeka servisine ulaşılamadı; bağlantıyı kontrol et.";
  if (kind === "unclear") return "Yapay zekanın yanıtı anlaşılamadı; isteği biraz farklı söyleyip tekrar dene.";
  if (kind === "nokey") return "Yapay zeka anahtarı ya da modeli tanımlı değil (Netlify ortam değişkenleri).";
  return "Asistan şu an yanıt vermedi.";
}

// Sunucu günlüğüne tek satır: [assistant] HATA · ZAMAN AŞIMI · gemini · 20.3 sn · ayrıntı
export function logAiError(tag, provider, e, ms) {
  const kind = aiErrorKind(e);
  console.error(`[${tag}] HATA · ${LABEL[kind]} · ${provider || "?"}${ms ? ` · ${(ms / 1000).toFixed(1)} sn` : ""} · ${String(e?.message || e).slice(0, 300)}`);
  return kind;
}
