// Gemini 3.5 Transcribe (Google'ın konuşmadan yazıya modeli): istek gövdesi, kelime listesi, yanıtın okunması.
// "SMART" kip: "eee, ııı" gibi dolgular, tekrarlar, yarım başlangıçlar atılır, "3'te, yok 2'de" gibi düzeltmede son hali yazılır,
// noktalama konur. Saf fonksiyonlar (test edilir); istek /api/transcribe'da.
// Dakika fiyatı ve Kullanım satırı: STT_PRICE_MIN, sttUsage (src/lib/aiUsage.js)

// Kelime listesi (custom vocabulary): sık kelimeler + kişi ve yarış adları. Google en iyi sonucu ~100 terimde veriyor.
export function sttVocab(hint, names = [], terms = []) {
  const base = String(hint || "")
    .replace(/\.$/, "")
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2); // "aç" gibi iki harfli genel kelimeler listeye girmez
  return [...new Set([...names, ...terms, ...base])].filter(Boolean).slice(0, 100);
}

export const sttBody = (data, mimeType, vocab = []) => ({
  contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }] }],
  generationConfig: {
    audioTranscriptionConfig: { languageCodes: ["tr-TR"], mode: "SMART", ...(vocab.length ? { customVocabulary: vocab } : {}) },
  },
});

// Yanıttaki metin tek satır olur: SMART kip listeleri madde madde yazabilir, asistan düz cümle bekler
export function sttText(json) {
  const parts = json?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text || "")
    .join("\n")
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Kaydın süresi (sn): telefonun gönderdiği WAV'da başlıktan; başka biçimde boyuttan kaba tahmin (~32 kbit/sn)
export function audioSecs(buf, type = "") {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf || []);
  const wav = /wav/i.test(type) || (b.length > 44 && String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF");
  if (wav && b.length > 44) {
    const rate = b[28] | (b[29] << 8) | (b[30] << 16) | (b[31] << 24); // bayt/sn
    if (rate > 0) return Math.max(1, Math.round((b.length - 44) / rate));
  }
  return Math.max(1, Math.round(b.length / 4000));
}
