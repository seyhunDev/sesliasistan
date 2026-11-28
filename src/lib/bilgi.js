// Sporcu bilgi ekranı (Seyhun 2026-11-15): tek ekran, dokunulmaz; saat, pusula, start sayacı, parkur, gelen mesaj (sesli okunur) ve
// bas-konuş ses. Veri orgs/{org}/bilgi/ekran (sayaç, parkur, mesaj) ve orgs/{org}/bilgi/ses (son ses kaydı, base64). Saf işler burada.

import { bearing, dest, dist } from "./raceCourse.js";

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Parkurlar: 300×260 çizimde şamandıralar (x, y), numaraları (no, x, y), çizgi sırası, start hattı. Rüzgâr yukarıdan (1 numara rüzgârüstü)
export const COURSES = {
  trapez: { name: "Trapez", marks: [[150, 52], [96, 60], [136, 196], [164, 196]], labels: [["1", 150, 36], ["2", 80, 64], ["3", 150, 182]], path: [[150, 196], [150, 52], [96, 60], [136, 196]] },
  ucgen: { name: "Üçgen", marks: [[150, 52], [76, 130], [150, 200]], labels: [["1", 150, 36], ["2", 60, 134], ["3", 166, 204]], path: [[150, 200], [150, 52], [76, 130], [150, 200]] },
  ust: { name: "İniş çıkış", marks: [[150, 52], [136, 200], [164, 200]], labels: [["1", 150, 36], ["4", 150, 186]], path: [[150, 200], [150, 52]] },
};
export const courseOf = (k) => COURSES[k] || COURSES.trapez;

export const MSG_MAX = 200;
export const SES_MAX_SEC = 20;
// Mesaj ve ses yalnız tazeyse gösterilir/çalınır (ekran sonradan açılınca eski mesaj okunmaz)
export const FRESH_MS = 60e3;
// Sporcu ekranında yazılı mesaj (kalıp dahil) bu kadar görünür, sonra kaybolur; sabitlenen de kalmaz (Seyhun 2026-11-28 "çok fazla durmamalı")
export const MSG_SHOW_MS = 15e3;
// Kime (Seyhun 2026-11-25 "hangi sporcuya tıklıyorsam onunla, hepsine tıklıyorsam onlarla"): to = cihaz kimlikleri virgülle; boşsa herkes
export const TO_MAX = 600;
export const toList = (to) => String(to || "").split(",").filter(Boolean);
export const isFor = (to, dev) => !to || toList(to).includes(dev);

// Start sonrası ekranda ne görünsün (Seyhun 2026-11-15, örnek 5): Yönet'ten aç kapa. Varsayılan pusula + süre + saat
export const SHOW = [["pusula", "Pusula"], ["ruzgar", "Rüzgâr"], ["parkur", "Harita"], ["sure", "Süre"], ["saat", "Saat"]];
export const SHOW_DEF = { pusula: true, sure: true, parkur: true, ruzgar: true, saat: true };
export function cleanShow(v) {
  const o = v && typeof v === "object" ? v : {};
  return Object.fromEntries(SHOW.map(([k]) => [k, typeof o[k] === "boolean" ? o[k] : SHOW_DEF[k]]));
}

export function cleanBilgi(d = {}) {
  const t = d.timer && typeof d.timer === "object" ? d.timer : null;
  const m = d.msg && typeof d.msg === "object" ? d.msg : null;
  return {
    on: d.on !== false,
    label: S(d.label, 40),
    course: COURSES[d.course] ? d.course : "trapez",
    show: cleanShow(d.show),
    link: /^[a-z0-9]{12,40}$/.test(d.link || "") ? d.link : "",
    state: S(d.state, 80),
    timer: t ? { dur: Number(t.dur) || 300, end: Number.isFinite(+t.end) && t.end != null ? +t.end : null, left: Number.isFinite(+t.left) && t.left != null ? +t.left : null, mode: S(t.mode, 20) } : null,
    msg: m && m.id ? { id: S(m.id, 40), text: S(m.text, MSG_MAX), at: Number(m.at) || 0, to: S(m.to, TO_MAX) } : null,
    pin: d.pin && typeof d.pin === "object" && d.pin.id ? { id: S(d.pin.id, 40), text: S(d.pin.text, MSG_MAX), at: Number(d.pin.at) || 0, to: S(d.pin.to, TO_MAX) } : null,
    parkur: cleanParkur(d.parkur),
    kanal: d.kanal && typeof d.kanal === "object" && d.kanal.id ? { id: S(d.kanal.id, 40), name: S(d.kanal.name, 30) || "Kanal", open: d.kanal.open === true } : null,
    ceza: cleanCeza(d.ceza),
  };
}

