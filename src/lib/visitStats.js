// Canlı yayın ziyaretleri (Seyhun 2026-11-02 "kaç kişi girdi, ne kadar kaldı, ne yaptı"): herkese açık /canli
// sayfalarının isimsiz ziyaret kaydı ve özetleri. Kayıt Firestore'a değil Netlify Blobs'a gider (okuma sınırına dokunmaz).
// Her açılış bir oturumdur (sid); aynı tarayıcı v ile tanınır (ret: daha önce de gelmiş). IP saklanmaz.
// Bu dosya saf işlevler: sunucu (api/canli-iz) ve Ayarlar › Yayın sayfası birlikte kullanır.

export const PING_MIN = 5; // sayfa açıkken kaç dakikada bir haber verir
export const LIVE_MS = (PING_MIN + 1.5) * 60e3; // son haberi bundan yeni ve kapanmamış oturum "şu an" sayılır
const SLOT = 10 * 60e3; // en kalabalık an 10 dakikalık dilimlerle

const S = (v, n) => String(v ?? "").slice(0, n);
const ID = /^[\w-]{1,60}$/;
export const trDay = (ms = Date.now()) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);
const trHour = (ms) => new Date(ms + 3 * 3600e3).getUTCHours();

// Tıklanan düğmenin adı → okunur iş adı (LiveScreen'deki aria-label ve yazılar); bilinmeyen yazı olduğu gibi kalır
const ACT = [
  [/^tam sıralama$|^sıralama$/i, "Sıralamayı açtı"],
  [/genel sıralama|^tümü$/i, "Genel sıralamayı açtı"],
  [/parkuru göster/i, "Parkuru açtı"],
  [/gün boyu rüzgâr/i, "Rüzgâr grafiğini açtı"],
  [/^yarışlar$|tüm yarışlar/i, "Yarış listesini açtı"],
  [/^önceki yarış$/i, "Önceki yarışa baktı"],
  [/önceki adım|sonraki adım|baştan|oynat|durdur/i, "Parkur animasyonunu oynattı"],
];
export function actName(label) {
  const t = S(label, 40).replace(/\s+/g, " ").trim();
  if (!t) return "";
  for (const [re, name] of ACT) if (re.test(t)) return name;
  return t;
}

// Nereden geldi: referrer ya da utm_source
export function refName(ref = "", utm = "") {
  const u = S(utm, 40).toLowerCase();
  const r = S(ref, 200).toLowerCase();
  const src = u || r;
  if (!src) return "Doğrudan link";
  if (/whatsapp|wa\.me/.test(src)) return "WhatsApp";
  if (/instagram/.test(src)) return "Instagram";
  if (/facebook|fb\.|m\.facebook/.test(src)) return "Facebook";
  if (/youtube|youtu\.be/.test(src)) return "YouTube";
  if (/google\./.test(src)) return "Google";
  if (/t\.co\b|twitter|x\.com/.test(src)) return "X";
  if (/telegram|t\.me/.test(src)) return "Telegram";
  if (/sesliasistan|velora/.test(src)) return "Velora";
  try {
    return new URL(/^https?:/.test(src) ? src : `https://${src}`).hostname.replace(/^www\./, "").slice(0, 40) || "Doğrudan link";
  } catch {
    return S(src, 40);
  }
}

// Cihaz: ekran genişliği ve tarayıcı
export function devName(ua = "", w = 0) {
  const a = String(ua);
  if (/smart-?tv|tizen|webos|hbbtv|appletv|googletv|android tv|crkey|bravia/i.test(a) || w >= 2400) return "TV";
  if (/ipad|tablet/i.test(a) || (/android/i.test(a) && !/mobile/i.test(a))) return "Tablet";
  if (/iphone|ipod|android|mobile/i.test(a) || (w && w < 700)) return "Telefon";
  return "Bilgisayar";
}

