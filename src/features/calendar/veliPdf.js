// Veli takvimi PDF'i (A4 dik; örnek project-files/toplu-antrenman/ornek.html): antet, renk açıklaması, sayfa başına en çok 6 ay
// (3 sütun), her ay küçük takvim: mavi gün antrenman, kırmızı çerçeve bayram/resmi tatil, alt yarısı boyalı arife. Altta saatler ve not.
// pdf-lib yalnız çıktı alınırken yüklenir; yazı tipleri ve logo raceDocs.loadFonts'tan. Veri lib/veliTakvimi.js.
import { CLUB } from "@/features/athletes/raceDocs";
import { audGroups, audKey, fileName, hoursLines, monthOf, parentRaces, parentTrainings, periodTitle } from "@/lib/veliTakvimi";

const W = 595.28;
const H = 841.89;
const L = 36;
const R = W - 36;
const WK = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

// opts: { plans, months, title, note }. Tek program bütün takımlar için (Seyhun 2026-11-26): her "Kimler" ayrı renk,
// açıklamada adı ("Herkes", "A takım", "B takım · Optimist"); aynı günde iki kitle varsa hücre renklere bölünür.
export async function buildParentPdf({ plans, months, title = "", note = "" }, fonts) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const INK = rgb(0.09, 0.09, 0.11);
  const MUT = rgb(0.42, 0.42, 0.45);
  const SOFT = rgb(0.25, 0.25, 0.28);
  const TR = rgb(0.11, 0.37, 0.84);
  const RACE = rgb(0.96, 0.55, 0.07);
  const HOL = rgb(0.84, 0.2, 0.23);
  const HOLBG = rgb(0.99, 0.91, 0.91);
  const LINE = rgb(0.83, 0.83, 0.85);
  const WHITE = rgb(1, 1, 1);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const sorted = [...months].sort();
  const period = periodTitle(sorted);
  pdf.setTitle(`Antrenman takvimi ${period}`);
  pdf.setCreator("Velora");
  const f = { r: await pdf.embedFont(fonts.sans, { subset: true }), b: await pdf.embedFont(fonts.sansB, { subset: true }) };
  const logo = fonts.logo ? await pdf.embedPng(fonts.logo).catch(() => null) : null;
  const trainings = parentTrainings(plans, sorted);
  const races = parentRaces(plans, sorted);
  const sub = title;
  const PAL = [TR, rgb(0.06, 0.6, 0.38), rgb(0.52, 0.27, 0.82), rgb(0.05, 0.6, 0.66), rgb(0.86, 0.24, 0.55), rgb(0.45, 0.35, 0.22)];
  const groups = audGroups(trainings);
  const colorOf = (g) => PAL[Math.max(0, groups.indexOf(g)) % PAL.length];
  let gridTop = 132;
  const hours = hoursLines(trainings);

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

  const header = () => {
    page = pdf.addPage([W, H]);
    if (logo) page.drawImage(logo, { x: L, y: H - 78, width: 44, height: 44 });
    const hx = logo ? L + 54 : L;
    text(CLUB.name, hx, 50, f.b, 10, { color: MUT });
    text("Antrenman Takvimi", hx, 72, f.b, 20);
    text(period, R, 72, f.b, 13, { align: "right" });
    if (sub) text(sub, R, 52, f.r, 10, { align: "right", color: MUT, max: 220 });
    page.drawLine({ start: { x: L, y: H - 88 }, end: { x: R, y: H - 88 }, thickness: 1.4, color: INK });
    // Renk açıklaması
    let x = L;
    let ly = 100;
    const leg = (draw, label) => {
      const iw = 14 + w(label, f.r, 8) + 16;
      if (x + iw > R + 16) {
        x = L;
        ly += 15;
      }
      draw(x, ly);
      text(label, x + 14, ly + 8, f.r, 8, { color: SOFT });
      x += iw;
    };
    const gl = groups.length ? groups : ["Herkes"];
    gl.forEach((g) => leg((lx, t) => box(lx, t, 10, 10, { color: colorOf(g) }), gl.length > 1 ? `Antrenman · ${g}` : "Antrenman"));
    leg((lx, t) => box(lx, t, 10, 10, { color: RACE }), "Yarış");
    leg((lx, t) => box(lx, t, 10, 10, { color: HOLBG, borderColor: HOL, borderWidth: 0.8 }), "Bayram / resmi tatil");
    leg((lx, t) => box(lx, t, 10, 10, { color: TR, borderColor: HOL, borderWidth: 1.6 }), "Tatilde antrenman var");
    leg((lx, t) => {
      box(lx, t, 10, 10, { color: WHITE, borderColor: LINE, borderWidth: 0.6 });
      box(lx, t + 5, 10, 5, { color: HOLBG });
    }, "Arife (yarım gün)");
    gridTop = ly + 32;
  };

  // Ay kutusu: genişlik bw, hücre boyu c
  const drawMonth = (mo, x, top, bw) => {
    const c = (bw - 6 * 2) / 7;
    text(mo.title.toLocaleUpperCase("tr-TR"), x, top + 11, f.b, 11);
    text([`${mo.count} antrenman`, mo.races && `${mo.races} yarış`].filter(Boolean).join(" · "), x + bw, top + 11, f.r, 8, { align: "right", color: MUT });
    let y = top + 22;
    WK.forEach((d, i) => text(d, x + i * (c + 2) + c / 2, y + 7, f.b, 6.5, { align: "center", color: MUT }));
    y += 11;
    mo.cells.forEach((cell, k) => {
      const i = mo.lead + k;
      const cx = x + (i % 7) * (c + 2);
      const cy = y + Math.floor(i / 7) * (c + 2);
      const tr = cell.train.length > 0;
      const full = cell.hol && !cell.hol.half;
      const race = cell.race.length > 0;
      if (race) box(cx, cy, c, c, { color: RACE, ...(full ? { borderColor: HOL, borderWidth: 1.8 } : {}) });
      else if (tr) {
        // Günün kitleleri: tek renk ya da yan yana şeritler
        const gs = [...new Set(cell.train.map(audKey))];
        gs.forEach((g, k) => box(cx + (k * c) / gs.length, cy, c / gs.length, c, { color: colorOf(g) }));
        if (full) box(cx, cy, c, c, { borderColor: HOL, borderWidth: 1.8 });
      }
      else if (full) box(cx, cy, c, c, { color: HOLBG, borderColor: HOL, borderWidth: 0.8 });
      else if (cell.hol?.half) box(cx, cy + c / 2, c, c / 2, { color: HOLBG });
      text(cell.day, cx + c / 2, cy + c / 2 + 3, f.b, Math.min(9, c * 0.42), { align: "center", color: tr || race ? WHITE : full ? HOL : SOFT });
      if (cell.train.length > 1 && new Set(cell.train.map(audKey)).size === 1) text(`×${cell.train.length}`, cx + c - 1.5, cy + 6.5, f.b, 5, { align: "right", color: WHITE });
    });
    y += 6 * (c + 2) + 4;
    const lines = mo.notes.length ? mo.notes : [{ label: "Tatil yok", none: true }];
    lines.slice(0, 6).forEach((n) => {
      text(n.label, x, y + 8, n.none ? f.r : f.b, 7.5, { color: n.none ? MUT : n.race ? RACE : n.train ? TR : HOL, max: bw });
      y += 10;
    });
    return y - top;
  };

  const per = 6;
  for (let p = 0; p < sorted.length; p += per) {
    header();
    const chunk = sorted.slice(p, p + per);
    const cols = Math.min(3, chunk.length);
    const gap = 22;
    const bw = (R - L - gap * (cols - 1)) / cols;
    // tek ay: kutu çok büyümesin
    const bwUse = Math.min(bw, 260);
    let top = gridTop;
    for (let i = 0; i < chunk.length; i += cols) {
      let rowH = 0;
      chunk.slice(i, i + cols).forEach((ym, j) => {
        rowH = Math.max(rowH, drawMonth(monthOf(ym, trainings, races), L + j * (bwUse + gap), top, bwUse));
      });
      top += rowH + 22;
    }
    // Alt bilgi: saatler ve not (her sayfada)
    page.drawLine({ start: { x: L, y: H - (H - 112) }, end: { x: R, y: H - (H - 112) }, thickness: 0.6, color: LINE });
    let fy = H - 96;
    text("Saatler", L, fy, f.b, 9);
    (hours.length ? hours : ["Saatler uygulamada her antrenmanın üstünde yazar"]).forEach((h, k) => text(h, L, fy + 13 + k * 12, f.r, 8.5, { color: SOFT, max: (R - L) / 2 - 10 }));
    const nx = L + (R - L) / 2 + 10;
    if (note) {
      text("Not", nx, fy, f.b, 9);
      note
        .split("\n")
        .slice(0, 5)
        .forEach((l, k) => text(l, nx, fy + 13 + k * 12, f.r, 8.5, { color: SOFT, max: R - nx }));
    }
    text([CLUB.web, CLUB.phone].filter(Boolean).join(" · "), W / 2, H - 22, f.r, 7.5, { align: "center", color: MUT });
  }
  const bytes = await pdf.save();
  return new File([bytes], fileName(sorted), { type: "application/pdf" });
}
