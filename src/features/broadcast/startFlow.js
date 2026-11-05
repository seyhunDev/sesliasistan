"use client";

// Start verme (Seyhun 2026-11-05 "canlı yayın sayfasından da start verebilmeliyim"): Yayın › Süre ve /canli Start penceresi aynı
// kuralları ve aynı yazmaları kullanır. Sayaç telefonda tek (training/Countdown); sahibi her zaman yarışın Yayın sayfası, /canli'den
// başlatılan sayaç da Yayın'ındır (Yayın açılınca 0 anını, bitişi o yazar).
import { saveRounds } from "@/features/athletes/raceLiveStore";
import { needDnf, zeroRace } from "@/lib/raceLive";
import { dnfPen } from "@/lib/raceRounds";
import { groupMap, groupsOn } from "@/lib/roundScore";
import { cardFor } from "@/lib/raceCourse";

export const yayinPath = (raceId) => `/athletes/races/${raceId}/yayin`;

// geri sayım sürüyor mu (duraklatılmış da sayılır)
export const countingAt = (t, now) => t?.mode === "start" && ((t.end != null && t.end > now) || t.left != null);

// Başlatılabilir mi: başka grubun geri sayımı sürerken başlamaz, tehirdeki grup başlamaz, bayrak seçilmeden başlamaz. Boş = başlar
export function startBlock(t, row, now) {
  if (countingAt(t, now)) return "Önce süren geri sayım bitsin";
  if (!row) return "Bekleyen start yok";
  if (row.ap) return "Bu grup tehirde. Önce tehiri indir.";
  if (!row.prep) return "Önce bayrağı seç";
  return "";
}

// Start verildi: satırın sınıf, grup, bayrağı ve grubun parkur kartı (Parkur › Grupların parkuru, yoksa seçili kart) o yarışın dönüş
// kaydına yazılır (rota daha önce söylendiyse o kalır)
export function startedRow({ orgId, raceId, rid, row, rounds, course }) {
  const { cls, grp, prep } = row;
  const prev = rounds?.[rid] || { route: [], legs: [] };
  const k = cardFor(course, cls, grp);
  return rid ? saveRounds(orgId, raceId, rid, { ...prev, grp, cls, prep, card: k.id, route: prev.route?.length ? prev.route : k.route }, prev) : Promise.resolve();
}
export const orderWithout = (order, i) => order.filter((_, k) => k !== i);

// Sayaç 0: günün o yarışı start saati ve son rüzgârla yazılır. Yazılacak yoksa null
export function zeroStarts(starts, t, end, wind, rdays, mine) {
  if (Date.now() - end > 20 * 60e3) return null;
  if (t?.mode !== "start" || !t.rid || !mine) return null;
  const next = zeroRace(starts, t.rid, end, wind, rdays);
  return next === starts ? null : next;
}

// Finiş penceresi adımları (Seyhun 2026-11-05; Yayın › Süre ve uygulama içi /canli aynı kural): ilk tekne finişe yazılınca pencere açılır
// (open, at = ilk finiş anı), pencere bitince yarış biter (end), bitmiş yarışta bir kez DNF (dnf: bitirmeyen ve başka cezası olmayanlara, pen
// yalnız değiştiyse). groups: entries/list groups (grubun listesi; yoksa dönüşte görülenler)
export function finishSteps({ starts, rounds, groups, today, now }) {
  const out = [];
  for (const s of starts || []) {
    if (s.day !== today || s.void || Date.parse(s.at) > now) continue;
    const e = rounds?.[s.id];
    if (!s.fin && !s.fw) {
      const k = (e?.route || []).lastIndexOf("F");
      const first = k >= 0 ? (e.legs?.[k] || [])[0] : "";
      if (first) out.push({ k: "open", s, at: Math.min(e.tm?.[k]?.[first] || now, now) });
    } else if (!s.fin && Date.parse(s.fw) <= now) out.push({ k: "end", s });
    else if (needDnf(s)) {
      const gm = groupMap(groupsOn(groups || {}, s.day));
      const g = s.grp || e?.grp || "";
      const members = g && Object.keys(gm).length ? Object.keys(gm).filter((x) => gm[x] === g) : null;
      const pen = dnfPen(e, members);
      out.push({ k: "dnf", s, pen: JSON.stringify(pen) !== JSON.stringify(e?.pen || {}) ? pen : null });
    }
  }
  return out;
}
