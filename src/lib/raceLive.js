// Yarış multimedya sayfası (/athletes/races/<id>/media) saf parçaları: rüzgâr kayıtları, startlar, fotoğraf/video künyeleri,
// genel sıralama süzgeci ve asistan cümleleri. Kayıt orgs/{org}/raceLive/{yarışId} belgesinde (raceLiveStore.js):
// { wind: [{ at, dir, kn, gust, src }], starts: [{ id, day, n, at, dir, kn, course, flag, note }], media: [{ id, kind, type, size, url, at, ath }] }
// (ath: fotoğrafta/videoda etiketlenen sporcuların id'leri; phase/sec/end: çekildiği an start sayacına göre, momentOf).
// Rüzgâr kaydının `src` alanı "elle" ya da ileride bağlanacak ölçüm cihazının adı: grafik ikisini aynı noktalarla çizer.

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, max) => (Number.isFinite(Number(v)) && v !== null && v !== "" && Number(v) >= 0 && Number(v) <= max ? Math.round(Number(v)) : null);
const ISO = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : "");
const ID = /^[\w-]{1,40}$/;
const cleanIds = (v) => [...new Set((Array.isArray(v) ? v : []).filter((x) => typeof x === "string" && ID.test(x)))].slice(0, 30);

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
    .map((w) => {
      const ckn = Number(w?.ckn);
      const cur = Number.isFinite(ckn) && ckn > 0 && ckn <= 10 ? Math.round(ckn * 10) / 10 : null;
      // Akıntı (Seyhun 2026-10-18): hız knot (ondalıklı) ve nereye aktığı; not: serbest ayrıntı
      return { at: ISO(w?.at), dir: num(w?.dir, 359), kn: num(w?.kn, 80), gust: num(w?.gust, 99), src: S(w?.src, 20) || "elle", ckn: cur, cdir: cur ? num(w?.cdir, 359) : null, note: S(w?.note, 200) };
    })
    .filter((w) => w.at && w.dir !== null && w.kn !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-500);
}

export const COURSES = ["Trapez", "Up-down", "Üçgen"];
// Bayrak: yarış geçerli kalır. Geçersiz sayılan yarış (VOIDS, Seyhun 2026-10-18): tehir, genel geri çağırma ya da iptal; numarası sıradaki
// yarışa geçer (tekrar koşulan yarış yine "2. yarış"), çekimlerinin başlığına sebep eklenir ("Genel geri çağırma · 2. yarış")
export const FLAGS = ["Bireysel geri çağırma"];
export const VOIDS = ["Tehir", "Genel geri çağırma", "İptal"];
const OLD_VOID = { Ertelendi: "Tehir", "Genel geri çağırma": "Genel geri çağırma", İptal: "İptal" }; // eskiden bayrak olarak yazılanlar
// Parkur noktaları (Seyhun 2026-10-19): Süre'de Start · Şamandıra 1 · Şamandıra 2 · Finish kareleri; şamandıra eklenip çıkarılır.
// Kareye dokununca o yarışın startından beri geçen saniye yazılır (yarış satırında marks: { "Şamandıra 1": 580 }).
export const BUOYS = ["Start", "Şamandıra 1", "Şamandıra 2", "Finish"];
export function cleanBuoys(list) {
  const mid = (Array.isArray(list) ? list : []).filter((b) => /^Şamandıra \d{1,2}$/.test(b || ""));
  return ["Start", ...(Array.isArray(list) ? mid : BUOYS.slice(1, -1)).slice(0, 6), "Finish"];
}
// + son şamandıradan sonra yenisi; − son şamandırayı çıkarır (Start ve Finish kalır)
export const addBuoy = (list) => (list.length >= 8 ? list : [...list.slice(0, -1), `Şamandıra ${list.length - 1}`, "Finish"]);
export const dropBuoy = (list) => (list.length <= 2 ? list : [...list.slice(0, -2), "Finish"]);
const cleanMarks = (m) =>
  Object.fromEntries(
    Object.entries(m && typeof m === "object" ? m : {})
      .filter(([k, v]) => /^(Start|Finish|Şamandıra \d{1,2})$/.test(k) && num(v, 36000) !== null)
      .slice(0, 8)
      .map(([k, v]) => [k, num(v, 36000)]),
  );
