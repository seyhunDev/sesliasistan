// Yarış işaretleri (Seyhun 2026-11-03 19:23, Yarış Kuralları "Yarış işaretleri" sayfası): her bayrağın resmi, adı, sesi ve anlamı tek yerde.
// Yayın sayfası (işaret çekme) ve canlı ekran (işaret kartı) aynı listeyi kullanır. Saf: yalnız veri ve SVG yazısı.
// Ses: "•" kısa seda, "—" uzun seda, "– – – – –" tekrar eden kısa sedalar (çekilirken ↑, indirilirken ↓).

const W = 30;
const H = 20;
const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const flat = (body) => `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">${body}<rect x=".25" y=".25" width="29.5" height="19.5" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".5"/></svg>`;
// flama (üçgen): uzun, ucu sivri; içi kesilerek boyanır
const PEN = "M0 0 L30 6.5 L30 13.5 L0 20 Z";
const pennant = (body, id) =>
  `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><defs><clipPath id="pc-${id}"><path d="${PEN}"/></clipPath></defs><g clip-path="url(#pc-${id})">${body}</g><path d="${PEN}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".5"/></svg>`;
const RED = "#e0262f";
const BLUE = "#1b4fd6";
const YEL = "#f5c400";
const BLK = "#111";
const WHT = "#fff";
const checks = (a, b, n = 4) => {
  let s = "";
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += rect((i * W) / n, (j * H) / n, W / n, H / n, (i + j) % 2 ? b : a);
  return s;
};
const vbars = (cols) => cols.map((c, i) => rect((i * W) / cols.length, 0, W / cols.length + 0.05, H, c)).join("");
const hbars = (rows) => rows.map((c, i) => rect(0, (i * H) / rows.length, W, H / rows.length + 0.05, c)).join("");

