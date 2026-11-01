// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01): şamandıra dönüşleri, parkur sırası, ekranda oynayan kayıt,
// resmî sonuçla (PDF) karşılaştırma. Saf işlevler (test: scripts/asistan-test/yerel/yaris.mjs).
// Kayıt orgs/{org}/raceLive/{yarış} belgesinde:
//   rounds: { [startId]: { route: ["1","4","1","2","3","F"], legs: [["1302","1287"], …] } } (legs[k]: route[k] noktasını dönüş sırası)
//   screen: { kind: "live" | "rec" | "", mid: medya id, loop, at }  stream: { url } (YouTube canlı yayın bağlantısı)
// Sıralama: sporcunun en son döndüğü nokta, sonra o noktadaki sırası. Aynı şamandıra parkurda birden çok geçebilir (1 · 4 · 1 · 2 · 3 · F):
// okunan yelken numarası, o teknenin son döndüğü noktadan sonraki ilk eşleşen noktaya yazılır.

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
export const digits = (s) => String(s || "").replace(/\D/g, "");
const MARK = /^(?:[1-9]|F)$/;
const SAIL = /^\d{1,6}$/;

export const CLASS_PICK = ["Optimist", "ILCA 4", "ILCA 6", "ILCA 7"];
export const PREP_PICK = ["P", "I", "Z", "U", "Kara"];
export const prepName = (p) => (p === "Kara" ? "Kara bayrak" : p ? `${p} bayrağı` : "");
export function cleanEntry(e) {
  const route = (Array.isArray(e?.route) ? e.route : []).map(String).filter((m) => MARK.test(m)).slice(0, 16);
  const legs = route.map((_, k) => {
    const l = Array.isArray(e?.legs?.[k]) ? e.legs[k] : [];
    return [...new Set(l.map(digits).filter((s) => SAIL.test(s)))].slice(0, 200);
  });
  // grp: startın grubu (Mavi, Sarı…, Altın; lib/roundScore.js), yoksa yazılmaz
  const grp = String(e?.grp || "").replace(/[^\p{L} ]/gu, "").trim().slice(0, 20);
  // cls: sınıf (Optimist, ILCA 4…; uyarı işaretinde sınıf bayrağı), prep: hazırlık bayrağı (P, I, Z, U, Kara) (Seyhun 2026-11-01)
  const cls = String(e?.cls || "").replace(/[^\p{L}\d ]/gu, "").trim().slice(0, 20);
  const prep = PREP_PICK.includes(e?.prep) ? e.prep : "";
  return { route, legs, ...(grp ? { grp } : {}), ...(cls ? { cls } : {}), ...(prep ? { prep } : {}) };
}
export function cleanRounds(r) {
  const out = {};
  for (const [id, e] of Object.entries(r && typeof r === "object" ? r : {}).slice(-60)) if (/^[\w-]{1,40}$/.test(id)) out[id] = cleanEntry(e);
  return out;
}

// ---- Sesli cümle ----
const ORD = [
  ["birinci|ilk", "1"],
  ["ikinci", "2"],
  ["üçüncü|ucuncu", "3"],
  ["dördüncü|dorduncu", "4"],
  ["beşinci|besinci", "5"],
  ["altıncı|altinci", "6"],
  ["yedinci", "7"],
  ["sekizinci", "8"],
  ["dokuzuncu", "9"],
];
const FIN = /fini[sş]h?|finiş|bitiş|varış/;
const BUOY = /şamandıra|samandira|şamandra|şamandıraya|işaret|\bmark\b/;
const NOT_COURSE = /eksen|derece|°|knot|komite|\bpin\b|rüzgar|rüzgâr|açı|hat\b/;
const ordAt = (s, i) => {
  for (const [re, m] of ORD) if (new RegExp(`^(?:${re})`).test(s.slice(i))) return m;
  return "";
};