// Yarışın sıradaki noktası (çerçeveli kare): yazılmamış ilk nokta
export const nextBuoy = (buoys, s) => buoys.find((b) => s?.marks?.[b] == null) || "";
export function cleanStarts(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({
      id: ID.test(x?.id || "") ? x.id : "",
      day: /^\d{4}-\d{2}-\d{2}$/.test(x?.day || "") ? x.day : "",
      n: num(x?.n, 99) || 1,
      name: S(x?.name, 40),
      cd: ISO(x?.cd),
      at: ISO(x?.at),
      fin: ISO(x?.fin),
      dir: num(x?.dir, 359),
      kn: num(x?.kn, 80),
      course: S(x?.course, 30),
      flag: FLAGS.includes(x?.flag) ? x.flag : "",
      void: VOIDS.includes(x?.void) ? x.void : OLD_VOID[x?.flag] || "",
      note: S(x?.note, 200),
      marks: cleanMarks(x?.marks),
    }))
    .filter((x) => x.id && x.day && x.at)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-200);
}

export function cleanMedia(list) {
  return (Array.isArray(list) ? list : [])
    .map((m) => ({ id: ID.test(m?.id || "") ? m.id : "", kind: m?.kind === "video" ? "video" : "photo", type: S(m?.type, 40), size: Number(m?.size) || 0, url: /^https:\/\//.test(m?.url || "") ? S(m.url, 600) : "", at: ISO(m?.at), ath: cleanIds(m?.ath), ...(Number(m?.dur) > 0 ? { dur: Math.min(600, Math.round(m.dur)) } : {}), ...cleanMoment(m) }))
    .filter((m) => m.id && m.url && m.at)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-400);
}

// Elle eklenen günler (antrenman: yarıştan önce ya da sonra; Seyhun 2026-10-18)
export const cleanDays = (list) => [...new Set((Array.isArray(list) ? list : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "")))].sort().slice(0, 60);
export const cleanLive = (d) => ({ wind: cleanWind(d?.wind), starts: cleanStarts(d?.starts), media: cleanMedia(d?.media), days: cleanDays(d?.days), buoys: cleanBuoys(d?.buoys) });

// Günün kayıtları
// Sayfadaki günler: yarışın günleri + çekim ya da start olan başka günler (deneme, erteleme). Yoksa o gün çekilen kaydedilir ama
// hiçbir gün seçilemediği için görünmezdi (Seyhun 2026-10-18: "kaydet dediğimde kaydedilmedi").
// Startan beri ileri sayım en çok 59:59 (Seyhun 2026-10-18: "bir saatlik limit olsun, 59:59'da bitsin"); sayaç 60. dakikada kendiliğinden durur (TimerSound)
export const UP_MAX = 3599;
// Cihazlar arası sayaç (useLiveSync): belgeye yazılan alanlar ve uzaktaki sayacın bu cihaza yazılıp yazılmayacağı.
// Sayfa ilk açılırken (first) yalnız süren sayaç alınır; durmuş eski kayıt buradaki antrenman sayacını durdurmaz.
export const pickTimer = (t) => ({ dur: t?.dur ?? 300, end: t?.end ?? null, left: t?.left ?? null, mode: t?.mode || "", rid: t?.rid || "", zero: t?.zero ?? null });
export function takeTimer(remote, mine, first, now) {
  if (!remote) return false;
  if (JSON.stringify(pickTimer(remote)) === JSON.stringify(pickTimer(mine))) return false;
  if (first) return remote.end != null && now < remote.end + (UP_MAX + 1) * 1000;
  return true;
}
export const upSec = (end, now) => Math.min(UP_MAX, Math.max(0, Math.floor((now - end) / 1000)));
export const liveDays = (days, live) =>
  [...new Set([...(days || []), ...(live?.days || []), ...[...(live?.media || []), ...(live?.starts || [])].map((x) => dayOf(x.at)).filter((d) => /^\d{4}-/.test(d))])].sort();
// Gün adları: yarış günleri "1. gün" (tek günse "Yarış"), diğerleri tarih sırasıyla "Antrenman 1", "Antrenman 2" (öncesi ve sonrası)
export function dayNames(rdays, days) {
  let k = 0;
  return Object.fromEntries(
    (days || []).map((d) => {
      const i = (rdays || []).indexOf(d);
      return [d, i >= 0 ? (rdays.length > 1 ? `${i + 1}. gün` : "Yarış") : `Antrenman ${++k}`];
    }),
  );
}
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

// Sayaç 0 olunca yeni start (sayaç yarışa bağlı değilse): serinin sıradaki numarası, o anki rüzgâr (son 90 dakikadaki elle kayıt, yoksa tahmin)
export function newStart(starts, at, wind = [], forecast = null, rdays = null) {
  const day = dayOf(at);
  const t = Date.parse(at);
  if ((starts || []).some((x) => Math.abs(Date.parse(x.at) - t) < 5000)) return null; // aynı start iki kez yazılmaz
  const near = [...windOn(wind, day)].reverse().find((w) => Date.parse(w.at) <= t + 60e3 && t - Date.parse(w.at) < 90 * 60e3);
  const w = near || forecast;
  const n = nextRaceNo(starts, day, rdays);
  return { id: `s${t.toString(36)}`, day, n, name: "", cd: "", at: new Date(t).toISOString(), fin: "", dir: w?.dir ?? null, kn: w?.kn ?? w?.wind ?? null, course: "", flag: "", note: "", void: "" };
}
// Yarışlar bütün seri boyunca sırayla numaralanır (Seyhun 2026-10-18: ilk gün 3 yarış yapıldıysa ikinci gün 4. yarışla başlar)
// Geçersiz yarış numara almaz: sıradaki geçerli yarışın numarasını taşır (tekrar koşulan yarışla aynı numara)
// rdays (yarışın günleri) verilirse yarış dışındaki günler (antrenman) kendi içinde 1'den başlar, yarış serisini kaydırmaz
const group = (day, rdays) => (rdays?.length && !rdays.includes(day) ? day : "seri");
export function renumber(starts, rdays = null) {
  const n = {};
  return cleanStarts(starts).map((x) => {
    const g = group(x.day, rdays);
    const c = n[g] || 0;
    if (!x.void) n[g] = c + 1;
    return { ...x, n: c + 1 };
  });
}
// Yarışın adı: elle verilen ad, yoksa "4. yarış"
export const raceName = (s) => (s ? s.name || `${s.n}. yarış` : "");
// Başlık: geçersiz yarışın önüne sebebi ("Genel geri çağırma · 2. yarış")
export const raceTitle = (s) => (s?.void ? `${s.void} · ${raceName(s)}` : raceName(s));
// Serinin sıradaki yarışının numarası
export const nextRaceNo = (starts, day = "", rdays = null) => (starts || []).filter((x) => !x.void && group(x.day, rdays) === group(day, rdays)).length + 1;

// ---- Yarış akışı (Süre sekmesi): Başlat yarışı açar (geri sayım), 0'da yarış başlar, "Yarışı bitir" bitirir ----
// Her adım yeni liste döndürür; çağıran kaydeder ve önceki listeyi "Geri al" için saklar.
// Başlat: geri sayım başlar, yarış satırı açılır (at: planlanan start anı, cd: geri sayımın başladığı an)
export function beginRace(starts, nowMs, endMs, rdays = null) {
  const id = `s${Math.round(endMs).toString(36)}`;
  const s = { id, day: dayOf(new Date(endMs).toISOString()), n: 1, name: "", cd: new Date(nowMs).toISOString(), at: new Date(endMs).toISOString(), fin: "", dir: null, kn: null, course: "", flag: "", note: "" };
  return { id, starts: renumber([...(starts || []).filter((x) => x.id !== id), s], rdays) };
}
// +30 sn / +1 dk: start anı kayar
export const shiftRace = (starts, id, endMs, rdays = null) =>
  renumber((starts || []).map((x) => (x.id === id ? { ...x, at: new Date(endMs).toISOString(), day: dayOf(new Date(endMs).toISOString()) } : x)), rdays);
// 0: yarış başladı; o anki rüzgâr (son elle kayıt) yazılır. Bağlı satır yoksa (sayaç başka yerden başlatıldı) yeni satır açılır
export function zeroRace(starts, id, endMs, wind = [], rdays = null) {
  const at = new Date(endMs).toISOString();
  const s = (starts || []).find((x) => x.id === id);
  if (!s) {
    const add = newStart(starts, at, wind, null, rdays);
    return add ? renumber([...(starts || []), add], rdays) : starts;
  }
  const w = newStart([], at, wind);
  return renumber((starts || []).map((x) => (x.id === id ? { ...x, at, dir: x.dir ?? w.dir, kn: x.kn ?? w.kn } : x)), rdays);
}
export const finishRace = (starts, id, finMs, rdays = null) => renumber((starts || []).map((x) => (x.id === id ? { ...x, fin: new Date(finMs).toISOString() } : x)), rdays);
export const dropRace = (starts, id, rdays = null) => renumber((starts || []).filter((x) => x.id !== id), rdays);
// Yarışı geçersiz say (tehir / genel geri çağırma / iptal): bitiş = iptal anı (çekimleri o ana kadar bu yarışa düşer); reason boşsa geri geçerli
export const voidRace = (starts, id, reason, atMs, rdays = null) =>
  renumber((starts || []).map((x) => (x.id !== id ? x : reason ? { ...x, void: reason, fin: x.fin || new Date(atMs).toISOString() } : { ...x, void: "" })), rdays);
// Süre: "42:10" (start → bitiş)
export const raceTime = (s) => (s?.fin && s?.at && !s.void ? clock(Math.max(0, Math.round((Date.parse(s.fin) - Date.parse(s.at)) / 1000))) : "");

// Çekildiği anın start sayacına göre yeri (Seyhun 2026-10-18): sayaç yarış dizisinde geri sayarken "pre" (start öncesi) ya da son 60 saniyede
// "last" (son 1 dakika), 0'dan sonra "race" (startan beri). sec: starta göre saniye (öncesi eksi), end: sayacın 0 anı (o yarışın startı).
// timer: Countdown kaydı { end, mode }. Sayaç yoksa, antrenman sayacıysa ya da çok uzaksa (15 dk önce / 3 saat sonra) null.
export const PHASES = { pre: "Start öncesi", last: "Son 1 dakika", race: "Yarış sırasında", after: "Yarış sonrası" };
// Çekildiği anın yarışı ve evresi, yarış satırlarından (Süre sekmesinde Başlat ile açılan): geri sayım başladıktan sonra start öncesi /
// son 1 dakika, startan bitişe kadar yarış sırasında, bitişten sonra 30 dakika yarış sonrası. Dönüş { rid, phase, sec, end } ya da null
export function momentAt(at, starts) {
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return null;
  const s = [...(starts || [])].reverse().find((x) => (x.cd ? Date.parse(x.cd) : Date.parse(x.at) - 900e3) <= t + 1000);
  if (!s) return null;
  const st = Date.parse(s.at);
  const fin = s.fin ? Date.parse(s.fin) : null;
  const sec = Math.round((t - st) / 1000);
  if (s.void && fin != null && t > fin + 1000) return null; // iptalden sonra çekilen bu yarışa düşmez
  const phase = sec < -60 ? "pre" : sec < 0 ? "last" : fin == null ? (sec <= 3 * 3600 ? "race" : "") : t <= fin ? "race" : t - fin <= 1800e3 ? "after" : "";
  return phase ? { rid: s.id, phase, sec, end: s.at } : null;
}
export function momentOf(at, timer) {
  if (timer?.end == null || timer.mode !== "start") return null;
  const sec = Math.round((Date.parse(at) - timer.end) / 1000);
  if (!Number.isFinite(sec) || sec < -900 || sec > 3 * 3600) return null;
  return { phase: sec < -60 ? "pre" : sec < 0 ? "last" : "race", sec, end: new Date(timer.end).toISOString() };
}
function cleanMoment(m) {
  const sec = Number(m?.sec);
  if (!PHASES[m?.phase] || !Number.isFinite(sec) || !ISO(m?.end)) return {};
  return { phase: m.phase, sec: Math.round(sec), end: ISO(m.end), ...(ID.test(m?.rid || "") ? { rid: m.rid } : {}) };
}
const clock = (sec) => `${Math.floor(Math.abs(sec) / 60)}:${pad(Math.abs(sec) % 60)}`;
// Kısa rozet (küçük resmin köşesi): "−3:12" start öncesi, "+12:30" startan beri
export const momentBadge = (m) => (m?.phase ? `${m.sec < 0 ? "−" : "+"}${clock(m.sec)}` : "");
// Uzun yazı (büyük açılınca, fotoğrafın üstüne basılan): "Son 1 dakika · 0:42 kala", "Startan beri 12:30"
export const momentText = (m) =>
  !m?.phase ? "" : m.phase === "race" ? `Yarış sırasında · ${clock(m.sec)}` : m.phase === "after" ? PHASES.after : `${PHASES[m.phase]} · ${clock(m.sec)} kala`;
// Çekilenin yarışının adı: bağlı yarış satırı (rid), yoksa 0 anına denk gelen start, yoksa o andan önceki startların sırası + 1
export const momentRaceName = (m, starts) => {
  const s = m?.rid && (starts || []).find((x) => x.id === m.rid);
  return s ? raceTitle(s) : `${momentRace(m, starts)}. yarış`;
};
export function momentRace(m, starts) {
  const r = m?.rid && (starts || []).find((x) => x.id === m.rid);
  if (r) return r.n;
  const t = Date.parse(m.end);
  const day = dayOf(m.end);
  const st = startsOn(starts, day);
  const hit = st.find((x) => Math.abs(Date.parse(x.at) - t) < 5000);
  return hit ? hit.n : st.filter((x) => Date.parse(x.at) < t).length + 1;
}

// Fotoğraf/video gruplanır: yarışa ve ana göre ("4. yarış · Son 1 dakika"). Anı kayıtlı olan kendi yarışına ve evresine düşer;
// anı olmayan, çekildiği saatten önceki son startın "Yarış sırasında" grubuna (start yoksa "Start öncesi").
// Dönüş [{ key, title, items }]: en son yarış en üstte, yarış içinde sonrası · sırasında · son 1 dakika · öncesi; içerik yeniden eskiye
export function mediaGroups(media, starts, day) {
  const st = startsOn(starts, day);
  const order = { after: 0, race: 1, last: 2, pre: 3 };
  const groups = new Map();
  for (const m of (media || []).filter((x) => dayOf(x.at) === day)) {
    let n = 0;
    let name = "";
    let phase = "pre";
    let id = "";
    let at = "";
    if (m.phase) (n = momentRace(m, starts)), (name = momentRaceName(m, starts)), (phase = m.phase), (id = m.rid || ""), (at = m.end);
    else {
      const s = [...st].reverse().find((x) => x.at <= m.at);
      if (s) (n = s.n), (name = raceTitle(s)), (phase = "race"), (id = s.id), (at = s.at);
    }
    // Aynı numaralı iki yarış (geçersiz sayılan ve tekrarı) ayrı gruplarda: anahtar yarışın kendisi
    const key = `${id || n}-${phase}`;
    if (!groups.has(key)) groups.set(key, { key, n, at, rank: order[phase], title: n ? `${name} · ${PHASES[phase]}` : PHASES.pre, items: [] });
    groups.get(key).items.push(m);
  }
  return [...groups.values()]
    .sort((a, b) => (b.n || 0) - (a.n || 0) || String(b.at).localeCompare(String(a.at)) || a.rank - b.rank)
    .map(({ key, title, items }) => ({ key, title, items: items.reverse() }));
}

// Sonradan düzeltme (büyük açınca "Düzelt"): çekimin yarışı ve anı değişir; mom null: yarışsız. Dönüş yeni liste
export function fixMedia(media, id, mom) {
  return cleanMedia(
    (media || []).map((m) => {
      if (m.id !== id) return m;
      const { phase: _p, sec: _s, end: _e, rid: _r, ...rest } = m;
      return mom ? { ...rest, ...mom } : rest;
    }),
  );
}
// Sporcu etiketi: dokunulan sporcu varsa çıkar, yoksa ekler. Dönüş yeni liste
export function tagMedia(media, id, athId) {
  return cleanMedia((media || []).map((m) => (m.id !== id ? m : { ...m, ath: m.ath?.includes(athId) ? m.ath.filter((x) => x !== athId) : [...(m.ath || []), athId] })));
}
// Süzgeç: yalnız o sporcunun etiketli olduğu fotoğraf/videolar ("" = hepsi)
export const mediaOf = (media, athId) => (athId ? (media || []).filter((m) => m.ath?.includes(athId)) : media || []);

// Gün sonu özeti (veliye / Instagram'a paylaşılan kart ve yazı). rows: yarış yerinin saatlik tahmini (yoksa null);
// elle/cihazla yazılan rüzgâr varsa o, yoksa tahminin start saatleri (yoksa 10–18) arası kullanılır.
// ours: [{ id, studentName }]; sıra yarış sonucundan (race.results.rows), en iyi sıradan.
export function daySummary({ race, day, live, ours = [], rows = null, line = null }) {
  const st = startsOn(live?.starts, day);
  const wl = windOn(live?.wind, day);
  const most = (dirs) => {
    const c = {};
    for (const d of dirs) c[dirShort(d)] = (c[dirShort(d)] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  };
  let wind = null;
  if (wl.length) {
    const kn = wl.map((w) => w.kn);
    const g = wl.map((w) => w.gust).filter((x) => x !== null);
    wind = { lo: Math.min(...kn), hi: Math.max(...kn), gust: g.length ? Math.max(...g) : null, dir: most(wl.map((w) => w.dir)), src: "ölçülen", pts: wl.map((w) => ({ hh: hm(w.at), kn: w.kn })) };
  } else if (rows?.length) {
    const h0 = st.length ? +hm(st[0].at).slice(0, 2) : 10;
    const h1 = st.length ? +hm(st[st.length - 1].at).slice(0, 2) + 1 : 18;
    const r = rows.filter((x) => +x.hh >= h0 && +x.hh <= h1);
    if (r.length) {
      const kn = r.map((x) => Math.round(x.wind));
      wind = { lo: Math.min(...kn), hi: Math.max(...kn), gust: Math.round(Math.max(...r.map((x) => x.gust))), dir: most(r.map((x) => x.dir)), src: "tahmin", pts: r.map((x) => ({ hh: `${x.hh}:00`, kn: Math.round(x.wind) })) };
    }
  }
  const res = race?.results?.rows || {};
  const team = ours
    .map((a) => ({ name: a.studentName || a.name || "", place: res[a.id]?.place || 0, line: res[a.id]?.place ? (line ? line(res[a.id]) : `${res[a.id].place}.`) : "" }))
    .filter((a) => a.name)
    .sort((a, b) => (a.place || 999) - (b.place || 999) || a.name.localeCompare(b.name, "tr"));
  const date = new Date(`${day}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  const sub = [race?.district || race?.city, date].filter(Boolean).join(" · ");
  const windText = wind ? `${wind.dir} ${wind.lo === wind.hi ? wind.hi : `${wind.lo}–${wind.hi}`} kn${wind.gust ? `, sağanak ${wind.gust} kn` : ""}${wind.src === "tahmin" ? " (tahmin)" : ""}` : "";
  const starts = st.map((x) => ({ n: x.n, time: hm(x.at), wind: x.kn !== null && x.dir !== null ? `${dirShort(x.dir)} ${x.kn} kn` : "", course: x.course, flag: x.void || x.flag }));
  const ranked = team.filter((a) => a.place);
  const text = [
    race?.name || "Yarış",
    sub,
    windText && `Rüzgâr: ${windText}`,
    starts.length && `Yarışlar: ${starts.map((x) => `${x.n}. ${x.time}${x.flag ? ` (${x.flag.toLocaleLowerCase("tr-TR")})` : ""}`).join(" · ")}`,
    ranked.length && `Bizimkiler:\n${ranked.map((a) => `${a.place}. ${a.name}${a.line && a.line !== `${a.place}.` ? ` · ${a.line}` : ""}`).join("\n")}`,
  ].filter(Boolean).join("\n");
  return { title: race?.name || "Yarış", sub, wind, windText, starts, team, text };
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