// Ceza uyarısı (Seyhun 2026-11-25): Yönet bir sporcuya 360° / 720° ceza dönüşü ya da faux départ verir; ekran belgesinde
// ceza = { [cihaz]: { k: "1" | "2" | "sb" | "fd", at } }. Sporcu ekranı 10 sn tam ekran, sonra şerit; Yönet kaldırana kadar durur.
export const PEN = {
  // name: yönetimde ve tanıtımda görünen ad, deg: yanında küçük soluk (Seyhun 2026-11-27 "360-720 yerine bir ceza dönüşü, 2 ceza dönüşü");
  // short: rozet (sporcu karesi, harita). big: sporcu ekranındaki büyük yazı
  1: { name: "1 ceza dönüşü", deg: "360°", short: "1 dönüş", big: "360°", t: "Bir ceza dönüşü yap", say: "Bir ceza dönüşü" },
  2: { name: "2 ceza dönüşü", deg: "720°", short: "2 dönüş", big: "720°", t: "İki ceza dönüşü yap", say: "İki ceza dönüşü" },
  // Ses (Seyhun 2026-11-28, bip kaldırıldı): yalnız kısa söz: "Bir ceza dönüşü", "İki ceza dönüşü", "Erken start. Fodepar."
  // Faux départ = erken start (Seyhun 2026-11-27 "Fox depart değil, Faux départ diyoruz; yani erken start"): ses Türkçe okunuşla "Fodepar"
  // Sarı bayrak (Seyhun 2026-11-28 "o da bir ceza, 720 dönüşü yapması gerekiyor; sarı bayrak vermek olarak vereceğiz")
  sb: { name: "Sarı bayrak", deg: "720°", short: "SB", big: "720°", t: "Sarı bayrak · iki ceza dönüşü (720°) yap", say: "Sarı bayrak. İki ceza dönüşü." },
  fd: { name: "Fodepar", deg: "Erken start", short: "FD", big: "FD", t: "Fodepar · erken start, hattın gerisine dön, yeniden başla", say: "Erken start. Fodepar." },
};
export const PEN_BIG_MS = 10e3;
function cleanCeza(c) {
  if (!c || typeof c !== "object") return {};
  const o = {};
  for (const [dev, v] of Object.entries(c)) if (/^[a-z0-9]{12,24}$/.test(dev) && v && PEN[v.k]) o[dev] = { k: String(v.k), at: Number(v.at) || 0, ...(v.keep ? { keep: true } : {}) };
  return o;
}

// Kanal (Seyhun 2026-11-15): Yönet bir kanal açar (Antrenman, Yarış…); bilgi ekranı yalnız açık kanala katılarak başlar.
// Kanaldakiler: bilgiTekne belgeleri (ch = kanal id), son 60 sn'de ses verenler açık sayılır.
export const LIVE_MS = 90e3; // konum en geç 45 sn'de bir yazılır; iki yazım kaçarsa kapalı sayılır
export const membersOf = (boats, ch, now) => (boats || []).filter((b) => ch && b.ch === ch && now - (b.t || 0) < LIVE_MS);

