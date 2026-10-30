// Parkur analizi (Seyhun 2026-10-28, örnek yaris-tasarim/parkur/parkur-3-harita.png): yarış gününün parkuru harita üstünde.
// Kayıt orgs/{org}/raceLive/{yarış}/course/{gün} (gün gün ayrı; kişi uid'si ve sporcu bilgisi yok, ortak yarışa aynen taşınabilir):
//   pts: { komite, pin, m1, m2, m3, m4 } → { lat, lon, at } "burada" ile işaretlenen yerler
//   obs: [{ id, at, kind, ref, deg, kn, by, lat, lon }] ölçümler
//     kind "wind" (rüzgârın geldiği yön, kn hız) · "axis" (parkur ekseni) · "line" (ref "pin": pin'den komiteyi görüş,
//     ref "komite": komiteden pin'i görüş) · "mark" (ref "m1" orsa / "m2" apaz şamandırasına bakış) · "leg" (ref "m1m2" orsadan apaza,
//     "m2m1" apazdan orsaya); by "ben" | "komite" | "hakem"; lat/lon ölçümün yapıldığı yer (varsa)
//   len: { orsa } orsa ayağı metre (söylenmezse varsayılan)
// Bu dosya saf: temizleme, yazıdan anlama, açı hesapları, parkurun çizimi için noktalar.

export const KINDS = ["wind", "axis", "line", "mark", "leg"];
export const BYS = [["ben", "Ben"], ["komite", "Komite"], ["hakem", "Hakem botu"]];
export const PTS = ["komite", "pin", "m1", "m2", "m3", "m4"];
export const PT_NAME = { komite: "Komite", pin: "Pin", m1: "1 nolu (orsa)", m2: "2 nolu (apaz)", m3: "3 nolu", m4: "4 nolu" };
// "Bu açı ne?" seçenekleri (pusula ve elle ekleme aynı listeyi kullanır)
export const PICKS = [
  ["wind", "", "Rüzgâr"],
  ["axis", "", "Parkur ekseni"],
  ["line", "komite", "Komiteden pin"],
  ["line", "pin", "Pin'den komite"],
  ["mark", "m1", "Orsa şamandırası"],
  ["mark", "m2", "Apaz şamandırası"],
  ["leg", "m1m2", "Orsadan apaza"],
  ["leg", "m2m1", "Apazdan orsaya"],
];
export const ORSA_M = 900; // söylenmezse orsa ayağı (≈0,5 mil)
export const LINE_M = 120; // söylenmezse start hattı
const NM = 1852;

const N = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(+v) ? null : +v);
export const norm = (d) => ((Math.round(d) % 360) + 360) % 360;
// a'dan b'ye en kısa açı farkı (−180..180; artı saat yönü)
export const diff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
const geo = (p) => {
  const lat = N(p?.lat);
  const lon = N(p?.lon);
  return lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180 ? null : { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 };
};

export function cleanObs(o) {
  if (!o || !KINDS.includes(o.kind)) return null;
  const deg = N(o.deg);
  if (deg === null) return null;
  const kn = o.kind === "wind" ? N(o.kn) : null;
  const refs = { wind: [""], axis: [""], line: ["pin", "komite"], mark: ["m1", "m2", "m3", "m4"], leg: ["m1m2", "m2m1"] }[o.kind];
  const ref = refs.includes(o.ref) ? o.ref : refs[0];
  const at = typeof o.at === "string" && !Number.isNaN(Date.parse(o.at)) ? o.at : new Date().toISOString();
  // Rüzgâr aralığı (Seyhun 2026-10-30 "20 ile 30 arasında oynuyor"): range [ilk, ikinci] söylendiği sırayla; deg aradaki orta yön
  // (hat avantajı, kart ve dönüş ortadan hesaplanır). Aynı ya da 180°'den geniş aralık yok sayılır.
  const r = o.kind === "wind" && Array.isArray(o.range) ? o.range.map(N) : null;
  const range = r && r[0] !== null && r[1] !== null && Math.abs(diff(r[0], r[1])) >= 2 && Math.abs(diff(r[0], r[1])) < 180 ? [norm(r[0]), norm(r[1])] : null;
  return {
    id: String(o.id || `${Date.parse(at).toString(36)}${Math.random().toString(36).slice(2, 6)}`).slice(0, 24),
    at,
    kind: o.kind,
    ref,
    deg: range ? norm(range[0] + diff(range[0], range[1]) / 2) : norm(deg),
    ...(range ? { range } : {}),
    kn: kn === null || kn < 0 || kn > 80 ? null : Math.round(kn * 10) / 10,
    by: BYS.some(([k]) => k === o.by) ? o.by : "ben",
    ...(PTS.includes(o.spot) ? { spot: o.spot } : {}),
    ...(geo(o) || {}),
  };
}

