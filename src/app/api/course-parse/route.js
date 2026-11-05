import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { aiErrorKind, logAiError } from "@/lib/ai/errors";
import { COURSE_SCHEMA, COURSE_SYSTEM, courseUser } from "@/lib/ai/course";
import { CARD_IDS, CARD_TYPES, PTS, cleanObs } from "@/lib/raceCourse";
import { cleanRoute } from "@/lib/courseScene";
import { groupOf } from "@/lib/roundScore";

export const runtime = "nodejs";

// Parkur ölçümü (lib/ai/course.js): cümle → { items: [{ obs } | { pt } | { len }], ...ilki } | { none: true }. Kısa ve hızlı (en çok 5 sn).
// last: ekrandaki son rüzgâr ve eksen (göreli cümleler: "rüzgar 10 derece sağa döndü")
const num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : null);
function lastOf(l) {
  const deg = num(l?.wind?.deg, 0, 360);
  const axis = num(l?.axis, 0, 360);
  return { wind: deg === null ? null : { deg, kn: num(l?.wind?.kn, 0, 80) }, axis };
}
function itemOf(r) {
  if (r?.type === "pt" && PTS.includes(r.pt)) return { pt: r.pt };
  if (r?.type === "len" && r.orsa >= 100 && r.orsa <= 10000) return { len: { orsa: Math.round(r.orsa) } };
  // Uzun anlatım (Seyhun 2026-11-05): kart türü, rota, grubun kartı
  if (r?.type === "card" && CARD_TYPES[r.card]) return { card: r.card };
  if (r?.type === "route") {
    const route = cleanRoute((Array.isArray(r.route) ? r.route : []).map(String));
    return route.length >= 2 ? { route } : null;
  }
  if (r?.type === "grp") {
    const grp = groupOf(r.grp);
    const card = String(r.card || "").trim().toUpperCase();
    return grp && CARD_IDS.includes(card) ? { grp: { grp, card } } : null;
  }
  const o = r?.type === "obs" ? cleanObs({ kind: r.kind, ref: r.ref, deg: r.deg, kn: r.kn, gust: r.gust, by: r.by, spot: r.spot, ...(r.deg2 != null ? { range: [r.deg, r.deg2] } : {}) }) : null;
  return o ? { obs: { kind: o.kind, ref: o.ref, deg: o.deg, kn: o.kn, by: o.by, ...(o.gust != null ? { gust: o.gust } : {}), ...(o.spot ? { spot: o.spot } : {}), ...(o.range ? { range: o.range } : {}) } } : null;
}
const bad = (error, status = 400, reason = "") => NextResponse.json({ error, ...(reason ? { reason } : {}) }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = String(body?.text ?? "").trim();
  if (!text) return bad("Cümle boş");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503, "nokey");
  countAi(au, "course");
  const t0 = Date.now();
  const long = text.length > 120; // uzun anlatım: daha çok yer ve süre (Netlify 10 sn sınırı içinde)
  try {
    const r = await callGemini({ model: process.env.GEMINI_SOZ_MODEL || process.env.GEMINI_MODEL, system: COURSE_SYSTEM, user: courseUser(text, lastOf(body?.last)), schema: COURSE_SCHEMA, maxTokens: long ? 1200 : 400, timeoutMs: long ? 9000 : 5000, attemptMs: long ? 9000 : 5000 });
    const items = (Array.isArray(r?.items) ? r.items : [r]).map(itemOf).filter(Boolean).slice(0, 16);
    return NextResponse.json(items.length ? { items, ...items[0] } : { none: true });
  } catch (e) {
    logAiError("course", "gemini", e, Date.now() - t0);
    return bad("Anlaşılamadı", e.status === 429 ? 429 : 502, aiErrorKind(e));
  }
}

export const POST = withAiCool(handle);
