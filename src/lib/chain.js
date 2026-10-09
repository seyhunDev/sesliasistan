// Sıralı görev zinciri (Seyhun: "şu yarışı oluştur, sonra Instagram'da gönderi hazırla, sonra aidatlara nakit yaz, sonra
// yoklamaya şu sporcular katıldı de; bunları sırayla yapsın", 2026-10-09). Cümle "sonra / ardından / daha sonra / en son"
// sözleriyle işlere bölünür; her iş sırayla kendi akışında yapılır, bir iş soru sorarsa cevabı beklenir, bitince sıradakine geçilir.
// "10'dan sonra", "antrenmandan sonra" gibi zaman sözleri bölmez: ayırıcı yalnız noktalama ya da "ve"den sonra gelen "sonra"dır.
const SPLIT = /(?:[.;,!]\s*|\s+ve\s+)(?:daha\s+sonra|sonrasında|sonra|ardından|en\s+son(?:\s+olarak)?|son\s+olarak)(?:\s+(?:da|de|ise))?[,\s]+/giu;
// Baştaki bağlaç ve "git" ("sonra git Instagram'da…", "gidip aidatlara…")
const LEAD = /^(?:(?:ve|ayrıca|bir de|şimdi|hemen)\s+)*(?:git(?:\s+|,\s*)|gidip\s+|gidelim\s+)?/iu;

export function splitChain(text) {
  const s = String(text || "").trim();
  if (!s) return [];
  const parts = s
    .split(SPLIT)
    .map((x) => x.replace(LEAD, "").replace(/[.,;\s]+$/u, "").trim())
    .filter(Boolean);
  // Tek kelimelik parça (ör. "tamam") öncekine eklenir
  const out = [];
  for (const p of parts) {
    if (out.length && p.split(/\s+/).length < 2) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out;
}

// Önceki işe gönderme: "bunun için", "o yarış için", "bu yarışa" (zincirde az önce açılan yarış)
export const refersBack = (s) => /(^|\s)(bunun|onun|bunu|bu yarış\p{L}*|o yarış\p{L}*|aynı yarış\p{L}*|yarış(?:ı|ın)? için)(\s|$|,)/iu.test(String(s || ""));