const ART = {
  AP: () => pennant(vbars([RED, WHT, RED, WHT, RED, WHT]), "ap"),
  H: () => flat(rect(0, 0, 15, 20, WHT) + rect(15, 0, 15, 20, RED)),
  A: () => flat(`<path d="M0 0 H30 L22 10 L30 20 H0 Z" fill="${BLUE}"/>${rect(0, 0, 13, 20, WHT)}`).replace(/<rect x="\.25"[^>]*\/>/, ""),
  N: () => flat(checks(BLUE, WHT)),
  V: () => flat(rect(0, 0, 30, 20, WHT) + `<path d="M2 1.5 L28 18.5 M28 1.5 L2 18.5" stroke="${RED}" stroke-width="3"/>`),
  P: () => flat(rect(0, 0, 30, 20, BLUE) + rect(8.4, 5.6, 13.2, 8.8, WHT)),
  I: () => flat(rect(0, 0, 30, 20, YEL) + `<ellipse cx="15" cy="10" rx="6.6" ry="6" fill="${BLK}"/>`),
  Z: () => flat(`<path d="M0 0 L15 10 L0 20 Z" fill="${BLK}"/><path d="M0 0 L30 0 L15 10 Z" fill="${YEL}"/><path d="M30 0 L30 20 L15 10 Z" fill="${BLUE}"/><path d="M0 20 L30 20 L15 10 Z" fill="${RED}"/>`),
  U: () => flat(rect(0, 0, 30, 20, WHT) + rect(0, 0, 15, 10, RED) + rect(15, 10, 15, 10, RED)),
  Kara: () => flat(rect(0, 0, 30, 20, BLK)),
  X: () => flat(rect(0, 0, 30, 20, WHT) + rect(12, 0, 6, 20, BLUE) + rect(0, 7, 30, 6, BLUE)),
  FS: () => pennant(rect(0, 0, 30, 20, BLUE) + `<path d="M0 3 L17 10 L0 17 Z" fill="${YEL}"/>`, "fs"),
  S: () => flat(rect(0, 0, 30, 20, WHT) + rect(9, 5.5, 12, 9, BLUE)),
  C: () => flat(hbars([BLUE, WHT, RED, WHT, BLUE])),
  sancak: () => `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><path d="M15 1 L26 19 H4 Z" fill="#2f8f4e"/></svg>`,
  iskele: () => `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="1" width="14" height="18" fill="${RED}"/></svg>`,
  eksi: () => `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="1" width="14" height="18" fill="${WHT}" stroke="#333" stroke-width=".6"/><rect x="11" y="9.2" width="8" height="1.6" fill="${BLK}"/></svg>`,
  arti: () => `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="1" width="14" height="18" fill="${WHT}" stroke="#333" stroke-width=".6"/><rect x="11" y="9.2" width="8" height="1.6" fill="${BLK}"/><rect x="14.2" y="6" width="1.6" height="8" fill="${BLK}"/></svg>`,
  L: () => flat(rect(0, 0, 15, 10, YEL) + rect(15, 0, 15, 10, BLK) + rect(0, 10, 15, 10, BLK) + rect(15, 10, 15, 10, YEL)),
  M: () => flat(rect(0, 0, 30, 20, BLUE) + `<path d="M0 0 L30 20 M30 0 L0 20" stroke="${WHT}" stroke-width="3"/>`),
  Y: () => {
    let s = rect(0, 0, 30, 20, YEL);
    for (let i = -20; i < 30; i += 6) s += `<path d="M${i} 20 L${i + 20} 0 L${i + 23} 0 L${i + 3} 20 Z" fill="${RED}"/>`;
    return flat(s);
  },
  turuncu: () => flat(rect(0, 0, 30, 20, "#f26a1b")),
  mavi: () => flat(rect(0, 0, 30, 20, BLUE)),
  // numara flamaları (1–9)
  n1: () => pennant(rect(0, 0, 30, 20, WHT) + `<circle cx="7" cy="10" r="3.6" fill="${RED}"/>`, "n1"),
  n2: () => pennant(rect(0, 0, 30, 20, BLUE) + `<circle cx="7" cy="10" r="3.6" fill="${WHT}"/>`, "n2"),
  n3: () => pennant(vbars([RED, WHT, BLUE]), "n3"),
  n4: () => pennant(rect(0, 0, 30, 20, RED) + rect(0, 8.6, 30, 2.8, WHT) + rect(6, 0, 2.8, 20, WHT), "n4"),
  n5: () => pennant(vbars([YEL, BLUE]), "n5"),
  n6: () => pennant(hbars([BLK, WHT]), "n6"),
  n7: () => pennant(hbars([YEL, RED]), "n7"),
  n8: () => pennant(rect(0, 0, 30, 20, WHT) + rect(0, 8.6, 30, 2.8, RED) + rect(6, 0, 2.8, 20, RED), "n8"),
  n9: () => pennant(rect(0, 0, 30, 20, WHT) + rect(10, 0, 20, 10, BLK) + rect(10, 10, 10, 10, RED) + rect(20, 10, 10, 10, YEL), "n9"),
};
export const flagSvg = (id) => (ART[id] ? ART[id]() : "");
export const FLAG_IDS = Object.keys(ART);

