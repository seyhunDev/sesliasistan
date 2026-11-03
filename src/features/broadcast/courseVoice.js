import { cleanCourse, courseCommand, courseRelative } from "@/lib/raceCourse";
import { cleanRoute, routeText } from "@/lib/courseScene";
import { askCourseAi } from "@/services/courseService";

// Yayın › Parkur'da sesle parkur (Seyhun 2026-11-03 18:43 "parkuru sesle yapabilmeliyim; rüzgâr 20-35 aralığı ya da 20, eksen şu"):
// "rota 1 2 3 2 3 finiş" → seçili kartın rotası; "trapez" / "ILCA parkuru" → kart türü; rüzgâr, aralık, eksen, hat, orsa boyu
// asistanın parkur kurallarıyla (courseCommand, göreli cümle), anlaşılmazsa parkur yapay zekâsı (/api/course-parse).
const NUM = { bir: "1", iki: "2", üç: "3", uc: "3", dört: "4", dort: "4" };
const ROUTE_RE = /\b(?:rota|parkur(?:\s+sırası)?)\s*[:\-]?\s*((?:(?:[1-4]|bir|iki|üç|uc|dört|dort|f|fin|finiş|finis|finish)(?:[\s,·>\-–]+|$))+)/i;

export function routeOf(text) {
  const m = ROUTE_RE.exec(String(text || "").toLocaleLowerCase("tr-TR"));
  if (!m) return null;
  const r = cleanRoute(m[1].split(/[\s,·>\-–]+/).map((w) => NUM[w] || w));
  return r.length >= 2 ? r : null;
}
export function typeOf(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  if (/trapez/.test(t)) return "trapez";
  if (/\bilca\b|standart parkur|orsa\s*pupa/.test(t)) return "std";
  return "";
}
function lastVals(c) {
  const obs = cleanCourse(c || {}).obs;
  const w = [...obs].reverse().find((x) => x.kind === "wind");
  const a = [...obs].reverse().find((x) => x.kind === "axis");
  return { wind: w ? { deg: w.deg, kn: w.kn } : null, axis: a ? a.deg : null };
}
// Dönüş { route, type, list: [obs…], len, need, error }; hiçbiri yoksa { none: true }
export async function courseVoice(text, cur) {
  const route = routeOf(text);
  const type = typeOf(text);
  const rest = route ? String(text).replace(ROUTE_RE, " ") : String(text);
  let cc = courseCommand(rest);
  if (!cc) {
    const rel = courseRelative(rest, cur);
    if (rel?.need) return { route, type, need: rel.need, list: [] };
    if (rel) cc = rel;
  }
  if (!cc && !route && !type && /\d/.test(rest)) {
    const ai = await askCourseAi(rest, lastVals(cur));
    if (ai.items) cc = { list: ai.items };
    else if (ai.error) return { error: ai.error, list: [] };
  }
  const list = (cc?.list || []).filter((x) => x.obs).map((x) => x.obs);
  const len = cc?.list?.find((x) => x.len)?.len || null;
  if (!route && !type && !list.length && !len) return { none: true, list: [] };
  return { route, type, list, len };
}
export const routeSay = (r) => routeText(r);