// Gönderim durumu (İletildi / Görüldü / Ulaşmadı): sent = { id, at, to, ok } (ok: sunucu onayı true/false, beklerken null).
// Hedef: to verilirse o cihaz, yoksa gönderim anında kanalda açık olanlar. 15 sn'de görmeyen "ulaşmadı" sayılır.
export const SEEN_WAIT = 15e3;
export function deliveryOf(sent, boats, ch, now) {
  if (!sent) return null;
  if (sent.ok === false) return { state: "fail", seen: 0, of: 0, missing: [] };
  if (sent.ok == null) return { state: "wait", seen: 0, of: 0, missing: [] };
  const pool = (boats || []).filter((b) => b.ch === ch);
  const targets = sent.to ? pool.filter((b) => isFor(sent.to, b.id)) : pool.filter((b) => (b.t || 0) > sent.at - LIVE_MS);
  const seen = targets.filter((b) => b.seen === sent.id);
  const missing = targets.filter((b) => b.seen !== sent.id).map((b) => b.sail || b.name || "?");
  const late = now - sent.at > SEEN_WAIT;
  if (targets.length && seen.length === targets.length) return { state: "seen", seen: seen.length, of: targets.length, missing: [] };
  if (!late) return { state: "sent", seen: seen.length, of: targets.length, missing };
  return { state: seen.length ? "part" : "fail", seen: seen.length, of: targets.length, missing };
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Start sayacı: geri sayım (down), startan beri (up), durdurulmuş (pause), yok (none). left: kalan saniye
export function startView(t, now = Date.now()) {
  if (!t) return { phase: "none", txt: "--:--", left: null };
  if (t.end != null) {
    const ms = t.end - now;
    if (ms > 0) {
      const left = Math.ceil(ms / 1000);
      return { phase: "down", txt: mmss(left), left };
    }
    const up = Math.floor(-ms / 1000);
    return up < 6 * 3600 ? { phase: "up", txt: `+${mmss(up)}`, left: 0 } : { phase: "none", txt: "--:--", left: null };
  }
  if (t.left != null) return { phase: "pause", txt: mmss(Math.ceil(t.left / 1000)), left: Math.ceil(t.left / 1000) };
  return { phase: "none", txt: "--:--", left: null };
}

// 5 dakikalık start dizisi: 5 (sınıf bayrağı), 4 (P), 1 (P iner), 0. Her adım: done (geçti), on (şu anki dakika)
export function seqMarks(left) {
  const at = [5, 4, 1, 0];
  return at.map((m, i) => {
    const n = at[i + 1] ?? -1;
    const on = left != null && left > 0 && left <= m * 60 && left > n * 60;
    const done = left != null && (left <= n * 60 || left === 0);
    return { m, done, on };
  });
}
// Ekran kipi: son 1 dakikada yalnız büyük süre ("last"), start olunca ortada büyük pusula + altta küçük süre ("race"), öncesi "pre"
export const screenMode = (sv) => (sv.phase === "down" && sv.left <= 60 ? "last" : sv.phase === "up" ? "race" : "pre");

// Son dakika bipleri (Seyhun 2026-11-15): 30. ve 10. saniyede bip, son 5 saniyede her saniye çift bip, startta uzun bip.
// prev → left geçişinde çalınacak bip: "one" | "two" | "long" | null
export function beepOf(prev, left) {
  if (prev == null || left == null || left === prev || left > prev || prev - left > 2) return null;
  if (left === 0) return "long";
  if (left <= 5) return "two";
  // Son 1 dakika da bir bip (Seyhun 2026-11-28 "son 30 saniyede çalan 1 dakikada da çalmalı")
  if (left === 60 || left === 30 || left === 10) return "one";
  return null;
}

// P bayrağı 4. dakikadan 1. dakikaya kadar
export const pFlag = (left, dur) => dur === 300 && left != null && left > 60 && left <= 240;

// Pusula: telefonun baktığı yön (derece) ve 8 yön adı
const DIRS = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
export const dirName = (deg) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
export const normDeg = (d) => Math.round(((d % 360) + 360) % 360);

// Asistan: "bilgi ekranına yaz: …" ("sporculara söyle" Mesajlar'daki gruba gider), "bilgi ekranını aç", "bilgi ekranını yönet"
export function bilgiCommand(s) {
  const t = String(s || "").trim();
  const m = /^bilgi ekranına\s+(?:yaz|söyle|mesaj gönder|mesaj yaz|duyur|gönder)\s*[:,]?\s*(.+)$/i.exec(t);
  if (m) return { op: "msg", text: S(m[1].replace(/[.!]+$/, ""), MSG_MAX) };
  // "bilgi ekranında Mustafa'ya yaz: …": yalnız o kişiye (kanaldaki adı ya da yelken no)
  const p = /^bilgi ekranında\s+(.+?)['’]?(?:y?a|y?e)\s+(?:yaz|söyle|gönder)\s*[:,]?\s*(.+)$/i.exec(t);
  if (p) return { op: "msg", to: S(p[1], 30), text: S(p[2].replace(/[.!]+$/, ""), MSG_MAX) };
  // "bilgi kanalı aç: Antrenman" / "bilgi kanalını kapat"
  const k = /^bilgi kanalı(?:nı)?\s+aç\s*[:,]?\s*(.*)$/i.exec(t);
  if (k) return { op: "kanal", name: S(k[1].replace(/[.!]+$/, ""), 30) || "Antrenman" };
  if (/^bilgi kanalını?\s+kapat$/i.test(t)) return { op: "kanalKapat" };
  // Bilgi parkuru (Yönet › Parkur): "bilgi parkuru rüzgâr 220", "bilgi parkuru hakem botu burada", "bilgi parkuru trapez"
  const pr = /^bilgi parkur(?:u|unda)?\s+(.+)$/i.exec(t);
  if (pr) {
    const x = pr[1].toLocaleLowerCase("tr").replace(/[.!]+$/, "").trim();
    const w = /^r[uü]zg[aâ]r(?:ı)?\s*(\d{1,3})(?:\s*derece)?$/.exec(x);
    if (w && +w[1] <= 360) return { op: "parkur", patch: { wind: +w[1] % 360 } };
    if (/^(hakem botu|komite)(?:\s+(burada|konumum|benim yerim))?$/.test(x)) return { op: "parkurHere" };
    const ty = PK_TYPES.find(([, n]) => n.toLocaleLowerCase("tr") === x);
    if (ty) return { op: "parkur", patch: { type: ty[0] } };
    const o = /^(?:1 numara(?:ya)?|orsa)\s*(\d{2,4})\s*(?:m|metre)?$/.exec(x);
    if (o) return { op: "parkur", patch: { orsa: +o[1] } };
  }
  if (/^bilgi ekranını?\s+(?:aç|göster)$/i.test(t)) return { op: "open" };
  if (/^bilgi ekranı(?:nın)?\s+link(?:i|ini)?(?:\s+(?:ver|kopyala|paylaş|gönder|aç|oluştur))?$/i.test(t)) return { op: "link" };
  // "bilgi ekranında rüzgârı göster" / "bilgi ekranında saati gizle": start sonrası ekranda aç kapa
  const g = /^bilgi ekranında\s+(pusula|süre|parkur|rüzg[aâ]r|saat)\S*\s+(göster|gizle|aç|kapat)$/i.exec(t);
  if (g) {
    const w = g[1].toLocaleLowerCase("tr");
    const key = w === "süre" ? "sure" : w.startsWith("rüzg") ? "ruzgar" : w;
    return { op: "show", key, on: /göster|aç/i.test(g[2]) };
  }
  if (/^bilgi ekranını?\s+yönet(?:imini aç)?$|^bilgi ekranı yönetimini aç$/i.test(t)) return { op: "admin" };
  return null;
}

// Eğim düzeltmeli pusula (Seyhun 2026-11-15: telefon teknede dik durur; "öne arkaya yatırınca değişmemeli, yalnız sağa sola"):
// yön = telefonun arka yüzünün (kameranın baktığı yönün) yatay izdüşümü. Dik telefon öne/arkaya yatınca ya da yana yatınca (tekne
// yatışı) arka yüzün yatay yönü değişmez, yalnız telefon sağa sola dönünce değişir. Telefon düze yaklaştıkça (arka yüz yere bakar)
// ekranın "yukarı" ekseni devreye girer. Cihaz yön olayı W3C (ZXY: alpha Z, beta X, gamma Y) dönme matrisinden hesaplanır.
// screenAngle: ekranın dönüşü (yatayda 90 / 270). Dönen: derece (0 kuzey, saat yönünde) ya da null (sensör yok)
export function tiltHeading(alpha, beta, gamma, screenAngle = 0) {
  if (![alpha, beta, gamma].every(Number.isFinite)) return null;
  const r = Math.PI / 180;
  const cZ = Math.cos(alpha * r), sZ = Math.sin(alpha * r);
  const cX = Math.cos(beta * r), sX = Math.sin(beta * r);
  const cY = Math.cos(gamma * r), sY = Math.sin(gamma * r);
  // Dönme matrisinin sütunları (doğu, kuzey): cihaz X, Y ve arka yüz (-Z)
  const xE = cZ * cY - sZ * sX * sY, xN = cY * sZ + cZ * sX * sY;
  const yE = -cX * sZ, yN = cZ * cX;
  const bE = -(cY * sZ * sX + cZ * sY), bN = -(sZ * sY - cZ * cY * sX);
  return colsHeading(xE, xN, yE, yN, bE, bN, screenAngle);
}

// Ortak: cihaz X, Y eksenleri ve arka yüzün dünya (doğu, kuzey) bileşenlerinden yön. Arka yüz yataya yakınsa (telefon dik) onun
// baktığı yer; telefon düze yaklaştıkça ekranın yukarısı karışır.
function colsHeading(xE, xN, yE, yN, bE, bN, screenAngle = 0) {
  const r = Math.PI / 180;
  const a = (screenAngle || 0) * r;
  const uE = Math.sin(a) * xE + Math.cos(a) * yE, uN = Math.sin(a) * xN + Math.cos(a) * yN;
  const m = Math.hypot(bE, bN); // arka yüz ne kadar yatay (dik telefonda 1, düz telefonda 0)
  const w = Math.max(0, Math.min(1, (0.5 - m) / 0.5)); // düzden 30°'ye kadar ekranın yukarısı karışır
  const E = bE + w * uE, N = bN + w * uN;
  if (Math.hypot(E, N) < 1e-6) return null;
  return ((Math.atan2(E, N) / r) % 360 + 360) % 360;
}

// Android (Seyhun 2026-11-15: Hiking telefonda düzken doğru, dikken yanlış): Chrome'un açı (alpha/beta/gamma) olayı yerine
// AbsoluteOrientationSensor dörtlüğü (cihazdan dünyaya, doğu-kuzey-yukarı). Euler açılarının dik duruştaki kilitlenmesi yok.
// q = [x, y, z, w]. Dönüş: { h, beta, gamma } (beta/gamma kayıt için, W3C ile aynı anlam)
export function quatHeading(q, screenAngle = 0) {
  if (!q || q.length !== 4 || !q.every(Number.isFinite)) return null;
  const [x, y, z, w] = q;
  const xE = 1 - 2 * (y * y + z * z), xN = 2 * (x * y + w * z), xU = 2 * (x * z - w * y);
  const yE = 2 * (x * y - w * z), yN = 1 - 2 * (x * x + z * z), yU = 2 * (y * z + w * x);
  const zE = 2 * (x * z + w * y), zN = 2 * (y * z - w * x), zU = 1 - 2 * (x * x + y * y);
  const h = colsHeading(xE, xN, yE, yN, -zE, -zN, screenAngle);
  const d = 180 / Math.PI;
  return { h, beta: Math.asin(Math.max(-1, Math.min(1, yU))) * d, gamma: Math.atan2(-xU, zU) * d };
}

// Manyetik sapma (Seyhun 2026-11-15 "sapma düzeltmesini yapalım"): telefon pusulası (iPhone webkitCompassHeading, Android sensör)
// manyetik kuzeyi verir; harita, parkur ve hava durumundan girilen rüzgâr gerçek kuzeye göre. Ekrandaki derece gerçek kuzeye çevrilir.
// Batı Türkiye için yaklaşık model: Dikili'de 2026 sonunda ~5,8° doğu, yılda ~0,1° artar, doğuya gittikçe biraz büyür.
// Doğruluk tahmini ±1° (NOAA WMM2025 hesaplayıcısıyla doğrulanmadı; bu ortamdan erişilemedi). Konum yoksa Dikili değeri.
export function declination(lat = 39.07, lon = 26.89, d = new Date()) {
  const year = d.getFullYear() + d.getMonth() / 12;
  const la = Number.isFinite(lat) ? lat : 39.07;
  const lo = Number.isFinite(lon) ? lon : 26.89;
  return 5.8 + 0.06 * (lo - 26.89) - 0.05 * (la - 39.07) + 0.1 * (year - 2026.9);
}

// ---- Otomatik parkur (Seyhun 2026-11-15): hakem botu (komite, start hattının sancak ucu) + rüzgâr yönü (estiği yer) girilince
// şamandıralar yerleşir. Pin: rüzgâra bakarken hattın solu; 1: hattın ortasından rüzgâra "orsa" metre; trapezde 2 apaz (1'den sola
// geri), 3 alt kapı; iniş çıkışta 4 alt kapı; üçgende 2 yan (kanat), 3 alt. Her şamandıra elle (koordinat) düzeltilebilir (marks).
export const PK_TYPES = [["trapez", "Trapez"], ["ust", "İniş çıkış"], ["ucgen", "Üçgen"]];
export const PK_NAMES = { pin: "Pin", m1: "1 · Orsa", m2: "2 · Apaz", m2u: "2 · Kanat", m3: "3 · Alt", g1: "Alt kapı (sancak)", g2: "Alt kapı (iskele)" };
const okPt = (p) => (p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) && Math.abs(+p.lat) <= 90 && Math.abs(+p.lon) <= 180 ? { lat: +(+p.lat).toFixed(6), lon: +(+p.lon).toFixed(6) } : null);
const num = (v, lo, hi, def) => (Number.isFinite(+v) && v !== null && v !== "" ? Math.min(hi, Math.max(lo, Math.round(+v))) : def);
export function cleanParkur(p) {
  const o = p && typeof p === "object" ? p : {};
  const marks = {};
  for (const k of Object.keys(PK_NAMES)) {
    const q = okPt(o.marks?.[k]);
    if (q) marks[k] = q;
  }
  return {
    type: PK_TYPES.some(([k]) => k === o.type) ? o.type : "trapez",
    wind: o.wind == null || o.wind === "" ? null : num(o.wind, 0, 360, null) % 360,
    komite: okPt(o.komite),
    line: num(o.line, 20, 1000, 120),
    orsa: num(o.orsa, 100, 5000, 900),
    marks,
  };
}
// "39.0712, 26.8840" ya da "39.0712 26.8840" → { lat, lon }
export function parsePt(s) {
  const m = String(s || "").replace(/,(?=\d{3,})/g, ".").match(/(-?\d+(?:\.\d+)?)[\s,;]+(-?\d+(?:\.\d+)?)/);
  return m ? okPt({ lat: m[1], lon: m[2] }) : null;
}
export const fmtPt = (p) => (p ? `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}` : "");

// Parkurun noktaları: { up (rüzgâr), pts: [{ k, n (etiket), lat, lon, kind: "mark" | "komite" | "pin", manual }], line: [komite, pin] }
export function buildCourse(pk) {
  const p = cleanParkur(pk);
  const W = p.wind;
  const auto = {};
  if (p.komite && W != null) {
    const pin = dest(p.komite, W - 90, p.line);
    const mid = dest(p.komite, W - 90, p.line / 2);
    const m1 = dest(mid, W, p.orsa);
    auto.pin = pin;
    auto.m1 = m1;
    if (p.type === "trapez") {
      auto.m2 = dest(m1, W - 120, p.orsa * 0.6);
      const g = dest(mid, W, Math.min(150, p.orsa * 0.15));
      auto.g1 = dest(g, W + 90, 20);
      auto.g2 = dest(g, W - 90, 20);
    } else if (p.type === "ust") {
      const g = dest(mid, W, Math.min(150, p.orsa * 0.15));
      auto.g1 = dest(g, W + 90, 20);
      auto.g2 = dest(g, W - 90, 20);
    } else {
      auto.m2u = dest(dest(mid, W, p.orsa / 2), W - 90, p.orsa / 2);
      auto.m3 = dest(mid, W, Math.min(120, p.orsa * 0.1));
    }
  }
  const at = (k) => p.marks[k] || (auto[k] ? okPt(auto[k]) : null);
  const label = { m1: "1", m2: "2", m2u: "2", m3: "3", g1: p.type === "ust" ? "4" : "3", g2: "" }; // kapının numarası bir kez
  const keys = p.type === "trapez" ? ["m1", "m2", "g1", "g2"] : p.type === "ust" ? ["m1", "g1", "g2"] : ["m1", "m2u", "m3"];
  const pts = [];
  if (p.komite) pts.push({ k: "komite", n: "", kind: "komite", ...p.komite });
  const pin = at("pin");
  if (pin) pts.push({ k: "pin", n: "", kind: "pin", ...pin, manual: !!p.marks.pin });
  for (const k of keys) {
    const q = at(k);
    if (q) pts.push({ k, n: label[k], kind: "mark", ...q, manual: !!p.marks[k] });
  }
  return { up: W, type: p.type, pts, has: pts.some((x) => x.kind === "mark") };
}
// Parkurda düzeltilebilen şamandıralar (sırayla)
export const markKeys = (type) => ["pin", ...(type === "trapez" ? ["m1", "m2", "g1", "g2"] : type === "ust" ? ["m1", "g1", "g2"] : ["m1", "m2u", "m3"])];

// Haritada yer: merkeze göre metre (doğu x, kuzey y), "up" derece yukarı gelecek şekilde döndürülür
export function project(pt, c, up = 0) {
  const d = dist(c, pt);
  const b = ((bearing(c, pt) - (up || 0)) * Math.PI) / 180;
  return { x: d * Math.sin(b), y: -d * Math.cos(b) };
}

// Rüzgâr teknenin burnuna göre: rel (0 burun, saat yönünde) ve "27° iskeleden" / "sancaktan"
export function windRel(wind, head) {
  if (wind == null || head == null) return null;
  const rel = (((wind - head) % 360) + 360) % 360;
  const side = rel === 0 || rel === 180 ? "" : rel < 180 ? "sancaktan" : "iskeleden";
  return { rel, deg: Math.round(rel <= 180 ? rel : 360 - rel), side };
}

// İz geri oynatma (Seyhun 2026-11-17): bilgiIz belgelerinden tekne başına sıralı noktalar. pts düz liste: [sn, enlem, boylam, hız (kn; -1 yok), …]
export const IZ_COLORS = ["#e08a00", "#7c3aed", "#dc2626", "#0891b2", "#16a34a", "#db2777", "#4d7c0f", "#1d4ed8"];
export function izTracks(docs) {
  const by = {};
  for (const d of docs || []) {
    const id = d.dev || d.uid || `${d.sail}-${d.name}`;
    const tr = (by[id] ||= { id, sail: d.sail || "", name: d.name || "", p: [] });
    const a = Array.isArray(d.pts) ? d.pts : [];
    for (let i = 0; i + 3 < a.length; i += 4) {
      if (!Number.isFinite(a[i + 1]) || !Number.isFinite(a[i + 2])) continue;
      tr.p.push({ t: (d.t0 || 0) + a[i] * 1000, lat: a[i + 1], lon: a[i + 2], spd: a[i + 3] >= 0 ? a[i + 3] : null });
    }
  }
  const tracks = Object.values(by)
    .filter((x) => x.p.length)
    .sort((x, y) => String(x.sail).localeCompare(String(y.sail), "tr", { numeric: true }) || x.name.localeCompare(y.name, "tr"));
  tracks.forEach((x, i) => {
    x.p.sort((a, b) => a.t - b.t);
    x.color = IZ_COLORS[i % IZ_COLORS.length];
  });
  const t0 = Math.min(...tracks.map((x) => x.p[0].t));
  const t1 = Math.max(...tracks.map((x) => x.p[x.p.length - 1].t));
  return tracks.length ? { tracks, t0, t1 } : { tracks: [], t0: 0, t1: 0 };
}
// T anındaki nokta: T'den önceki son nokta; iz henüz başlamadıysa null
export function izAt(tr, T) {
  const p = tr?.p || [];
  if (!p.length || T < p[0].t) return null;
  let lo = 0;
  let hi = p.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (p[mid].t <= T) lo = mid;
    else hi = mid - 1;
  }
  return p[lo];
}

// Yönet sporcu kareleri (Seyhun 2026-11-28 örnek CgU1g4SzydbNPqsCtdeDcD): 1–4 sporcu iki sütun (3'te alttaki tam genişlik), 5 ve üstü üç sütun;
// son satırda kalanlar satırı doldurur. 6'lık ızgarada her karenin genişliği (sütun sayısı) döner.
export function kareSpans(n) {
  const c = n <= 4 ? 2 : 3;
  const w = 6 / c;
  const rest = n % c;
  return Array.from({ length: n }, (_, i) => (rest && i >= n - rest ? 6 / rest : w));
}