// İşaretler: id, bayraklar (üstteki önce), kısa ad, ses (çekilirken / indirilirken), anlam, grup.
// "ap"/"void"/"prep"/"fs" türleri yarış akışına bağlı (tehir, abandone, hazırlık, genel geri); diğerleri yalnız ekranda işaret kartı.
export const SIGNAL_GROUPS = [
  ["tehir", "Tehir"],
  ["abandone", "Abandone"],
  ["hazirlik", "Hazırlık"],
  ["geri", "Geri çağırma"],
  ["rota", "Rota"],
  ["diger", "Diğer"],
];
const N_HOURS = Array.from({ length: 9 }, (_, i) => ({
  id: `AP${i + 1}`,
  g: "tehir",
  flags: ["AP", `n${i + 1}`],
  name: `Tehir · ${i + 1} saat`,
  short: `${i + 1} saat tehir`,
  up: "••",
  down: "•",
  info: `Programlanmış start saati ${i + 1} saat ertelendi.`,
  kind: "ap",
  hours: i + 1,
}));
export const SIGNALS = [
  { id: "AP", g: "tehir", flags: ["AP"], name: "Tehir", short: "Tehir", up: "••", down: "•", info: "Startı verilmemiş yarışlar tehir edildi. Tehir indikten 1 dakika sonra uyarı işareti verilecek.", kind: "ap" },
  { id: "AP/H", g: "tehir", flags: ["AP", "H"], name: "H üzeri tehir", short: "Tehir · kıyıda", up: "••", info: "Startı verilmemiş yarışlar tehir edildi. Diğer işaretler kıyıda verilecek.", kind: "ap", land: true },
  { id: "AP/A", g: "tehir", flags: ["AP", "A"], name: "A üzeri tehir", short: "Bugün yarış yok", up: "••", info: "Startı verilmemiş yarışlar tehir edildi. Bugün başka yarış yok.", kind: "ap", end: true },
  ...N_HOURS,
  { id: "N", g: "abandone", flags: ["N"], name: "Abandone", short: "Abandone", up: "•••", down: "•", info: "Devam eden tüm yarışlar abandone edildi. Start alanına dönün. İndikten 1 dakika sonra uyarı işareti verilecek.", kind: "void" },
  { id: "N/H", g: "abandone", flags: ["N", "H"], name: "H üzeri abandone", short: "Abandone · kıyıda", up: "•••", info: "Devam eden tüm yarışlar abandone edildi. Diğer işaretler kıyıda verilecek.", kind: "void", land: true },
  { id: "N/A", g: "abandone", flags: ["N", "A"], name: "A üzeri abandone", short: "Abandone · bugün yarış yok", up: "•••", info: "Devam eden tüm yarışlar abandone edildi. Bugün başka yarış yok.", kind: "void", end: true },
  { id: "V", g: "abandone", flags: ["V"], name: "V bayrağı", short: "Güvenlik", up: "—", info: "Güvenlik talimatları için haberleşme kanalını takip edin (kural 37).", kind: "show" },
  { id: "P", g: "hazirlik", flags: ["P"], name: "P", short: "Hazırlık", up: "•", down: "—", info: "Hazırlık işareti.", kind: "prep" },
  { id: "I", g: "hazirlik", flags: ["I"], name: "I", short: "Kural 30.1", up: "•", down: "—", info: "Son dakikada hattın parkur tarafındaki tekne uçlardan birinden dolaşarak start eder.", kind: "prep" },
  { id: "Z", g: "hazirlik", flags: ["Z"], name: "Z", short: "Kural 30.2", up: "•", down: "—", info: "Son dakikada üçgende bulunan tekneye %20 puan cezası.", kind: "prep" },
  { id: "U", g: "hazirlik", flags: ["U"], name: "U", short: "Kural 30.3", up: "•", down: "—", info: "Son dakikada üçgende bulunan tekne diskalifiye (UFD), yeniden startta da.", kind: "prep" },
  { id: "Kara", g: "hazirlik", flags: ["Kara"], name: "Siyah bayrak", short: "Kural 30.4", up: "•", down: "—", info: "Son dakikada üçgende bulunan tekne diskalifiye (BFD), yeniden startta da.", kind: "prep" },
  { id: "X", g: "geri", flags: ["X"], name: "X", short: "Ferdi geri çağırma", up: "•", info: "Erken start eden tekne var; geri dönüp yeniden start etmeli.", kind: "show" },
  { id: "FS", g: "geri", flags: ["FS"], name: "Birinci tekrar", short: "Genel geri çağırma", up: "••", down: "•", info: "Genel geri çağırma. İndikten 1 dakika sonra uyarı işareti verilecek.", kind: "fs" },
  { id: "S", g: "rota", flags: ["S"], name: "S", short: "Rota kısaltıldı", up: "••", info: "Rota kısaltıldı; finiş burada (kural 32.2).", kind: "show" },
  { id: "C", g: "rota", flags: ["C"], name: "C", short: "Şamandıra değişti", up: "– – – – –", info: "Bir sonraki şamandıranın yeri değiştirildi.", kind: "show" },
  { id: "C+sancak", g: "rota", flags: ["C", "sancak"], name: "C · sancağa", short: "Şamandıra sancağa", up: "– – – – –", info: "Bir sonraki şamandıranın yeri değiştirildi: sancağa.", kind: "show" },
  { id: "C+iskele", g: "rota", flags: ["C", "iskele"], name: "C · iskeleye", short: "Şamandıra iskeleye", up: "– – – – –", info: "Bir sonraki şamandıranın yeri değiştirildi: iskeleye.", kind: "show" },
  { id: "C+eksi", g: "rota", flags: ["C", "eksi"], name: "C · kısa", short: "Ayak kısaldı", up: "– – – – –", info: "Bir sonraki şamandıranın yeri değiştirildi: ayak kısaltıldı.", kind: "show" },
  { id: "C+arti", g: "rota", flags: ["C", "arti"], name: "C · uzun", short: "Ayak uzadı", up: "– – – – –", info: "Bir sonraki şamandıranın yeri değiştirildi: ayak uzatıldı.", kind: "show" },
  { id: "M", g: "rota", flags: ["M"], name: "M", short: "Yedek şamandıra", up: "– – – – –", info: "Bu işareti taşıyan nesne kaybolan şamandıranın yerine geçer.", kind: "show" },
  { id: "L", g: "diger", flags: ["L"], name: "L", short: "Duyuru", up: "•", info: "Kıyıda: yarışçılara ilan asıldı. Suda: seslenme mesafesine gelin ya da bu tekneyi izleyin.", kind: "show" },
  { id: "Y", g: "diger", flags: ["Y"], name: "Y", short: "Can yeleği", up: "•", info: "Kişisel yüzdürücü giyin (kural 40).", kind: "show" },
  { id: "turuncu", g: "diger", flags: ["turuncu"], name: "Turuncu bayrak", short: "Start hattı ucu", info: "Bu bayrağı taşıyan direk start hattının bir ucu.", kind: "info" },
  { id: "mavi", g: "diger", flags: ["mavi"], name: "Mavi bayrak", short: "Finiş hattı ucu", info: "Bu bayrağı taşıyan direk finiş hattının bir ucu.", kind: "info" },
];
export const signalOf = (id) => SIGNALS.find((x) => x.id === id) || null;
export const soundText = (s) => [s?.up ? `↑ ${s.up}` : "", s?.down ? `↓ ${s.down}` : ""].filter(Boolean).join("   ");

// Ekrandaki işaret (raceLive.plan.sig): { id, at, grp }. Yayın › Bayrak ile çekilen; "İndir" ile kalkar. Canlı ekran yalnız o günün işaretini kartta gösterir.
export function cleanSig(x) {
  const s = signalOf(x?.id);
  if (!s) return null;
  const at = typeof x.at === "string" && !Number.isNaN(Date.parse(x.at)) ? x.at.slice(0, 30) : new Date().toISOString();
  return { id: s.id, at, grp: typeof x.grp === "string" ? x.grp.slice(0, 40) : "" };
}
// Kartta gösterilen işaretler: kendi akışı olmayanlar (rota, güvenlik, duyuru…) ve akışa bir şey ekleyenler (kıyıda, bugün yarış yok, saatli tehir)
export const sigOnCard = (s) => !!s && (s.kind === "show" || !!s.land || !!s.end || !!s.hours);
// "11:00" + n saat → "12:00" (gün aşarsa boş)
export function addHours(hm, n) {
  const m = /^(\d\d):(\d\d)$/.exec(hm || "");
  if (!m) return "";
  const h = +m[1] + n;
  return h > 23 ? "" : `${String(h).padStart(2, "0")}:${m[2]}`;
}
