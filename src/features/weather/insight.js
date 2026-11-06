// Ana sayfa hava bölümünün "önemli" kartı ve küçük gidiş grafiği (Seyhun 2026-11-06). Saf hesap, testli.
// Öncelik: yağmur (burada / yakında / bugün bekleniyor) > rüzgâr artışı > sıcaklık değişimi. Önemli bir şey yoksa kart çıkmaz,
// yerine sıcaklığın gidişi (sakin gün) gösterilir. Yapay zeka yalnız üstteki cümleyi yazar (/api/weather-brief); burada yedek cümle de üretilir.
import { hereLine } from "./rainLine";

const LV = ["", "hafif", "orta", "kuvvetli"];

// rows: seçili günün saatlik satırları (radarRows'tan geçmiş), nowH: şimdiki saat (bugün değilse -1), radar: /api/rain-radar cevabı
export function weatherInsight({ rows, nowH = -1, radar = null, hm }) {
  if (!rows?.length) return null;
  const from = nowH >= 0 ? nowH : 6;
  const span = rows.filter((r) => +r.hh >= from && +r.hh <= 23);
  if (span.length < 3) return null;
  const first = span[0];

  // 1) Yağmur
  const last = radar?.frames?.at(-1);
  let rain = null;
  if (nowH >= 0 && last?.level > 0) {
    rain = { title: `Burada ${LV[last.level]} yağış var`, sub: hereLine(radar, false, hm), when: "şimdi" };
  } else if (nowH >= 0 && radar?.near && radar.near.km <= 15) {
    rain = { title: `Yağış yakında · ${radar.near.km} km`, sub: hereLine(radar, false, hm), when: "yakında" };
  } else {
    const wet = span.find((r) => (r.rain ?? 0) >= 50 && (r.mm ?? 0) >= 0.3);
    if (wet) {
      const mm = span.reduce((a, r) => a + (r.mm || 0), 0);
      rain = { title: `Yağmur bekleniyor · ${wet.hh}:00`, sub: `${mm >= 1 ? Math.round(mm) : "<1"} mm, ihtimal %${wet.rain}`, when: `${wet.hh}:00` };
    }
  }
  if (rain) {
    return { kind: "rain", title: rain.title, sub: rain.sub, chart: chart(span, "rain"), line: rain.title.replace(/ · /, ", ") + "." };
  }

  // 2) Rüzgâr artışı: kalan saatlerde en yüksek rüzgâr şimdikinden 8 kn+ fazla ve 15 kn+
  const peakW = span.reduce((m, r) => (r.wind > m.wind ? r : m), span[0]);
  if (peakW.wind >= 15 && peakW.wind - first.wind >= 8) {
    const g = peakW.gust > peakW.wind ? `, hamle ${peakW.gust} kn` : "";
    return {
      kind: "wind", title: `Rüzgâr artışı · ${first.wind} → ${peakW.wind} kn`, sub: `Zirve ${peakW.hh}:00${g}`, chart: chart(span, "wind"),
      line: `Rüzgâr ${first.wind} knottan ${peakW.hh}:00'te ${peakW.wind} knota çıkıyor.`,
    };
  }

  // 3) Sıcaklık değişimi: 6° ve üstü
  const hi = span.reduce((m, r) => (r.t > m.t ? r : m), span[0]);
  const lo = span.reduce((m, r) => (r.t < m.t ? r : m), span[0]);
  if (hi.t - first.t >= 6) {
    return { kind: "temp", title: `Isınıyor · ${first.t}° → ${hi.t}°`, sub: `Zirve ${hi.hh}:00`, chart: chart(span, "temp"), line: `Sıcaklık ${hi.hh}:00'e kadar ${first.t}°'den ${hi.t}°'ye çıkıyor.` };
  }
  if (first.t - lo.t >= 6) {
    return { kind: "temp", title: `Soğuyor · ${first.t}° → ${lo.t}°`, sub: `En düşük ${lo.hh}:00`, chart: chart(span, "temp"), line: `Sıcaklık ${lo.hh}:00'e kadar ${first.t}°'den ${lo.t}°'ye düşüyor.` };
  }

  // Sakin gün: kart yok, sıcaklığın gidişi
  const c = chart(span, "temp");
  return { kind: "calm", title: "", sub: "", chart: c, line: `Sakin gün; sıcaklık ${first.t}° ile ${hi.t}° arasında, rüzgâr en çok ${peakW.wind} kn.` };
}

// Küçük grafik verisi: { kind, vals:[{hh,v}], first, peak, label }
function chart(span, kind) {
  const f = kind === "wind" ? (r) => r.wind : kind === "rain" ? (r) => r.rain ?? 0 : (r) => r.t;
  const vals = span.map((r) => ({ hh: r.hh, v: f(r) }));
  const peak = vals.reduce((m, p) => (p.v > m.v ? p : m), vals[0]);
  const unit = kind === "wind" ? " kn" : kind === "rain" ? "%" : "°";
  const label = kind === "wind" ? "Rüzgâr" : kind === "rain" ? "Yağış ihtimali" : "Sıcaklık";
  return { kind, vals, first: vals[0], peak, unit, label };
}

// Yapay zekaya giden kısa gerçekler (aynı gerçekler = aynı anahtar = önbellek)
export function insightFacts(ins, place) {
  if (!ins) return null;
  return { key: `${place}|${ins.kind}|${ins.title}|${ins.sub}|${ins.chart.first.v}>${ins.chart.peak.v}@${ins.chart.peak.hh}`, kind: ins.kind, title: ins.title, sub: ins.sub, fallback: ins.line, place, chart: ins.chart.label, from: ins.chart.first.v, peak: ins.chart.peak.v, peakAt: ins.chart.peak.hh, unit: ins.chart.unit };
}