// Netlify'ın konum başlığı (x-nf-geo, base64 JSON): şehir ve ülke; yoksa boş
export function geoOf(header = "") {
  if (!header) return { city: "", cc: "" };
  try {
    const j = JSON.parse(Buffer.from(String(header), "base64").toString("utf8"));
    return { city: S(j?.city, 40), cc: S(j?.country?.code, 2).toUpperCase() };
  } catch {
    return { city: "", cc: "" };
  }
}

// İstemciden gelen haberi temizler. was: aynı oturumun önceki kaydı (başlangıç, ilk referrer korunur)
export function cleanVisit(b, { now = Date.now(), geo = {}, ua = "", was = null } = {}) {
  if (!b || typeof b !== "object") return null;
  const sid = S(b.s, 24);
  const v = S(b.v, 24);
  if (!/^[\w-]{6,24}$/.test(sid) || !/^[\w-]{6,24}$/.test(v)) return null;
  const race = b.r ? S(b.r, 60) : "";
  if (race && !ID.test(race)) return null;
  const day = S(b.d, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const dms = Date.parse(`${day}T12:00:00Z`);
  if (!Number.isFinite(dms) || Math.abs(dms - now) > 2 * 864e5) return null;
  const ev = {};
  if (b.ev && typeof b.ev === "object") {
    for (const [k, n] of Object.entries(b.ev).slice(0, 20)) {
      const a = actName(k);
      if (a) ev[a] = Math.min(999, (ev[a] || 0) + (Math.max(0, Math.round(Number(n))) || 0));
    }
  }
  const dur = Math.min(24 * 3600, Math.max(0, Math.round(Number(b.dur) || 0)));
  return {
    sid,
    v,
    race,
    day,
    ret: !!(was?.ret ?? b.ret),
    ref: was?.ref ?? refName(b.ref, b.utm),
    dev: was?.dev ?? devName(ua, Number(b.w) || 0),
    city: was?.city || S(geo.city, 40),
    cc: was?.cc || S(geo.cc, 2),
    t0: was?.t0 || now,
    t1: now,
    dur: Math.max(dur, was?.dur || 0),
    ev: was?.ev ? mergeCount(was.ev, ev, true) : ev,
    end: !!b.end,
  };
}

// Sayı tablolarını birleştirir; max: aynı oturumun sayaçları (büyüğü kalır), değilse toplanır
function mergeCount(a = {}, b = {}, max = false) {
  const o = { ...a };
  for (const [k, n] of Object.entries(b)) o[k] = max ? Math.max(o[k] || 0, n) : (o[k] || 0) + n;
  return o;
}

const empty = () => ({ n: 0, vs: [], rv: [], dur: 0, hr: Array(24).fill(0), peak: { n: 0, at: 0 }, acts: {}, refs: {}, devs: {}, cities: {}, days: {} });

// Bir günün oturumlarından özet (birleştirilebilir: sayılar ve ziyaretçi kimlikleri)
export function summarize(visits = []) {
  const s = empty();
  const vs = new Set();
  const rv = new Set();
  const slots = new Map();
  const hours = Array.from({ length: 24 }, () => new Set());
  const dayPeople = {};
  for (const x of visits) {
    if (!x?.v) continue;
    s.n++;
    vs.add(x.v);
    if (x.ret) rv.add(x.v);
    s.dur += x.dur || 0;
    const t0 = x.t0 || x.t1;
    const t1 = Math.max(t0, x.t1 || t0);
    for (let t = Math.floor(t0 / SLOT) * SLOT; t <= t1; t += SLOT) slots.set(t, (slots.get(t) || 0) + 1);
    for (let t = t0; t <= t1 + 1; t += 3600e3) hours[trHour(Math.min(t, t1))].add(x.v);
    hours[trHour(t1)].add(x.v);
    for (const a of Object.keys(x.ev || {})) s.acts[a] = (s.acts[a] || 0) + 1;
    s.refs[x.ref || "Doğrudan link"] = (s.refs[x.ref || "Doğrudan link"] || 0) + 1;
    s.devs[x.dev || "Bilgisayar"] = (s.devs[x.dev || "Bilgisayar"] || 0) + 1;
    const c = x.city || (x.cc && x.cc !== "TR" ? x.cc : "");
    if (c) s.cities[c] = (s.cities[c] || 0) + 1;
    (dayPeople[x.day] ||= new Set()).add(x.v);
  }
  s.vs = [...vs];
  s.rv = [...rv];
  s.hr = hours.map((h) => h.size);
  for (const [t, n] of slots) if (n > s.peak.n) s.peak = { n, at: t };
  for (const [d, set] of Object.entries(dayPeople)) s.days[d] = set.size;
  return s;
}

// Özetleri birleştirir (7 gün, 30 gün, bir yarışın tüm günleri)
export function mergeSums(list = []) {
  const s = empty();
  const vs = new Set();
  const rv = new Set();
  for (const x of list) {
    if (!x) continue;
    s.n += x.n || 0;
    s.dur += x.dur || 0;
    for (const v of x.vs || []) vs.add(v);
    for (const v of x.rv || []) rv.add(v);
    (x.hr || []).forEach((n, i) => (s.hr[i] += n || 0));
    if ((x.peak?.n || 0) > s.peak.n) s.peak = { ...x.peak };
    s.acts = mergeCount(s.acts, x.acts);
    s.refs = mergeCount(s.refs, x.refs);
    s.devs = mergeCount(s.devs, x.devs);
    s.cities = mergeCount(s.cities, x.cities);
    s.days = mergeCount(s.days, x.days);
  }
  s.vs = [...vs];
  s.rv = [...rv];
  return s;
}

// Şu an izleyen (kapanmamış, son haberi yeni) oturum sayısı, yarış yarış
export function liveCount(visits = [], now = Date.now()) {
  const by = {};
  for (const x of visits) if (x && !x.end && now - (x.t1 || 0) < LIVE_MS) by[x.race || ""] = (by[x.race || ""] || 0) + 1;
  return by;
}

// Sayfaya giden kısa görünüm: yüzdeler, ortalama süre, sıralı listeler (kimlik listeleri gitmez)
export function viewOf(s, live = 0) {
  const n = s?.n || 0;
  const people = s?.vs?.length || 0;
  const pct = (k) => (n ? Math.round((k / n) * 100) : 0);
  const top = (o = {}, max = 8) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([name, k]) => ({ name, pct: pct(k) }));
  return {
    live,
    n,
    people,
    ret: people ? Math.round(((s.rv?.length || 0) / people) * 100) : 0,
    avg: n ? Math.round((s.dur || 0) / n) : 0,
    hr: s?.hr || Array(24).fill(0),
    peak: s?.peak || { n: 0, at: 0 },
    acts: top(s?.acts, 10),
    refs: top(s?.refs, 6),
    devs: top(s?.devs, 4),
    cities: top(s?.cities, 12),
    days: Object.entries(s?.days || {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, k]) => ({ day, people: k })),
  };
}

// Son N günün gün listesi (bugün dahil, Türkiye saati)
export function lastDays(n, now = Date.now()) {
  return Array.from({ length: Math.max(1, Math.min(31, n)) }, (_, i) => trDay(now - i * 864e5));
}

// Ayarlar › Yayın listesi: yarışlar Yayında / Yaklaşan / Biten diye ayrılır
// races: [{ id, name, startDate, endDate, pub }] (pub: yayına açık), today: TR günü
export function raceGroups(races = [], today = trDay()) {
  const out = { now: [], soon: [], past: [] };
  for (const r of races) {
    if (!r?.id || !r.startDate) continue;
    const end = r.endDate || r.startDate;
    const row = { ...r, endDate: end, pub: !!r.pub };
    if (r.startDate <= today && today <= end) out.now.push(row);
    else if (r.startDate > today) out.soon.push(row);
    else out.past.push(row);
  }
  out.now.sort((a, b) => a.startDate.localeCompare(b.startDate));
  out.soon.sort((a, b) => a.startDate.localeCompare(b.startDate));
  out.past.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return out;
}