// "birinci şamandıra 1302 1287 1415", "1. şamandıra: 1302, 1287", "şamandıra 2 1415", "finish 1287 1302" → { mark, sails }
export function roundCommand(raw) {
  const s = low(raw).replace(/[,;:]/g, " ");
  if (/\?|\bkaç\b|\bkim\b|nedir/.test(s)) return null;
  if (/\b(parkur|rota)\b/.test(s) || NOT_COURSE.test(s)) return null; // "1. şamandıra 15 derece" parkur ölçümü
  let mark = "";
  const b = s.match(BUOY);
  if (b) {
    const head = s.slice(0, b.index).trim();
    const tail = s.slice(b.index + b[0].length);
    const pre = head.match(/(?:^|\s)([1-9])\s*\.?\s*(?:nolu|numaralı)?$/);
    const preW = head.split(/\s+/).pop() || "";
    const post = tail.match(/^\s*(?:numara\s*)?([1-9])(?:\s|$|\.)/);
    mark = pre ? pre[1] : ordAt(preW, 0) || (post ? post[1] : "");
  } else if (FIN.test(s)) mark = "F";
  if (!mark) return null;
  // yelken numaraları: iki ve daha çok basamaklı sayılar (şamandıra numarası tek basamak)
  const sails = [...new Set((s.match(/\d{2,6}/g) || []).map(digits))];
  if (!sails.length) return null;
  return { mark, sails };
}

// "parkur 1 4 1 2 3 finish", "rota birinci dördüncü ikinci üçüncü finiş" → { route: ["1","4","1","2","3","F"] }
export function routeCommand(raw) {
  const s = low(raw).replace(/[,;:·-]/g, " ");
  if (!/\b(parkur|rota)\b/.test(s) || NOT_COURSE.test(s)) return null;
  const route = [];
  for (const w of s.split(/\s+/)) {
    if (/^[1-9]\.?$/.test(w)) route.push(w[0]);
    else if (FIN.test(w)) route.push("F");
    else if (ordAt(w, 0)) route.push(ordAt(w, 0));
  }
  if (route.length < 2) return null;
  if (route.at(-1) !== "F") route.push("F");
  return { route: route.slice(0, 16) };
}

// ---- Dönüşleri yazma ----
const lastPos = (legs, sail) => {
  for (let k = legs.length - 1; k >= 0; k--) if (legs[k].includes(sail)) return k;
  return -1;
};
// Dönüş: { entry, added: [[k, sail]], skipped: [sail] }. Noktası parkurda yoksa eklenir (parkur söylenmediyse okundukça oluşur)
export function applyRound(entry0, mark, sails) {
  const e = cleanEntry(entry0);
  const added = [];
  const skipped = [];
  for (const raw of sails || []) {
    const sail = digits(raw);
    if (!SAIL.test(sail)) continue;
    const p = lastPos(e.legs, sail);
    let k = e.route.findIndex((m, i) => i > p && m === mark);
    if (k < 0) {
      if (mark === "F" || e.route.at(-1) !== "F") k = e.route.length;
      else k = e.route.length - 1; // Finish'ten önce
      if (p >= k) {
        skipped.push(sail);
        continue;
      }
      e.route.splice(k, 0, mark);
      e.legs.splice(k, 0, []);
      added.forEach((a) => a[0] >= k && a[0]++);
    }
    if (e.legs[k].includes(sail)) {
      skipped.push(sail);
      continue;
    }
    e.legs[k].push(sail);
    added.push([k, sail]);
  }
  return { entry: e, added, skipped };
}
// Parkur değişince: eski dönüşler sırayla yeni parkura taşınır
export function setRoute(entry0, route) {
  const old = cleanEntry(entry0);
  let e = { route: [...route], legs: route.map(() => []), ...(old.grp ? { grp: old.grp } : {}), ...(old.cls ? { cls: old.cls } : {}), ...(old.prep ? { prep: old.prep } : {}) };
  old.legs.forEach((l, k) => {
    e = applyRound(e, old.route[k], l).entry;
  });
  return e;
}

