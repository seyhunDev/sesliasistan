// Sporcu bilgi notu: her sporcuya tek sayfa PDF (veliye gönderilir).
// İçinde: yolculuk (tahmini plan), talimattaki program, konaklama, yalnız o sporcunun bütçe payı kalem kalem.
// sheetData saf (testlenir); buildAthleteSheet pdf-lib'i yalnız çıktı alınırken yükler.
import { CLUB, hotelInfo, rangeText } from "./raceDocs.js";
import { tl, totals } from "./budget.js";
import { raceHotels, tripRows } from "./races.js";

const dayName = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
const nightsBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5)) : 0);
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

// Talimattaki program günlere göre: [{ date, items: [{ time, title }] }]
export function programDays(r) {
  const days = [];
  for (const s of r?.notice?.schedule || []) {
    if (!s?.title) continue;
    const last = days.at(-1);
    if (last && last.date === (s.date || "")) last.items.push({ time: s.time || "", title: s.title });
    else days.push({ date: s.date || "", items: [{ time: s.time || "", title: s.title }] });
  }
  return days;
}

// Konaklama: evrakta yazılan otel varsa yalnız o, yoksa yarışın otelleri (en çok 3); giriş-çıkış ve gece
export function stayOf(r) {
  const h = hotelInfo(r);
  const all = raceHotels(r);
  const pick = h.hotel ? [all.find((x) => low(x.name) === low(h.hotel)) || { name: h.hotel }] : all.slice(0, 3);
  return { hotels: pick.map((x) => ({ name: x.name, phone: x.phone || "", note: x.note || "" })), from: h.from || "", to: h.to || "", nights: nightsBetween(h.from, h.to) };
}

// Bir sporcunun notu. count: yarıştaki sporcu sayısı (bütçe payı buna göre bölünür)
export function sheetData(r, athlete, count) {
  const t = totals(r?.budget, count);
  const mine = t.lines.filter((l) => l.share > 0).map((l) => ({ cat: l.cat, title: l.title, amount: l.share, est: !!l.est }));
  const club = t.lines.filter((l) => l.club).map((l) => l.title);
  return {
    name: athlete?.studentName || "",
    race: r?.name || "",
    place: [r?.district, r?.city].filter(Boolean).join(", "),
    dates: rangeText(r?.startDate, r?.endDate || r?.startDate),
    trip: tripRows(r),
    days: programDays(r),
    stay: stayOf(r),
    money: { lines: mine, club, total: mine.reduce((n, l) => n + l.amount, 0) },
  };
}

// Notta neler var (sayfadaki özet için): [ad, durum, var mı]
export function sheetParts(r, count) {
  const d = sheetData(r, null, count);
  const items = d.days.reduce((n, x) => n + x.items.length, 0);
  return [
    ["Yolculuk", d.trip.length ? d.trip[0][1] : "Çıkış girilmedi", d.trip.length > 0, "trip"],
    ["Program", d.days.length ? `Talimattan ${d.days.length} gün, ${items} madde` : "Talimatta program yok", d.days.length > 0, "notice"],
    ["Konaklama", d.stay.hotels.length ? [d.stay.hotels.map((h) => h.name).join(", "), d.stay.nights && `${d.stay.nights} gece`].filter(Boolean).join(" · ") : "Otel girilmedi", d.stay.hotels.length > 0, "trip"],
    ["Bütçe", d.money.lines.length ? `Sporcu payı ${tl(d.money.total)} · ${d.money.lines.length} kalem` : "Sporcu payı olan kalem yok", d.money.lines.length > 0, "budget"],
  ];
}

const W = 595.28;
const H = 841.89;
const L = 48;
const R = W - 48;

