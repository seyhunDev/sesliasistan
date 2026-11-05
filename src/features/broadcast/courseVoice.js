import { cleanCourse, courseCommand, courseRelative } from "@/lib/raceCourse";
import { cleanRoute, routeText } from "@/lib/courseScene";
import { askCourseAi } from "@/services/courseService";
import { GROUP_PICK, groupOf } from "@/lib/roundScore";

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
// Grubun kartı (Seyhun 2026-11-05 "Bronz B kartında", "Altın A parkurunda", "sarı grup kart B"): { grp, card } ya da null
const GRP_WORDS = [...GROUP_PICK, "Zümrüt", "gold", "silver", "bronze", "blue", "yellow", "red", "green", "pink"];
export function groupCardOf(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  const w = GRP_WORDS.find((g) => new RegExp(`(^|[^a-zçğıöşü])${g.toLocaleLowerCase("tr-TR")}`).test(t));
  const grp = w ? groupOf(w) : "";
  if (!grp) return null;
  const m = /\b([a-h])\s*(?:kart|parkur)/.exec(t) || /(?:kart|parkur)\S*\s+([a-h])\b/.exec(t);
  return m ? { grp, card: m[1].toUpperCase() } : null;
}
// Uzun anlatım mı (Seyhun 2026-11-05 "uzun konuşma da olabilir, rüzgârı, parkuru anlatacağım"): birden çok cümle ya da 120 harften uzun
export const longTalk = (text) => String(text || "").length > 120 || (String(text || "").match(/[.!?]\s/g) || []).length >= 2;
// "… gönder" ile biten konuşma: komut kelimesi atılır
export const dropSend = (text) => String(text || "").replace(/[\s,.]*(?:tamam\s+)?g[öo]nder[\s.!]*$/i, "").trim();
const fromAi = (items) => {
  const out = { route: null, type: "", grpCards: [], list: [], len: null };
  for (const x of items || []) {
    if (x.obs) out.list.push(x.obs);
    else if (x.len) out.len = x.len;
    else if (x.route) out.route = x.route; // son söylenen
    else if (x.card) out.type = x.card;
    else if (x.grp) out.grpCards = [...out.grpCards.filter((g) => g.grp !== x.grp.grp), x.grp];
  }
  return out;
};
// Dönüş { route, type, grpCards: [{ grp, card }], list: [obs…], len, need, error }; hiçbiri yoksa { none: true }
export async function courseVoice(text0, cur) {
  const text = dropSend(text0);
  // uzun anlatım: önce yapay zekâ bütün metni okur (rota, kart, gruplar dahil); ulaşılamazsa telefondaki kurallar
  if (longTalk(text)) {
    const ai = await askCourseAi(text, lastVals(cur));
    if (ai.items) {
      const r = fromAi(ai.items);
      if (r.route || r.type || r.grpCards.length || r.list.length || r.len) return r;
    } else if (ai.error) return { error: ai.error, list: [], grpCards: [] };
    else if (ai.none) return { none: true, list: [], grpCards: [] };
  }
  const grpCard = groupCardOf(text);
  if (grpCard) return { grpCards: [grpCard], list: [] };
  const route = routeOf(text);
  const type = typeOf(text);
  const rest = route ? String(text).replace(ROUTE_RE, " ") : String(text);
  let cc = courseCommand(rest);
  if (!cc) {
    const rel = courseRelative(rest, cur);
    if (rel?.need) return { route, type, need: rel.need, list: [], grpCards: [] };
    if (rel) cc = rel;
  }
  if (!cc && !route && !type && /\d/.test(rest)) {
    const ai = await askCourseAi(rest, lastVals(cur));
    if (ai.items) {
      const r = fromAi(ai.items);
      if (r.route || r.type || r.grpCards.length || r.list.length || r.len) return r;
    } else if (ai.error) return { error: ai.error, list: [], grpCards: [] };
  }
  const list = (cc?.list || []).filter((x) => x.obs).map((x) => x.obs);
  const len = cc?.list?.find((x) => x.len)?.len || null;
  if (!route && !type && !list.length && !len) return { none: true, list: [], grpCards: [] };
  return { route, type, list, len, grpCards: [] };
}
export const routeSay = (r) => routeText(r);