export function cleanCourse(c) {
  const pts = {};
  for (const k of PTS) {
    const g = geo(c?.pts?.[k]);
    if (g) pts[k] = { ...g, at: typeof c.pts[k].at === "string" ? c.pts[k].at : "" };
  }
  const obs = (Array.isArray(c?.obs) ? c.obs : []).map(cleanObs).filter(Boolean).sort((a, b) => a.at.localeCompare(b.at)).slice(-200);
  const orsa = N(c?.len?.orsa);
  return { pts, obs, len: orsa && orsa >= 100 && orsa <= 10000 ? { orsa: Math.round(orsa) } : {} };
}

// ---- Yazıdan (sesle söylenen ya da yazılan) ölçüm: "orsa şamandırasında rüzgâr 330, 5 knot", "pin'den komite 52",
// "parkur ekseni 320", "komite burada", "orsa 0,8 mil". Dönüş { obs } | { pt } | { len } | null (anlaşılmadı → yapay zekâ)
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[’']/g, "").replace(/\s+/g, " ").trim();
const numWords = { sıfır: 0, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90, yüz: 100 };
// "üç yüz otuz" → 330 (yazıyla söylenen sayılar). Basamak büyükten küçüğe gitmezse yeni sayı başlar: "üç yüz otuz on iki" → "330 12"
// (Seyhun 2026-10-30 "sesle parkur hatasız olmalı": eskiden 342 oluyordu)
function wordsToNum(t) {
  return t.replace(/(?<![a-zçğıöşü])((?:sıfır|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan|yüz)(?:\s+(?:sıfır|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan|yüz))*)(?![a-zçğıöşü])/g, (m, _g, at, all) => {
    // tek başına "bir" sayı değil ("bir rüzgar ölçümü 330"); "bir numaralı", "bir knot" sayı
    if (m === "bir" && !/^\s*(nolu|numara|knot|not|kn|derece|mil|metre)/.test(all.slice(at + 3))) return m;
    const out = [];
    let cur = null;
    let place = 9; // son kullanılan basamak: 2 yüzler, 1 onlar, 0 birler
    const flush = () => (cur !== null && out.push(cur), (cur = null), (place = 9));
    for (const w of m.split(/\s+/)) {
      const v = numWords[w];
      if (w === "sıfır") (flush(), out.push(0));
      else if (v === 100) {
        if (cur !== null && (cur >= 10 || place < 0)) flush();
        cur = (cur || 1) * 100;
        place = 2;
      } else if (v >= 10) {
        if (place <= 1) flush();
        cur = (cur || 0) + v;
        place = 1;
      } else {
        if (place <= 0) flush();
        cur = (cur || 0) + v;
        place = 0;
      }
    }
    flush();
    return out.join(" ");
  });
}
// Ses tanımanın sık hataları (Seyhun 2026-10-30 "muhtemel hatalara önlem"): "üçyüz" bitişik, "1. şamandıra" (iPhone sırayı rakamla yazar),
// "bin'den komite" / "bin burada" (pin), "12 nat / knat / nod" (knot), "12-15 knot" / "12 ile 15 knot" aralığı (ortalaması; 12 derece sanılmasın)
const joinFix = (t) => t.replace(/(bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz)yüz(?![a-zçğıöşü])/g, "$1 yüz");
const sttFix = (t) => t
  .replace(/(?<![\d.])([1-4])\s*\.\s*(?=şamandıra)/g, "$1 nolu ")
  .replace(/(?<![a-zçğıöşü])bin(?=(?:den|e|in)?(?![a-zçğıöşü])\s*(?:komite|burada|burası|end|ucu|\d))/g, "pin")
  .replace(/(\d)\s*(?:k?nat|k?nod|knt|konat|kont)(?![a-zçğıöşü])/g, "$1 knot")
  .replace(/(\d+(?:\.\d+)?)\s*(?:-|–|ile|ila|ya da|veya)\s*(\d+(?:\.\d+)?)\s*(?=knot|knots|not|kn|kt)/g, (m, a, b) => (+a < +b && +b <= 60 ? `${Math.round(((+a + +b) / 2) * 2) / 2} ` : m));
// Söylenen / yazılan cümle: küçük harf, yazıyla sayılar rakam, ondalık virgül nokta, ses tanıma hataları düzeltilmiş
const prep = (text) => sttFix(wordsToNum(joinFix(low(text))).replace(/(\d),(\d)/g, "$1.$2")).replace(/(\d)\s*(?:°|derece)?\s+ve\s+(\d{1,3})(?=\s*(?:°|derece)?\s*ara)/g, "$1 ile $2");
// Rüzgâr yön aralığı: "20 ile 30 arasında", "20-30 arası", "20 ila 30", "20den 30a dönüyor", "30dan 10a oynuyor"
const RANGE = /(?<!\d)(\d{1,3})\s*(?:°|derece)?\s*(?:-|–|ile|ila|ya da|veya)\s*(\d{1,3})(?!\d)|(?<!\d)(\d{1,3})\s*(?:°|derece)?\s*(?:den|dan|ten|tan)\s+(\d{1,3})\s*(?:°|derece)?\s*(?:a|e|ya|ye)(?![a-zçğıöşü])/;
const SWING = /ara(sı|sında)|oynuyor|oynadı|salın|gidip geliyor|değişiyor|dönüp duruyor|dönüyor|döndü/;
const DIR_DEG = [
  [/kuzey ?bat[ıi]|karayel/, 315], [/kuzey ?do[gğ]u|poyraz/, 45], [/g[uü]ney ?bat[ıi]|lodos/, 225], [/g[uü]ney ?do[gğ]u|ke[sş]i[sş]leme/, 135],
  [/kuzey|y[ıi]ld[ıi]z/, 0], [/g[uü]ney|k[ıi]ble/, 180], [/bat[ıi]/, 270], [/do[gğ]u/, 90],
];
const BY_RE = [["komite", /komite (botu )?(ölçtü|diyor|veriyor|söyledi)|komiteden gelen/], ["hakem", /hakem/]];
export function parseCourseText(text) {
  const t = prep(text);
  if (!t) return null;
  const by = BY_RE.find(([, re]) => re.test(t))?.[0] || "ben";
  const mark = /or[st]a (şamandıra|şamandırası|şamandırasında|şamandırasının)|1 ?(nolu|numara|numaralı)|birinci şamandıra/.test(t) ? "m1"
    : /apaz (şamandıra|şamandırası|şamandırasında)|2 ?(nolu|numara|numaralı)|ikinci şamandıra/.test(t) ? "m2"
      : /3 ?(nolu|numara|numaralı)|üçüncü şamandıra/.test(t) ? "m3" : /4 ?(nolu|numara|numaralı)|dördüncü şamandıra/.test(t) ? "m4" : "";
  // "... burada" → konum
  if (/\bburada(yım)?\b|\bburası\b/.test(t)) {
    const pt = /komite|hakem/.test(t) ? "komite" : /\bpin/.test(t) ? "pin" : mark;
    return pt ? { pt } : null;
  }
  // Orsa ayağı uzunluğu: "orsa 0.8 mil", "orsa ayağı 1200 metre"
  const L = t.match(/orsa( ayağı| mesafesi)?\s*(\d+(?:\.\d+)?)\s*(mil|nm|metre|m)\b/);
  if (L && !/rüzgar|rüzgâr|derece/.test(t)) return { len: { orsa: Math.round(+L[2] * (/mil|nm/.test(L[3]) ? NM : 1)) } };
  const kn = t.match(/(\d+(?:\.\d+)?)\s*(knot|knots|not|kn|kt|deniz mili)\b/);
  // saat ("saat 11de", "11:30") ve şamandıra numarası derece sanılmaz
  const rest = (kn ? t.replace(kn[0], " ") : t).replace(/[1-4] ?(nolu|numara|numaralı)/g, " ").replace(/saat \d{1,2}(?:[:.]\d{2})?\S*|\d{1,2}[:.]\d{2}/g, " ");
  const rg = rest.match(RANGE);
  const range = rg && (/r[uü]zg[aâ]r|esiyor|geliyor/.test(t) || kn || SWING.test(t)) && !/eksen|komite|pin|(?<![a-zçğıöşü])hat|orsadan|apazdan/.test(t) ? [+(rg[1] ?? rg[3]), +(rg[2] ?? rg[4])] : null;
  if (range && range.every((x) => x <= 360)) return { obs: { kind: "wind", deg: range[0], range, kn: kn ? +kn[1] : null, by, ...(mark ? { spot: mark } : {}) } };
  const degM = rest.match(/(\d{1,3})(?:\s*°|\s*derece)?/);
  // "rüzgar kuzeybatı 12 knot": derece yerine yön adı (yalnız rüzgârda)
  const word = !degM && /r[uü]zg[aâ]r/.test(t) ? DIR_DEG.find(([re]) => re.test(rest))?.[1] : undefined;
  const deg = degM ? +degM[1] : word ?? null;
  if (deg === null || deg > 360) return null;
  const o = { deg, by };
  if (/orsadan apaz/.test(t)) Object.assign(o, { kind: "leg", ref: "m1m2" });
  else if (/apazdan orsa/.test(t)) Object.assign(o, { kind: "leg", ref: "m2m1" });
  else if (/pin(den|'den)? komite|pinden|line(dan|'dan)? komite|hattan komite/.test(t)) Object.assign(o, { kind: "line", ref: "pin" });
  // komiteden / hakem botundan pin'e bakış; yalnız "pin 40" da komiteden sayılır (Seyhun 2026-10-29: "hakem botundan pin 50'de")
  else if (/(komite|hakem)\S* (botu\S* )?(pin|line)|komiteden|\bpin(ent| ?end| ucu)?\S* \d/.test(t) && !/rüzgar|rüzgâr/.test(t)) Object.assign(o, { kind: "line", ref: "komite" });
  else if (/eksen|parkur(u|un)? (yönü |açısı |rotası )?(\d|şu|derece)|parkuru .*kur/.test(t)) Object.assign(o, { kind: "axis" });
  else if (/rüzgar|rüzgâr|esiyor|geliyor/.test(t) || kn) Object.assign(o, { kind: "wind", kn: kn ? +kn[1] : null });
  // "start hattı 52", "hat açısı 52": komiteden pin'e bakış sayılır ("pin 40" gibi)
  else if (/(?<![a-zçğıöşü])(start )?hat(tı|ti)?( açısı)? \d/.test(t)) Object.assign(o, { kind: "line", ref: "komite" });
  // "orsa şamandırası 15" (derece demeden de); uzunluk değil
  else if (mark && !/\d\s*(mil|nm|metre|m)\b/.test(t)) Object.assign(o, { kind: "mark", ref: mark });
  else return null;
  if (o.kind === "wind" && mark) o.spot = mark; // ölçümün yapıldığı şamandıra (konum yoksa oraya konur)
  return { obs: o };
}

// Bir cümlede birden çok ölçüm (Seyhun 2026-10-30 "parkurdaki her şeyi, çoklu söyleyebilmem lazım"): "rüzgar 330 derece 12 knot,
// eksen 320, pinden komite 110 ve orsa şamandırası 15 derece". Önce virgül / "ve" / "sonra" ile, sonra her ölçüm sözünün (rüzgar, eksen,
// pin, komite, orsa…) önünden bölünür; sayısı olmayan parça sonrakine ("orsa şamandırasında" + "rüzgar 330"), ölçüm sözü olmayan parça
// öncekine ("rüzgar 330", "12 knot") eklenir. Dönüş: parseCourseText sonuçları ({ obs } | { len } | { pt }) listesi
const KEY = /(?<![a-zçğıöşü])(?=r[uü]zg[aâ]r|eksen|parkur|pinden|pin |komite|hakem|orsa|orta şamandıra|apaz|[1-4] ?(?:nolu|numara)|birinci|ikinci|üçüncü|dördüncü|start hat|hat(?:t[ıi])? (?:açısı )?\d)/;
export function courseList(text) {
  const t = prep(text);
  const bits = t.split(/[;.](?!\d)|,|\s(?:ve|sonra|bir de|1 de|ayrıca)\s/).flatMap((b) => b.split(KEY)).map((b) => b.trim()).filter(Boolean);
  const out = [];
  let lead = "";
  for (const b of bits) {
    const seg = `${lead} ${b}`.trim();
    if (!/\d|burada|burası/.test(seg) && !(/r[uü]zg[aâ]r/.test(seg) && DIR_DEG.some(([re]) => re.test(seg)))) {
      lead = seg;
      continue;
    }
    lead = "";
    if (!KEY.test(` ${seg}`) && out.length) out[out.length - 1] += ` ${seg}`;
    else out.push(seg);
  }
  if (lead && out.length) out[out.length - 1] += ` ${lead}`;
  return out.map(parseCourseText).filter(Boolean);
}

// Asistana söylenen parkur derecesi (Seyhun 2026-10-29 "sesli asistanla parkur derecelerini söyleyebilmeliyim"): "parkur ekseni 320",
// "pinden komite 110", "komiteden pin 280", "rüzgar 330 derece 12 knot", "orsa şamandırası 15 derece"; bir cümlede birkaçı da olur.
// Soru ya da tahmin cümlesi değil ("yarın rüzgar kaç derece olacak"). Dönüş { obs (ilki), list: [{ obs } | { len }] } | null
export function courseCommand(text) {
  const t = low(text);
  if (!COURSE_WORD.test(t)) return null;
  if (REL.test(wordsToNum(t))) return null; // "10 derece sağa döndü" göreli (courseRelative)
  if (/\?|(?<![a-zçğıöşü])(kaç|ne)(?![a-zçğıöşü])|nasıl|olacak|olur mu|tahmin|yarın|dün|haftaya/.test(t)) return null;
  const list = courseList(text).filter((r) => (r.obs && Number.isFinite(r.obs.deg)) || r.len);
  const obs = list.filter((r) => r.obs);
  // tek rüzgâr yön adıyla ("rüzgar 15 knot kuzeybatı") rüzgâr kaydı işidir (windCommand), parkur değil; yalnız "orsa 1200 metre" de parkura
  if (!list.length || (!obs.length && !list.some((r) => r.len))) return null;
  if (obs.length === 1 && list.length === 1 && !/\d/.test(prep(text).replace(/\d+(?:\.\d+)?\s*(knot|knots|not|kn|kt)\b/, ""))) return null;
  return { obs: obs[0]?.obs || null, list };
}

// Asistanın az önce parkura yazdığını geri alma (Seyhun 2026-10-30 "sesle parkur hatasız olmalı"): "geri al", "yanlış", "sil",
// "sonuncuyu sil", "iptal". Yalnız parkura yazdıktan hemen sonra geçerli (isler/yarisMedya UNDO_MS)
export const courseUndo = (text) => /^(geri al|yanlış( oldu| yazdın| anladın)?|hayır yanlış|onu sil|sil|son(uncu(yu)?)?( ölçümü| yazdığını| yazılanı)? sil|iptal( et)?|vazgeç)$/.test(low(text).replace(/[.!,]/g, "").trim());

// Parkurla ilgili söz (Parkur sekmesinde yapay zekâya sormadan önce bakılır)
export const COURSE_WORD = /r[uü]zg[aâ]r|eksen|parkur|\bpin|komite|hakem|orsa|apaz|şamandıra|line|hat(tan|tı|ta)?\b|esiyor|start|knot|derece/;
const REL = /\d\s*(?:°|derece)?\s*(?:daha\s*)?(sağa|saga|sola|saat yönü)|\d\s*(?:knot|knots|not|kn|kt)\s*(?:daha\s*)?(art|yüksel|çık|düş|azal|in(?:di|er)|sert|hafifle)/;
const FUTURE = /yarın|olacak|tahmin|haftaya|öğleden sonra ne|akşam ne/;

// Göreli değişim (Seyhun 2026-10-30 "muhtemel insan konuşmaları"): "rüzgar 10 derece sağa döndü", "rüzgar 2 knot düştü",
// "komite ekseni 10 derece sola aldı". Sağa = saat yönü (+). Dayanak son rüzgâr / son eksen; yoksa { need: "wind" | "axis" }.
// Dönüş { list: [{ obs }] } | { need } | null
export function courseRelative(text, c) {
  const t = prep(text);
  if (FUTURE.test(t) || /\?/.test(t)) return null;
  const turn = t.match(/(\d{1,3})\s*(?:°|derece)?\s*(?:daha\s*)?(sağa|saga|sola|saat yönünde|saat yönünün tersine)/);
  const knCh = t.match(/(\d+(?:\.\d+)?)\s*(?:knot|knots|not|kn|kt)\s*(?:daha\s*)?(art|yüksel|çık|düş|azal|in(?:di|er)|sert|hafifle)/);
  if (!turn && !knCh) return null;
  const axis = /eksen|parkur/.test(t) && !/r[uü]zg[aâ]r/.test(t);
  const cc = cleanCourse(c || {});
  if (axis) {
    if (!turn) return null;
    const a = last(cc.obs, (x) => x.kind === "axis");
    if (!a) return { need: "axis" };
    const d = +turn[1] * (/sola|tersine/.test(turn[2]) ? -1 : 1);
    return { list: [{ obs: { kind: "axis", deg: norm(a.deg + d), by: a.by } }] };
  }
  const w = last(cc.obs, (x) => x.kind === "wind");
  if (!w) return { need: "wind" };
  const d = turn ? +turn[1] * (/sola|tersine/.test(turn[2]) ? -1 : 1) : 0;
  let kn = w.kn;
  if (knCh) {
    if (kn === null) return { need: "wind" };
    kn = Math.max(0, kn + +knCh[1] * (/art|yüksel|çık|sert/.test(knCh[2]) ? 1 : -1));
  }
  return { list: [{ obs: { kind: "wind", deg: norm(w.deg + d), kn, ...(w.spot ? { spot: w.spot } : {}) } }] };
}

// Parkur soruları (yerel, anında): "hangi taraf avantajlı", "pin mi komite mi", "rüzgar ne kadar döndü", "son rüzgar kaç",
// "eksen kaç", "rüzgar eksene göre nerede". Dönüş cevap cümlesi | null (tahmin ve yarın soruları değil)
export function courseAsk(text, c) {
  const t = low(text);
  if (FUTURE.test(t)) return null;
  const cc = cleanCourse(c || {});
  const kn = (x) => (x.kn != null ? `, ${String(x.kn).replace(".", ",")} knot` : "");
  if (/avantaj|hangi (taraf|uç|uçtan)|pin mi|komite mi|önde olan|hangi taraftan (başla|çık|kalk)|hat (nasıl|ne durumda|dik mi)/.test(t)) {
    const b = lineBias(cc);
    if (!b) return "Hat avantajı için rüzgârın derecesi ve hat açısı lazım. Örneğin “rüzgar 330, pinden komite 60” de.";
    if (!b.end) return `Hat rüzgâra dik, iki uç da eşit. Rüzgâr ${b.wind}°, hat ${b.line}°.`;
    return `${b.end === "pin" ? "Pin" : "Komite"} tarafı ${b.deg}° önde${b.m ? ` (yaklaşık ${b.m} m)` : ""}. Rüzgâr ${b.wind}°, hat ${b.line}°.`;
  }
  const q = /\?|(?<![a-zçğıöşü])(kaç|ne|nedir|nasıl|nerede|mı|mi|mu|mü|söyle|oku)(?![a-zçğıöşü])/.test(t);
  if (!q) return null;
  if (/r[uü]zg[aâ]r/.test(t) && /dön|değiş|art|azal|düş|kaydı/.test(t)) {
    const tr = windTrend(cc);
    if (!tr) return "Rüzgâr dönüşü için en az iki rüzgâr ölçümü lazım.";
    const turn = tr.deg === 0 ? "yönü aynı" : `${Math.abs(tr.deg)}° ${tr.deg > 0 ? "sağa" : "sola"} döndü`;
    const sp = tr.kn ? `, ${Math.abs(tr.kn)} knot ${tr.kn > 0 ? "arttı" : "azaldı"}` : "";
    return `İlk ölçümden bu yana rüzgâr ${turn}${sp}. Şimdi ${degText(tr.to)}${kn(tr.to)}.`;
  }
  if (/r[uü]zg[aâ]r/.test(t) && /eksen/.test(t)) {
    const w = last(cc.obs, (x) => x.kind === "wind");
    const a = axisOf(cc);
    if (!w || !a || a.src === "wind") return "Bunun için rüzgâr ve parkur ekseni lazım.";
    const d = diff(a.deg, w.deg);
    return d === 0 ? `Rüzgâr tam eksende, ${w.deg}°.` : `Rüzgâr eksenden ${Math.abs(d)}° ${d > 0 ? "sağda" : "solda"}. Eksen ${a.deg}°, rüzgâr ${w.deg}°.`;
  }
  if (/r[uü]zg[aâ]r/.test(t)) {
    const w = last(cc.obs, (x) => x.kind === "wind");
    return w ? `Son rüzgâr ${degText(w)}${w.range ? " arası oynuyor" : ""}${kn(w)}${w.spot ? ` (${PT_NAME[w.spot]})` : ""}.` : "Bugün rüzgâr ölçümü yok.";
  }
  if (/eksen|parkur/.test(t)) {
    const a = last(cc.obs, (x) => x.kind === "axis");
    return a ? `Parkur ekseni ${a.deg}°.` : "Parkur ekseni henüz söylenmedi.";
  }
  return null;
}

// ---- Coğrafya
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return norm((Math.atan2(y, x) * 180) / Math.PI);
}
export function dist(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function dest(p, deg, m) {
  const d = m / R;
  const b = rad(deg);
  const la = rad(p.lat);
  const lat = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lon = rad(p.lon) + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(lat));
  return { lat: (lat * 180) / Math.PI, lon: (((lon * 180) / Math.PI + 540) % 360) - 180 };
}