// ---- Sıralama ----
// [{ sail, pos: son dönülen nokta, ranks: [nokta başına sıra | null] }], en önde olan başta
export function standings(entry0) {
  const e = cleanEntry(entry0);
  const all = [...new Set(e.legs.flat())];
  return all
    .map((sail) => {
      const ranks = e.legs.map((l) => (l.includes(sail) ? l.indexOf(sail) + 1 : null));
      const pos = lastPos(e.legs, sail);
      return { sail, pos, ranks };
    })
    .sort((a, b) => b.pos - a.pos || a.ranks[a.pos] - b.ranks[b.pos]);
}
// Şu an dönülen nokta (en ileri dolu nokta), yoksa -1
export const nowPos = (entry0) => {
  const e = cleanEntry(entry0);
  for (let k = e.legs.length - 1; k >= 0; k--) if (e.legs[k].length) return k;
  return -1;
};
export const markLabel = (m) => (m === "F" ? "F" : m);
export const markName = (m) => (m === "F" ? "Finish" : `${m}. şamandıra`);
// Elle finish sırası: yelken → sıra (son F noktası)
export function manualFinish(entry0) {
  const e = cleanEntry(entry0);
  const k = e.route.lastIndexOf("F");
  return k < 0 ? {} : Object.fromEntries(e.legs[k].map((s, i) => [s, i + 1]));
}

