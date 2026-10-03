// Yarış günlerinin hava tahmini, rüzgâr önde. Kaynak ana sayfadaki hava durumuyla aynı: Open-Meteo (ücretsiz, anahtarsız, knot).
// Konum: Çevre'de bulunan yarış alanı, yoksa yarışın ilçesi (Open-Meteo konum arama). Tahmin en çok 16 gün ileriyi kapsar;
// daha uzaktaki günler "henüz tahmin yok" görünür. Sonuç yarışın `weather` alanına kaydedilir, "Güncelle" ile yenilenir.
import { sailWindows, windName } from "@/features/weather/weather";

export const HORIZON = 15; // bugün + 15 gün = Open-Meteo'nun 16 günlük tahmini
const DAY_FROM = 9; // gündüz rüzgârı: 09–18
const DAY_TO = 18;
const SHOW_HOURS = ["08", "10", "12", "14", "16", "18"];
const MAX_DAYS = 10;

const S = (v, n = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const N = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (s, n) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const lastForecastDay = (today) => addDays(today, HORIZON);
// Tahminin ilk çıkacağı gün (yarışın ilk günü ufka girince)
export const forecastFrom = (startDate) => addDays(startDate, -HORIZON);

// Yarış günleri (en çok 10)
export function raceDays(r) {
  const a = DATE.test(r?.startDate || "") ? r.startDate : "";
  if (!a) return [];
  const b = DATE.test(r?.endDate || "") && r.endDate >= a ? r.endDate : a;
  const out = [];
  for (let d = a; d <= b && out.length < MAX_DAYS; d = addDays(d, 1)) out.push(d);
  return out;
}

// Yönlerin ortalaması (rüzgâr hızıyla ağırlıklı)
function meanDir(rows) {
  let x = 0;
  let y = 0;
  for (const h of rows) {
    const rad = (h.dir * Math.PI) / 180;
    x += Math.cos(rad) * (h.wind || 0.1);
    y += Math.sin(rad) * (h.wind || 0.1);
  }
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

// Open-Meteo yanıtı → yarış günleri: gündüz rüzgârı (en az–en çok, sağanak, yön), birkaç saat, yelkene uygun aralıklar
export function shapeDays(j, days) {
  const h = j?.hourly || {};
  const d = j?.daily || {};
  const rows = (h.time || []).map((t, i) => ({
    date: t.slice(0, 10), hh: t.slice(11, 13), t: N(h.temperature_2m?.[i]), code: N(h.weather_code?.[i]), day: h.is_day ? !!h.is_day[i] : true,
    wind: N(h.wind_speed_10m?.[i]), gust: N(h.wind_gusts_10m?.[i]), dir: N(h.wind_direction_10m?.[i]),
  })).filter((x) => x.wind !== null && x.gust !== null && x.dir !== null);
  return days
    .map((date) => {
      const all = rows.filter((x) => x.date === date);
      const dayRows = all.filter((x) => +x.hh >= DAY_FROM && +x.hh <= DAY_TO);
      if (dayRows.length < 4) return null;
      const k = (d.time || []).indexOf(date);
      return {
        date,
        lo: Math.min(...dayRows.map((x) => x.wind)),
        hi: Math.max(...dayRows.map((x) => x.wind)),
        gust: Math.max(...dayRows.map((x) => x.gust)),
        dir: meanDir(dayRows),
        min: k >= 0 ? N(d.temperature_2m_min?.[k]) : null,
        max: k >= 0 ? N(d.temperature_2m_max?.[k]) : null,
        code: k >= 0 ? N(d.weather_code?.[k]) : dayRows[0].code,
        hours: all.filter((x) => SHOW_HOURS.includes(x.hh)).map(({ hh, wind, gust, dir, code, t }) => ({ hh, wind, gust, dir, code, t })),
        sail: sailWindows(all.filter((x) => +x.hh >= 7 && +x.hh <= 20)),
      };
    })
    .filter(Boolean);
}

// Kayıtta yalnız bilinen alanlar (Firestore iç içe dizi almaz; saatler nesne listesi)
export function cleanWeather(w) {
  if (!w || typeof w !== "object") return null;
  const lat = Number(w.place?.lat);
  const lon = Number(w.place?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Math.round(Number(v)) : null);
  const days = (Array.isArray(w.days) ? w.days : [])
    .filter((x) => DATE.test(x?.date || ""))
    .slice(0, MAX_DAYS)
    .map((x) => ({
      date: x.date, lo: num(x.lo), hi: num(x.hi), gust: num(x.gust), dir: num(x.dir), min: num(x.min), max: num(x.max), code: num(x.code),
      hours: (Array.isArray(x.hours) ? x.hours : []).slice(0, 8).map((h) => ({ hh: S(h?.hh, 2), wind: num(h?.wind), gust: num(h?.gust), dir: num(h?.dir), code: num(h?.code), t: num(h?.t) })),
      sail: (Array.isArray(x.sail) ? x.sail : []).map((s) => S(s, 8)).filter(Boolean).slice(0, 4),
    }))
    .filter((x) => x.hi !== null);
  return { place: { name: S(w.place.name), lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 }, at: S(w.at, 30), days };
}

// Kısa rüzgâr cümlesi: "Karayel (KB) 8–14 kn, sağanak 19 kn"
export const windLine = (x) => `${windName(x.dir)[0]} (${windName(x.dir)[1]}) ${x.lo === x.hi ? x.hi : `${x.lo}–${x.hi}`} kn, sağanak ${x.gust} kn`;

// --- İstekler (telefondan) ---

// Konum: yarış alanı bulunduysa orası, yoksa ilçe (il eşleşeni öncelikli)
export async function racePlace(r) {
  const v = r?.around?.venue;
  if (v && Number.isFinite(v.lat) && Number.isFinite(v.lon)) return { name: S(v.q) || S(r.district), lat: v.lat, lon: v.lon };
  const name = S(r?.district) || S(r?.city);
  if (!name) throw new Error("Önce yarışın ilçesini yaz (Bilgi sekmesi)");
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name, count: "10", language: "tr", format: "json" })}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("Konum aranamadı");
  const list = (await res.json()).results || [];
  const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
  const hit = list.find((x) => r.city && low(x.admin1) === low(r.city)) || list.find((x) => x.country_code === "TR") || list[0];
  if (!hit) throw new Error(`"${name}" haritada bulunamadı`);
  return { name: [hit.name, hit.admin1].filter(Boolean).join(", "), lat: hit.latitude, lon: hit.longitude };
}

// Yarış günlerinin tahmini. today: "YYYY-MM-DD". Ufuk dışındaki günler gelmez (ekranda "henüz tahmin yok").
export async function loadRaceWeather(r, today) {
  const days = raceDays(r);
  if (!days.length) throw new Error("Önce yarışın tarihini yaz");
  const last = lastForecastDay(today);
  const want = days.filter((d) => d >= today && d <= last);
  if (!want.length) throw new Error(days[days.length - 1] < today ? "Yarış geçti, tahmin alınamaz" : `Tahmin henüz yok; ${forecastFrom(days[0])} tarihinden sonra alınabilir`);
  const place = await racePlace(r);
  const q = new URLSearchParams({
    latitude: place.lat, longitude: place.lon, timezone: "auto", wind_speed_unit: "kn", start_date: want[0], end_date: want[want.length - 1],
    hourly: "temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Hava tahmini alınamadı (${res.status})`);
  return cleanWeather({ place, at: new Date().toISOString(), days: shapeDays(await res.json(), want) });
}
