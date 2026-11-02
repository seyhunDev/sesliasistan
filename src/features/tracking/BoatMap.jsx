"use client";

// Canlı yayında tekne haritası (Seyhun 2026-11-02 tekne takibi): işaretli şamandıralar (turuncu), start/finiş hattı ve teknelerin son
// konumu (yelken numarasıyla, grubun rengiyle). Parkur ekseni yukarıda; 1 dk'dır konum gelmeyen tekne soluk.
import { axisOf } from "@/lib/raceCourse";
import { fitMap } from "@/lib/boatTrack";
import { groupColor } from "@/lib/roundScore";

const W = 240;
const H = 240;
const MARKS = [
  ["m1", "1"],
  ["m2", "2"],
  ["m3", "3"],
  ["m4", "4"],
];

export function BoatMap({ boats = [], course, groupOf = {} }) {
  if (!boats.length) return null;
  const pts = course?.pts || {};
  const items = [...MARKS.filter(([k]) => pts[k]).map(([k, n]) => ({ id: k, n, kind: "mark", ...pts[k] })), ...["komite", "pin"].filter((k) => pts[k]).map((k) => ({ id: k, kind: "line", ...pts[k] })), ...boats.map((b) => ({ id: `b${b.sail}`, kind: "boat", ...b }))];
  let up = 0;
  try {
    up = axisOf({ obs: [], ...course, pts })?.deg || 0;
  } catch {}
  const { pts: P } = fitMap(items, { W, H, up });
  const at = (id) => P.find((p) => p.id === id);
  const k = at("komite");
  const p = at("pin");
  return (
    <div className="lv-glass lv-map" aria-label="Tekneler">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
        {k && p ? <line x1={k.x} y1={k.y} x2={p.x} y2={p.y} stroke="rgba(255,255,255,.55)" strokeWidth="1.5" strokeDasharray="4 3" /> : null}
        {P.filter((x) => x.kind === "mark").map((m) => (
          <g key={m.id}>
            <circle cx={m.x} cy={m.y} r="6" fill="#ff9a4d" />
            <text x={m.x} y={m.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="800" fill="#1a1a1a">
              {m.n}
            </text>
          </g>
        ))}
        {P.filter((x) => x.kind === "boat").map((b) => {
          const c = groupColor(groupOf[b.sail]) || "#fff";
          const r = ((b.hdg ?? 0) - up + 360) % 360;
          return (
            <g key={b.id} opacity={b.old ? 0.35 : 1}>
              {b.hdg != null && b.spd ? <path d="M0,-7 L4,4 L-4,4 Z" transform={`translate(${b.x},${b.y}) rotate(${r})`} fill={c} /> : <circle cx={b.x} cy={b.y} r="3.5" fill={c} />}
              <text x={b.x + 6} y={b.y - 5} fontSize="9" fontWeight="700" fill="#fff">
                {b.sail}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
