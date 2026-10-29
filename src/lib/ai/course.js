// Parkur ölçümü yapay zekâsı (Seyhun 2026-10-28: "orsa şamandırası dediğimde orada algılanmalı, derece olarak eklemeliyiz"):
// sesle söylenen ya da yazılan tek cümleyi parkur ölçümüne çevirir (lib/raceCourse.js). Önce telefondaki kural (parseCourseText)
// dener; anlamazsa bu çağrı yapılır. Dönen yanıt sunucuda cleanObs ile denetlenir.

export const COURSE_SYSTEM = `Sen bir yelken yarışı antrenörünün parkur ölçüm defterisin. Kullanıcı Türkçe tek bir cümle söyler; onu tek bir kayda çevir.
Kayıt türleri:
- "obs": açı ölçümü. obs.kind:
  - "wind": rüzgârın GELDİĞİ yön (derece) ve varsa hızı (knot, kn).
  - "axis": komitenin parkuru kurduğu eksen (orsa yönü).
  - "line": start hattı açısı. ref "pin": pin (line) botundan komite botunu gördüğü açı; ref "komite": komite (ya da hakem) botundan pin'i gördüğü açı; "hakem botundan pin 50", "pin 50" gibi cümleler ref "komite".
  - "mark": bir şamandıraya bakış açısı. ref "m1" orsa/1 nolu, "m2" apaz/2 nolu, "m3" 3 nolu, "m4" 4 nolu.
  - "leg": ayak yönü. ref "m1m2" orsadan apaza, "m2m1" apazdan orsaya.
  obs.by: ölçen "ben" (varsayılan), "komite" (komite/hakem komite botu), "hakem" (hakem botu).
  obs.spot: rüzgâr bir yerde ölçüldüyse o yer: "m1".."m4", "komite", "pin"; yoksa boş.
- "pt": "X burada" denince işaretlenen yer: pt "komite", "pin", "m1".."m4".
- "len": orsa ayağının uzunluğu metre (mil × 1852).
- "none": cümle bunlardan biri değilse.
Sayıları yazıyla söylenmiş olabilir ("üç yüz otuz" = 330). Derece 0-359. Tahmin etme; cümlede yoksa alanı boş bırak.`;

export const courseUser = (text) => `Cümle: """${String(text || "").replace(/\s+/g, " ").trim().slice(0, 300)}"""`;

export const COURSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["obs", "pt", "len", "none"] },
    kind: { type: "string", enum: ["wind", "axis", "line", "mark", "leg"] },
    ref: { type: "string" },
    deg: { type: "number" },
    kn: { type: "number" },
    by: { type: "string", enum: ["ben", "komite", "hakem"] },
    spot: { type: "string" },
    pt: { type: "string" },
    orsa: { type: "number" },
  },
  required: ["type"],
};
