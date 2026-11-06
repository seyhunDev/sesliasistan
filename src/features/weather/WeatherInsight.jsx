"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

// Ana sayfa hava bölümünün üstündeki yapay zeka cümlesi (useWeatherBrief) ile "önemli" kart ve küçük gidiş grafiği (insight.js).
// Cümle: aynı gerçekler için 30 dk telefonda saklanır; yapay zeka yanıt vermezse kuralların yazdığı yedek cümle gösterilir.
const KEY = "sa-wbrief";
const TTL = 30 * 60e3;
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};

const fresh = (key) => {
  const hit = read();
  return hit?.key === key && Date.now() - hit.t < TTL ? hit.text : "";
};

export function useWeatherBrief(facts) {
  const key = facts?.key || "";
  const [got, setGot] = useState({ key: "", text: "" });
  useEffect(() => {
    if (!key) return;
    if (fresh(key)) return;
    let on = true;
    authFetch("/api/weather-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(facts) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.text) return;
        try {
          localStorage.setItem(KEY, JSON.stringify({ key, t: Date.now(), text: j.text }));
        } catch {}
        if (on) setGot({ key, text: j.text });
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (got.key === key && got.text) || (key && fresh(key)) || facts?.fallback || "";
}

// Önemli kart: yağmur mavi, rüzgâr ve sıcaklık kehribar (yalnız uyarı rengi)
export function InsightCard({ ins }) {
  if (!ins || ins.kind === "calm") return null;
  const rain = ins.kind === "rain";
  return (
    <div className={`rounded-xl border px-3 py-2 ${rain ? "border-[#7fb0ff]/50 bg-[#2563eb]/25" : "border-[#ffa94d]/50 bg-[#ffa94d]/15"}`} role="status">
      <b className={`block text-[0.9375rem] font-semibold ${rain ? "text-[#cfe0ff]" : "text-[#ffc47a]"}`}>{ins.title}</b>
      {ins.sub && <small className="block text-[0.8125rem] text-white/75">{ins.sub}</small>}
    </div>
  );
}

// Küçük gidiş grafiği: başlangıç ve en yüksek nokta işaretli, altı hafif dolgulu
export function InsightChart({ ins, compact = false }) {
  const c = ins?.chart;
  if (!c || c.vals.length < 3) return null;
  const W = 300, H = 56, P = 6;
  const vs = c.vals.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const rng = hi - lo || 1;
  const x = (i) => (i / (vs.length - 1)) * W;
  const y = (v) => P + (1 - (v - lo) / rng) * (H - 2 * P);
  const pts = vs.map((v, i) => [x(i), y(v)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const pi = vs.indexOf(c.peak.v);
  const col = ins.kind === "rain" ? "#7fb0ff" : ins.kind === "calm" || ins.kind === "temp" ? "#9cc2ff" : "#ffc47a";
  return (
    <div aria-label={c.label} className={compact && ins.kind === "calm" ? "landscape:hidden" : ""}>
      <p className={`mb-1 flex justify-between text-[0.75rem] text-white/70 ${compact ? "sr-only" : ""}`}>
        <span>{c.label} bugün</span>
        <span className="tabular-nums">{c.first.v}{c.unit} → {c.peak.v}{c.unit} ({c.peak.hh}:00)</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio={compact ? "none" : undefined} className={`block w-full ${compact ? "h-8" : "h-auto"}`} role="img" aria-hidden="true">
        <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={col} opacity=".14" />
        <path d={d} fill="none" stroke={col} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={pts[0][0]} cy={pts[0][1]} r="3.5" fill={col} />
        <circle cx={pts[pi][0]} cy={pts[pi][1]} r="3.5" fill={col} />
      </svg>
    </div>
  );
}
