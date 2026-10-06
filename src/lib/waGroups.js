// WhatsApp grup bağlantıları (Ayarlar › WhatsApp grupları; users/{uid}.waGroups [{name, link}]).
// WhatsApp'ta gruba metinle açılan bağlantı yok; kayıtlı davet bağlantısı grubu doğrudan açar,
// metin panoya kopyalanır, grupta yapıştırılıp gönderilir.

export const WA_GROUP_MAX = 10;
export const WA_GROUP_NAMES = ["Sporcular", "Aileler", "Ekip"];

// "https://chat.whatsapp.com/KOD?mode=…" → "https://chat.whatsapp.com/KOD" (değilse "")
export function cleanWaLink(raw) {
  const m = String(raw || "").trim().match(/^(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{10,40})(?:[/?#].*)?$/i);
  return m ? `https://chat.whatsapp.com/${m[1]}` : "";
}

export function cleanWaGroups(list) {
  const out = [];
  for (const g of Array.isArray(list) ? list : []) {
    const name = String(g?.name || "").trim().slice(0, 40);
    const link = cleanWaLink(g?.link);
    if (!name || !link || out.some((x) => stem(x.name) === stem(name))) continue;
    out.push({ name, link });
    if (out.length >= WA_GROUP_MAX) break;
  }
  return out;
}

// Ad kökü: Türkçe harfsiz, "grubu" ve çoğul eki atılır (Sporcular = Sporcu grubu, Aileler = Aile)
function stem(s) {
  return String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c])
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(whatsapp|grubu|grubumuz|grup)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(lar|ler)$/, "");
}

// Uygulamadaki grubun (Sporcular, Ekip, Aile, kurulan grup) WhatsApp bağlantısı
export function waGroupFor(label, groups) {
  const k = stem(label);
  if (!k) return "";
  return cleanWaGroups(groups).find((g) => stem(g.name) === k)?.link || "";
}