const last = (obs, f) => [...obs].reverse().find(f) || null;
// Parkur ekseni: söylenen eksen, yoksa orsa şamandırasına bakış, yoksa komitenin rüzgârı, yoksa son rüzgâr
export function axisOf(c) {
  const o = last(c.obs, (x) => x.kind === "axis") || last(c.obs, (x) => x.kind === "mark" && x.ref === "m1") || last(c.obs, (x) => x.kind === "wind" && x.by === "komite") || last(c.obs, (x) => x.kind === "wind");
  if (o) return { deg: o.deg, src: o.kind };
  if (c.pts.m1 && (c.pts.komite || c.pts.pin)) return { deg: bearing(lineMid(c) || c.pts.komite || c.pts.pin, c.pts.m1), src: "pts" };
  return null;
}
// Pin'den komiteye hat yönü: işaretli iki uçtan, yoksa son line ölçümünden
export function lineOf(c) {
  if (c.pts.pin && c.pts.komite) return { deg: bearing(c.pts.pin, c.pts.komite), src: "pts" };
  const o = last(c.obs, (x) => x.kind === "line");
  return o ? { deg: o.ref === "pin" ? o.deg : norm(o.deg + 180), src: "obs" } : null;
}
function lineMid(c) {
  const { komite, pin } = c.pts;
  return komite && pin ? { lat: (komite.lat + pin.lat) / 2, lon: (komite.lon + pin.lon) / 2 } : null;
}
// Hat avantajı: rüzgâra bakınca komite sağda; hat rüzgâra dik olsa pin'den komite = rüzgâr + 90°.
// Fark artıysa hat saat yönüne dönmüş, komite ucu rüzgâraltında kalmış → pin önde (ve tersi).
export function lineBias(c) {
  // hattaki rüzgâr: şamandırada ölçülen değil, hatta (ya da yeri belirtilmeden) ölçülen son rüzgâr
  const w = last(c.obs, (x) => x.kind === "wind" && (!x.spot || x.spot === "komite" || x.spot === "pin")) || last(c.obs, (x) => x.kind === "wind");
  const l = lineOf(c);
  if (!w || !l) return null;
  const ideal = norm(w.deg + 90);
  const d = diff(ideal, l.deg);
  const m = c.pts.pin && c.pts.komite ? dist(c.pts.pin, c.pts.komite) : null;
  // aralıklı rüzgârda iki uçtaki avantaj da (−: komite, +: pin önde)
  const span = w.range ? w.range.map((x) => diff(norm(x + 90), l.deg)) : null;
  return { wind: w.deg, line: l.deg, ideal, deg: Math.abs(d), end: Math.abs(d) < 1 ? "" : d > 0 ? "pin" : "komite", m: m === null ? null : Math.round(Math.abs(Math.sin(rad(d))) * m), ...(span ? { range: w.range, span } : {}) };
}
// Saha (Seyhun 2026-10-30, yaris-yapi "rüzgâr 3 yerden 1 yere"): sesle ya da Hava'dan yazılan rüzgâr (raceLive.wind) o günün parkur
// ölçümlerine katılır; kayıtta ayrı durur (live: true, silinince raceLive'dan silinir). Saate göre sıralı.
const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function withLiveWind(c, wind, day) {
  const extra = (wind || [])
    .filter((w) => w?.at && localDay(w.at) === day && !c.obs.some((o) => o.kind === "wind" && o.at === w.at))
    .map((w) => ({ ...cleanObs({ id: `w${Date.parse(w.at).toString(36)}`, at: w.at, kind: "wind", deg: w.dir, kn: w.kn, by: "ben" }), live: true }))
    .filter((o) => o.deg != null);
  if (!extra.length) return c;
  return { ...c, obs: [...c.obs, ...extra].sort((a, b) => a.at.localeCompare(b.at)) };
}
// Rüzgâr dönüşü ve hız: ilk ve son rüzgâr ölçümü (ayrı yer ya da ayrı saat)
export function windTrend(c) {
  const ws = c.obs.filter((x) => x.kind === "wind");
  if (ws.length < 2) return null;
  const a = ws[0];
  const b = ws[ws.length - 1];
  const d = diff(a.deg, b.deg);
  const k = a.kn !== null && b.kn !== null ? Math.round((b.kn - a.kn) * 10) / 10 : null;
  return { from: a, to: b, deg: d, kn: k };
}
export const placeOf = (o) => (o.spot ? PT_NAME[o.spot] : o.kind === "line" ? "Start hattı" : "");
export function obsTitle(o) {
  if (o.kind === "wind") return o.spot ? `${PT_NAME[o.spot]} · rüzgâr` : "Rüzgâr";
  if (o.kind === "axis") return "Parkur ekseni";
  if (o.kind === "line") return o.ref === "pin" ? "Pin'den komite" : "Komiteden pin";
  if (o.kind === "mark") return `${PT_NAME[o.ref]} yönü`;
  return o.ref === "m1m2" ? "Orsadan apaza" : "Apazdan orsaya";
}
export const degText = (o) => (o.range ? `${o.range[0]}–${o.range[1]}°` : `${o.deg}°`);
export const obsValue = (o) => `${degText(o)}${o.kn !== null ? ` · ${String(o.kn).replace(".", ",")} kn` : ""}`;

