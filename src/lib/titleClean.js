// Kayıt başlığından kullanıcının hitap ve dolgu sözleri atılır: "Bana için akşam yemeği" → "Akşam yemeği".
// Başlık konuyu anlatır; "bana", "benim için", "lütfen", "bir", "planla/ekle" gibi sözler başlıkta durmaz.
const LEAD = /^(?:ee+|şey|hmm+|lütfen|rica etsem|acaba|hemen|bir de|bana|bize|benim\s+için|bizim\s+için|benim|bizim|için|yarın|bugün|bu\s+akşam|bu\s+sabah|bir)(?=\s|$)[\s,]*/i;
const TAIL = /[\s,]+(?:planla(?:r\s+mısın|yalım|yabilir\s+misin)?|ekle(?:r\s+misin|yelim|yebilir\s+misin)?|oluştur(?:ur\s+musun|alım|abilir\s+misin)?|kaydet|ayarla|lütfen|için|olsun|bana|bize)$/i;

const cap = (x) => x.charAt(0).toLocaleUpperCase("tr-TR") + x.slice(1);

export function cleanTitle(t) {
  const raw = String(t || "").replace(/\s+/g, " ").trim();
  let x = raw;
  for (let k = 0; k < 6; k++) {
    const y = x.replace(LEAD, "").replace(TAIL, "").replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "").trim();
    if (y === x) break;
    x = y;
  }
  // Hepsi dolgu söz idiyse ("bana bir") eskisi kalır
  return x ? cap(x) : raw;
}
