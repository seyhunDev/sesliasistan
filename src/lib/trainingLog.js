// Antrenman günlüğü: antrenman planına (kategori Antrenman) eklenen kısa kayıt. Plan kaydının `log` alanında durur:
// log = { wind (kn), dir, topics [konu], min (süre dk), rating 1-3 (zor/iyi/çok iyi), note, at }
// Saf fonksiyonlar (test edilir); ekran AddSheet içindeki TrainingLog.jsx, liste /training.
export const TOPICS = ["Start", "Tramola", "Kavança", "Şamandıra dönüşü", "Rota", "Hız/trim", "Taktik", "Ağır hava", "Hafif hava", "Yarış provası", "Kondisyon", "Teori"];
export const DIRS = ["Poyraz", "Gündoğusu", "Keşişleme", "Kıble", "Lodos", "Kaba", "Batı", "Karayel"];
export const RATINGS = [
  [1, "Zor geçti"],
  [2, "İyi"],
  [3, "Çok iyi"],
];

export const isTraining = (p) => (p?.cat || p?.category) === "Antrenman";
// Günlük, antrenmanın günü ya da sonrasında yazılır (iptal edilen hariç)
export const canLog = (p, today) => isTraining(p) && p.status !== "cancelled" && !!p.date && p.date <= today;

const num = (v, max) => {
  const n = Math.round(Number(String(v ?? "").replace(",", ".")));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
};
export function cleanLog(l, now = new Date()) {
  if (!l) return null;
  const out = {
    wind: num(l.wind, 60),
    dir: DIRS.includes(l.dir) ? l.dir : "",
    topics: [...new Set((l.topics || []).map((t) => String(t).trim().slice(0, 30)).filter(Boolean))].slice(0, 12),
    min: num(l.min, 600),
    rating: [1, 2, 3].includes(Number(l.rating)) ? Number(l.rating) : null,
    note: String(l.note || "").trim().slice(0, 1500),
  };
  const empty = !out.wind && !out.dir && !out.topics.length && !out.min && !out.rating && !out.note;
  return empty ? null : { ...out, at: now.toISOString() };
}

// Kısa satır: "12 kn Poyraz · Start, Rota · 90 dk"
export function logLine(l) {
  if (!l) return "";
  return [l.wind ? `${l.wind} kn${l.dir ? ` ${l.dir}` : ""}` : l.dir, (l.topics || []).join(", "), l.min ? `${l.min} dk` : ""].filter(Boolean).join(" · ");
}

// Ay özeti (YYYY-MM): antrenman sayısı, günlüğü yazılan, toplam süre, ortalama rüzgâr, en çok çalışılan konular
export function monthLog(plans, month) {
  const all = plans.filter((p) => isTraining(p) && p.status !== "cancelled" && (p.date || "").startsWith(month));
  const logged = all.filter((p) => p.log).sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  const winds = logged.map((p) => p.log.wind).filter(Boolean);
  const count = {};
  for (const p of logged) for (const t of p.log.topics || []) count[t] = (count[t] || 0) + 1;
  return {
    total: all.length,
    logged,
    minutes: logged.reduce((s, p) => s + (p.log.min || 0), 0),
    avgWind: winds.length ? Math.round(winds.reduce((a, b) => a + b, 0) / winds.length) : null,
    topics: Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr")),
  };
}
