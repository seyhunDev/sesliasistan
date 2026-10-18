// Yarış multimedya sayfası (/athletes/races/<id>/media) saf parçaları: rüzgâr kayıtları, startlar, fotoğraf/video künyeleri,
// genel sıralama süzgeci ve asistan cümleleri. Kayıt orgs/{org}/raceLive/{yarışId} belgesinde (raceLiveStore.js):
// { wind: [{ at, dir, kn, gust, src }], starts: [{ id, day, n, at, dir, kn, course, flag, note }], media: [{ id, kind, type, size, url, at }] }.
// Rüzgâr kaydının `src` alanı "elle" ya da ileride bağlanacak ölçüm cihazının adı: grafik ikisini aynı noktalarla çizer.

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, max) => (Number.isFinite(Number(v)) && v !== null && v !== "" && Number(v) >= 0 && Number(v) <= max ? Math.round(Number(v)) : null);
const ISO = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : "");
const ID = /^[\w-]{1,40}$/;

// Sekiz yön: rüzgârın geldiği yön (derece)
export const DIRS = [["K", 0], ["KD", 45], ["D", 90], ["GD", 135], ["G", 180], ["GB", 225], ["B", 270], ["KB", 315]];
export const dirShort = (deg) => DIRS[Math.round((((Number(deg) % 360) + 360) % 360) / 45) % 8][0];

const pad = (n) => String(n).padStart(2, "0");
// Telefonun saatine göre gün ve saat ("2026-10-19", "13:05")
export const dayOf = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const hm = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
// "2026-10-19" + "13:05" → ISO (telefonun saat dilimi)
export const atOf = (day, time) => new Date(`${day}T${/^\d{2}:\d{2}$/.test(time || "") ? time : "12:00"}:00`).toISOString();

export function cleanWind(list) {
  return (Array.isArray(list) ? list : [])
    .map((w) => ({ at: ISO(w?.at), dir: num(w?.dir, 359), kn: num(w?.kn, 80), gust: num(w?.gust, 99), src: S(w?.src, 20) || "elle" }))
    .filter((w) => w.at && w.dir !== null && w.kn !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-500);
}

export const COURSES = ["Trapez", "Up-down", "Üçgen"];
export const FLAGS = ["Ertelendi", "Genel geri çağırma", "Bireysel geri çağırma", "İptal"];
export function cleanStarts(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({
      id: ID.test(x?.id || "") ? x.id : "",
      day: /^\d{4}-\d{2}-\d{2}$/.test(x?.day || "") ? x.day : "",
      n: num(x?.n, 30) || 1,
      at: ISO(x?.at),
      dir: num(x?.dir, 359),
      kn: num(x?.kn, 80),
      course: S(x?.course, 30),
      flag: FLAGS.includes(x?.flag) ? x.flag : "",
      note: S(x?.note, 200),
    }))
    .filter((x) => x.id && x.day && x.at)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-100);
}

