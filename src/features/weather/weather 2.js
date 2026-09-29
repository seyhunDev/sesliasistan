// Hava durumu ve rüzgâr: Open-Meteo (ücretsiz, anahtarsız). Rüzgâr knot (kn) olarak alınır.
// Sonuç cihazda 30 dk saklanır; bağlantı yoksa son alınan gösterilir.

export const PLACE = { name: "Dikili", lat: 39.0717, lon: 26.8886, tz: "Europe/Istanbul" };
const TTL = 30 * 60e3;
const KEY = "sa-weather";

// WMO hava kodu -> Türkçe ad + simge
export function sky(code, day = true) {
  if (code === 0) return { label: "Açık", icon: day ? "sun" : "moon" };
  if (code === 1 || code === 2) return { label: code === 1 ? "Az bulutlu" : "Parçalı bulutlu", icon: day ? "cloudSun" : "cloud" };
  if (code === 3) return { label: "Kapalı", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Sisli", icon: "fog" };
  if (code >= 51 && code <= 57) return { label: "Çisenti", icon: "rain" };
  if (code >= 61 && code <= 67) return { label: "Yağmurlu", icon: "rain" };
  if (code >= 71 && code <= 77) return { label: "Kar", icon: "snow" };
  if (code >= 80 && code <= 82) return { label: "Sağanak", icon: "rain" };
  if (code === 85 || code === 86) return { label: "Kar sağanağı", icon: "snow" };
  if (code >= 95) return { label: "Gök gürültülü", icon: "storm" };
  return { label: "—", icon: "cloud" };
}

// Rüzgâr yönü (geldiği yön, derece) -> Türkçe rüzgâr adı ve kısa yön
const WINDS = [
  ["Yıldız", "K"], ["Poyraz", "KD"], ["Gündoğusu", "D"], ["Keşişleme", "GD"],
  ["Kıble", "G"], ["Lodos", "GB"], ["Günbatısı", "B"], ["Karayel", "KB"],
];
export const windName = (deg) => WINDS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

// Rüzgâr şiddeti (kn): renk ve kısa açıklama (yelken için)
export function windLevel(kn) {
  if (kn < 7) return { label: "Hafif", tone: "text-mut" };
  if (kn < 12) return { label: "Tatlı", tone: "text-ok" };
  if (kn < 17) return { label: "Orta", tone: "text-acc" };
  if (kn < 22) return { label: "Sert", tone: "text-amber-700" };
  if (kn < 28) return { label: "Kuvvetli", tone: "text-rec" };
  return { label: "Fırtına", tone: "text-rec" };
}

const r = Math.round;

// Open-Meteo yanıtını sade biçime çevirir: şimdi, sonraki 15 saat, sonraki 5 gün
export function shape(j, now = new Date()) {
  const c = j.current;
  const h = j.hourly;
  const d = j.daily;
  const cur = c.time.slice(0, 13); // "2026-09-29T14"
  let i0 = h.time.findIndex((t) => t.slice(0, 13) >= cur);
  if (i0 < 0) i0 = 0;
  const hours = h.time.slice(i0 + 1, i0 + 16).map((t, k) => {
    const i = i0 + 1 + k;
    return { time: t, hh: t.slice(11, 13), t: r(h.temperature_2m[i]), code: h.weather_code[i], day: h.is_day ? !!h.is_day[i] : true,
      wind: r(h.wind_speed_10m[i]), gust: r(h.wind_gusts_10m[i]), dir: h.wind_direction_10m[i] };
  });
  const today = c.time.slice(0, 10);
  const days = d.time
    .map((t, i) => ({ date: t, code: d.weather_code[i], min: r(d.temperature_2m_min[i]), max: r(d.temperature_2m_max[i]),
      wind: r(d.wind_speed_10m_max[i]), gust: r(d.wind_gusts_10m_max[i]), dir: d.wind_direction_10m_dominant[i] }))
    .filter((x) => x.date > today)
    .slice(0, 5);
  const todayRow = d.time.indexOf(today) >= 0 ? d.time.indexOf(today) : 0;
  // Yapay zeka için: önümüzdeki 48 saat, saat saat (kısa biçim)
  const h48 = h.time.slice(i0, i0 + 48).map((t, k) => {
    const i = i0 + k;
    return [t, r(h.temperature_2m[i]), h.weather_code[i], r(h.wind_speed_10m[i]), r(h.wind_gusts_10m[i]), r(h.wind_direction_10m[i])];
  });
  return {
    at: now.getTime(),
    h48,
    now: { t: r(c.temperature_2m), code: c.weather_code, day: c.is_day !== 0, wind: r(c.wind_speed_10m), gust: r(c.wind_gusts_10m), dir: c.wind_direction_10m },
    today: {
      min: r(d.temperature_2m_min[todayRow]), max: r(d.temperature_2m_max[todayRow]), code: d.weather_code[todayRow],
      wind: r(d.wind_speed_10m_max[todayRow]), gust: r(d.wind_gusts_10m_max[todayRow]), dir: d.wind_direction_10m_dominant[todayRow], date: today,
    },
    hours,
    days,
  };
}

function url(p) {
  const q = new URLSearchParams({
    latitude: p.lat, longitude: p.lon, timezone: p.tz, wind_speed_unit: "kn", forecast_days: "6",
    current: "temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly: "temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant",
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

export function cached() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

// force: süre dolmamış olsa da yenile
export async function loadWeather(force = false) {
  const old = cached();
  if (!force && old && Date.now() - old.at < TTL) return old;
  const res = await fetch(url(PLACE), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Hava durumu alınamadı (${res.status})`);
  const data = shape(await res.json());
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  return data;
}

// ---- Yapay zeka için ----
// Hava ile ilgili bir soru mu (yalnızca o zaman veri gönderilir; kota boşa gitmesin)
const WX = new RegExp(
  "(?<![\\p{L}])(hava|havalar|rüzg[aâ]r|ruzgar|esinti|poyraz|lodos|karayel|kıble|keşişleme|imbat|meltem|fırtına|firtina|yağmur|yagmur|yağış|sağanak|kar(?![\\p{L}])|dolu(?![\\p{L}])|sis(?![\\p{L}])|bulut|güneş|gunes|sıcaklık|sicaklik|derece|soğuk|sıcak|serin|knot|kn(?![\\p{L}])|beaufort|dalga|denize (çık|cik)|yelken(e|de)? uygun|tekneye uygun|şemsiye|semsiye)",
  "iu",
);
export const wantsWeather = (text) => WX.test(String(text || "").toLocaleLowerCase("tr-TR"));

const DAYS = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: PLACE.tz });
const dname = (s) => DAYS.format(new Date(`${s}T12:00:00`));
const wind = (kn, gust, dir) => `${windName(dir)[0]} (${windName(dir)[1]}) ${kn} kn, hamle ${gust} kn, ${windLevel(kn).label.toLocaleLowerCase("tr-TR")}`;

// Yapay zekaya giden hava özeti (düz metin, kısa)
export function weatherDigest(w) {
  if (!w) return "";
  const age = Math.round((Date.now() - w.at) / 60000);
  const lines = [
    `## HAVA DURUMU (${PLACE.name}, Open-Meteo; ${age < 2 ? "az önce" : `${age} dk önce`} alındı; rüzgâr knot, yön rüzgârın geldiği yön)`,
    `ŞİMDİ: ${w.now.t}°C, ${sky(w.now.code, w.now.day).label}, ${wind(w.now.wind, w.now.gust, w.now.dir)}`,
    `BUGÜN (${dname(w.today.date || new Date().toISOString().slice(0, 10))}): ${w.today.min}–${w.today.max}°C${w.today.wind != null ? `, en yüksek rüzgâr ${wind(w.today.wind, w.today.gust, w.today.dir)}` : ""}`,
  ];
  if (w.h48?.length) {
    lines.push("SAATLİK (48 saat; saat | °C | gökyüzü | rüzgâr):");
    w.h48.forEach(([t, temp, code, kn, gust, dir]) =>
      lines.push(`${t.slice(5, 10)} ${t.slice(11, 16)} | ${temp}° | ${sky(code).label} | ${windName(dir)[1]} ${kn}/${gust} kn`),
    );
  }
  lines.push("GÜNLÜK:");
  w.days.forEach((d) => lines.push(`${dname(d.date)}: ${d.min}–${d.max}°C, ${sky(d.code).label}, en yüksek rüzgâr ${wind(d.wind, d.gust, d.dir)}`));
  return lines.join("\n");
}
