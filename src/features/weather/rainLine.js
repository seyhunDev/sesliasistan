// Rüzgâr grafiğinin altındaki yağmur özeti (CockpitWind, Seyhun 2026-10-28 "A · Saat saat çubuk"). Saf hesap, testli.
const STRONG = (v) => (v >= 4 ? "kuvvetli" : v >= 1 ? "orta" : "hafif");

// Yağmur özeti: geçmiş "N mm yağdı" (istasyon) ya da "Şimdi yağıyor" (radar), gelecek "16–18 arası kuvvetli, 12 mm bekleniyor".
// nowAt < 0 (başka gün): bütün gün tahmin. hot: saatte 4 mm ve üstü bekleniyor (kehribar).
export function rainLine(rows, fc, nowAt, oSum, radH) {
  const out = [];
  const lastR = Object.keys(radH).map(Number).sort((a, b) => b - a)[0];
  if (oSum >= 0.1) out.push(`${oSum >= 1 ? Math.round(oSum) : "<1"} mm yağdı`);
  else if (lastR != null && radH[lastR] > 0 && lastR >= Math.floor(nowAt)) out.push("Şimdi yağıyor");
  const ahead = fc.map((v, i) => ({ v, i })).filter((q) => q.v >= 0.1 && (nowAt < 0 || q.i > nowAt));
  let hot = false;
  if (ahead.length) {
    const top = ahead.reduce((m, q) => (q.v > m.v ? q : m), ahead[0]);
    let a = top.i, b = top.i; // en yüksek saatin çevresindeki kesintisiz yağış
    while (a - 1 >= 0 && fc[a - 1] >= 0.5 && (nowAt < 0 || a - 1 > nowAt)) a--;
    while (b + 1 < fc.length && fc[b + 1] >= 0.5) b++;
    const sum = ahead.reduce((t, q) => t + q.v, 0);
    const when = a === b ? `${rows[a].hh}:00'da` : `${rows[a].hh}–${rows[(b + 1) % rows.length]?.hh ?? rows[b].hh} arası`;
    hot = top.v >= 4;
    out.push(`${when} ${STRONG(top.v)}, ${sum >= 1 ? Math.round(sum) : "<1"} mm bekleniyor`);
  } else if (nowAt >= 0) out.push("sonra beklenmiyor");
  return { text: out.join(" · "), hot };
}


// Burada / çevrede (Seyhun 2026-11-04, kart "Radarla burada / çevrede"): tahmin ~10 km'lik kareyi tek değer sayar; şu anki durumu radar söyler.
// radar: /api/rain-radar cevabı ({ frames, near }); soon: tahmin önümüzdeki 3 saatte yağış diyor mu. Gösterilecek bir şey yoksa "".
const LV = ["", "hafif", "orta", "kuvvetli"];
const AT = { kuzey: "kuzeyinde", kuzeydoğu: "kuzeydoğusunda", doğu: "doğusunda", güneydoğu: "güneydoğusunda", güney: "güneyinde", güneybatı: "güneybatısında", batı: "batısında", kuzeybatı: "kuzeybatısında" };
export function hereLine(radar, soon, hm = (ms) => new Date(ms).toTimeString().slice(0, 5)) {
  const last = radar?.frames?.at(-1);
  if (!last || radar.near === undefined) return "";
  const when = ` (radar ${hm(Date.parse(last.at))})`;
  if (last.level > 0) return `Burada şu an ${LV[last.level]} yağış var${when}`;
  if (radar.near) return `Burada yağmıyor · ${radar.near.km} km ${AT[radar.near.dir] || radar.near.dir} ${LV[radar.near.level]} yağış${when}`;
  return soon ? `Burada ve 30 km içinde şu an yağış yok${when}` : "";
}