// ---- Çizim: parkurun noktaları (gerçek ya da tahmini). Merkez: komite, yoksa pin, yoksa "here" (telefonun yeri), yoksa null.
// Kartın düzeni (dış yamuk): Start → 1 (orsa) → 1A → 2 (apaz) → 3s/3p (pupa kapısı) → Finiş; 4s/4p hattın hemen üstünde.
export function courseShape(c, here = null) {
  const ax = axisOf(c);
  const ln = lineOf(c);
  const axis = ax ? ax.deg : ln ? norm(ln.deg - 90) : null;
  const base = c.pts.komite || c.pts.pin || here;
  if (axis === null || !base) return null;
  const lineDeg = ln ? ln.deg : norm(axis + 90);
  const est = {};
  // Seyhun 2026-10-28 çöktü ("e.lat"): komite ve pin işaretlenmeden (yalnız telefonun yeri) komite telefonun yerine konur
  const komite = c.pts.komite || ((est.komite = true), c.pts.pin ? dest(c.pts.pin, lineDeg, LINE_M) : base);
  const pin = c.pts.pin || (est.pin = true, dest(komite, norm(lineDeg + 180), LINE_M));
  const mid = { lat: (komite.lat + pin.lat) / 2, lon: (komite.lon + pin.lon) / 2 };
  const L = c.len.orsa || (c.pts.m1 ? dist(mid, c.pts.m1) : ORSA_M);
  const m1 = c.pts.m1 || (est.m1 = true, dest(mid, axis, L));
  const legObs = last(c.obs, (x) => x.kind === "leg");
  const reach = legObs ? (legObs.ref === "m1m2" ? legObs.deg : norm(legObs.deg + 180)) : norm(axis - 120);
  const m2 = c.pts.m2 || (est.m2 = true, dest(m1, reach, L * 0.67));
  const m3 = c.pts.m3 || (est.m3 = true, dest(m2, norm(axis + 180), L * 0.9));
  const m4 = c.pts.m4 || (est.m4 = true, dest(mid, axis, L * 0.12));
  const fin = dest(m3, norm(axis + 160), L * 0.15);
  return { axis, komite, pin, mid, m1, m2, m3, m4, fin, est, orsa: Math.round(L) };
}
export const nm = (m) => `${(m / NM).toFixed(1).replace(".", ",")} mil`;
