// Veli takvimi PDF'i, telefon düzeni (Seyhun 2026-11-27: WhatsApp'tan telefonda açılıyor): her ay ayrı, uzun dik sayfa
// (telefon ekranı oranı), büyük takvim. Hücrede gün ve antrenman saati; yarış turuncu (antrenman da varsa üst yarı),
// tatil kırmızı çerçeve + kısa adı. Altta o ayın yarış/tatil satırları ve o ayın saatleri, en altta not.
import { CLUB } from "@/features/athletes/raceDocs";
import { audGroups, audKey, fileName, hoursLines, monthOf, parentRaces, parentTrainings, periodTitle } from "@/lib/veliTakvimi";

const W = 420;
const H = 800;
const L = 22;
const R = W - 22;
const WK = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const hm = (t) => (/^\d{1,2}:\d{2}/.test(t || "") ? t.slice(0, 5).padStart(5, "0") : "");

export async function buildPhonePdf({ plans, months, title = "", note = "", real = {} }, fonts) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const INK = rgb(0.09, 0.09, 0.11);
  const MUT = rgb(0.45, 0.45, 0.48);
  const SOFT = rgb(0.22, 0.22, 0.25);
  const TR = rgb(0.11, 0.37, 0.84);
  const RACE = rgb(0.96, 0.55, 0.07);
  const HOL = rgb(0.84, 0.2, 0.23);
  const HOLBG = rgb(0.99, 0.91, 0.91);
  const EMPTY = rgb(0.955, 0.955, 0.96);
  const LINE = rgb(0.86, 0.86, 0.88);
  const WHITE = rgb(1, 1, 1);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const sorted = [...months].sort();
  pdf.setTitle(`Antrenman takvimi ${periodTitle(sorted)}`);
  pdf.setCreator("Velora");
  const f = { r: await pdf.embedFont(fonts.sans, { subset: true }), b: await pdf.embedFont(fonts.sansB, { subset: true }) };
  const logo = fonts.logo ? await pdf.embedPng(fonts.logo).catch(() => null) : null;
  const trainings = parentTrainings(plans, sorted);
  const races = parentRaces(plans, sorted, null, real);
  const PAL = [TR, rgb(0.06, 0.6, 0.38), rgb(0.52, 0.27, 0.82), rgb(0.05, 0.6, 0.66), rgb(0.86, 0.24, 0.55), rgb(0.45, 0.35, 0.22)];
  const groups = audGroups(trainings);
  const colorOf = (g) => PAL[Math.max(0, groups.indexOf(g)) % PAL.length];

  let page;
  const w = (s, font, size) => font.widthOfTextAtSize(String(s), size);
  const text = (s, x, top, font, size, { align = "left", color = INK, max } = {}) => {
    s = String(s ?? "");
    if (!s) return;
    while (max && w(s, font, size) > max && s.length > 3) s = `${s.slice(0, -2).trimEnd()}…`;
    const tw = w(s, font, size);
    page.drawText(s, { x: align === "right" ? x - tw : align === "center" ? x - tw / 2 : x, y: H - top, font, size, color });
  };
  const box = (x, top, bw, bh, o) => page.drawRectangle({ x, y: H - top - bh, width: bw, height: bh, ...o });

  sorted.forEach((ym, pi) => {
    page = pdf.addPage([W, H]);
    const mo = monthOf(ym, trainings, races);
    // Antet
    if (logo) page.drawImage(logo, { x: L, y: H - 52, width: 30, height: 30 });
    const hx = logo ? L + 38 : L;
    text(CLUB.upper, hx, 35, f.b, 9, { color: MUT, max: R - hx });
    if (title) text(title, hx, 47, f.r, 9, { color: MUT, max: R - hx });
    text(mo.title, L, 92, f.b, 28);
    text([`${mo.count} antrenman`, mo.races && `${mo.races} yarış`].filter(Boolean).join(" · "), R, 90, f.r, 11, { align: "right", color: MUT });
    // Renk açıklaması
    let lx = L;
    let ly = 112;
    const legend = [...groups.map((g) => [g, colorOf(g), "fill"]), ...(races.length ? [["Yarış", RACE, "fill"]] : []), ["Tatil", HOL, "line"]];
    legend.forEach(([label, c, kind]) => {
      const lw = 16 + w(label, f.r, 10) + 14;
      if (lx + lw > R) {
        lx = L;
        ly += 16;
      }
      box(lx, ly - 9, 10, 10, kind === "fill" ? { color: c } : { borderColor: c, borderWidth: 1.6, color: WHITE });
      text(label, lx + 15, ly, f.r, 10, { color: SOFT });
      lx += lw;
    });
    // Takvim
    const gap = 3;
    const cw = (R - L - gap * 6) / 7;
    const ch = 62;
    let y = ly + 14;
    WK.forEach((d, i) => text(d, L + i * (cw + gap) + cw / 2, y + 9, f.b, 9, { align: "center", color: i > 4 ? INK : MUT }));
    y += 16;
    mo.cells.forEach((cell, k) => {
      const i = mo.lead + k;
      const cx = L + (i % 7) * (cw + gap);
      const cy = y + Math.floor(i / 7) * (ch + gap);
      const tr = cell.train.length > 0;
      const race = cell.race.length > 0;
      const full = cell.hol && !cell.hol.half;
      box(cx, cy, cw, ch, { color: full && !tr && !race ? HOLBG : EMPTY });
      if (cell.hol?.half && !tr && !race) box(cx, cy + ch / 2, cw, ch / 2, { color: HOLBG });
      const ty = race ? cy + ch / 2 : cy;
      const th = race ? ch / 2 : ch;
      if (race) box(cx, cy, cw, tr ? ch / 2 : ch, { color: RACE });
      if (tr) {
        const gs = [...new Set(cell.train.map(audKey))];
        gs.forEach((g, j) => box(cx + (j * cw) / gs.length, ty, cw / gs.length, th, { color: colorOf(g) }));
      }
      if (full) box(cx + 0.9, cy + 0.9, cw - 1.8, ch - 1.8, { borderColor: HOL, borderWidth: 1.8 });
      const on = tr || race;
      text(cell.day, cx + 5, cy + 15, f.b, 13, { color: on ? WHITE : full ? HOL : INK });
      if (race) text("Yarış", cx + cw - 4, cy + 13, f.b, 7.5, { align: "right", color: WHITE });
      if (tr) {
        const times = [...new Set(cell.train.map((p) => hm(p.time)).filter(Boolean))];
        if (times.length) text(times.length > 1 ? `${times[0]} +${times.length - 1}` : times[0], cx + cw / 2, cy + ch - 7, f.b, 10.5, { align: "center", color: WHITE, max: cw - 4 });
      } else if (cell.hol && !race) text(cell.hol.name.replace(/ (Bayramı|Günü)$/u, "").replace(/ arifesi$/u, " arife"), cx + cw / 2, cy + ch - 8, f.r, 7, { align: "center", color: HOL, max: cw - 4 });
    });
    y += Math.ceil((mo.lead + mo.cells.length) / 7) * (ch + gap) + 14;
    // Bu ayın yarışları ve tatilleri
    page.drawLine({ start: { x: L, y: H - y }, end: { x: R, y: H - y }, thickness: 0.6, color: LINE });
    y += 20;
    (mo.notes.length ? mo.notes : [{ label: "Bu ay tatil yok", none: true }]).slice(0, 7).forEach((n) => {
      if (!n.none) box(L, y - 8, 8, 8, n.race ? { color: RACE } : { borderColor: HOL, borderWidth: 1.4, color: WHITE });
      text(n.label, L + (n.none ? 0 : 14), y, n.none ? f.r : f.b, 11, { color: n.none ? MUT : n.race ? INK : SOFT, max: R - L - 14 });
      y += 17;
    });
    // Bu ayın saatleri
    const hours = hoursLines(mo.cells.flatMap((c) => c.train));
    if (hours.length) {
      y += 8;
      text("Saatler", L, y, f.b, 11);
      y += 17;
      hours.forEach((h) => {
        text(h, L, y, f.r, 11, { color: SOFT, max: R - L });
        y += 16;
      });
    }
    // Not: her sayfanın altında
    if (note) {
      const lines = note.split("\n").filter(Boolean).slice(0, 3);
      let ny = H - 40 - lines.length * 13;
      if (ny > y + 6) {
        text("Not", L, ny, f.b, 10);
        lines.forEach((l) => text(l, L, (ny += 13), f.r, 10, { color: SOFT, max: R - L }));
      }
    }
    text([CLUB.web, CLUB.phone, sorted.length > 1 && `${pi + 1}/${sorted.length}`].filter(Boolean).join(" · "), W / 2, H - 16, f.r, 8, { align: "center", color: MUT });
  });
  const bytes = await pdf.save();
  return new File([bytes], fileName(sorted), { type: "application/pdf" });
}
