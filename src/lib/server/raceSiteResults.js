import { resultTableOf } from "../pdfLines.js";
import { cleanSheet } from "../resultSheet.js";
import { RESULTS_SCHEMA, RESULTS_SYSTEM } from "../ai/raceResultsAi.js";

// ---- Sonuç belgesi (Seyhun 2026-11-09, canlı genel sıralama): siteden gelen sonuç sunucuda okunur, genel liste hemen
// raceLive/{yarış}/sheets/site-{belge}'ye yazılır (/api/canli fleetsOf oradan okur). Bizim sporcuların sırası (race.results) yine
// telefonda işlenir (state "new"); telefon kendi kopyasını yazınca bu kayıt silinir (resultsImport replace). Okunamazsa null.
export async function takeResults({ db, orgId, raceId, d, buf, ai, pdfPages }) {
  const pages = await pdfPages(buf).catch(() => []);
  let fleets = cleanSheet(resultTableOf(pages));
  if (fleets.reduce((n, f) => n + f.rows.length, 0) < 3) {
    if (!ai?.callGemini || !process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL || buf.length > 15 * 1024 * 1024) return null;
    const raw = await ai.callGemini({ model: process.env.GEMINI_MODEL, system: RESULTS_SYSTEM, user: "Bu sonuç belgesini oku.", schema: RESULTS_SCHEMA, images: [{ mimeType: "application/pdf", data: Buffer.from(buf).toString("base64") }], maxTokens: 24000, timeoutMs: 120000 });
    if (raw?.isResults === false) return null;
    fleets = cleanSheet(raw?.fleets);
  }
  if (!fleets.length) return null;
  const sheet = `site-${d.key}`;
  await db.collection("orgs").doc(orgId).collection("raceLive").doc(raceId).collection("sheets").doc(sheet).set({ fleets, at: new Date().toISOString(), site: d.key });
  return { state: "new", sheet };
}
