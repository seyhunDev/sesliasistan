// Gerçekleşen (ölçülen) rüzgâr: resmî istasyonların SYNOP raporları (OGIMET üzerinden, ücretsiz, 1-3 saat gecikmeli).
// Seyhun: "gerçekleşeni ön plana alıp sonra tahmin tarafına geçebilir miyiz… doğru noktayı bulmamız gerekiyor".
// Yalnız seçilen yere NEAR_KM içindeki istasyon kullanılır; uzak istasyonun verisi hiç gösterilmez.
// Liste elle tutulur: yalnız yeri ve numarası bilinen istasyon eklenir.
export const STATIONS = [{ id: "17180", name: "Dikili", lat: 39.07, lon: 26.89 }];
export const NEAR_KM = 10;

export function km(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const s = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(s));
}

// En yakın istasyon ve uzaklığı; NEAR_KM içindeyse `near: true`
export function nearestStation(lat, lon) {
  let best = null;
  for (const s of STATIONS) {
    const d = km({ lat, lon }, s);
    if (!best || d < best.km) best = { ...s, km: Math.round(d * 10) / 10 };
  }
  return best && { ...best, near: best.km <= NEAR_KM };
}

const KN = 1.943844; // m/s → knot
// Bir OGIMET satırı: "17180,2026,10,18,12,00,AAXX 18124 17180 42970 33006 10216 … 333 … 91108 …="
// Dönen: { at (UTC ISO), dir (derece ya da null), kn, gust (kn ya da null) }; okunamazsa null.
export function parseSynop(line, id) {
  const p = String(line || "").trim().split(",");
  if (p.length < 7 || (id && p[0] !== id)) return null;
  const [, Y, M, D, h, m] = p;
  const g = p.slice(6).join(",").replace(/=.*$/, "").trim().split(/\s+/);
  let i = g[0] === "AAXX" ? 1 : 0;
  const iw = (g[i++] || "")[4];
  if (!/^[0134]$/.test(iw || "")) return null; // rüzgâr birimi yok ya da tahmini
  const k = iw === "3" || iw === "4" ? 1 : KN;
  i += 2; // istasyon numarası, iRixhVV
  const w = g[i++] || "";
  if (!/^\d{5}$/.test(w)) return null;
  const dd = +w.slice(1, 3);
  let ff = +w.slice(3);
  if (ff === 99 && /^00\d{3}$/.test(g[i] || "")) ff = +g[i].slice(2);
  let gust = null;
  const s3 = g.indexOf("333");
  if (s3 >= 0) {
    for (let j = s3 + 1; j < g.length && !/^\d{3}$/.test(g[j]); j++) {
      if (/^91[01]\d\d$/.test(g[j])) {
        gust = +g[j].slice(3);
        if (gust === 99 && /^00\d{3}$/.test(g[j + 1] || "")) gust = +g[j + 1].slice(2);
        break;
      }
    }
  }
  const at = new Date(Date.UTC(+Y, +M - 1, +D, +h, +m));
  if (Number.isNaN(at.getTime())) return null;
  const kn = Math.round(ff * k);
  return { at: at.toISOString(), dir: dd >= 1 && dd <= 36 ? dd * 10 : null, kn, gust: gust == null ? null : Math.max(kn, Math.round(gust * k)) };
}

// Yerel güne göre saatlik satırlar { hh, wind, gust, dir, at }; aynı saatte birden çok rapor varsa sonuncusu
export function obsRows(list, date, tz = "Europe/Istanbul") {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const hr = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz });
  const by = new Map();
  for (const o of list) {
    if (!o) continue;
    const d = new Date(o.at);
    if (ymd.format(d) !== date) continue;
    by.set(hr.format(d), { hh: hr.format(d), wind: o.kn, gust: o.gust, dir: o.dir, at: o.at });
  }
  return [...by.values()].sort((a, b) => a.hh.localeCompare(b.hh));
}

// OGIMET isteği için UTC aralığı: yerel günün tamamı (Türkiye UTC+3)
export function utcRange(date, offsetH = 3) {
  const s = new Date(`${date}T00:00:00Z`).getTime() - offsetH * 3600e3;
  const f = (t) => new Date(t).toISOString().replace(/[-:T]/g, "").slice(0, 12);
  return { begin: f(s), end: f(s + 24 * 3600e3 - 60e3) };
}
