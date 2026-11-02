// Canlı ekranın günün programı ve beklenen rüzgâr (yayın tasarımı, Seyhun 2026-11-02 onay, project-files/samandira-donus/tasarim7)
import { dirShort, raceName } from "@/lib/raceLive";

const hmOf = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }) : "");

// Günün programı: bugün yapılan startlar (Bitti / Canlı) ve sıradaki startlar (plan.order), her biri "1. yarış · Mavi grup".
// Numara serinin sırası (raceName); sıradakiler son numaradan devam eder.
export function dayProgram(data, today) {
  const plan = data.plan;
  const starts = data.starts || [];
  const all = starts.filter((x) => !x.void);
  const mine = all.filter((x) => x.day === today);
  const done = mine.map((x) => {
    const e = data.rounds?.[x.id];
    const live = x.id === data.cur && !x.fin;
    return { key: x.id, n: x.n, name: raceName(x), grp: e?.grp || "", cls: e?.cls || "", state: x.fin ? "done" : live ? "now" : "done", at: hmOf(x.at) };
  });
  const lastN = Math.max(0, ...all.map((x) => x.n || 0));
  const pend = plan.status === "done" || plan.status === "none" ? [] : plan.order;
  const first = !mine.length && plan.day === today;
  const next = pend.map((o, i) => ({ key: `p${i}`, n: lastN + i + 1, name: `${lastN + i + 1}. yarış`, grp: o.grp, cls: o.cls, state: i === 0 ? "next" : "", at: i === 0 && first ? plan.at : "" }));
  return [...done, ...next];
}

// Beklenen rüzgâr: tahminin o saatteki satırı ("11:00" → 11'in satırı); yön, hız ve sağanak
export function expWind(fc, at) {
  const rows = fc?.rows || [];
  if (!rows.length || !at) return null;
  const r = rows.find((x) => x.hh === at.slice(0, 2));
  return r && r.wind != null ? { dir: r.dir, kn: r.wind, gust: r.gust } : null;
}
export const expText = (w) => (w ? `${w.dir != null ? `${dirShort(w.dir)} ` : ""}${w.gust && w.gust > w.kn ? `${w.kn}–${w.gust}` : w.kn} kn` : "");

