// Yarış evrakı: kulübün GSİM'e verdiği 4 belgeyi seçilen sporculara göre PDF olarak üretir.
// Düzen, kulübün kullandığı örneklerle aynıdır (A4, Times/Arial ölçülü Liberation yazı tipleri).
// 1) Okul izni yazısı  2) EK-2 Kafile Onayı  3) Seyahat dilekçesi  4) EK-3/D Veli İzin Belgesi (sporcu başına)
// 5) Kulüp izin yazısı: kulüpten sporcunun okuluna, sporcu başına bir sayfa (antetli düzen, tarihleri ayrı)
// 6) Otel konaklama izni: tüm sporcuların velileri tek sayfada imzalar (otel adı yoksa elle yazılacak boşluk)
// 7) TYF Antrenör kayıt formu: antrenör bilgileri hesabın profilinden (users/{uid}.coach), sınıf başına bir sayfa
// 8) TYF Katılım bildirim formu (sporcu kayıt): kulüp, destek botu, antrenör ve sporcular; sınıf başına bir form
// 9) EK-3/C Seyahat Taahhüt Belgesi: antrenör için (18 yaşından büyük, kendi imkânlarıyla), bilgiler hesabın antrenör kaydından
// pdf-lib yalnızca belge hazırlanırken yüklenir (sayfa açılışını ağırlaştırmasın)

export const DOCS = [
  ["school", "Okul izni yazısı"],
  ["kafile", "EK-2 Kafile Onayı"],
  ["travel", "Seyahat dilekçesi"],
  ["parent", "EK-3/D Veli İzin Belgesi"],
  ["adult", "EK-3/C Seyahat Taahhüt Belgesi"],
  ["club", "Kulüp izin yazısı"],
  ["hotel", "Otel konaklama izni"],
  ["coach", "Antrenör kayıt formu"],
  ["entry", "Katılım bildirim formu"],
];

// Yeni yarışta seçili gelen belgeler: basılıp imzalatılan yazılar (okul izni, kulüp izin yazısı) yalnız gerekince seçilir
export const DOC_DEFAULT = DOCS.map(([k]) => k).filter((k) => k !== "school" && k !== "club");
// Kayıtlı seçimi temizler (bilinmeyen anahtar atılır, DOCS sırasında); hiç seçim yoksa null
export const cleanDocs = (v) => (Array.isArray(v) ? DOCS.map(([k]) => k).filter((k) => v.includes(k)) : null);

// Kulübün antet bilgileri (kulüp izin yazısının üst ve alt bilgisi)
export const CLUB = {
  name: "DİKİLİ YELKEN SPOR KULÜBÜ",
  web: "www.dikiliyelken.com",
  mail: "bilgi@dikiliyelken.com",
  phone: "(533) 470 78 73",
  address: "Cumhuriyet Mahallesi, Bankacılar Sitesi, 370 SK. No: 28  Dikili / İZMİR",
  // TYF kayıtlarındaki adı (katılım bildirim formu)
  tyfName: "DİKİLİ YELKEN VE KANO SPOR KULÜBÜ",
};

// Antrenör bilgileri (ana hesabın profilinde users/{uid}.coach; bir kez girilir, her yarışta hazır gelir)
export const COACH_FIELDS = [
  ["name", "Ad soyad"],
  ["tc", "T.C. kimlik no", "numeric"],
  ["sicil", "TYF sicil no", "numeric"],
  ["license", "Antrenör lisans no"],
  ["father", "Baba adı"],
  ["mother", "Anne adı"],
  ["birthPlace", "Doğum yeri"],
  ["birthDate", "Doğum tarihi", "date"],
  ["level", "Kademesi (yılı)"],
  ["club", "Kulübü (antrenör formunda)"],
  ["city", "İli"],
  ["phone", "Cep telefonu", "tel"],
  ["email", "E-posta", "email"],
  ["adb", "ADB numarası"],
  ["team", "Kulüp (katılım formunda)"],
  ["boatNo", "Destek botu no"],
  ["boatLength", "Destek botu boyu"],
  ["boatColor", "Destek botu rengi"],
  ["boatPower", "Destek botu gücü"],
  ["boatCount", "Destek tekne adedi", "numeric"],
];
// Henüz kaydedilmemişse başlangıç: ad ve e-posta hesaptan, kulüp ve destek botu kulübün TYF kaydındaki gibi
export const coachStart = (profile = {}) => ({
  name: profile.name || "", email: profile.email || "", club: "SERBEST", city: "İZMİR", level: "",
  team: CLUB.tyfName, boatLength: "520", boatColor: "Gri", boatPower: "50", boatCount: "1",
});
export const cleanCoach = (c) => Object.fromEntries(COACH_FIELDS.map(([k]) => [k, String(c?.[k] ?? "").trim().slice(0, 120)]));
// Antrenör bilgisi kullanan belgeler
export const COACH_DOCS = ["kafile", "adult", "coach", "entry"];
// Seçili belgelerde boş kalacak önemli antrenör bilgileri
export const coachMissing = (c, docs = ["coach", "entry"]) => {
  const has = (...ks) => ks.some((k) => docs.includes(k));
  const need = [["name", "ad soyad", has(...COACH_DOCS)], ["tc", "T.C.", has("adult", "coach", "entry")], ["sicil", "sicil no", has("coach", "entry")], ["phone", "telefon", has("adult", "coach", "entry")], ["father", "baba adı", has("adult")], ["mother", "anne adı", has("adult")], ["birthPlace", "doğum yeri", has("adult")], ["birthDate", "doğum tarihi", has("adult")]];
  return need.filter(([k, , on]) => on && !String(c?.[k] || "").trim()).map(([, l]) => l);
};

export const FONT_FILES = {
  serif: "LiberationSerif-Regular.ttf",
  serifB: "LiberationSerif-Bold.ttf",
  serifBI: "LiberationSerif-BoldItalic.ttf",
  sans: "LiberationSans-Regular.ttf",
  sansB: "LiberationSans-Bold.ttf",
};

const W = 595.28;
const H = 841.89;
let INK;
let NAVY;
let GRAY;
let LIGHT;
const MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];