export function cleanMedia(list) {
  return (Array.isArray(list) ? list : [])
    .map((m) => ({ id: ID.test(m?.id || "") ? m.id : "", kind: m?.kind === "video" ? "video" : "photo", type: S(m?.type, 40), size: Number(m?.size) || 0, url: /^https:\/\//.test(m?.url || "") ? S(m.url, 600) : "", at: ISO(m?.at) }))
    .filter((m) => m.id && m.url && m.at)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-400);
}

export const cleanLive = (d) => ({ wind: cleanWind(d?.wind), starts: cleanStarts(d?.starts), media: cleanMedia(d?.media) });

// Günün kayıtları
export const windOn = (wind, day) => (wind || []).filter((w) => dayOf(w.at) === day);
export const startsOn = (starts, day) => (starts || []).filter((x) => x.day === day);

// Saatlik grafikte noktalar: satırlar 00..23 ise saat + dakika/60 sıradaki yer. rows: [{ hh }]
export function marksFor(rows, wind) {
  if (!rows?.length) return [];
  const h0 = +rows[0].hh;
  const last = rows.length - 1;
  return (wind || [])
    .map((w) => {
      const d = new Date(w.at);
      return { i: d.getHours() + d.getMinutes() / 60 - h0, kn: w.kn, dir: w.dir, hh: pad(d.getHours()) };
    })
    .filter((m) => m.i >= 0 && m.i <= last);
}

// Sayaç 0 olunca yeni start: günün sıradaki numarası, o anki rüzgâr (son 90 dakikadaki elle kayıt, yoksa tahmin)
export function newStart(starts, at, wind = [], forecast = null) {
  const day = dayOf(at);
  const t = Date.parse(at);
  if ((starts || []).some((x) => Math.abs(Date.parse(x.at) - t) < 5000)) return null; // aynı start iki kez yazılmaz
  const near = [...windOn(wind, day)].reverse().find((w) => Date.parse(w.at) <= t + 60e3 && t - Date.parse(w.at) < 90 * 60e3);
  const w = near || forecast;
  const n = startsOn(starts, day).length + 1;
  return { id: `s${t.toString(36)}`, day, n, at: new Date(t).toISOString(), dir: w?.dir ?? null, kn: w?.kn ?? w?.wind ?? null, course: "", flag: "", note: "" };
}
// Startlar yeniden numaralanır (silinince ya da saati değişince)
export function renumber(starts) {
  const by = {};
  return cleanStarts(starts).map((x) => ({ ...x, n: (by[x.day] = (by[x.day] || 0) + 1) }));
}

// Fotoğraf/video gruplanır: o günün hangi yarışından sonra çekildi. Dönüş [{ key, title, items }] (yeniden eskiye)
export function mediaGroups(media, starts, day) {
  const st = startsOn(starts, day);
  const groups = new Map();
  for (const m of (media || []).filter((x) => dayOf(x.at) === day)) {
    const s = [...st].reverse().find((x) => x.at <= m.at);
    const key = s ? s.id : "pre";
    if (!groups.has(key)) groups.set(key, { key, title: s ? `${s.n}. yarış · ${hm(s.at)}` : "Start öncesi", items: [] });
    groups.get(key).items.push(m);
  }
  return [...groups.values()].reverse().map((g) => ({ ...g, items: g.items.reverse() }));
}

// Sayaç bipleri. Yarış (start dizisi): başlatınca, 4:00 ve 1:00 kala (süre ondan uzunsa), son 10 saniye her saniye, 0'da uzun.
// Antrenman: son 5 saniye her saniye, 0'da uzun. Dönüş: "" | "short" | "mid" | "long"
export function beepAt(left, mode = "") {
  if (left === 0) return "long";
  if (mode === "start") {
    if (left === 240 || left === 60) return "mid";
    return left > 0 && left <= 10 ? "short" : "";
  }
  return left > 0 && left <= 5 ? "short" : "";
}

// Genel sıralama: sınıfın satırları süzülür (Genel, Junior, Bambino, Kızlar), sıra süzgeç içinde yeniden verilir
export function sheetRows(fleet, filter = "all") {
  const rows = (fleet?.rows || []).map((r, i) => ({ ...r, i })); // i: sınıf listesindeki yeri (bizimkiler bununla işaretlenir)
  const pick = filter === "girls" ? rows.filter((r) => r.sex === "K") : filter === "Junior" || filter === "Bambino" ? rows.filter((r) => r.cat === filter) : rows;
  return pick.map((r, k) => ({ ...r, pos: k + 1 }));
}
export function sheetFilters(fleet) {
  const rows = fleet?.rows || [];
  return [["all", "Genel"], ...["Junior", "Bambino"].filter((c) => rows.some((r) => r.cat === c)).map((c) => [c, c]), ...(rows.some((r) => r.sex === "K") ? [["girls", "Kızlar"]] : [])];
}

// ---- Asistan ----
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const WORD_DIR = [
  [/kuzey\s*bat[ıi]|karayel|\bkb\b/, 315], [/kuzey\s*do[gğ]u|poyraz|\bkd\b/, 45], [/g[uü]ney\s*bat[ıi]|lodos|\bgb\b/, 225], [/g[uü]ney\s*do[gğ]u|ke[sş]i[sş]leme|\bgd\b/, 135],
  [/kuzey|y[ıi]ld[ıi]z|\bk\b/, 0], [/g[uü]ney|k[ıi]ble|\bg\b/, 180], [/bat[ıi]|batı|\bb\b/, 270], [/do[gğ]u|\bd\b/, 90],
];
const NUMS = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30 };
function numberIn(s, unit) {
  const m = s.match(new RegExp(`(\\d{1,2})\\s*(?:${unit})`));
  if (m) return +m[1];
  const w = s.match(new RegExp(`\\b(on|yirmi|otuz)?\\s*(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz)?\\s*(?:${unit})`));
  if (w && (w[1] || w[2])) return (NUMS[w[1]] || 0) + (NUMS[w[2]] || 0);
  return null;
}

// "rüzgar 15 knot kuzeybatı", "rüzgarı yaz karayel 12 knot", "kuzeybatıdan 14 knot esiyor yaz" → { kn, dir, gust }
export function windCommand(raw) {
  const s = low(raw);
  if (!/r[uü]zg[aâ]r|esiyor|\bkn\b|knot/.test(s)) return null;
  if (/\?|\bkaç\b|\bne\b|nasıl|olacak|tahmin|yarın/.test(s)) return null;
  const kn = numberIn(s, "knot|kn|not\\b|deniz mili");
  if (kn === null || kn > 60) return null;
  const rest = s.replace(/sağanak\s*\d+/, " ");
  const hit = WORD_DIR.find(([re]) => re.test(rest));
  if (!hit) return null;
  const g = s.match(/sağanak\s*(\d{1,2})/);
  return { kn, dir: hit[1], gust: g ? +g[1] : null };
}

// "5 dakikalık sayacı başlat", "sayacı başlat", "geri sayımı başlat 2 dakika", "start sayacını başlat" → { sec }
export function timerCommand(raw) {
  const s = low(raw);
  if (!/(saya[cç]|geri\s*say[ıi]m|start\s*say)/.test(s) || !/ba[sş]la/.test(s)) return null;
  const min = numberIn(s, "dakika|dk");
  const sec = min && min <= 30 ? min * 60 : 300;
  return { sec };
}

// Sesle kaydedilen rüzgâr hangi yarışa: açık yarış, yoksa bugün süren yarış
export function liveRace(races, today, cur = "") {
  if (cur) return (races || []).find((r) => r.id === cur) || null;
  const on = (r) => r.startDate && r.startDate <= today && (r.endDate || r.startDate) >= today;
  return (races || []).find(on) || null;
}
