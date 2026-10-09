// Yarış bütçesi PDF'i: antetli başlık, kalem tablosu, özet ve sporcu başına ödeme listesi (A4).
// pdf-lib yalnızca çıktı alınırken yüklenir. Yazı tipleri ve logo raceDocs.loadFonts'tan.
import { CLUB, rangeText } from "./raceDocs.js";
import { UNITS, howText, tl, totals } from "./budget.js";
import { tripRows } from "./races.js";

const W = 595.28;
const H = 841.89;
const L = 50;
const R = W - 50;

// athletes: [{ id, studentName }] (yarışa seçilenler)
export async function buildBudgetPdf(r, athletes, fonts) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const INK = rgb(0.1, 0.12, 0.14);
  const MUT = rgb(0.4, 0.43, 0.47);
  const NAVY = rgb(0.06, 0.2, 0.38);
  const LINE = rgb(0.82, 0.84, 0.86);
  const SOFT = rgb(0.95, 0.96, 0.97);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${r.name} bütçe`);
  pdf.setCreator("Sesli Asistan");
  const f = { r: await pdf.embedFont(fonts.sans, { subset: true }), b: await pdf.embedFont(fonts.sansB, { subset: true }) };
  const logo = fonts.logo ? await pdf.embedPng(fonts.logo) : null;
  const b = r.budget;
  const t = totals(b, athletes.length);

  let page;
  let y;
  const w = (s, font, size) => font.widthOfTextAtSize(String(s), size);
  const text = (s, x, top, font, size, { align = "left", color = INK, max } = {}) => {
    s = String(s ?? "").replace(/₺/g, "TL"); // yazı tipinde ₺ yok
    if (!s) return;
    while (max && w(s, font, size) > max && s.length > 3) s = `${s.slice(0, -2).trimEnd()}…`;
    const tw = w(s, font, size);
    const left = align === "right" ? x - tw : align === "center" ? x - tw / 2 : x;
    page.drawText(s, { x: left, y: H - top, font, size, color });
  };
  const rule = (top, color = LINE, th = 0.6) => page.drawLine({ start: { x: L, y: H - top }, end: { x: R, y: H - top }, thickness: th, color });
  const band = (top, h, color = SOFT) => page.drawRectangle({ x: L, y: H - top - h, width: R - L, height: h, color });
  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = 60;
  };
  const need = (h) => y + h > H - 60 && (newPage(), true);

  // Başlık
  newPage();
  if (logo) page.drawImage(logo, { x: L, y: H - 92, width: 46, height: 46 });
  const hx = logo ? L + 58 : L;
  text(CLUB.name, hx, 62, f.b, 13, { color: NAVY });
  text("YARIŞ BÜTÇESİ", hx, 80, f.r, 9.5, { color: MUT });
  text(new Date().toLocaleDateString("tr-TR"), R, 62, f.r, 9.5, { align: "right", color: MUT });
  page.drawLine({ start: { x: L, y: H - 104 }, end: { x: R, y: H - 104 }, thickness: 1.4, color: NAVY });
  y = 130;
  text(r.name, L, y, f.b, 15, { max: R - L });
  y += 18;
  text([rangeText(r.startDate, r.endDate), [r.district, r.city].filter(Boolean).join(", ")].filter(Boolean).join(" · "), L, y, f.r, 10.5, { color: MUT });
  y += 16;
  text(`${t.athletes} sporcu · ${b.staff} antrenör/refakatçi`, L, y, f.r, 10.5, { color: MUT });
  y += 26;

  // Tahmini plan: yolculuk ayrı kutuda, etiket solda değer sağda
  const plan = tripRows(r);
  if (plan.length) {
    text("TAHMİNİ PLAN", L, y, f.b, 9, { color: NAVY });
    text("Gün ve saatler değişebilir", R, y, f.r, 8, { color: MUT, align: "right" });
    y += 10;
    const ph = plan.length * 20 + 12;
    page.drawRectangle({ x: L, y: H - y - ph, width: R - L, height: ph, color: SOFT, borderColor: LINE, borderWidth: 0.6 });
    page.drawRectangle({ x: L, y: H - y - ph, width: 3, height: ph, color: NAVY });
    y += 6;
    plan.forEach(([k, v], i) => {
      text(k, L + 14, y + 14, f.r, 9.5, { color: MUT });
      text(v, L + 120, y + 14, f.b, 10.5, { max: R - L - 134 });
      y += 20;
      if (i < plan.length - 1) page.drawLine({ start: { x: L + 14, y: H - y }, end: { x: R - 12, y: H - y }, thickness: 0.5, color: LINE });
    });
    y += 32;
  }

  // Özet kutuları (kulüp payı yoksa kulüp kutusu çıkmaz)
  const boxes = [
    ["Toplam bütçe", tl(t.total)],
    ["Sporcu başı ödeme", t.athletes ? tl(t.perAthlete) : "-"],
    t.club > 0 && ["Kulüp karşılar", tl(t.club)],
  ].filter(Boolean);
  const bw = (R - L - 8 * (boxes.length - 1)) / boxes.length;
  boxes.forEach(([k, v], i) => {
    const x = L + i * (bw + 8);
    page.drawRectangle({ x, y: H - y - 46, width: bw, height: 46, color: SOFT });
    text(k, x + 10, y + 16, f.r, 8.5, { color: MUT });
    text(v, x + 10, y + 36, f.b, 13);
  });
  y += 70;

  // Kalem tablosu
  const cols = [L + 6, L + 92, R - 190, R - 96, R - 6]; // kategori, kalem, hesap(sağa), toplam(sağa), pay(sağa)
  const head = () => {
    band(y - 12, 18);
    text("Kategori", cols[0], y, f.b, 8.5, { color: MUT });
    text("Kalem", cols[1], y, f.b, 8.5, { color: MUT });
    text("Toplam", cols[3], y, f.b, 8.5, { color: MUT, align: "right" });
    text("Sporcu payı", cols[4], y, f.b, 8.5, { color: MUT, align: "right" });
    y += 18;
  };
  text("KALEMLER", L, y, f.b, 9, { color: NAVY });
  y += 16;
  head();
  const unitName = Object.fromEntries(UNITS);
  t.lines.forEach((l) => {
    if (need(30)) head();
    text(l.cat, cols[0], y, f.r, 9.5, { max: cols[1] - cols[0] - 6 });
    text(l.title + (l.club ? " (kulüp)" : ""), cols[1], y, f.b, 9.5, { max: cols[3] - cols[1] - 70 });
    text(l.unit === "room" ? howText(l, t) : `${howText(l, t)} · ${unitName[l.unit]}`, cols[1], y + 12, f.r, 8, { color: MUT, max: cols[3] - cols[1] - 70 });
    text(tl(l.total), cols[3], y, f.b, 9.5, { align: "right" });
    text(l.club ? "-" : tl(l.share), cols[4], y, f.r, 9.5, { align: "right" });
    y += 28;
    rule(y - 11);
  });
  if (!t.lines.length) {
    text("Kalem yok.", cols[1], y, f.r, 9.5, { color: MUT });
    y += 22;
  }
  need(24);
  text("Toplam", cols[1], y + 2, f.b, 10);
  text(tl(t.total), cols[3], y + 2, f.b, 10, { align: "right" });
  text(t.athletes ? tl(t.perAthlete) : "-", cols[4], y + 2, f.b, 10, { align: "right" });
  y += 30;

  // Sporcu başına ödeme
  if (athletes.length) {
    need(60);
    text("SPORCU BAŞINA ÖDEME", L, y, f.b, 9, { color: NAVY });
    y += 16;
    band(y - 12, 18);
    text("Sporcu", cols[0], y, f.b, 8.5, { color: MUT });
    text("Tutar", cols[3], y, f.b, 8.5, { color: MUT, align: "right" });
    y += 18;
    athletes.forEach((a, i) => {
      need(20);
      text(`${i + 1}. ${a.studentName}`, cols[0], y, f.r, 9.5, { max: cols[3] - cols[0] - 80 });
      text(tl(t.perAthlete), cols[3], y, f.r, 9.5, { align: "right" });
      y += 18;
      rule(y - 13);
    });
    y += 18;
  }

  need(40);
  text("Kişi başı kalemlere antrenör/refakatçi payı da dahildir; bu pay ve ortak masraflar sporculara eşit bölünür.", L, y, f.r, 8, { color: MUT });
  if (t.club > 0) text("Kulübün karşıladığı kalemler sporcu payına girmez.", L, y + 11, f.r, 8, { color: MUT });
  return pdf.save();
}