// ---- Resmî sonuç (PDF; raceLive/{yarış}/sheets) ----
// Satırın yarış yarış puanları r: ["1","(14)","DNF"]; n. yarış = r[n-1]. Grup grup (Altın, Gümüş) ya da sınıf sınıf liste.
export const scoreNum = (v) => {
  const m = String(v ?? "").match(/\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(",", ".")) : null;
};
export const sameSail = (a, b) => {
  const x = digits(a), y = digits(b);
  return !!x && !!y && (x === y || (x.length >= 3 && y.length >= 3 && (x.endsWith(y) || y.endsWith(x))));
};
export function officialFor(fleets, n, manual = {}) {
  const groups = new Map();
  const many = new Set((fleets || []).map((f) => f.cls)).size > 1;
  for (const f of fleets || []) {
    for (const r of f.rows || []) {
      const sc = Array.isArray(r.r) ? r.r[n - 1] : "";
      if (!sc) continue;
      const key = `${f.cls}|${r.grp || ""}`;
      const label = r.grp ? (many ? `${f.cls} ${r.grp}` : r.grp) : f.cls;
      if (!groups.has(key)) groups.set(key, { key, label, rows: [] });
      groups.get(key).rows.push({ sail: r.sail || "", name: r.name || "", club: r.club || "", score: String(sc) });
    }
  }
  const mk = Object.keys(manual);
  return [...groups.values()].map((g) => {
    const rows = g.rows.sort((a, b) => (scoreNum(a.score) ?? 999) - (scoreNum(b.score) ?? 999) || a.name.localeCompare(b.name, "tr"));
    const has = mk.length > 0 && rows.some((r) => mk.some((s) => sameSail(s, r.sail)));
    return {
      ...g,
      manual: has,
      rows: rows.map((r, i) => {
        const hit = has ? mk.find((s) => sameSail(s, r.sail)) : null;
        const elle = hit ? manual[hit] : null;
        const place = /^\(?\d/.test(r.score) ? scoreNum(r.score) : null;
        return { ...r, place: place ?? "", code: place == null ? r.score.replace(/[()]/g, "") : "", pos: i + 1, elle, diff: has && (elle == null ? "Elle yok" : place != null && elle !== place ? `Elle ${elle}` : "") };
      }),
    };
  });
}
// Yelken numarasından ad ve kulüp (sonuç listelerinden)
export function whoBySail(fleets) {
  const out = {};
  for (const f of fleets || []) for (const r of f.rows || []) if (digits(r.sail) && !out[digits(r.sail)]) out[digits(r.sail)] = { name: r.name || "", club: r.club || "" };
  return out;
}
export function whoOf(map, sail) {
  const d = digits(sail);
  if (map[d]) return map[d];
  const k = Object.keys(map).find((x) => sameSail(x, d));
  return k ? map[k] : null;
}

// ---- Ekranda oynayan ----
export function cleanScreen(s) {
  const kind = ["live", "rec"].includes(s?.kind) ? s.kind : "";
  return { kind, mid: kind === "rec" && /^[\w-]{1,40}$/.test(s?.mid || "") ? s.mid : "", loop: !!s?.loop, at: typeof s?.at === "string" ? s.at.slice(0, 30) : "" };
}
// YouTube bağlantısından video kimliği (watch?v=, youtu.be/, /live/, /embed/)
export function ytId(url) {
  const u = String(url || "").trim();
  const m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : "";
}
// Kanalın canlı yayını (youtube.com/channel/UC…/live, …/embed/live_stream?channel=UC…): kanal kimliği; @ad bağlantısı çözülemez
export function ytChannel(url) {
  const m = String(url || "").match(/youtube\.com\/(?:channel\/|embed\/live_stream\?channel=)(UC[\w-]{22})/);
  return m ? m[1] : "";
}
// Gömülecek adres parçası (embed/…): video kimliği ya da kanalın canlı yayını; tanınmazsa ""
export function ytEmbed(url) {
  const v = ytId(url);
  if (v) return v;
  const c = ytChannel(url);
  return c ? `live_stream?channel=${c}` : "";
}
export const ytSrc = (url, q = "autoplay=1&mute=1&playsinline=1&rel=0") => {
  const e = ytEmbed(url);
  return e ? `https://www.youtube-nocookie.com/embed/${e}${e.includes("?") ? "&" : "?"}${q}` : "";
};
export const cleanStream = (s) => (ytEmbed(s?.url) ? { url: String(s.url).trim().slice(0, 200) } : { url: "" });

// Ekrandaki "1. yarış startı" gibi başlık: çekimin yarışı (rname) ve evresi
export function recTitle(m, rname) {
  const n = rname || "";
  if (!m?.phase) return n || "Kayıt";
  if (m.phase === "pre" || m.phase === "last" || (m.phase === "race" && m.sec <= 120)) return n ? `${n} startı` : "Start";
  if (m.phase === "after") return n ? `${n} sonrası` : "Yarış sonrası";
  const t = Math.abs(m.sec);
  return `${n || "Yarış"} · ${Math.floor(t / 60)}. dk`;
}

// "ekranda birinci yarışın startını döngüde göster", "ekranda canlı yayını göster", "ekrandan kaldır" → { kind, n, loop } | { clear }
export function screenCommand(raw) {
  const s = low(raw);
  if (/ekran(dan|ı)\s*(kaldır|kapat|temizle|boşalt)|ekrandakini\s*kaldır/.test(s)) return { clear: true };
  if (!/(canlı\s*)?ekran(da|a)\b/.test(s) || !/göster|oynat|\baç\b|ver\b|yayınla/.test(s)) return null;
  const loop = /döngü|tekrar\s*tekrar|sürekli|loop|başa\s*sar/.test(s);
  if (/canlı\s*yayın|yayını\b|canlı\s*görüntü/.test(s)) return { kind: "live", loop: false };
  let n = 0;
  const d = s.match(/(\d{1,2})\s*\.?\s*yarış/);
  if (d) n = +d[1];
  else {
    const w = s.match(/([a-zçğıöşü]+)\s+yarış/);
    if (w) n = +(ordAt(w[1], 0) || 0);
  }
  return { kind: "rec", n, loop };
}

// Canlı ekranın yarışı: sayaç bir yarışa bağlıysa o, değilse en son açılan geçerli yarış
export function currentStart(starts, timer) {
  const list = (starts || []).filter((x) => !x.void);
  const t = timer?.rid && list.find((x) => x.id === timer.rid);
  if (t) return t;
  return [...list].sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1) || null;
}