export const up = (s) => String(s || "").trim().toLocaleUpperCase("tr-TR");
const pad = (n) => String(n).padStart(2, "0");
// "2026-10-07" ya da ISO → Date (yerel)
const toDate = (v) => (v ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v) : null);
export const dmy = (v, sep = "/") => {
  const d = toDate(v);
  return d && !Number.isNaN(d.getTime()) ? `${pad(d.getDate())}${sep}${pad(d.getMonth() + 1)}${sep}${d.getFullYear()}` : "";
};
// "07-11 EKİM 2026", ay ya da yıl farklıysa "28 EYLÜL-02 EKİM 2026"
export function rangeText(a, b) {
  const x = toDate(a);
  const y = toDate(b || a);
  if (!x || !y) return "";
  const dd = (d) => pad(d.getDate());
  if (x.getFullYear() !== y.getFullYear()) return `${dd(x)} ${MONTHS[x.getMonth()]} ${x.getFullYear()}-${dd(y)} ${MONTHS[y.getMonth()]} ${y.getFullYear()}`;
  if (x.getMonth() !== y.getMonth()) return `${dd(x)} ${MONTHS[x.getMonth()]}-${dd(y)} ${MONTHS[y.getMonth()]} ${y.getFullYear()}`;
  if (x.getDate() === y.getDate()) return `${dd(x)} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
  return `${dd(x)}-${dd(y)} ${MONTHS[y.getMonth()]} ${y.getFullYear()}`;
}
// "07-11 Ekim 2026" (yazı içinde)
export const rangeTitle = (a, b) => rangeText(a, b).toLocaleLowerCase("tr-TR").replace(/(^|\s|-)(\p{L})/gu, (m, p, c) => p + c.toLocaleUpperCase("tr-TR"));
// "GID-2026-14" + 2 → "GID-2026-16" (sondaki sayı artar, baştaki sıfırlar korunur)
export function nextNo(no, n = 1) {
  const m = String(no || "").match(/^(.*?)(\d+)$/);
  if (!m) return no || "";
  return m[1] + String(Number(m[2]) + n).padStart(m[2].length, "0");
}
// Bulunma eki: İZMİR → İZMİR’de, ANTALYA → ANTALYA’da, BODRUM → BODRUM’da, MUĞLA → MUĞLA’da
export function locative(word) {
  const w = up(word);
  const v = [...w].reverse().find((c) => "AEIİOÖUÜ".includes(c));
  const back = !v || "AIOU".includes(v);
  const hard = "ÇFHKPSŞT".includes(w.slice(-1));
  return `${w}’${hard ? "t" : "d"}${back ? "a" : "e"}`;
}

// Sporcu kartından belgeye giden bilgiler
export function athleteInfo(a) {
  const b = toDate(a.studentBirthDate);
  return {
    name: up(a.studentName),
    tc: a.studentTc || "",
    license: a.licenseNo || "",
    school: up(a.studentSchool || a.studentSchoolAndClass),
    schoolPlace: up(a.studentSchoolPlace),
    parents: [up(a.fatherName), up(a.motherName)].filter(Boolean).join("/"),
    birth: [up(a.studentBirthPlace), b && !Number.isNaN(b.getTime()) ? dmy(a.studentBirthDate, "-") : ""].filter(Boolean).join("/"),
    phone: a.studentPhone || "",
    parentName: up(a.parentName),
    parentTc: a.parentTc || "",
    parentPhone: a.parentPhone || "",
    relation: up(a.parentRelation),
    // Kulüp izin yazısı (yazı içinde adın kendi yazımı)
    plainName: String(a.studentName || "").trim().replace(/\s+/g, " "),
    schoolNo: String(a.studentNo || "").trim(),
    letterSchool: up(a.studentSchool || String(a.studentSchoolAndClass || "").replace(CLASS, "")),
    cls: String(a.studentClass || "").trim() || classOf(a.studentSchoolAndClass),
    schoolDistrict: up(String(a.studentSchoolPlace || "").split(/[-/,]/)[0]),
    // TYF katılım bildirim formu
    tyfNo: String(a.tyfNo || "").trim(),
    sailNo: String(a.sailNo || "").trim(),
    gender: up(a.studentGender),
    birthDot: b && !Number.isNaN(b.getTime()) ? dmy(a.studentBirthDate, ".") : "",
    boat: up(a.boatClass),
  };
}

// "Gelişim Lisesi 9/B" → "9/B"
const CLASS = /\s*\b(\d{1,2}\s*[/-]?\s*[A-ZÇĞİÖŞÜ])\b.*$/u;
const classOf = (s) => String(s || "").match(CLASS)?.[1].replace(/\s+/g, "").replace("-", "/") || "";

// Belgede boş kalacak alanlar (uyarı için)
export const NEEDS = [
  ["studentTc", "T.C."],
  ["licenseNo", "lisans no"],
  ["school", "okul"],
  ["studentSchoolPlace", "okul il-ilçe"],
  ["fatherName", "baba adı"],
  ["motherName", "anne adı"],
  ["studentBirthPlace", "doğum yeri"],
  ["studentBirthDate", "doğum tarihi"],
  ["parentName", "veli adı"],
  ["parentTc", "veli T.C."],
  ["parentPhone", "veli telefonu"],
  ["parentRelation", "yakınlık"],
  ["studentNo", "okul no"],
  ["studentClass", "sınıf"],
  // Yalnız katılım bildirim formu seçiliyse aranır
  ["tyfNo", "TYF sicil no", "entry"],
  ["sailNo", "yelken no", "entry"],
  ["studentGender", "cinsiyet", "entry"],
];
// docs: seçili belgeler (yalnız o belgelerin istediği alanlar sayılır)
export const missing = (a, docs = DOCS.map(([k]) => k)) =>
  NEEDS.filter(([k, , only]) => !only || docs.includes(only))
    .filter(([k]) => (k === "school" ? !(a.studentSchool || a.studentSchoolAndClass) : k === "studentClass" ? !(a.studentClass || classOf(a.studentSchoolAndClass)) : !a[k]))
    .map(([, l]) => l);

// ---- Çizim yardımcıları (y değerleri sayfanın üstünden ölçülür) ----
function painter(page) {
  const Y = (top) => H - top;
  const width = (s, font, size) => font.widthOfTextAtSize(s, size);
  const text = (s, x, top, font, size, align = "left") => {
    s = String(s ?? "");
    if (!s) return;
    const w = width(s, font, size);
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    page.drawText(s, { x: left, y: Y(top), font, size, color: INK });
    return w;
  };
  const line = (x1, t1, x2, t2, th = 0.6) => page.drawLine({ start: { x: x1, y: Y(t1) }, end: { x: x2, y: Y(t2) }, thickness: th, color: INK });
  const box = (x, top, w, h, th = 0.6) => page.drawRectangle({ x, y: Y(top + h), width: w, height: h, borderWidth: th, borderColor: INK });
  // Kelimeleri satırlara böler (ilk satır girintili olabilir)
  const wrap = (s, font, size, w, indent = 0) => {
    const words = String(s).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = [];
    const sp = width(" ", font, size);
    let used = 0;
    for (const word of words) {
      const ww = width(word, font, size);
      const room = w - (lines.length ? 0 : indent);
      if (cur.length && used + sp + ww > room) {
        lines.push(cur);
        cur = [];
        used = 0;
      }
      used += (cur.length ? sp : 0) + ww;
      cur.push(word);
    }
    if (cur.length) lines.push(cur);
    return lines;
  };
  // İki yana yaslı paragraf; son satır sola dayalı. Bir sonraki satırın üst değerini döndürür.
  const para = (s, x, top, w, font, size, lead, { indent = 0, justify = true } = {}) => {
    const lines = wrap(s, font, size, w, indent);
    lines.forEach((words, i) => {
      const lx = x + (i ? 0 : indent);
      const lw = w - (i ? 0 : indent);
      const total = words.reduce((n, wd) => n + width(wd, font, size), 0);
      const last = i === lines.length - 1;
      const gap = justify && !last && words.length > 1 ? (lw - total) / (words.length - 1) : width(" ", font, size);
      let cx = lx;
      for (const wd of words) {
        page.drawText(wd, { x: cx, y: Y(top + i * lead), font, size, color: INK });
        cx += width(wd, font, size) + gap;
      }
    });
    return top + lines.length * lead;
  };
  // Hücre içine dikeyde ortalı yazı (birden çok satır olabilir)
  const cell = (s, x, top, w, h, font, size, { align = "left", padX = 4 } = {}) => {
    const lines = Array.isArray(s) ? s : [s];
    const lead = size * 1.15;
    const first = top + h / 2 - ((lines.length - 1) * lead) / 2 + size * 0.35;
    lines.forEach((ln, i) => {
      const ax = align === "center" ? x + w / 2 : align === "right" ? x + w - padX : x + padX;
      text(ln, ax, first + i * lead, font, size, align);
    });
  };
  return { text, line, box, para, cell, width, wrap };
}

// Satır sınırlarıyla tablo: cols = [x0, x1, …], rows = [üst0, üst1, …]
function grid(p, cols, rows, th = 0.6) {
  rows.forEach((t) => p.line(cols[0], t, cols.at(-1), t, th));
  cols.forEach((x) => p.line(x, rows[0], x, rows.at(-1), th));
}

// ---- 1) Okul izni yazısı ----
function schoolLetter(pdf, f, r, list) {
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  p.text("GENÇLİK VE SPOR İL MÜDÜRLÜĞÜNE", 186, 92, f.serifB, 12);
  p.text(up(r.city), 396, 113, f.serifB, 12);
  const x = 74;
  const w = 461;
  const lead = 20.7;
  let top = p.para(
    `Türkiye ${up(r.federation)} Federasyonu ${r.year} yılı faaliyet programında yer alan ve ${rangeText(r.startDate, r.endDate)} tarihleri arasında ${r.place} ilinde düzenlenecek olan ${up(r.name)} müsabakalarına aşağıdaki listede adı soyadı, okulu, görevi yazılı olanlar sporcu olarak katılacaktır.`,
    x, 160, w, f.serif, 12, lead, { indent: 34 },
  );
  top = p.para(`Adı geçenlerin söz konusu müsabakaya katılabilmesi için ${rangeText(r.leaveStart, r.leaveEnd)} tarihleri arasında izinli sayılması hususunda;`, x, top, w, f.serif, 12, lead, { indent: 34 });
  top = p.para(`Bilgilerinizi ve gereğini arz ederim. ${dmy(r.letterDate)}`, x, top, w, f.serif, 12, lead, { indent: 34, justify: false });

  const sx = 297;
  const st = Math.max(top + 30, 334);
  p.text("İl Temsilcisi / Kulüp Yetkili İmza Kaşe:", sx, st, f.serifBI, 12);
  const lw = p.text("Adı Soyadı:  ", sx, st + 20, f.serifBI, 12);
  p.text(up(r.signer), sx + lw, st + 20, f.serifB, 12);

  const cols = [12, 50, 194, 268, 466, 576];
  const head = ["SIRA", "ADI-SOYADI", "GÖREVİ", "OKULU – BÖLÜMÜ / KURUMU", "İL - İLÇESİ"];
  const t0 = Math.max(432, st + 98);
  const rows = [t0, t0 + 36];
  // Kalabalık kafilede satırlar sayfaya sığacak kadar daralır
  const rh = Math.min(27, (805 - t0 - 36) / Math.max(1, list.length));
  const fs = Math.min(11, rh - 3);
  list.forEach(() => rows.push(rows.at(-1) + rh));
  grid(p, cols, rows);
  head.forEach((h, i) => p.cell(h, cols[i], rows[0], cols[i + 1] - cols[i], 36, f.serifB, 11, { align: i >= 3 ? "center" : "left" }));
  list.forEach((a, n) => {
    const t = rows[n + 1];
    const c = [String(n + 1), a.name, "SPORCU", a.school, a.schoolPlace];
    c.forEach((v, i) => fitCell(p, v, cols[i], t, cols[i + 1] - cols[i], rh, i === 0 ? f.serifB : f.serif, fs));
  });
}

// Sığmazsa yazıyı küçült, yine sığmazsa iki satıra böl
// Yazıyı hücreye sığdırır: önce tek satırda küçülterek, olmazsa satırlara bölerek (yükseklik de hesaba katılır).
// En küçük boyutta da sığmazsa satırlar yine bölünür; yazı kesilmez.
function fitLines(p, s, font, size, w, h, min = 6) {
  const room = w - 8;
  for (let sz = size; sz >= min; sz -= 0.25) {
    if (p.width(s, font, sz) <= room) return { lines: [s], sz };
    const lines = p.wrap(s, font, sz, room).map((ws) => ws.join(" "));
    if (lines.length * sz * 1.15 <= h - 1 && lines.every((l) => p.width(l, font, sz) <= room)) return { lines, sz };
  }
  return { lines: p.wrap(s, font, min, room).map((ws) => ws.join(" ")), sz: min };
}
function fitCell(p, s, x, top, w, h, font, size, opt) {
  s = String(s ?? "").trim();
  if (!s) return;
  const { lines, sz } = fitLines(p, s, font, size, w, h);
  p.cell(lines, x, top, w, h, font, sz, opt);
}

// ---- 2) EK-2 Kafile Onayı ----
// Kafile listesi: önce antrenör (hesabın antrenör adı, lisans no boş), sonra sporcular
export const kafileRows = (list, coach = {}) => {
  const name = up(coach.name);
  return [...(name ? [{ name, license: String(coach.license || "").trim(), role: "ANTRENÖR" }] : []), ...list.map((a) => ({ name: a.name, license: a.license, role: "SPORCU" }))];
};
function kafile(pdf, f, r, list, coach) {
  const rows = kafileRows(list, coach);
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  p.text("(EK-2)", 527, 95, f.serifB, 12, "right");
  p.text("T.C.", W / 2, 110, f.serif, 12, "center");
  p.text(`${up(r.city)} VALİLİĞİ`, W / 2, 124, f.serif, 12, "center");
  p.text("Gençlik ve Spor İl Müdürlüğü", W / 2, 139, f.serif, 12, "center");
  p.text("Sayı", 74, 167, f.serif, 12);
  p.text(`:${r.year} -`, 106, 167, f.serif, 12);
  p.text("Konu", 74, 181, f.serif, 12);
  p.text(":Kafile Onayı", 106, 181, f.serif, 12);
  p.text(dmy(r.letterDate), 527, 167, f.serif, 12, "right");
  p.text(`${up(r.city)} GENÇLİK VE SPOR İL MÜDÜRLÜĞÜNE`, W / 2, 210, f.serif, 12, "center");

  // Faaliyet tablosu
  const c1 = [72, 272, 527];
  // Faaliyet adı uzunsa satırı yükselir (iki satıra sığsın)
  const hs = [14, p.width(up(r.name), f.serif, 10) > 247 ? 26 : 14, 14, 23, 23, 15];
  const r1 = [223];
  hs.forEach((h) => r1.push(r1.at(-1) + h));
  grid(p, c1, r1);
  const left = [
    "FAALİYETİN YAPILACAĞI İL",
    "FAALİYETİN ADI",
    "FAALİYETİN TARİHİ",
    ["ARACIN PLAKASI – ARACIN MARKASI", "VE MODELİ"],
    ["ŞOFÖRLERİN ADI SOYADI – ŞOFÖRLERİN", "EHLİYET SINIFLARI"],
    "SEYAHAT TÜRÜ",
  ];
  const right = [r.place, up(r.name), rangeText(r.startDate, r.endDate), r.vehicle || "-", r.drivers || "-", r.travel || "Kendi İmkanları İle"];
  left.forEach((s, i) => p.cell(s, c1[0], r1[i], c1[1] - c1[0], hs[i], f.serif, 9));
  right.forEach((s, i) => fitCell(p, s, c1[1], r1[i], c1[2] - c1[1], hs[i], f.serif, 12));

  // Kafile listesi (en az 5 satır)
  const c2 = [72, 99, 275, 378, 527];
  const r2 = [346, 359];
  const n = Math.max(5, rows.length);
  const rh = Math.min(14.5, 230 / n);
  for (let i = 0; i < n; i++) r2.push(r2.at(-1) + rh);
  grid(p, c2, r2);
  ["NO", "ADI SOYADI", "LİSANS NO", "GÖREVİ / UNVANI"].forEach((h, i) => p.cell(h, c2[i], r2[0], c2[i + 1] - c2[i], 13, f.serifB, 9.5, { align: "center" }));
  rows.forEach((a, i) => {
    const t = r2[i + 1];
    const sm = Math.min(10, rh - 2);
    p.cell(String(i + 1), c2[0], t, c2[1] - c2[0], rh, f.serifB, sm, { align: "center" });
    fitCell(p, a.name, c2[1], t, c2[2] - c2[1], rh, f.serif, Math.min(12, rh - 2));
    p.cell(a.license, c2[2], t, c2[3] - c2[2], rh, f.serif, sm, { align: "center" });
    p.cell(a.role, c2[3], t, c2[4] - c2[3], rh, f.serif, sm, { align: "center" });
  });

  const pt = Math.max(432, r2.at(-1) + 30);
  const end = p.para(
    `Yukarıda belirtilen kafilenin ${rangeText(r.startDate, r.endDate)} tarihleri arasında ${up(r.city)} ilinde düzenlenecek olan ${up(r.name)} spor faaliyetine katılmasında idari yönden sakınca yoktur. İlgililerin 3289 sayılı Kanunun 29 uncu maddesi gereğince ${dmy(r.leaveStart)} - ${dmy(r.leaveEnd)} tarihleri arasında izinli sayılmalarını olurlarınıza arz ederim.`,
    72, pt, 455, f.serif, 12, 14, { indent: 34 },
  );
  const s = Math.min(Math.max(537, end + 60), 690);
  p.text("………………………………", 450, s, f.serif, 12, "center");
  p.text("GSİM Spor Şube Müdürü", 450, s + 15, f.serif, 12, "center");
  p.text("O  L  U  R", W / 2 - 10, s + 50, f.serif, 12, "center");
  p.text(`……/……/${r.year}`, W / 2 - 10, s + 64, f.serif, 12, "center");
  p.text("………………………", W / 2, s + 118, f.serif, 12, "center");
  p.text("Gençlik ve Spor İl Müdürü", W / 2, s + 131, f.serif, 12, "center");
}

// ---- 3) Seyahat dilekçesi ----
function travel(pdf, f, r, list) {
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  p.text(`${up(r.city)} GENÇLİK VE SPOR İL MÜDÜRLÜĞÜNE`, W / 2, 142, f.serifB, 12, "center");
  p.text("(Spor Faaliyetleri Birimi)", W / 2, 156, f.serifB, 12, "center");
  const x = 42;
  const w = 520;
  let top = p.para(
    `TÜRKİYE ${up(r.federation)} Federasyonu Başkanlığının ${r.year} Yılı Faaliyet Programında yer alan ${up(r.name)} müsabakaları ${rangeText(r.startDate, r.endDate)} tarihleri arasında ${locative(r.place)} yapılacaktır.`,
    x, 194, w, f.serif, 12, 14.4, { indent: 42 },
  );
  top = p.para(
    `Söz konusu faaliyete Seyahat Yönergesi doğrultusunda hazırlanan aşağıda bilgileri yazılı kafilenin tartı, toplantı, yol dâhil ${dmy(r.leaveStart)} ile ${dmy(r.leaveEnd)} tarihleri arasında (Kafile ile yolculuk edecek sporcuların seyahat sorumluluğu Kulübe, kendi imkânlarıyla ile yolculuk edecek sporcuların seyahat sorumluluğu şahıslara aittir) katılmalarını ve kafile onaylarının alınması hususunda gereğini arz ederim.`,
    x, top + 12, w, f.serif, 12, 14.4, { indent: 42 },
  );
  top = p.para(
    "Not: Ek’te sunulan seyahat belgelerinin Spor Hizmetleri Genel Müdürlüğünün yayımladığı Spor Kafileleri Seyahat Yönergesine uygun olarak hazırlanmış olduğunu kabul ve taahhüt ederim.",
    x, top + 12, w, f.serifB, 12, 14.4,
  );
  const e = Math.max(383, top + 30);
  const ew = p.text("EKLER:", 42, e, f.serif, 12);
  p.line(42, e + 1.5, 42 + ew, e + 1.5, 0.6);
  p.text("1-Sporcu Seyahat İzin Belgesi", 52, e + 28, f.serif, 12);
  p.text(`(${list.length} Adet)`, 236, e + 28, f.serif, 12);

  const sx = 441;
  const st = Math.max(546, e + 160);
  p.text("Kulüp Yetkilisi", sx, st, f.serifB, 11, "center");
  p.text(r.signer, sx, st + 37, f.serifB, 10, "center");
  p.text(up(r.signerTitle), sx, st + 49, f.serifB, 10, "center");
}

// ---- 4) EK-3/D Veli İzin Belgesi (sporcu başına bir sayfa) ----
function parentForm(pdf, f, r, a) {
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  const L = 81;
  const R = 533;
  const M = 177;
  p.text("EK-3/D", R, 70, f.serifB, 13, "right");

  // Organizasyon ve sporcu kutusu
  p.box(L, 77, R - L, 211);
  p.cell("VELİ İZİN BELGESİ", L, 77, R - L, 22, f.sansB, 17, { align: "center" });
  p.cell("(KENDİ İMKÂNLARIYLA SEYAHAT EDECEK 18 YAŞINDAN KÜÇÜKLER İÇİN)", L, 96, R - L, 15, f.sansB, 10.5, { align: "center" });
  const rows = [113, 128, 145.5, 163, 181, 199, 216.5, 234, 251.5, 270, 288];
  rows.slice(0, -1).forEach((t) => p.line(L, t, R, t));
  // Başlık satırları (ORGANİZASYONUN, SPORCUNUN) tek hücre; diğerlerinde dikey çizgi
  [1, 2, 3, 5, 6, 7, 8, 9].forEach((i) => p.line(M, rows[i], M, rows[i + 1]));
  p.cell("ORGANİZASYONUN", L, rows[0], R - L, rows[1] - rows[0], f.sansB, 9.5, { align: "center" });
  p.cell("SPORCUNUN", L, rows[4], R - L, rows[5] - rows[4], f.sansB, 9.5, { align: "center" });
  const org = [["Adı", up(r.name)], ["Yeri", `${up(r.city)} -${up(r.district)}`], ["Tarihi", rangeText(r.startDate, r.endDate)]];
  org.forEach(([k, v], i) => {
    p.cell(k, L, rows[i + 1], M - L, rows[i + 2] - rows[i + 1], f.sans, 9.5);
    fitCell(p, v, M, rows[i + 1], R - M, rows[i + 2] - rows[i + 1], f.sansB, 9.5, { align: "center" });
  });
  const sp = [
    ["TC Kimlik No", a.tc, "left"],
    ["Adı ve Soyadı", a.name, "left"],
    ["Baba - Anne Adı", a.parents, "center"],
    ["Doğum Yeri - Tarihi", a.birth, "center"],
    ["İrtibat Telefonu", a.phone, "center"],
  ];
  sp.forEach(([k, v, al], i) => {
    p.cell(k, L, rows[i + 5], M - L, rows[i + 6] - rows[i + 5], f.sans, 9.5);
    fitCell(p, v, M, rows[i + 5], R - M, rows[i + 6] - rows[i + 5], f.sansB, 9.5, { align: al });
  });

  // Veli kutusu
  const vt = 298;
  const vb = 645;
  p.box(L, vt, R - L, vb - vt);
  const vr = [vt, 319, 336, 361];
  vr.slice(1).forEach((t) => p.line(L, t, R, t));
  const vc = [L, 173, 314, 383, R];
  vc.slice(1, -1).forEach((x) => p.line(x, vr[1], x, vr[3]));
  p.cell("VELİSİNİN (VASİSİ)", L, vt, R - L, vr[1] - vt, f.sansB, 9.5, { align: "center" });
  const tw = p.width("VELİSİNİN (VASİSİ)", f.sansB, 9.5);
  p.text("(1)", (L + R) / 2 + tw / 2 + 2, vt + 9, f.sans, 6);
  p.cell("Adı Soyadı", vc[0], vr[1], vc[1] - vc[0], vr[2] - vr[1], f.sans, 9.5);
  fitCell(p, a.parentName, vc[1], vr[1], vc[2] - vc[1], vr[2] - vr[1], f.sans, 9.5);
  p.cell("TC Kimlik No", vc[2], vr[1], vc[3] - vc[2], vr[2] - vr[1], f.sans, 9.5);
  p.cell(a.parentTc, vc[3], vr[1], vc[4] - vc[3], vr[2] - vr[1], f.sans, 9.5);
  p.cell("İrtibat Telefonu", vc[0], vr[2], vc[1] - vc[0], vr[3] - vr[2], f.sans, 9.5);
  p.cell(a.parentPhone, vc[1], vr[2], vc[2] - vc[1], vr[3] - vr[2], f.sans, 9.5);
  p.cell(["Yakınlık", "Derecesi"], vc[2], vr[2], vc[3] - vc[2], vr[3] - vr[2], f.sans, 9.5);
  p.cell(a.relation, vc[3], vr[2], vc[4] - vc[3], vr[3] - vr[2], f.sans, 9.5);

  const fs = 9;
  const ld = 10.8;
  const tx = L + 3;
  const tw2 = R - L - 6;
  p.text("Velisi (Vasisi) olarak oğlumun/kızımın;", tx, 372, f.sans, fs);
  let top = 383;
  [
    "Velayetim altında bulunduğunu ve reşit olana kadar adına her türlü işlem yapma haklarının tarafıma ait olduğunu,",
    "Katılacağı resmi müsabakalara ait yönerge ve talimatlarının bütün hükümleri hakkında bilgi sahibi olduğunu,",
    "Yönerge ve talimatların taraflara yüklediği vecibeleri eksiksiz yerine getireceğini,",
  ].forEach((s, i) => {
    p.text(`${i + 1}.`, tx + 3, top, f.sans, fs);
    top = p.para(s, tx + 20, top, tw2 - 20, f.sans, fs, ld);
  });
  p.text("beyan ve taahhüt ettiği konusunda bilgim mevcuttur.", tx, top, f.sans, fs);
  p.para(
    "Velisi(Vasisi) bulunduğum yukarıda açık kimlik bilgileri yazılı oğlumun/kızımın belirtilen organizasyona katılımı için kendi imkânlarıyla seyahat edeceğini, gerekli yol, iaşe ve ibate giderleri ile her türlü sorumluluğun tarafıma ait olduğunu beyan ve taahhüt ederim.",
    tx, top + 14, tw2, f.sans, fs, ld,
  );
  p.text("Velisi(Vasisi)", 442, 525, f.sans, 9.5, "center");
  const sw = p.text("(Adı Soyadı ve İmza)", 448, 540, f.sans, 9.5, "center");
  p.text("(2)", 448 + sw / 2 + 2, 535, f.sans, 6);
  p.para(
    "Yukarıda açık kimliği yazılı sporcuya ait veli izin belgesi sporcunun velisi (vasisi) tarafından huzurumuzda imzalanmış ve kimlik kontrolü yapılmıştır.",
    tx, 621, tw2, f.sans, 10, 12,
  );

  // Huzurunda imza atan görevli
  const g = [652, 670, 688, 706, 726];
  p.box(L, g[0], R - L, g.at(-1) - g[0]);
  g.slice(1, -1).forEach((t) => p.line(L, t, 334, t));
  p.line(L, g[1], R, g[1]);
  p.line(181, g[1], 181, g.at(-1));
  p.line(334, g[1], 334, g.at(-1));
  p.cell("HUZURUNDA İMZA ATILAN GÖREVLİNİN;", L, g[0], R - L, g[1] - g[0], f.sansB, 9.5, { align: "center" });
  p.cell("Adı Soyadı", L, g[1], 100, 18, f.sans, 9.5);
  const kw = p.width("Kurumu / Görevi ", f.sans, 9.5);
  p.cell("Kurumu / Görevi ", L, g[2], 100, 18, f.sans, 9.5);
  p.text("(3)", L + 4 + kw, g[2] + 8, f.sans, 6);
  p.cell("Tarih", L, g[3], 100, 20, f.sans, 9.5);
  fitCell(p, up(r.signer), 181, g[1], 153, 18, f.sans, 9.5);
  p.cell(`KULÜP/${up(r.signerTitle)}`, 181, g[2], 153, 18, f.sans, 9.5, { align: "center" });
  p.cell(dmy(r.letterDate), 181, g[3], 153, 20, f.sans, 9.5);
  const iw = p.text("(Adı Soyadı ve İmza)", 433, 721, f.sans, 8, "center");
  p.text("(3)", 433 + iw / 2 + 2, 717, f.sans, 5.5);

  p.line(L, 764, L + 138, 764, 0.5);
  [
    "Sporcunun vasisi tarafından imzalanması halinde vasi belgesinin fotokopisi eklenecektir.",
    "Elle yazılacak ve ıslak imza olacaktır.",
    "Gençlik Hizmetleri ve Spor İl / İlçe Müdürlükleri veya Okul Müdürlükleri tarafından yetkilendirilmiş kişiler.",
  ].forEach((s, i) => {
    p.text(String(i + 1), L, 775 + i * 11, f.sans, 5.5);
    p.text(s, L + 6, 778 + i * 11, f.sans, 8);
  });
  p.text("1", W / 2, 818, f.serif, 11, "center");
}

// ---- 9) EK-3/C Seyahat Taahhüt Belgesi (antrenör; EK-3/D ile aynı düzen) ----
function adultForm(pdf, f, r, c) {
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  const L = 81;
  const R = 533;
  const M = 177;
  p.text("EK-3/C", R, 70, f.serifB, 13, "right");

  p.box(L, 77, R - L, 211);
  p.cell("SEYAHAT TAAHHÜT BELGESİ", L, 77, R - L, 22, f.sansB, 17, { align: "center" });
  p.cell("(KENDİ İMKÂNLARIYLA SEYAHAT EDECEK 18 YAŞINDAN BÜYÜKLER İÇİN)", L, 96, R - L, 15, f.sansB, 10.5, { align: "center" });
  const rows = [113, 128, 145.5, 163, 181, 199, 216.5, 234, 251.5, 270, 288];
  rows.slice(0, -1).forEach((t) => p.line(L, t, R, t));
  [1, 2, 3, 5, 6, 7, 8, 9].forEach((i) => p.line(M, rows[i], M, rows[i + 1]));
  p.cell("ORGANİZASYONUN", L, rows[0], R - L, rows[1] - rows[0], f.sansB, 9.5, { align: "center" });
  // Kafile başlığı: görevi (ANTRENÖR) altı çizili
  const parts = ["KAFİLE (BAŞKAN / BAŞKAN YRD. / ", "ANTRENÖR", " / REFAKATÇİ / TERCÜMAN / SPORCU)"];
  const fs0 = 9;
  const tw = parts.reduce((n, x) => n + p.width(x, f.sansB, fs0), 0);
  const ax = (L + R) / 2 - tw / 2 + p.width(parts[0], f.sansB, fs0);
  p.cell(parts.join(""), L, rows[4], R - L, rows[5] - rows[4], f.sansB, fs0, { align: "center" });
  p.line(ax, rows[4] + 13.5, ax + p.width(parts[1], f.sansB, fs0), rows[4] + 13.5, 0.8);
  const org = [["Adı", up(r.name)], ["Yeri", `${up(r.city)} -${up(r.district)}`], ["Tarihi", rangeText(r.startDate, r.endDate)]];
  org.forEach(([k, v], i) => {
    p.cell(k, L, rows[i + 1], M - L, rows[i + 2] - rows[i + 1], f.sans, 9.5);
    fitCell(p, v, M, rows[i + 1], R - M, rows[i + 2] - rows[i + 1], f.sansB, 9.5, { align: "center" });
  });
  const birth = [up(c.birthPlace), dmy(c.birthDate, "-")].filter(Boolean).join("/");
  const sp = [
    ["TC Kimlik No", c.tc, "left"],
    ["Adı ve Soyadı", up(c.name), "left"],
    ["Baba - Anne Adı", [up(c.father), up(c.mother)].filter(Boolean).join("/") || "/", "center"],
    ["Doğum Yeri - Tarihi", birth || "/", "center"],
    ["İrtibat Telefonu", c.phone, "center"],
  ];
  sp.forEach(([k, v, al], i) => {
    p.cell(k, L, rows[i + 5], M - L, rows[i + 6] - rows[i + 5], f.sans, 9.5);
    fitCell(p, v, M, rows[i + 5], R - M, rows[i + 6] - rows[i + 5], f.sansB, 9.5, { align: al });
  });

  const fs = 9.5;
  const ld = 11.5;
  const tx = L + 3;
  const tw2 = R - L - 6;
  // Beyan ve doğrulama kutusu (örnekteki gibi tek çerçeve)
  p.box(L, 296, R - L, 294);
  p.line(L, 550, R, 550);
  let top = 308;
  [
    "Katılacağım resmi müsabakalara ait yönerge ve talimatlarının bütün hükümleri hakkında bilgi sahibi olduğumu,",
    "Yönerge ve talimatların taraflara yüklediği vecibeleri eksiksiz yerine getireceğimi,",
    "Belirtilen organizasyona kendi imkânlarımla seyahat edeceğimi, gerekli yol, iaşe ve ibate giderleri ile her türlü sorumluluğun tarafıma ait olduğunu beyan ve taahhüt ederim.",
  ].forEach((s, i) => {
    p.text(`${i + 1}.`, tx + 3, top, f.sans, fs);
    top = p.para(s, tx + 20, top, tw2 - 20, f.sans, fs, ld) + 2;
  });
  const sw = p.text("(Adı Soyadı ve İmza)", 448, 440, f.sans, 9.5, "center");
  p.text("(1)", 448 + sw / 2 + 2, 435, f.sans, 6);
  p.para(
    "Yukarıda açık kimliği yazılı kişiye ait seyahat taahhüt belgesi huzurumuzda imzalanmış ve kimlik kontrolü yapılmıştır.",
    tx, 563, tw2, f.sans, 10, 12,
  );

  // Huzurunda imza atan görevli
  const g = [590, 608, 626, 644, 664];
  p.box(L, g[0], R - L, g.at(-1) - g[0]);
  g.slice(1, -1).forEach((t) => p.line(L, t, 334, t));
  p.line(L, g[1], R, g[1]);
  p.line(181, g[1], 181, g.at(-1));
  p.line(334, g[1], 334, g.at(-1));
  p.cell("HUZURUNDA İMZA ATILAN GÖREVLİNİN;", L, g[0], R - L, g[1] - g[0], f.sansB, 9.5, { align: "center" });
  p.cell("Adı Soyadı", L, g[1], 100, 18, f.sans, 9.5);
  const kw = p.width("Kurumu / Görevi ", f.sans, 9.5);
  p.cell("Kurumu / Görevi ", L, g[2], 100, 18, f.sans, 9.5);
  p.text("(2)", L + 4 + kw, g[2] + 8, f.sans, 6);
  p.cell("Tarih", L, g[3], 100, 20, f.sans, 9.5);
  fitCell(p, up(r.signer), 181, g[1], 153, 18, f.sans, 9.5);
  p.cell(`KULÜP/${up(r.signerTitle)}`, 181, g[2], 153, 18, f.sans, 9.5, { align: "center" });
  p.cell(dmy(r.letterDate), 181, g[3], 153, 20, f.sans, 9.5);
  const iw = p.text("(Adı Soyadı ve İmza)", 433, 659, f.sans, 8, "center");
  p.text("(1)", 433 + iw / 2 + 2, 655, f.sans, 5.5);

  p.line(L, 764, L + 138, 764, 0.5);
  [
    "Elle yazılacak ve ıslak imza olacaktır.",
    "Gençlik Hizmetleri ve Spor İl / İlçe Müdürlükleri veya Okul Müdürlükleri tarafından yetkilendirilmiş kişiler.",
  ].forEach((s, i) => {
    p.text(String(i + 1), L, 775 + i * 11, f.sans, 5.5);
    p.text(s, L + 6, 778 + i * 11, f.sans, 8);
  });
}

// ---- 5) Kulüp izin yazısı (sporcu başına; kulüp antetli) ----
// c: { no, date, from, to, event, place, signer, title } yarıştan hazırlanır (buildRaceDocs)
function clubLetter(pdf, f, c, a, no) {
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  const L = 70;
  const R = W - 70;
  letterhead(page, p, f, L, R);

  // Sayı, konu, tarih
  const kv = (k, v, top) => {
    p.text(k, L, top, f.serif, 11);
    p.text(":", L + 40, top, f.serif, 11);
    p.text(v, L + 48, top, f.serif, 11);
  };
  if (no) kv("Sayı", no, 132);
  kv("Konu", "Öğrenci izni", no ? 148 : 132);
  p.text(dmy(c.date), R, 132, f.serif, 11, "right");

  // Muhatap
  p.text(`${a.letterSchool || "……………………………………"} MÜDÜRLÜĞÜNE`, W / 2, 206, f.serifB, 12, "center");
  if (a.schoolDistrict) p.text(a.schoolDistrict, W / 2, 222, f.serifB, 12, "center");

  // Metin
  const lead = 21;
  const cls = a.cls ? `${a.cls} sınıfı ` : "";
  const num = a.schoolNo ? `${a.schoolNo} numaralı ` : "";
  let top = p.para(
    `Okulunuz ${num}${cls}öğrenciniz ${a.plainName}, ${rangeTitle(c.from, c.to)} tarihleri arasında ${c.place}${placeSuffix(c.place)} düzenlenecek olan ${c.event} organizasyonuna kulübümüz sporcusu olarak katılacaktır.`,
    L, 272, R - L, f.serif, 12, lead, { indent: 36 },
  );
  top = p.para("Söz konusu tarihlerde sporcumuzun izinli sayılması hususunda gereğini rica ederiz.", L, top + 8, R - L, f.serif, 12, lead, { indent: 36 });
  p.text("Saygılarımızla,", L + 36, top + 8, f.serif, 12);

  // İmza
  const sx = R - 95;
  const st = Math.max(top + 70, 470);
  p.text("Dikili Yelken Spor Kulübü", sx, st, f.serif, 12, "center");
  if (c.title) p.text(c.title, sx, st + 16, f.serif, 12, "center");
  p.text(c.signer || "", sx, st + 66, f.serifB, 12, "center");
  page.drawLine({ start: { x: sx - 70, y: H - (st + 52) }, end: { x: sx + 70, y: H - (st + 52) }, thickness: 0.4, color: LIGHT, dashArray: [1.5, 2] });

}

// Kulüp anteti (üstte logo + ad, altta iletişim); kulüp izin yazısı ve otel izni ortak kullanır
function letterhead(page, p, f, L, R) {
  const navy = NAVY;
  const tx = (s, x, top, font, size, align, color = navy) => {
    const w = p.width(s, font, size);
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    page.drawText(s, { x: left, y: H - top, font, size, color });
  };
  // Antet: kulüp logosu + kulüp adı, altında çift çizgi
  if (f.logo) page.drawImage(f.logo, { x: L, y: H - 92, width: 58, height: 58 });
  else page.drawSvgPath("M 15 0 L 15 34 L 0 34 Z M 18 4 L 18 34 L 34 34 Z M -2 38 L 36 38 Q 34 44 28 45 L 4 45 Q 0 44 -2 38 Z", { x: L, y: H - 44, color: navy });
  const nx = L + (f.logo ? 70 : 48);
  tx(CLUB.name, nx, 64, f.serifB, 19, "left");
  tx("Dikili / İZMİR", nx, 80, f.serif, 10.5, "left", GRAY);
  page.drawRectangle({ x: L, y: H - 102, width: R - L, height: 1.6, color: navy });
  page.drawRectangle({ x: L, y: H - 105.5, width: R - L, height: 0.5, color: navy });
  // Alt bilgi
  page.drawRectangle({ x: L, y: H - 770, width: R - L, height: 0.5, color: navy });
  page.drawRectangle({ x: L, y: H - 773.5, width: R - L, height: 1.6, color: navy });
  tx(CLUB.name, W / 2, 790, f.sansB, 9, "center");
  tx(`${CLUB.web}   ·   ${CLUB.mail}   ·   ${CLUB.phone}`, W / 2, 803, f.sans, 8.5, "center", GRAY);
  tx(CLUB.address, W / 2, 815, f.sans, 8.5, "center", GRAY);
}

// ---- 6) Otel konaklama izni (tek sayfa; tüm sporcuların velileri imzalar) ----
// h: { hotel, from, to, event, place, date, signer, title } (hotelInfo). Otel adı yoksa elle yazılacak boşluk kalır.
function hotelForm(pdf, f, h, list) {
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  const L = 60;
  const R = W - 60;
  letterhead(page, p, f, L, R);
  p.text(dmy(h.date), R, 128, f.serif, 11, "right");
  p.text("OTEL KONAKLAMA VELİ İZİN BELGESİ", W / 2, 152, f.serifB, 13, "center");

  const lead = 17;
  const dates = rangeTitle(h.from, h.to);
  let top = p.para(
    `Aşağıda imzası bulunan veliler olarak, velisi olduğumuz sporcuların ${dates || "……/……/…………  –  ……/……/…………"} tarihleri arasında ${h.place ? `${h.place}${placeSuffix(h.place)}` : "……………………’da"} düzenlenecek olan ${h.event || "……………………………………"} organizasyonu süresince kulüp kafilesiyle birlikte, antrenörlerin gözetiminde aşağıda belirtilen otelde konaklamasına izin veriyoruz.`,
    L, 182, R - L, f.serif, 11.5, lead, { indent: 30 },
  );
  // Otel adı ve tarihler (yoksa elle yazılacak çizgi)
  const kv = (k, v, t) => {
    const kw = p.text(`${k}:`, L, t, f.serifB, 11.5);
    if (v) p.text(v, L + kw + 6, t, f.serif, 11.5);
    else page.drawLine({ start: { x: L + kw + 6, y: H - (t + 2) }, end: { x: R, y: H - (t + 2) }, thickness: 0.4, color: LIGHT, dashArray: [1.5, 2] });
  };
  top += 14;
  kv("Konaklanacak otel", h.hotel, top);
  kv("Konaklama tarihleri", dates, top + 22);

  // Veli tablosu: sporcu, veli, telefon, imza (kartta veli bilgisi yoksa elle doldurulur)
  const cols = [L, L + 26, L + 152, L + 288, L + 378, R];
  const t0 = top + 46;
  const hh = 26;
  const n = Math.max(5, list.length);
  const bottom = 680;
  const rh = Math.min(30, (bottom - t0 - hh) / n);
  const fs = Math.min(10.5, rh - 4);
  const rows = [t0, t0 + hh];
  for (let i = 0; i < n; i++) rows.push(rows.at(-1) + rh);
  grid(p, cols, rows);
  ["NO", "SPORCUNUN ADI SOYADI", "VELİSİNİN ADI SOYADI", "VELİ TELEFONU", "VELİ İMZASI"].forEach((s, i) =>
    fitCell(p, s, cols[i], rows[0], cols[i + 1] - cols[i], hh, f.serifB, 9, { align: "center" }),
  );
  for (let i = 0; i < n; i++) {
    const a = list[i];
    const t = rows[i + 1];
    p.cell(String(i + 1), cols[0], t, cols[1] - cols[0], rh, f.serifB, fs, { align: "center" });
    if (!a) continue;
    fitCell(p, a.name, cols[1], t, cols[2] - cols[1], rh, f.serif, fs);
    fitCell(p, a.parentName, cols[2], t, cols[3] - cols[2], rh, f.serif, fs);
    fitCell(p, a.parentPhone, cols[3], t, cols[4] - cols[3], rh, f.serif, fs, { align: "center" });
  }

  // Kulüp yetkilisi
  const sx = R - 90;
  const st = Math.min(rows.at(-1) + 26, 712);
  p.text("Kulüp Yetkilisi", sx, st, f.serif, 11, "center");
  if (h.title) p.text(h.title, sx, st + 14, f.serif, 10.5, "center");
  p.text(h.signer || "", sx, st + 44, f.serifB, 11, "center");
}

// ---- 7-8) TYF formları (federasyon sistemindeki düzen: sade, açık gri çizgili tablolar) ----
// Basım zamanı = evrak tarihi (tüm belgelerde aynı); saat yalnız evrak o gün ilk hazırlandıysa (docsAt)
export function stamp(r) {
  const at = toDate(r?.docsAt);
  const ok = at && !Number.isNaN(at.getTime());
  if (!r?.letterDate) return ok ? `${dmy(at, ".")} ${pad(at.getHours())}:${pad(at.getMinutes())}` : "";
  const day = dmy(r.letterDate, ".");
  return ok && dmy(at, ".") === day ? `${day} ${pad(at.getHours())}:${pad(at.getMinutes())}` : day;
}
// Başlık satırları ortada; son satırın altına basım zamanı. Bir sonraki boş üst değeri döndürür.
function tyfHead(p, f, r, lines, top = 62, size = 12.5) {
  const lead = size * 1.2;
  lines.forEach((s, i) => p.text(s, W / 2, top + i * lead, f.sans, size, "center"));
  const t = top + lines.length * lead + 4;
  p.text(`Belge Basım Zamanı: ${stamp(r)}`, W / 2, t, f.sans, 7.5, "center");
  return t + 22;
}
// Açık gri çizgili tablo (satır sınırları rows, sütunlar cols)
function softGrid(page, cols, rows) {
  const c = { thickness: 0.5, color: LIGHT };
  rows.forEach((t) => page.drawLine({ start: { x: cols[0], y: H - t }, end: { x: cols.at(-1), y: H - t }, ...c }));
  cols.forEach((x) => page.drawLine({ start: { x, y: H - rows[0] }, end: { x, y: H - rows.at(-1) }, ...c }));
}
// "Ad Soyad / İmza" kutusu
function signBox(page, p, f, x, top, name = "") {
  page.drawRectangle({ x, y: H - (top + 34), width: 186, height: 34, borderWidth: 0.5, borderColor: LIGHT });
  p.text("Ad Soyad", x + 6, top + 11, f.sans, 6.5);
  p.text("İmza", x + 6, top + 20, f.sans, 6.5);
  if (name) p.text(name, x + 46, top + 11, f.sans, 7.5);
}
// Örnek formlar A3 ölçüsünde; logolar aynı yerde, A4'e oranla küçültülmüş (k = A4/A3).
// tyfTop/gsbTop: logonun A3'teki üst değeri (antrenör formunda 36/41, katılım formunda 64/68)
function tyfLogos(page, f, tyfTop, gsbTop) {
  const k = W / 841.92;
  if (f.tyf) page.drawImage(f.tyf, { x: 60 * k, y: H - (tyfTop + 85) * k, width: 60 * k, height: 85 * k });
  if (f.gsb) page.drawImage(f.gsb, { x: 694 * k, y: H - (gsbTop + 86) * k, width: 86 * k, height: 86 * k });
}
const dotRange = (a, b) => [dmy(a, "."), dmy(b || a, ".")];

// Sporcuları tekne sınıfına göre ayırır (sınıf başına bir form). Yarışta sınıf yazıldıysa hepsi o sınıfta.
export function entryGroups(r, list) {
  const fixed = up(r.entryClass);
  if (fixed || !list.length) return [{ cls: fixed, list }];
  const map = new Map();
  for (const a of list) map.set(a.boat, [...(map.get(a.boat) || []), a]);
  return [...map].map(([cls, l]) => ({ cls, list: l }));
}

// 7) Antrenör kayıt formu (sınıf başına bir sayfa)
function coachForm(pdf, f, r, c, cls) {
  const page = pdf.addPage([W, H]);
  const p = painter(page);
  const L = 34;
  const R = W - 34;
  tyfLogos(page, f, 36, 41);
  let top = tyfHead(p, f, r, ["TÜRKİYE YELKEN FEDERASYONU", "ANTRENÖR KAYIT FORMU"], 52) + 20;
  const [a, b] = dotRange(r.startDate, r.endDate);
  const rows = [
    ["Faaliyet Adı", up(r.name)],
    ["Faaliyet Bölgesi", up(r.district || r.city)],
    ["Faaliyet Tarihi", a ? `${a} / ${b}` : ""],
    ["TC Kimlik No", c.tc],
    ["Adı Soyadı", up(c.name)],
    ["Kulübü / İli", [up(c.club), up(c.city)].filter(Boolean).join(" / ")],
    ["Kademesi (Yılı)", up(c.level)],
    ["Cep Telefonu", c.phone],
    ["EPosta Adresi", c.email],
    ["ADB Numarası", c.adb],
    ["Destek Botu Boyu", c.boatLength],
    ["Destek Botu Rengi", c.boatColor],
    ["Destek Botu Gücü", c.boatPower],
    ["Destek Tekne Adeti", c.boatCount],
    ["Sınıf", cls],
  ];
  const rh = 15.5;
  const cols = [L, L + 108, R];
  const lines = rows.map((_, i) => top + i * rh);
  lines.push(top + rows.length * rh);
  softGrid(page, cols, lines);
  rows.forEach(([k, v], i) => {
    p.cell(k, cols[0], lines[i], cols[1] - cols[0], rh, f.sans, 8);
    fitCell(p, v, cols[1], lines[i], cols[2] - cols[1], rh, f.sans, 8);
  });
  top = lines.at(-1) + 36;
  p.text("BEYAN VE TAAHHÜT", W / 2, top, f.sans, 11.5, "center");
  top += 34;
  [
    "1) Yarışla ilgili Yarış ilanı ve Yarış Talimatlarında, destek personeli ile ilgili hükümlere uyacağımı,",
    "2) Yarışın başhakemi tarafından davet edilmedikçe (can kurtarma hali hariç) yarış parkuruna girmeyeceğimi,",
    "3) Destek verdiğim sporculardan her konuda sorumlu olacağımı,",
    "4) TYF Destek Botu Kullanma Talimatına harfiyen uyacağımı,",
    "Beyan ve taahhüt ederim.",
  ].forEach((s, i) => p.text(s, L + 32, top + i * 21, f.sans, 8.5));
  signBox(page, p, f, L, top + 5 * 21 + 30, up(c.name));
}

// 8) Katılım bildirim formu: kulüp, destek botu, antrenör, sporcular (çok sporcuda sonraki sayfaya geçer)
function entryForm(pdf, f, r, c, cls, list) {
  let page = pdf.addPage([W, H]);
  let p = painter(page);
  const L = 34;
  const R = W - 34;
  const name = up(r.name);
  tyfLogos(page, f, 64, 68);
  const titleLines = p.wrap(name, f.sans, 11.5, 400).map((ws) => ws.join(" "));
  const [a, b] = dotRange(r.startDate, r.endDate);
  let top = tyfHead(p, f, r, [...titleLines, `/ ${up(r.district || r.city)}`, a ? `${a} - ${b}` : "", "KATILIM BİLDİRİM FORMU"].filter(Boolean), 48, 11.5);
  p.text("Yarış Sekreterliğine,", L + 32, top, f.sans, 8.5);
  top = p.para(
    `Aşağıda isimleri bulunan; Kulüp idarecisi, antrenör ve sporcuların '${name}' faaliyetine katılmak üzere, faaliyet alanına geldiğini, faaliyet ilanında belirtilen tüm kural ve prosedürlere uyacaklarını kabul ve taahhüt ederim.`,
    L, top + 22, R - L, f.sans, 8.5, 14, { indent: 32 },
  );
  // Kulüp / yarış (solda), destek botu (sağda)
  top += 22;
  p.text("Kulüp", L + 52, top + 10, f.sansB, 8.5, "right");
  fitCell(p, up(c.team) || CLUB.tyfName, L + 58, top, 250, 14, f.sans, 8.5);
  p.text("Yarış", L + 52, top + 28, f.sansB, 8.5, "right");
  p.text(cls, L + 62, top + 28, f.sans, 8.5);
  const bx = [R - 260, R - 150, R];
  const brows = [0, 1, 2, 3, 4].map((i) => top + i * 15.5);
  softGrid(page, bx, brows);
  [["Destek Botu No#", c.boatNo], ["Destek Botu Boyu", c.boatLength], ["Destek Botu Rengi", c.boatColor], ["Destek Botu Gücü", c.boatPower]].forEach(([k, v], i) => {
    p.cell(k, bx[0], brows[i], bx[1] - bx[0], 15.5, f.sans, 8);
    fitCell(p, v, bx[1], brows[i], bx[2] - bx[1], 15.5, f.sans, 8);
  });
  top = brows.at(-1) + 26;

  // Başlık + tablo; sayfa dolarsa yeni sayfada başlık satırı tekrarlanır
  const table = (title, heads, cols, aligns, data) => {
    const hh = 22;
    const rh = 22;
    const header = () => {
      p.text(title, L + 6, top, f.sans, 12);
      top += 10;
      const lines = [top, top + hh];
      softGrid(page, cols, [top, top + hh]);
      heads.forEach((s, i) => p.cell(s, cols[i], top, cols[i + 1] - cols[i], hh, f.sansB, 6.5, { align: aligns[i] === "center" ? "center" : "left", padX: 10 }));
      top = lines[1];
    };
    header();
    const rows = data.length ? data : [heads.map(() => "")];
    for (const row of rows) {
      if (top + rh > 770) {
        page = pdf.addPage([W, H]);
        p = painter(page);
        top = 60;
        header();
      }
      softGrid(page, cols, [top, top + rh]);
      row.forEach((v, i) => fitCell(p, v, cols[i], top, cols[i + 1] - cols[i], rh, f.sans, 7.5, { align: aligns[i] === "center" ? "center" : "left", padX: 10 }));
      top += rh;
    }
    top += 28;
  };
  table("Antrenörler", ["Sicil No", "Ad Soyad", "GSM Numarası", "EPosta Adresi", "İmza"], [L + 6, L + 62, L + 270, L + 350, L + 452, R], ["", "", "center", "center", "center"], c.name || c.sicil ? [[c.sicil, up(c.name), c.phone, c.email, ""]] : []);
  table(
    "Sporcular / Ekip",
    ["Sicil No", "Ad Soyad", "Yelken No", "Cinsiyet", "Doğum T.", "İmza"],
    [L + 6, L + 62, L + 264, L + 330, L + 400, L + 452, R],
    ["", "", "", "center", "center", "center"],
    list.map((x) => [x.tyfNo, x.name, x.sailNo, x.gender, x.birthDot, ""]),
  );
  if (top + 90 > 800) {
    page = pdf.addPage([W, H]);
    p = painter(page);
    top = 70;
  }
  top = p.para(
    "\u201CBu formdaki tüm bilgilerin doğru olduğunu, yarış süresince tekne ve ekiple ilgili tüm sorumluluğun tarafımıza ait olduğunu kabul, beyan ve taahhüt ederim.\u201D",
    L + 6, top, R - L - 12, f.sansB, 8.5, 14, { indent: 32 },
  );
  signBox(page, p, f, L + 6, top + 6, up(c.name));
}

// Otel konaklama izninin bilgileri: otel adı yalnız yazıldıysa (talimattaki oteller öneri olarak seçilir);
// tarih, ad, yer ve imzalayan kulüp izin yazısıyla aynı yerden gelir
export function hotelInfo(r) {
  const c = clubInfo(r);
  return {
    hotel: String(r.hotelName || "").trim(),
    from: r.hotelFrom || r.startDate,
    to: r.hotelTo || r.hotelFrom || r.endDate || r.startDate,
    event: c.event,
    place: c.place,
    date: c.date,
    signer: c.signer || String(r.signer || "").trim(),
    title: c.signer ? c.title : up(r.signerTitle),
  };
}
// "Çeşme-İzmir" → "’de" (son kelimeye göre)
const placeSuffix = (s) => {
  const last = String(s || "").trim().split(/[\s-]+/).pop();
  return last ? locative(last).slice(up(last).length) : "";
};

// r: yarış bilgisi, athletes: sporcu kartları (sırasıyla), fonts: { ad: Uint8Array, logo?: PNG baytları (kulüp logosu) }
// only: üretilecek belgeler (DOCS anahtarları)
// coach: antrenör bilgileri (users/{uid}.coach); sporcuda boatClass tekne sınıfı adı (ILCA 4) olabilir
export async function buildRaceDocs(r, athletes, fonts, only = DOCS.map(([k]) => k), coach = {}) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  INK = rgb(0, 0, 0);
  NAVY = rgb(0.06, 0.2, 0.38);
  GRAY = rgb(0.32, 0.36, 0.42);
  LIGHT = rgb(0.6, 0.63, 0.68);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${r.name} evrakı`);
  pdf.setCreator("Sesli Asistan");
  const f = {};
  for (const [k, bytes] of Object.entries(fonts)) {
    if (k === "logo") {
      if (only.includes("club") || only.includes("hotel")) f.logo = await pdf.embedPng(bytes);
    } else if (k === "tyf" || k === "gsb") {
      if (only.includes("coach") || only.includes("entry")) f[k] = await pdf.embedPng(bytes);
    } else f[k] = await pdf.embedFont(bytes, { subset: true });
  }
  const year = (toDate(r.startDate) || new Date()).getFullYear();
  const race = { ...r, year, place: `${up(r.district)}-${up(r.city)}` };
  const list = athletes.map(athleteInfo);
  if (only.includes("school")) schoolLetter(pdf, f, race, list);
  if (only.includes("kafile")) kafile(pdf, f, race, list, cleanCoach(coach));
  if (only.includes("travel")) travel(pdf, f, race, list);
  if (only.includes("parent")) list.forEach((a) => parentForm(pdf, f, race, a));
  if (only.includes("adult")) adultForm(pdf, f, race, cleanCoach(coach));
  if (only.includes("club")) {
    const c = clubInfo(r);
    list.forEach((a, i) => clubLetter(pdf, f, c, a, c.no ? nextNo(c.no, i) : ""));
  }
  if (only.includes("hotel")) hotelForm(pdf, f, hotelInfo(r), list);
  if (only.includes("coach") || only.includes("entry")) {
    const c = cleanCoach(coach);
    const groups = entryGroups(r, list);
    if (only.includes("coach")) groups.forEach((g) => coachForm(pdf, f, r, c, g.cls));
    if (only.includes("entry")) groups.forEach((g) => entryForm(pdf, f, r, c, g.cls, g.list));
  }
  return pdf.save();
}

