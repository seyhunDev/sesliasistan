// Gün kaydı PDF'i (A4 dik; örnek project-files/bilgi-ekrani/gun-kaydi/ornek.html): antet (kulüp, gün, saat, antrenör),
// özet kutuları, sporcu özeti tablosu, saatli olaylar tablosu (sayfa taşarsa yeni sayfa, başlık tekrar), altta sayfa numarası.
// pdf-lib yalnız çıktı alınırken yüklenir; yazı tipleri ve logo raceDocs.loadFonts'tan. Veri lib/gunKaydi.js gunRows.
import { CLUB } from "@/features/athletes/raceDocs";

const W = 595.28;
const H = 841.89;
const L = 36;
const R = W - 36;
const BOTTOM = H - 48;

export async function buildGunKaydiPdf(g, fonts) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const INK = rgb(0.07, 0.07, 0.08);
  const MUT = rgb(0.38, 0.38, 0.4);
  const LINE = rgb(0.86, 0.86, 0.88);
  const SOFT = rgb(0.93, 0.93, 0.94);
  const PEN = rgb(1, 0.35, 0.24);
  const FD = rgb(1, 0.84, 0.04);
  const WHITE = rgb(1, 1, 1);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Gün kaydı · ${g.title}`);
  pdf.setCreator("Velora");
  const f = { r: await pdf.embedFont(fonts.sans, { subset: true }), b: await pdf.embedFont(fonts.sansB, { subset: true }) };
  const logo = fonts.logo ? await pdf.embedPng(fonts.logo).catch(() => null) : null;

  let page;
  let y = 0;
  const w = (s, font, size) => font.widthOfTextAtSize(String(s), size);
  const fit = (s, font, size, max) => {
    s = String(s ?? "");
    while (max && w(s, font, size) > max && s.length > 3) s = `${s.slice(0, -2).trimEnd()}…`;
    return s;
  };
  const text = (s, x, top, font, size, { align = "left", color = INK, max } = {}) => {
    s = fit(s, font, size, max);
    if (!s) return;
    const tw = w(s, font, size);
    page.drawText(s, { x: align === "right" ? x - tw : align === "center" ? x - tw / 2 : x, y: H - top, font, size, color });
  };
  // Uzun yazı satırlara bölünür (en çok n satır)
  const wrap = (s, font, size, max, n = 3) => {
    const out = [];
    let cur = "";
    for (const word of String(s ?? "").split(/\s+/)) {
      const t = cur ? `${cur} ${word}` : word;
      if (w(t, font, size) <= max || !cur) cur = t;
      else {
        out.push(cur);
        cur = word;
      }
    }
    if (cur) out.push(cur);
    if (out.length > n) out.splice(n - 1, out.length, fit(out.slice(n - 1).join(" "), font, size, max));
    return out.length ? out : [""];
  };
  const box = (x, top, bw, bh, o) => page.drawRectangle({ x, y: H - top - bh, width: bw, height: bh, ...o });
  const hr = (top, t = 0.6, color = LINE) => page.drawLine({ start: { x: L, y: H - top }, end: { x: R, y: H - top }, thickness: t, color });
  const tag = (k, t, x, top) => {
    const s = 7.5;
    const tw = w(t, f.b, s) + 8;
    const o = k === "fd" || k === "sb" ? { color: FD } : k === "off" ? { color: WHITE, borderColor: rgb(0.7, 0.7, 0.72), borderWidth: 0.6 } : { color: PEN };
    box(x, top - 8.5, tw, 11, o);
    text(t, x + 4, top, f.b, s, { color: k === "fd" || k === "sb" ? INK : k === "off" ? MUT : WHITE });
    return tw + 3;
  };

  const newPage = (first) => {
    page = pdf.addPage([W, H]);
    if (!first) {
      text(fit(g.title, f.b, 9, 300), L, 36, f.b, 9, { color: MUT });
      text("Gün kaydı (devam)", R, 36, f.r, 8, { align: "right", color: MUT });
      hr(44, 0.6);
      y = 60;
      return;
    }
    if (logo) page.drawImage(logo, { x: L, y: H - 80, width: 44, height: 44 });
    const hx = logo ? L + 54 : L;
    text(CLUB.upper, hx, 48, f.b, 9, { color: MUT });
    text(g.title, hx, 70, f.b, 18, { max: R - hx - 150 });
    text(g.sub, hx, 86, f.r, 9.5, { color: MUT, max: R - hx - 150 });
    if (g.coach) text(`Antrenör: ${g.coach}`, R, 70, f.r, 9, { align: "right", color: MUT, max: 150 });
    text("Gün kaydı", R, 48, f.b, 9, { align: "right", color: MUT });
    hr(96, 1.6, INK);
    y = 110;
  };
  const need = (h, head) => {
    if (y + h <= BOTTOM) return;
    newPage(false);
    head?.();
  };

  newPage(true);
  // Özet kutuları
  const n = g.sum.length;
  const gap = 6;
  const bw = (R - L - gap * (n - 1)) / n;
  g.sum.forEach((s, i) => {
    const x = L + i * (bw + gap);
    box(x, y, bw, 40, { borderColor: LINE, borderWidth: 0.8 });
    text(String(s.n), x + 8, y + 21, f.b, 17);
    text(s.t.toLocaleUpperCase("tr-TR"), x + 8, y + 33, f.b, 6.5, { color: MUT, max: bw - 12 });
  });
  y += 58;

  // Tablo: cols [{ t, w }], satır yazıcı
  const table = (title, cols, rows, cell) => {
    const xs = [];
    let x = L;
    for (const c of cols) {
      xs.push(x);
      x += c.w * (R - L);
    }
    const head = () => {
      cols.forEach((c, i) => text(c.t.toLocaleUpperCase("tr-TR"), xs[i] + 4, y + 9, f.b, 6.5, { color: MUT }));
      y += 13;
      hr(y, 1.1, INK);
      y += 2;
    };
    need(50);
    text(title.toLocaleUpperCase("tr-TR"), L, y + 10, f.b, 11);
    y += 18;
    head();
    if (!rows.length) {
      text("Kayıt yok", L + 4, y + 12, f.r, 8.5, { color: MUT });
      y += 20;
    }
    rows.forEach((r, ri) => {
      const parts = cols.map((c, i) => cell(r, i, c.w * (R - L) - 8));
      const lines = Math.max(...parts.map((p) => (Array.isArray(p) ? p.length : 1)));
      const rh = 7 + lines * 11;
      need(rh, head);
      if (ri % 2) box(L, y, R - L, rh, { color: SOFT });
      parts.forEach((p, i) => {
        if (typeof p === "function") p(xs[i] + 4, y + 12);
        else (Array.isArray(p) ? p : [p]).forEach((s, k) => text(s, xs[i] + 4, y + 12 + k * 11, i === 0 ? f.b : f.r, 8.5, { max: cols[i].w * (R - L) - 8 }));
      });
      y += rh;
      hr(y, 0.4);
    });
    y += 18;
  };

  table(
    "Sporcu özeti",
    [
      { t: "Sporcu", w: 0.3 },
      { t: "Ceza", w: 0.22 },
      { t: "Sana özel", w: 0.12 },
      { t: "Not", w: 0.08 },
      { t: "Video", w: 0.28 },
    ],
    g.athletes,
    (a, i) => {
      if (i === 0) return a.label;
      if (i === 1)
        return a.pen.length
          ? (x, top) => {
              let dx = 0;
              for (const p of a.pen) dx += tag(p.k, p.t, x + dx, top);
            }
          : "—";
      if (i === 2) return a.sana ? String(a.sana) : "—";
      if (i === 3) return a.not ? String(a.not) : "—";
      return a.vid || "—";
    },
  );

  table(
    "Olaylar",
    [
      { t: "Saat", w: 0.09 },
      { t: "Sporcu", w: 0.22 },
      { t: "Olay", w: 0.18 },
      { t: "Ayrıntı", w: 0.37 },
      { t: "Yapan", w: 0.14 },
    ],
    g.events,
    (e, i, max) => {
      if (i === 0) return e.time;
      if (i === 1) return wrap(e.who, f.b, 8.5, max, 2);
      if (i === 2)
        return e.tag
          ? (x, top) => {
              const t = e.tag === "off" ? "Kalktı" : e.tag === "fd" ? "FD" : e.tag === "sb" ? "Sarı bayrak (720°)" : e.tag === "2" ? "2 ceza dönüşü (720°)" : "1 ceza dönüşü (360°)";
              const dx = tag(e.tag, t, x, top);
              text(e.tag === "off" ? "" : e.tag === "fd" ? "Fodepar" : "Ceza", x + dx, top, f.r, 8.5);
            }
          : e.what;
      if (i === 3) return wrap(e.det, f.r, 8.5, max, 3);
      return e.by || "—";
    },
  );

  const all = pdf.getPages();
  all.forEach((p, i) => {
    page = p;
    hr(H - 30, 0.4);
    text("Velora · Yönet gün kaydı", L, H - 18, f.r, 7.5, { color: MUT });
    text(`Sayfa ${i + 1} / ${all.length}`, R, H - 18, f.r, 7.5, { align: "right", color: MUT });
  });
  const bytes = await pdf.save();
  return new File([bytes], g.file, { type: "application/pdf" });
}