// list: seçili sporcular [{ id, studentName }]; count: yarıştaki sporcu sayısı
export async function buildAthleteSheet(r, list, fonts, count = list.length) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const INK = rgb(0.1, 0.12, 0.14);
  const MUT = rgb(0.4, 0.43, 0.47);
  const NAVY = rgb(0.06, 0.2, 0.38);
  const LINE = rgb(0.82, 0.84, 0.86);
  const SOFT = rgb(0.95, 0.96, 0.97);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${r.name} bilgi notu`);
  pdf.setCreator("Sesli Asistan");
  const f = { r: await pdf.embedFont(fonts.sans, { subset: true }), b: await pdf.embedFont(fonts.sansB, { subset: true }) };
  const logo = fonts.logo ? await pdf.embedPng(fonts.logo) : null;

  for (const a of list) {
    const d = sheetData(r, a, count);
    const page = pdf.addPage([W, H]);
    const w = (s, font, size) => font.widthOfTextAtSize(String(s), size);
    const text = (s, x, top, font, size, { align = "left", color = INK, max } = {}) => {
      s = String(s ?? "").replace(/₺/g, "TL").replace(/[’]/g, "'");
      if (!s) return;
      while (max && w(s, font, size) > max && s.length > 3) s = `${s.slice(0, -2).trimEnd()}…`;
      const tw = w(s, font, size);
      page.drawText(s, { x: align === "right" ? x - tw : x, y: H - top, font, size, color });
    };
    const rule = (top, x1 = L, x2 = R) => page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, thickness: 0.5, color: LINE });
    const head = (s, top) => {
      text(s, L, top, f.b, 9, { color: NAVY });
      page.drawLine({ start: { x: L, y: H - top - 5 }, end: { x: R, y: H - top - 5 }, thickness: 0.8, color: NAVY });
    };

    // Başlık
    if (logo) page.drawImage(logo, { x: L, y: H - 86, width: 42, height: 42 });
    const hx = logo ? L + 54 : L;
    text(CLUB.name, hx, 60, f.b, 12.5, { color: NAVY });
    text("SPORCU BİLGİ NOTU", hx, 77, f.r, 9, { color: MUT });
    text(new Date().toLocaleDateString("tr-TR"), R, 60, f.r, 9, { align: "right", color: MUT });
    page.drawLine({ start: { x: L, y: H - 98 }, end: { x: R, y: H - 98 }, thickness: 1.4, color: NAVY });
    let y = 128;
    text(d.name, L, y, f.b, 18, { max: R - L });
    y += 20;
    text(d.race, L, y, f.b, 11.5, { max: R - L, color: NAVY });
    y += 15;
    text([d.place, d.dates].filter(Boolean).join(" · "), L, y, f.r, 10, { color: MUT, max: R - L });
    y += 24;

    // Bütçe ve konaklama sabit yer kaplar; program kalan yere sığdırılır
    const moneyH = d.money.lines.length ? 40 + d.money.lines.length * 16 + 26 + (d.money.club.length ? 14 : 0) : 0;
    const stayH = d.stay.hotels.length ? 36 + d.stay.hotels.length * 28 : 0;

    // Yolculuk
    if (d.trip.length) {
      head("YOLCULUK", y);
      y += 20;
      for (const [k, v] of d.trip) {
        text(k, L, y, f.r, 9.5, { color: MUT });
        text(v, L + 110, y, f.b, 10, { max: R - L - 110 });
        y += 16;
      }
      y += 14;
    }

    // Program: kalan yere sığan kadar; sığmazsa "…"
    if (d.days.length) {
      head("PROGRAM", y);
      y += 20;
      const bottom = H - 56 - moneyH - stayH - 18;
      let cut = false;
      outer: for (const day of d.days) {
        if (y + 30 > bottom) {
          cut = true;
          break;
        }
        text(day.date ? dayName(day.date) : "Tarih yok", L, y, f.b, 9.5);
        y += 14;
        for (const s of day.items) {
          if (y + 13 > bottom) {
            cut = true;
            break outer;
          }
          text(s.time || "—", L + 8, y, f.r, 9.5, { color: MUT });
          text(s.title, L + 56, y, f.r, 9.5, { max: R - L - 56 });
          y += 13;
        }
        y += 5;
      }
      if (cut) {
        text("… programın devamı talimatta", L + 8, y, f.r, 9, { color: MUT });
        y += 14;
      }
      y += 10;
    }

    // Konaklama
    if (d.stay.hotels.length) {
      head("KONAKLAMA", y);
      y += 20;
      const when = [d.stay.from && `Giriş ${shortDay(d.stay.from)}`, d.stay.to && `Çıkış ${shortDay(d.stay.to)}`, d.stay.nights && `${d.stay.nights} gece`].filter(Boolean).join(" · ");
      for (const h of d.stay.hotels) {
        text(h.name, L, y, f.b, 10, { max: R - L - 150 });
        if (h.phone) text(h.phone, R, y, f.r, 9.5, { align: "right", color: MUT });
        y += 13;
        text([when, h.note].filter(Boolean).join(" · "), L, y, f.r, 9, { color: MUT, max: R - L });
        y += 15;
      }
      y += 8;
    }

    // Bütçe: yalnız bu sporcunun payı
    if (d.money.lines.length) {
      head("BÜTÇE · SPORCU PAYI", y);
      y += 20;
      for (const l of d.money.lines) {
        text(l.cat, L, y, f.r, 9, { color: MUT, max: 80 });
        text(l.title + (l.est ? " (tahmini)" : ""), L + 90, y, f.r, 10, { max: R - L - 200 });
        text(tl(l.amount), R, y, f.r, 10, { align: "right" });
        y += 16;
        rule(y - 11, L + 90);
      }
      page.drawRectangle({ x: L, y: H - y - 12, width: R - L, height: 22, color: SOFT });
      text("Ödenecek toplam", L + 10, y + 3, f.b, 10.5);
      text(tl(d.money.total), R - 10, y + 3, f.b, 11.5, { align: "right" });
      y += 26;
      if (d.money.club.length) text(`Kulüp karşılar: ${d.money.club.join(", ")}`, L, y, f.r, 8.5, { color: MUT, max: R - L });
    }

    text("Gün ve saatler değişebilir. Sorular için kulübe ulaşın: " + CLUB.phone, L, H - 40, f.r, 8, { color: MUT, max: R - L });
  }
  return pdf.save();
}