// Kulüp izin yazısının bilgileri: boş bırakılanlar yarıştan gelir
export function clubInfo(r) {
  const place = [r.district, r.city].map((x) => String(x || "").trim()).filter(Boolean).join("-");
  return {
    no: String(r.clubNo || "").trim(),
    date: r.letterDate, // tüm belgelerde tek evrak tarihi
    from: r.clubFrom || r.startDate,
    to: r.clubTo || r.clubFrom || r.endDate || r.startDate,
    event: String(r.clubEvent || "").trim() || String(r.name || "").trim(),
    place: String(r.clubPlace || "").trim() || place,
    signer: String(r.clubSigner || "").trim(),
    title: String(r.clubTitle || "").trim(),
  };
}

// Tarayıcıda yazı tiplerini ve kulüp logosunu getirir (bir kez)
export const LOGO = "/club-logo.png";
// TYF formlarındaki federasyon ve bakanlık logoları (örnek formlardan, saydam PNG)
export const FORM_LOGOS = { tyf: "/forms/tyf-logo.png", gsb: "/forms/gsb-logo.png" };
let fontCache = null;
export function loadFonts() {
  fontCache ||= Promise.all(
    [...Object.entries(FONT_FILES).map(([k, file]) => [k, `/fonts/${file}`]), ["logo", LOGO], ...Object.entries(FORM_LOGOS)].map(async ([k, url]) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Belge dosyaları alınamadı.");
      return [k, new Uint8Array(await res.arrayBuffer())];
    }),
  ).then(Object.fromEntries, (e) => {
    fontCache = null;
    throw e;
  });
  return fontCache;
}
