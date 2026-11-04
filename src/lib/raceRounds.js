// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01): şamandıra dönüşleri, parkur sırası, ekranda oynayan kayıt,
// resmî sonuçla (PDF) karşılaştırma. Saf işlevler (test: scripts/asistan-test/yerel/yaris.mjs).
// Kayıt orgs/{org}/raceLive/{yarış} belgesinde:
//   rounds: { [startId]: { route: ["1","4","1","2","3","F"], legs: [["1302","1287"], …] } } (legs[k]: route[k] noktasını dönüş sırası)
//   screen: { kind: "live" | "drone" | "rec" | "", mid: medya id, loop, at }  stream: { url, drone } (YouTube canlı yayın ve drone yayını bağlantısı)
// Sıralama: sporcunun en son döndüğü nokta, sonra o noktadaki sırası. Aynı şamandıra parkurda birden çok geçebilir (1 · 4 · 1 · 2 · 3 · F):
// okunan yelken numarası, o teknenin son döndüğü noktadan sonraki ilk eşleşen noktaya yazılır.

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
export const digits = (s) => String(s || "").replace(/\D/g, "");
const MARK = /^(?:[1-9]|F)$/;
const SAIL = /^\d{1,6}$/;

export const CLASS_PICK = ["Optimist", "Optimist Junior", "ILCA 4", "ILCA 6", "ILCA 7"];
// Yarışın sınıfları (Seyhun 2026-11-04 "alınan yarışta hangi sınıf varsa direkt seçili olsun"): siteden izlenen sınıf (race.site.cls) ve
// talimattaki sınıflar (race.notice.classes) CLASS_PICK adlarına çevrilir
export function raceClasses(race) {
  const src = [race?.site?.cls, ...(Array.isArray(race?.notice?.classes) ? race.notice.classes : [])].filter(Boolean).map((x) => String(x).toLocaleLowerCase("tr-TR").replace(/ı/g, "i"));
  const out = new Set();
  for (const t of src) {
    if (/optim/.test(t)) out.add(/junior|\bjr\b|genç|minik/.test(t) ? "Optimist Junior" : "Optimist");
    const m = /ilca\s*([467])/.exec(t) || /laser\s*(4)\.7/.exec(t);
    if (m) out.add(`ILCA ${m[1]}`);
    else if (/laser\s*radial/.test(t)) out.add("ILCA 6");
    else if (/laser\s*(standart|standard)/.test(t)) out.add("ILCA 7");
  }
  return CLASS_PICK.filter((c) => out.has(c));
}
export const PREP_PICK = ["P", "I", "Z", "U", "Kara"];
export const prepName = (p) => (p === "Kara" ? "Kara bayrak" : p ? `${p} bayrağı` : "");
// Ceza ve sonuç kodları (Seyhun 2026-11-02 yayın incelemesi): puanı grup sayısı + 1, sıralamada en altta
// DNC gelmedi ve DNE (atılamaz diskalifiye) 2026-11-02; elle Yayın › Dönüşler › Ceza (arayarak seçerek)
export const PEN_CODES = ["DNC", "DNS", "OCS", "UFD", "BFD", "DSQ", "DNE", "RET", "DNF"];
export const PEN_NAME = { DNC: "Gelmedi", DNS: "Start almadı", OCS: "Erken çıktı", UFD: "U bayrağı", BFD: "Kara bayrak", DSQ: "Diskalifiye", DNE: "Atılamaz DSQ", RET: "Bıraktı", DNF: "Bitiremedi" };
// Ceza aramasının satırları (Yayın › Dönüşler › Ceza): yelken no başı ya da ad; members varsa önce o grup, all ile herkes
export function penRows({ entries = [], members = null, all = false, q = "" }) {
  const t = String(q || "").toLocaleLowerCase("tr-TR").trim();
  const d = t.replace(/\D/g, "");
  const base = all || !members ? entries : entries.filter((r) => members.includes(r.sail));
  if (!t) return base;
  return base.filter((r) => (d && String(r.sail || "").replace(/\D/g, "").startsWith(d)) || (!/^\d+$/.test(t) && String(r.name || "").toLocaleLowerCase("tr-TR").includes(t)));
}
// legs: kayıtta { "0": { s: [yelken…], t: [ms…] } } (Firestore iç içe dizi kabul etmez); bellekte legs [[yelken…]] ve tm [{ yelken: ms }]
// (saat yelkene bağlı: sıra düzeltilince, silinince saat kaymaz)
const legList = (e, n) => {
  const L = e?.legs;
  if (Array.isArray(L)) return Array.from({ length: n }, (_, k) => L[k]);
  if (L && typeof L === "object") return Array.from({ length: n }, (_, k) => L[k] ?? L[String(k)]);
  return Array.from({ length: n }, () => null);
};
export function cleanEntry(e) {
  const route = (Array.isArray(e?.route) ? e.route : []).map(String).filter((m) => MARK.test(m)).slice(0, 16);
  const raw = legList(e, route.length);
  const legs = [];
  const tm = [];
  raw.forEach((x, k) => {
    const list = Array.isArray(x) ? x : Array.isArray(x?.s) ? x.s : [];
    const arr = Array.isArray(x?.t) ? x.t : null;
    const map = e?.tm?.[k] && typeof e.tm[k] === "object" && !Array.isArray(e.tm[k]) ? e.tm[k] : {};
    const seen = new Set();
    const l = [];
    const t = {};
    list.forEach((v, i) => {
      const s = digits(v);
      if (!SAIL.test(s) || seen.has(s) || l.length >= 200) return;
      seen.add(s);
      l.push(s);
      const ms = Number(arr ? arr[i] : map[s]);
      if (Number.isFinite(ms) && ms > 0) t[s] = Math.round(ms);
    });
    legs.push(l);
    tm.push(t);
  });
  // grp: startın grubu (Mavi, Sarı…, Altın; lib/roundScore.js), yoksa yazılmaz
  const grp = String(e?.grp || "").replace(/[^\p{L} ]/gu, "").trim().slice(0, 20);
  // cls: sınıf (Optimist, ILCA 4…; uyarı işaretinde sınıf bayrağı), prep: hazırlık bayrağı (P, I, Z, U, Kara) (Seyhun 2026-11-01)
  const cls = String(e?.cls || "").replace(/[^\p{L}\d ]/gu, "").trim().slice(0, 20);
  const prep = PREP_PICK.includes(e?.prep) ? e.prep : "";
  // at: her noktada ilk teknenin saati (eski kayıt) ya da ilk teknenin tm'si; card: o yarışın parkur kartı
  const at = route.map((_, k) => (tm[k][legs[k][0]] ? new Date(tm[k][legs[k][0]]).toISOString() : typeof e?.at?.[k] === "string" && e.at[k].length <= 30 && legs[k].length ? e.at[k] : ""));
  const card = /^[A-H]$/.test(e?.card || "") ? e.card : "";
  // pen: { yelken: kod } (OCS, BFD, DSQ…)
  const pen = {};
  for (const [k, v] of Object.entries(e?.pen && typeof e.pen === "object" ? e.pen : {}).slice(0, 200)) {
    const s = digits(k);
    const c = String(v || "").toUpperCase();
    if (SAIL.test(s) && PEN_CODES.includes(c)) pen[s] = c;
  }
  const hasTm = tm.some((t) => Object.keys(t).length);
  return { route, legs, ...(hasTm ? { tm } : {}), ...(at.some(Boolean) ? { at } : {}), ...(grp ? { grp } : {}), ...(cls ? { cls } : {}), ...(prep ? { prep } : {}), ...(card ? { card } : {}), ...(Object.keys(pen).length ? { pen } : {}) };
}
// Kaydederken: yeni yazılan her numaraya o anın saati (önceden yazılmış saat kalır; Seyhun 2026-11-02 "lidere fark")
export function stampLegs(e0, now = Date.now()) {
  const e = cleanEntry(e0);
  const tm = e.legs.map((l, k) => Object.fromEntries(l.map((s) => [s, e.tm?.[k]?.[s] || now])));
  const at = e.route.map((_, k) => (e.legs[k].length ? new Date(tm[k][e.legs[k][0]]).toISOString() : ""));
  return { ...e, tm, ...(at.some(Boolean) ? { at } : {}) };
}
// Firestore'a yazılacak biçim: legs { "0": { s, t } } (iç içe dizi yok); at yazılmaz (t'den çıkar)
const legDoc = (e, k) => ({ s: e.legs[k], t: e.legs[k].map((s) => e.tm?.[k]?.[s] || 0) });
export function toStore(e0) {
  const e = cleanEntry(e0);
  const { tm: _t, at: _a, legs: _l, pen, ...meta } = e;
  return { ...meta, legs: Object.fromEntries(e.legs.map((_, k) => [String(k), legDoc(e, k)])), pen: pen || {} };
}
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
// İki görevli aynı startın farklı noktalarına yazarken birbirini silmesin (Seyhun 2026-11-02 inceleme): base (telefonun bildiği) ile
// next (telefonun yeni hâli) arasında değişen parçalar. Parkur değiştiyse bütün kayıt. Dönüş: { all: true, doc } | { patch, drop: [ceza silinen yelken] }
export function entryPatch(base0, next0) {
  const next = stampLegs(next0);
  if (!base0) return { all: true, doc: toStore(next) };
  const base = cleanEntry(base0);
  if (!same(base.route, next.route)) return { all: true, doc: toStore(next) };
  const patch = {};
  next.legs.forEach((l, k) => {
    if (!same(l, base.legs[k])) (patch.legs ||= {})[String(k)] = legDoc(next, k);
  });
  for (const f of ["grp", "cls", "prep", "card"]) if ((next[f] || "") !== (base[f] || "")) patch[f] = next[f] || "";
  const bp = base.pen || {};
  const np = next.pen || {};
  for (const [s, c] of Object.entries(np)) if (bp[s] !== c) (patch.pen ||= {})[s] = c;
  const drop = Object.keys(bp).filter((s) => !np[s]);
  return { patch, drop };
}
// Noktayı ilk dönen tekne ve saati: { sail, at } | null
export const leaderAt = (e, k) => (e?.legs?.[k]?.length ? { sail: e.legs[k][0], at: e.at?.[k] || "" } : null);
// Lidere fark (sn): noktada lider ile teknenin yazıldığı an arası; saat yoksa null
export function gapAt(e, k, i) {
  const l = e?.legs?.[k] || [];
  const t0 = e?.tm?.[k]?.[l[0]];
  const t = e?.tm?.[k]?.[l[i]];
  return t0 && t && i > 0 ? Math.max(0, Math.round((t - t0) / 1000)) : null;
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
      if (e.at) e.at.splice(k, 0, "");
      if (e.tm) e.tm.splice(k, 0, {});
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
  let e = { route: [...route], legs: route.map(() => []), tm: route.map(() => ({})), ...(old.grp ? { grp: old.grp } : {}), ...(old.cls ? { cls: old.cls } : {}), ...(old.prep ? { prep: old.prep } : {}), ...(old.card ? { card: old.card } : {}), ...(old.pen ? { pen: old.pen } : {}) };
  old.legs.forEach((l, k) => {
    const r = applyRound(e, old.route[k], l);
    e = r.entry;
    e.tm ||= e.legs.map(() => ({}));
    for (const [k2, sail] of r.added) if (old.tm?.[k]?.[sail]) e.tm[k2][sail] = old.tm[k][sail];
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
      return { sail, pos, ranks, ...(e.pen?.[sail] ? { pen: e.pen[sail] } : {}) };
    })
    .sort((a, b) => !!a.pen - !!b.pen || b.pos - a.pos || a.ranks[a.pos] - b.ranks[b.pos]);
}
// Sporcunun kendi dönüş sıraları (Seyhun 2026-11-02 "yan yana kendi dönüş sıralamalarını görmeli, yükselmiş düşmüş ok"):
// ranks içinden yazılan son iki noktanın farkı; atlanan şamandıra (null) sayılmaz (3 atlanıp finişte yazılabilir).
// Döndürür: { hist: [sıra|null…] (rotanın başından son yazılan noktaya kadar), move: >0 yükseldi, <0 düştü, 0 aynı, null tek nokta }
export function rankMove(ranks = []) {
  const idx = ranks.map((r, k) => (r != null ? k : -1)).filter((k) => k >= 0);
  const hist = idx.length ? ranks.slice(0, idx.at(-1) + 1) : [];
  if (idx.length < 2) return { hist, move: null };
  return { hist, move: ranks[idx.at(-2)] - ranks[idx.at(-1)] };
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
// Aynı tekne: rakamlar aynı (TUR 1312 = 1312). Sondan eşleşme yok: 312 ile 1312 başka tekneler (inceleme 2026-11-02)
export const sameSail = (a, b) => {
  const x = digits(a).replace(/^0+(?=\d)/, ""), y = digits(b).replace(/^0+(?=\d)/, "");
  return !!x && x === y;
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
  if (k) return map[k];
  // listede ülke ön ekiyle ya da eksik yazılmışsa: sondan tek bir eşleşme varsa o (birden çoksa kimse)
  const near = d.length >= 3 ? Object.keys(map).filter((x) => x.length >= 3 && (x.endsWith(d) || d.endsWith(x))) : [];
  return near.length === 1 ? map[near[0]] : null;
}

// ---- Ekranda oynayan ----
export function cleanScreen(s) {
  // boats: canlı tekne konumları (Seyhun 2026-11-03; features/tracking/BoatLive, ekrandaki yarışın grubu, döngü)
  const kind = ["live", "drone", "src", "rec", "boats"].includes(s?.kind) ? s.kind : "";
  // pause: yayına ara verildi (Seyhun 2026-11-02): video ekranda kalır, önünde "Yayına ara verildi" yazısı
  // caption: ekranın altındaki yazı (Seyhun 2026-11-02 "videonun ne olduğunu yazabileceğimiz bir alan, altta olimpiyat yayını gibi")
  // src: Yayın › Video'daki canlı kaynaklardan biri (stream.sources id; Seyhun 2026-11-02 "Drone 1, 2, 3, telefon; seçip ekrana alayım")
  // zoom: tekne ekranının yakınlığı (0 start … 100 bütün parkur; Seyhun 2026-11-03 "yönetimden ayarlayabileyim")
  return { kind, src: kind === "src" && SRC_ID.test(s?.src || "") ? s.src : "", mid: kind === "rec" && /^[\w-]{1,40}$/.test(s?.mid || "") ? s.mid : "", loop: !!s?.loop, pause: !!kind && !!s?.pause, caption: String(s?.caption || "").trim().slice(0, 80), at: typeof s?.at === "string" ? s.at.slice(0, 30) : "", ...(kind === "boats" ? { zoom: Number.isFinite(+s?.zoom) && s?.zoom !== null && s?.zoom !== "" ? Math.max(0, Math.min(100, Math.round(+s.zoom))) : 100 } : {}) };
}
// Parkur gösterimi (Seyhun 2026-11-02): auto = yarış öncesi 30 sn'de bir kendiliğinden (varsayılan açık), at = Yayın'dan "Parkuru göster"e basılan an
// one = Yayın'dan elle açılan tek gösterim ("course" | "wind" | "prog"): kaldırılana kadar ekranda kalır, yarış öncesi, sırasında ve sonrasında
// (Seyhun 2026-11-02 "starttan sonra manuel yönetim… parkur, rüzgâr, program gösterme butonları ayrı olsun")
export const SHOW_ONE = ["course", "wind", "prog"];
// side: videolu yarış öncesi ekranda soldaki bilgi şeridi (Seyhun 2026-11-02 "istersem kaldırabilmeliyim"), varsayılan açık
// ov: yarışta (start'tan sonra) sağdaki genel sıralama (Seyhun 2026-11-02 "göster ya da kaldır yapabilmeliyim"), varsayılan açık
// Yarış öncesi gösterim akışı (Seyhun 2026-11-03 17:10 sol-alt onayı; rota 17:34'te çıktı): beklenen rüzgâr (rüzgârın yanında açılır) → parkur → program.
// Yayın'da Otomatik (sec saniyede bir sıradaki, döner) ya da Elle (hold: ekrandaki adımın adı); pre: açık adımlar
export const PRE_STEPS = ["wind", "course", "prog"];
export const SCENES = ["01", "02", "03", "04", "05", "06"];
export const PRE_NAME = { wind: "Beklenen rüzgâr", course: "Parkur", prog: "Program" };
export const PRE_SECS = [8, 12, 20, 30];
export const cleanCourseShow = (c) => ({
  auto: c?.auto !== false,
  at: typeof c?.at === "string" ? c.at.slice(0, 30) : "",
  one: SHOW_ONE.includes(c?.one) ? c.one : "",
  side: c?.side !== false,
  ov: c?.ov !== false,
  sec: PRE_SECS.includes(Number(c?.sec)) ? Number(c.sec) : 12,
  pre: Array.isArray(c?.pre) ? PRE_STEPS.filter((k) => c.pre.includes(k)) : [...PRE_STEPS],
  hold: PRE_STEPS.includes(c?.hold) ? c.hold : "wind",
  // Yayın sahnesi (Seyhun 2026-11-04): "" otomatik (süreye göre), "01"…"06" Yayın'dan elle seçilen
  scene: SCENES.includes(c?.scene) ? c.scene : "",
  // Her sahnenin önceden seçilen videosu (Seyhun 2026-11-04 "her ekranın canlı videosunu önceden seçebilmeliyim"): sahne açılınca o görüntü;
  // kind "" = bulanık foto; sahnenin anahtarı yoksa ekrandaki ne ise o kalır
  vid: cleanSceneVid(c?.vid),
  // Evre atamaları (Seyhun 2026-11-04 "yarış öncesi şu video, yarışta şu drone; o sahnede şunu göster, sonra parkuru, rüzgârı"): evre başına
  // görüntü (vid; yoksa ekrandaki), gösterilecekler sırası (items) ve her birinin süresi (sec). Eski sahne videoları (vid) evrelere taşınır
  ev: cleanEv(c?.ev, cleanSceneVid(c?.vid)),
  // Elle sabitlenen öğe (Yayın › Ekran › Sabitle); "Otomatiğe dön" boşaltır
  pin: SHOW_ITEMS.includes(c?.pin) ? c.pin : "",
  // Elle seçilen evre (Seyhun 2026-11-04 "manuelde tıklayarak evrelere geçebilmeliyim"); boş = kendiliğinden
  evre: EVRES.includes(c?.evre) ? c.evre : "",
});
export function cleanSceneVid(v) {
  const out = {};
  for (const k of SCENES) {
    if (!v || typeof v[k] !== "object" || !v[k]) continue;
    const s = cleanScreen(v[k]);
    if (s.kind === "rec" && k !== "04") continue;
    out[k] = { kind: s.kind, src: s.src, mid: s.mid, ...(s.kind === "boats" ? { zoom: s.zoom } : {}) };
  }
  return out;
}
export const SCENE_NAME = { "01": "Yarış öncesi", "02": "Yarışta", "03": "Sıralama", "04": "Tekrar", "05": "Parkur", "06": "Sıradaki" };
export const SCENE_ROT = 15; // sn, 03 ↔ 06
// Otomatik sahne: tekrar videosu → 04; Parkur elle açık → 05; gün bitti → 03 ↔ 06; yarışta → 02; yarış bitti → 03 ↔ 06;
// yarış öncesi (bekleme, start dizisi, tehir) videolu → 02, videosuz → 01. Elle seçilen (show.scene) verisi varsa üstüne yazar
// far: yarış öncesi start'a 10 dk'dan fazla var (ya da saat yok); sıralama varsa arada 03 (Seyhun 2026-11-04 "starta bir saat var, genel sıralamayı neden gösteremiyoruz")
// Sahneler sırayla, her biri kendi süresi kadar (sn); boş anahtar atlanır
function sceneCycle(list, now) {
  const L = list.filter(([k, d]) => k && d > 0);
  const tot = L.reduce((s, [, d]) => s + d, 0);
  if (!tot) return "";
  let t = Math.floor(now / 1000) % tot;
  for (const [k, d] of L) {
    if (t < d) return k;
    t -= d;
  }
  return L[0][0];
}
// dwell: sahnenin ekranda kalacağı süre (sn); 03 uzun listede sayfa sayısı kadar kalır (Seyhun 2026-11-04 "sıralamayı daha detaylı; uzun liste")
export function sceneOf({ show, rec, mode, hasVideo, now, has, far = false, dwell = {} }) {
  const man = show?.scene || "";
  if (man && has[man]) return man;
  if (rec) return "04";
  if (show?.one === "course" && has["05"]) return "05";
  const d3 = dwell["03"] || SCENE_ROT;
  const rot = () => sceneCycle([[has["03"] ? "03" : "", d3], [has["06"] ? "06" : "", SCENE_ROT]], now);
  if (mode === "summary") return rot() || "01";
  if (mode === "race") return "02";
  const base = hasVideo ? "02" : "01";
  if (mode === "between") return rot() || base;
  // yarış öncesi (start'a 10 dk'dan çok) ve karada tehirde genel sıralama da döner (01'de Sıralama sekmesi yok, aynı bilgi iki yerde değil)
  if (((mode === "wait" && far) || mode === "ap") && has["03"]) return sceneCycle([[base, SCENE_ROT * 2], ["03", d3]], now);
  return base;
}
// Sahnenin görüntüsü: önceden seçilen video varsa o (ara ve alt yazı ekrandakinden), yoksa ekrandaki
export function sceneScreen(screen, show, sc) {
  const v = show?.vid?.[sc];
  const s = screen || { kind: "" };
  if (!v) return s;
  return { ...s, kind: v.kind, src: v.src || "", mid: v.mid || "", loop: v.kind === "boats", pause: !!v.kind && !!s.pause, ...(v.kind === "boats" ? { zoom: v.zoom ?? 100 } : {}) };
}
// ---- Yayın evreleri ve gösterilecekler (Seyhun 2026-11-04 "otomatik geçiş neye geçiyor belli değil; atamaları biz yapalım") ----
// Evre yarışın durumundan kendiliğinden belli olur (canlı ekran ve Yayın aynı evreOf); her evrenin görüntüsü ve öğe sırası Yayın › Ekran'da seçilir.
export const EVRES = ["pre", "prestart", "start", "race", "post", "ap"];
export const EVRE_NAME = { pre: "Yarış öncesi", prestart: "Start öncesi", start: "Start dizisi", race: "Yarışta", post: "Yarış sonrası", ap: "Tehir" };
export const EVRE_WHEN = { pre: "Start'a 10 dakikadan çok varken", prestart: "Turuncu bayrak çekilince ya da start'a 10 dakikadan az kalınca", start: "Start geri sayımında (5·4·1·0) ve genel geride", race: "Start'tan finişe kadar", post: "Finiş ya da abandone sonrası, gün bitince de", ap: "Tehir bayrağı çekiliyken" };
export const SHOW_ITEMS = ["video", "time", "prog", "wind", "course", "rank", "next"];
export const ITEM_NAME = { video: "Görüntü", time: "Süre", prog: "Program", wind: "Rüzgâr", course: "Parkur", rank: "Genel sıralama", next: "Sıradaki yarış" };
export const ITEM_SECS = [8, 10, 15, 20, 30];
export const EVRE_DEF = { pre: ["video", "time", "prog", "wind", "rank"], prestart: ["video", "time", "wind", "course"], start: ["video"], race: ["video"], post: ["rank", "next"], ap: ["time", "prog", "wind", "rank"] };
// Sol alttaki liste evre başına (Seyhun 2026-11-04 "genel sıralamayı starttan önce, start dizisinde, starttan sonra da gösterebilmeliyim"):
// grp = süre kartındaki grubun sporcuları + genel derecesi (yarışta dönüşten sonra dönüş sırası), gen = genel sıralama ilk 10, off = yok
export const SIDES = ["grp", "gen", "off"];
export const SIDE_NAME = { grp: "Grup ve sıra", gen: "Genel ilk 10", off: "Yok" };
export const SIDE_DEF = { pre: "grp", prestart: "grp", start: "grp", race: "grp", post: "off", ap: "grp" };
// eski sahnenin videosu hangi evreye (01 yarış öncesi videosuz, 02 videolu ve yarışta, 03 sıralama = yarış sonrası)
const EV_MIG = { pre: "01", prestart: "01", start: "02", race: "02", post: "03", ap: "01" };
export function cleanEvVid(v) {
  if (!v || typeof v !== "object") return null;
  const s = cleanScreen(v);
  return { kind: s.kind, src: s.src, mid: s.mid, ...(s.kind === "boats" ? { zoom: s.zoom } : {}) };
}
export function cleanEvOne(e, k, old = {}) {
  const has = !!e && typeof e === "object";
  const items = has && Array.isArray(e.items) ? [...new Set(e.items.filter((x) => SHOW_ITEMS.includes(x)))] : [...EVRE_DEF[k]];
  const vid = has ? cleanEvVid(e.vid) : old[EV_MIG[k]] || null;
  return { items, sec: ITEM_SECS.includes(Number(e?.sec)) ? Number(e.sec) : 15, vid, side: SIDES.includes(e?.side) ? e.side : SIDE_DEF[k] };
}
export function cleanEv(ev, old = {}) {
  return Object.fromEntries(EVRES.map((k) => [k, cleanEvOne(ev?.[k], k, old)]));
}
// Canlı ekranın kipinden evre: seq (dizide tehir "ap" ayrı), summary/between yarış sonrası; wait/none yarış öncesi
// soon: start'a 10 dk'dan az ya da turuncu bayrak çekili (Start öncesi). man: Yayın'dan elle seçilen evre (courseShow.evre) her şeyin üstünde
export function evreOf(mode, seqMode = "", soon = false, man = "") {
  if (EVRES.includes(man)) return man;
  if (mode === "ap" || (mode === "seq" && seqMode === "ap")) return "ap";
  if (mode === "seq") return "start";
  if (mode === "race") return "race";
  if (mode === "between" || mode === "summary") return "post";
  return soon ? "prestart" : "pre";
}
// O an gösterilen öğe: elle sabitlenen (ya da sesle açılan parkur/rüzgâr/program) varsa o; yoksa evrenin sırası, verisi olmayan atlanır.
// has: verisi olan öğeler; dwell: öğenin en az süresi (sn; uzun sıralama sayfa sayısı kadar). Dönen: item, left (sn), next, list
export function showPlan({ show, evre, has, now, dwell = {} }) {
  const c = cleanCourseShow(show);
  const e = c.ev[evre] || c.ev.pre;
  const pin = c.pin || ({ course: "course", wind: "wind", prog: "prog" }[c.one] || "");
  const list = e.items.filter((k) => has[k]);
  if (pin && has[pin]) return { evre, item: pin, pin: true, list, left: 0, next: "" };
  if (!list.length) return { evre, item: has.video ? "video" : "time", pin: false, list, left: 0, next: "", empty: true };
  const L = list.map((k) => [k, Math.max(e.sec, dwell[k] || 0)]);
  const tot = L.reduce((s, [, d]) => s + d, 0);
  let t = Math.floor(now / 1000) % tot;
  for (let i = 0; i < L.length; i++) {
    const [k, d] = L[i];
    if (t < d) return { evre, item: k, pin: false, list, left: d - t, next: L.length > 1 ? L[(i + 1) % L.length][0] : "" };
    t -= d;
  }
  return { evre, item: L[0][0], pin: false, list, left: 0, next: "" };
}
// Evrenin görüntüsü: atanmışsa o (ara ve alt yazı ekrandakinden), yoksa ekrandaki
export function evreScreen(screen, show, evre) {
  const v = cleanCourseShow(show).ev[evre]?.vid;
  const s = screen || { kind: "" };
  if (!v) return s;
  return { ...s, kind: v.kind, src: v.src || "", mid: v.mid || "", loop: v.kind === "boats" || v.kind === "rec" ? true : !!s.loop, pause: !!v.kind && !!s.pause, ...(v.kind === "boats" ? { zoom: v.zoom ?? 100 } : {}) };
}
// Öğenin canlı ekrandaki çizimi (sahne.css sınıfları): Görüntü 02 (kayıtsa 04 Tekrar), Süre/Program/Rüzgâr 01, Sıralama 03, Parkur 05, Sıradaki 06
export const itemScene = (item, rec = false) => (item === "video" ? (rec ? "04" : "02") : item === "rank" ? "03" : item === "course" ? "05" : item === "next" ? "06" : "01");
// Akışta o an gösterilen adım; have: ekranda gösterilebilenler (veri yoksa adım atlanır). Otomatikte "at"tan (Yayın'da Başa al) itibaren döner.
export function preSteps(show, have = PRE_STEPS) {
  return cleanCourseShow(show).pre.filter((k) => have.includes(k));
}
export function preStep({ show, now, have = PRE_STEPS }) {
  const c = cleanCourseShow(show);
  const steps = preSteps(c, have);
  if (!steps.length) return "";
  if (!c.auto) return steps.find((k) => PRE_STEPS.indexOf(k) >= PRE_STEPS.indexOf(c.hold)) || steps[0];
  const at = Date.parse(c.at) || 0;
  return steps[Math.floor(Math.max(0, now - at) / (c.sec * 1000)) % steps.length];
}
// Yayın'da Geri / İleri / Durdur: o anki adımdan elle sürdür
export function preMove(show, now, by = 0, have = PRE_STEPS) {
  const c = cleanCourseShow(show);
  const steps = preSteps(c, have);
  if (!steps.length) return c;
  const cur = Math.max(0, steps.indexOf(preStep({ show: c, now, have })));
  return { ...c, auto: false, hold: steps[(cur + by + steps.length) % steps.length] };
}
// Yarış öncesi gösterim sırası (Seyhun 2026-11-02 "parkuru gösterdik, sonra rüzgâr grafiği, sonra başka ne gösterebiliyorsak; yarış başlayınca gösterilmemeli"):
// slides = ekranda olanlar sırayla (ör. ["course","wind","prog"]), her biri SHOW_ON. Otomatikte her SHOW_CYCLE'da bir tur;
// Yayın'dan "Göster" (at) o andan bir tur. pre değilse (yarış başladı) hiçbiri. Döndürür: o an gösterilen ("" yok)
export const SHOW_ON = 12000;
export const SHOW_CYCLE = 60000;
export function showSlide({ show, now, pre, slides = ["course"] }) {
  const c = cleanCourseShow(show);
  if (c.one && slides.includes(c.one)) return c.one;
  if (!pre || !slides.length) return "";
  const at = Date.parse(c.at) || 0;
  if (at && now >= at - 2000) {
    const k = Math.floor(Math.max(0, now - at) / SHOW_ON);
    if (k < slides.length) return slides[k];
  }
  if (!c.auto) return "";
  const k = Math.floor((now % SHOW_CYCLE) / SHOW_ON);
  return k < slides.length ? slides[k] : "";
}
// Eski ad: parkur ekranda mı (yalnız parkur)
export const courseShowing = ({ show, now, pre }) => showSlide({ show, now, pre, slides: ["course"] }) === "course";
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
// Bağlantıdaki başlama saniyesi (…&t=64s, ?t=1m4s, &start=64); yoksa null
export function ytStart(url) {
  const m = String(url || "").match(/[?&#](?:t|start)=(?:(\d+)m)?(\d+)s?(?:&|$)/);
  return m ? (+m[1] || 0) * 60 + +m[2] : null;
}
export const ytSrc = (url, q = "autoplay=1&mute=1&playsinline=1&rel=0") => {
  const e = ytEmbed(url);
  const t = ytId(url) ? ytStart(url) : null;
  return e ? `https://www.youtube-nocookie.com/embed/${e}${e.includes("?") ? "&" : "?"}${q}${t != null ? `&start=${t}` : ""}` : "";
};
// drone: DJI dronun yayını (Seyhun 2026-11-02): DJI Fly RTMP ile YouTube'a gönderir, burada o yayının (ya da drone kanalının) bağlantısı
const ytUrl = (u) => (ytEmbed(u) ? String(u).trim().slice(0, 200) : "");
// sources: canlı kaynaklar [{ id, name, kind: "drone"|"phone"|"camera", url }] (en çok 8; bağlantısı boş olabilir, sonra yapıştırılır).
// Eski tek alanlar (url = Kamera 1, drone = Drone 1) yazılırken listeden doldurulur; okuyan: lib/raceCams.js sourcesOf
const SRC_ID = /^[A-Za-z0-9_-]{1,40}$/;
export const SRC_KINDS = { drone: "Drone", phone: "Telefon", camera: "Kamera" };
export const cleanSources = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((x) => x && SRC_ID.test(x.id || ""))
    .slice(0, 8)
    .map((x) => ({ id: x.id, name: String(x.name || "").trim().slice(0, 30) || x.id, kind: SRC_KINDS[x.kind] ? x.kind : "camera", url: ytUrl(x.url) }));
export const cleanStream = (s) => {
  const sources = cleanSources(s?.sources);
  const of = (id) => sources.find((x) => x.id === id)?.url;
  return { url: sources.length ? of("c1") ?? ytUrl(s?.url) : ytUrl(s?.url), drone: sources.length ? of("d1") ?? ytUrl(s?.drone) : ytUrl(s?.drone), sources };
};
// Kaynak listesi: kayıtlı liste, yoksa eski alanlardan Kamera 1 + Drone 1
export const streamSources = (stream) => {
  const l = cleanSources(stream?.sources);
  return l.length ? l : [{ id: "c1", name: "Kamera 1", kind: "camera", url: ytUrl(stream?.url) }, { id: "d1", name: "Drone 1", kind: "drone", url: ytUrl(stream?.drone) }];
};
// Yeni kaynak: türün sıradaki numarası ("Drone 2", id d2)
export function addSource(list, kind) {
  const k = SRC_KINDS[kind] ? kind : "camera";
  const p = { drone: "d", phone: "p", camera: "c" }[k];
  let n = 1;
  while (list.some((x) => x.id === `${p}${n}`)) n++;
  return [...list, { id: `${p}${n}`, name: `${SRC_KINDS[k]} ${n}`, kind: k, url: "" }].slice(0, 8);
}
// Ekrandaki canlı görüntünün bağlantısı: canlı yayın, drone ya da seçilen kaynak
export const screenUrl = (scr, stream) => {
  if (scr?.kind === "live") return stream?.url || "";
  if (scr?.kind === "drone") return stream?.drone || streamSources(stream).find((x) => x.kind === "drone" && x.url)?.url || "";
  if (scr?.kind === "src") return streamSources(stream).find((x) => x.id === scr.src)?.url || "";
  return "";
};
// Sesle "drone 2", "telefon 1", "kamera 2" → kaynak (adı ya da türü + numarası)
export function sourceBySay(list, say) {
  const s = low(say).replace(/dron\b/g, "drone");
  const m = s.match(/(drone|telefon|kamera)\s*'?\s*(\d)/);
  if (!m) return null;
  return list.find((x) => low(x.name) === `${m[1]} ${m[2]}`) || null;
}
// DJI Fly › Canlı yayın › RTMP adresinin başı (sonuna YouTube yayın anahtarı eklenir; anahtar burada hiç yazılmaz, saklanmaz)
export const YT_RTMP = "rtmp://a.rtmp.youtube.com/live2/";

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
  // "geneli göster", "genel sıralamayı ekrandan kaldır" (ekranı temizlemeden önce bakılır)
  if (/\bgenel(i|in)?\b|genel\s*(sıralama|durum)/.test(s) && /kapat|kaldır|gizle|\baç\b|göster/.test(s)) return { ov: !/kapat|kaldır|gizle/.test(s) };
  if (/ekran(dan|ı)\s*(kaldır|kapat|temizle|boşalt)|ekrandakini\s*kaldır/.test(s)) return { clear: true };
  // "ekrana yaz: Optimist Mavi grup start" → { caption }; "ekrandaki yazıyı kaldır" → { caption: "" }
  if (/ekran(daki|ın altındaki)\s*yazıyı\s*(kaldır|sil|temizle)/.test(s)) return { caption: "" };
  // "turuncu bayrak çekildi" → { orange: true }; "turuncu bayrak indi" → { orange: false }
  if (/turuncu\s*bayra[kğ]/.test(s)) {
    if (/\bin(di|dir|sin|iyor)|indiril|kapat|yok/.test(s)) return { orange: false };
    if (/çek|kalk|kaldır|aç|bas|var|yukarı/.test(s)) return { orange: true };
  }
  // "sol bilgiyi kapat" / "sol bilgiyi aç" (videolu ekrandaki sol şerit)
  if (/sol\s*(bilgi|şerit|panel)/.test(s) && /kapat|kaldır|gizle|aç|göster/.test(s)) return { side: !/kapat|kaldır|gizle/.test(s) };
  const cy = String(raw || "").match(/ekran(?:a|ın altına)\s*yaz(?:ın)?\s*[:,]?\s*(.+)$/i);
  if (cy && cy[1].trim()) return { caption: cy[1].trim().replace(/[.!]+$/, "").slice(0, 80) };
  // "yayını duraklat", "yayına ara ver" → { pause: true }; "yayını sürdür", "yayına devam" → { pause: false }
  if (/yayın[ıa]?\s*(duraklat|ara\s*ver|beklet)|ekran[ıa]?\s*(duraklat|beklet)/.test(s)) return { pause: true };
  if (/yayın[ıa]?\s*(sürdür|devam)|ekran[ıa]?\s*(sürdür|devam)|duraklatmayı\s*kaldır/.test(s)) return { pause: false };
  if (!/(canlı\s*)?ekran(da|a)\b/.test(s) || !/göster|oynat|\baç\b|ver\b|yayınla/.test(s)) return null;
  const loop = /döngü|tekrar\s*tekrar|sürekli|loop|başa\s*sar/.test(s);
  // "ekranda drone 2'yi göster", "telefon 1'i ekrana ver" → { kind: "src", say } (adıyla bulunur); numarasız drone → ilk drone
  if (/(dron|drone|telefon|kamera)\s*'?\s*\d/.test(s)) return { kind: "src", say: s, loop: false };
  if (/\bdron|havadan|hava\s*görüntü/.test(s)) return { kind: "drone", loop: false };
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

// Şu an süren startlar (Seyhun 2026-11-02 inceleme: Mavi start aldıktan sonra Sarı start alınca Mavi ekrandan düşmesin):
// bugünün, bitmemiş, geçersiz olmayan, start anı gelmiş (ya da sayacın) startları; en son başlayan sonda
export function liveStarts(starts, timer, today, now = Date.now()) {
  return (starts || []).filter((x) => !x.void && !x.fin && x.day === today && (Date.parse(x.at) <= now || x.id === timer?.rid));
}

// Yayın görünümünde kısa ad ve kulüp (Seyhun 2026-11-02 "yelken no, isim, kulüp ama kısa olsun"): "Deniz Aydın" → "D. Aydın",
// "Dikili Yelken Kulübü" / "Dikili YK" → "DYK", tek kelime → ilk 4 harf
export function shortName(name) {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (w.length < 2) return w[0] || "";
  return `${w[0][0].toLocaleUpperCase("tr-TR")}. ${w.slice(1).join(" ")}`;
}
export function shortClub(club) {
  const w = String(club || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "";
  if (w.length === 1) return w[0].length <= 4 ? w[0].toLocaleUpperCase("tr-TR") : w[0].slice(0, 4).toLocaleUpperCase("tr-TR");
  const last = w.at(-1);
  const abbr = /^[A-ZÇĞİÖŞÜ]{2,4}$/.test(last) ? last : "";
  const head = (abbr ? w.slice(0, -1) : w).filter((x) => !/^(ve|and|of|the)$/i.test(x)).map((x) => x[0].toLocaleUpperCase("tr-TR")).join("");
  return (head + abbr).slice(0, 5);
}

// Beklenen rüzgâr grafiğinin saatleri (Seyhun 2026-11-03 19:12 "bugün bitiyorsa yarına geçsin"): şimdiki saatten (İstanbul) 12 saat;
// bugünün satırları, sonra ertesi günün (forecast.next, tm: true)
export function windAhead(data, now) {
  const h0 = new Date(now + 3 * 3600e3).getUTCHours();
  const a = (data?.forecast?.rows || []).filter((r) => r.wind != null && +r.hh >= h0).map((r) => ({ ...r, tm: false }));
  const b = (data?.forecast?.next || []).filter((r) => r.wind != null).map((r) => ({ ...r, tm: true }));
  return [...a, ...b].slice(0, 12);
}
