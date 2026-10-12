// Sporcu bilgi notu: her sporcuya tek sayfa PDF (veliye gönderilir).
// İçinde: yolculuk (tahmini plan), talimattaki program, konaklama, yalnız o sporcunun bütçe payı kalem kalem.
// sheetData saf (testlenir); buildAthleteSheet pdf-lib'i yalnız çıktı alınırken yükler.
import { CLUB, hotelInfo, rangeText } from "./raceDocs.js";
import { capName, cleanRooms, linesFor, money as cash, roomNight, tl, totals } from "./budget.js";
import { cleanTodos, doneFor, noticeTasks, raceHotels, tripRows } from "./races.js";
import { todayStr } from "@/lib/utils/format";

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

// Konaklama: evrakta yazılan otel varsa yalnız o, yoksa yarışın otelleri (en çok 3); giriş-çıkış, gece ve talimattaki oda fiyatları
// rooms: [{ name: "2 kişilik", night: "3.000 TL", each: "1.500 TL", board }]
export function stayOf(r) {
  const h = hotelInfo(r);
  const all = raceHotels(r);
  const pick = h.hotel ? [all.find((x) => low(x.name) === low(h.hotel)) || { name: h.hotel }] : all.slice(0, 3);
  const rooms = (x) =>
    cleanRooms(x.rooms).map((o) => {
      const night = roomNight(o);
      return { name: o.label || capName(o.cap), night: o.amount ? cash(night, o.cur) : o.price, each: o.amount && o.cap > 1 ? cash(night / o.cap, o.cur) : "", board: o.board };
    });
  return { hotels: pick.map((x) => ({ name: x.name, phone: x.phone || "", note: x.note || "", rooms: rooms(x) })), from: h.from || "", to: h.to || "", nights: nightsBetween(h.from, h.to) };
}

// Notta seçilebilen bölümler (anahtar, ad); hepsi varsayılan açık
export const SHEET_KEYS = [
  ["trip", "Yolculuk"],
  ["program", "Program"],
  ["stay", "Konaklama"],
  ["dates", "Son tarihler"],
  ["budget", "Bütçe"],
];
const ALL = Object.fromEntries(SHEET_KEYS.map(([k]) => [k, true]));

// Yaklaşan son tarihler: talimattaki son tarihler + tarihli talimat işleri + elle eklenen tarihli işler (bugün ve sonrası, en çok 6)
export function upcomingDates(r, today = todayStr()) {
  const seen = new Set();
  const dl = (r?.notice?.deadlines || []).map((d) => ({ title: d.title, date: d.date }));
  const days = new Set(dl.map((d) => d.date));
  // Talimat işleri çoğu zaman son tarihin tekrarı ("Online kaydı yap" = "Online kayıt son gün"): aynı günde son tarih varsa alınmaz
  const list = [...dl, ...noticeTasks(r?.notice).filter((t) => !days.has(t.date)).map((t) => ({ title: t.label, date: t.date })), ...cleanTodos(r?.todos)];
  return list
    .filter((d) => d?.title && /^\d{4}-\d{2}-\d{2}$/.test(d.date || "") && d.date >= today)
    .filter((d) => {
      const k = `${d.date}|${low(d.title)}`;
      return !seen.has(k) && seen.add(k);
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
    .map((d) => ({ ...d, left: nightsBetween(today, d.date), done: doneFor(r, d.title, d.date) }));
}
export const leftText = (n) => (n === 0 ? "bugün" : n === 1 ? "yarın" : `${n} gün kaldı`);

// Bir sporcunun notu. show: hangi bölümler görünsün ({ trip, program, stay, dates, budget }; yoksa hepsi) count: yarıştaki sporcu sayısı (bütçe payı buna göre bölünür)
// Yalnız bazı sporculara yazılan kalem (only) yalnız onların notunda görünür
export function sheetData(r, athlete, count, show = ALL) {
  const on = { ...ALL, ...show };
  const t = totals(r?.budget, count, r?.athleteIds);
  const mine = (athlete?.id ? linesFor(t, athlete.id) : t.lines.filter((l) => l.share > 0 && !l.only)).map((l) => ({ cat: l.cat, title: l.title, amount: l.share, est: !!l.est }));
  const club = t.lines.filter((l) => l.club).map((l) => l.title);
  return {
    name: athlete?.studentName || "",
    race: r?.name || "",
    place: [r?.district, r?.city].filter(Boolean).join(", "),
    dates: rangeText(r?.startDate, r?.endDate || r?.startDate),
    trip: on.trip ? tripRows(r) : [],
    days: on.program ? programDays(r) : [],
    stay: on.stay ? stayOf(r) : { hotels: [], from: "", to: "", nights: 0 },
    deadlines: on.dates ? upcomingDates(r) : [],
    money: on.budget ? { lines: mine, club, total: mine.reduce((n, l) => n + l.amount, 0) } : { lines: [], club: [], total: 0 },
  };
}

// Notta neler var (sayfadaki özet için): [ad, durum, var mı, gidilecek sekme, anahtar]
export function sheetParts(r, count) {
  const d = sheetData(r, null, count);
  const items = d.days.reduce((n, x) => n + x.items.length, 0);
  return [
    ["Yolculuk", d.trip.length ? d.trip[0][1] : "Çıkış girilmedi", d.trip.length > 0, "trip", "trip"],
    ["Program", d.days.length ? `Talimattan ${d.days.length} gün, ${items} madde` : "Talimatta program yok", d.days.length > 0, "notice", "program"],
    ["Konaklama", d.stay.hotels.length ? [d.stay.hotels.map((h) => h.name).join(", "), d.stay.nights && `${d.stay.nights} gece`, d.stay.hotels.some((h) => h.rooms.length) && "oda fiyatları"].filter(Boolean).join(" · ") : "Otel girilmedi", d.stay.hotels.length > 0, "trip", "stay"],
    ["Son tarihler", d.deadlines.length ? `${d.deadlines[0].title} · ${d.deadlines[0].done ? "yapıldı" : leftText(d.deadlines[0].left)}${d.deadlines.length > 1 ? ` · +${d.deadlines.length - 1}` : ""}` : "Yaklaşan son tarih yok", d.deadlines.length > 0, "sum", "dates"],
    ["Bütçe", d.money.lines.length ? `Sporcu payı ${tl(d.money.total)} · ${d.money.lines.length} kalem` : "Sporcu payı olan kalem yok", d.money.lines.length > 0, "budget", "budget"],
  ];
}

// Programın yerleşimi: hangi ölçekte, tek mi iki sütun mu. Önce tek sütun, sonra iki sütun, sonra küçülerek; hiçbir madde atılmaz.
// avail: kullanılabilir yükseklik (pt), width: genişlik, measure(metin, boyut) -> genişlik
export function programLayout(days, avail, width, measure) {
  const wrap = (s, max, size) => {
    const words = String(s || "").split(/\s+/).filter(Boolean);
    const out = [""];
    for (const wd of words) {
      const next = out.at(-1) ? `${out.at(-1)} ${wd}` : wd;
      if (measure(next, size) <= max || !out.at(-1)) out[out.length - 1] = next;
      else if (out.length < 2) out.push(wd);
      else out[1] = `${out[1]} ${wd}`;
    }
    return out;
  };
  const build = (k, n) => {
    const colW = n === 1 ? width : (width - 16) / 2;
    const tx = 46 * k;
    const rows = [];
    days.forEach((d, i) => {
      rows.push({ day: true, gap: i > 0, label: d.date ? dayName(d.date) : "Tarih yok", di: i });
      for (const it of d.items) rows.push({ time: it.time, lines: wrap(it.title, colW - tx, 9.5 * k), di: i });
    });
    const hOf = (r, first) => (r.day ? (r.gap && !first ? 5 : 0) + 14 : 13 + (r.lines.length - 1) * 11.5) * k;
    const sum = (rs) => rs.reduce((n, r, i) => n + hOf(r, i === 0), 0);
    if (n === 1) return { k, colW, tx, cols: [{ x: 0, rows }], h: sum(rows) };
    // İki sütun: önce gün sınırında, sığmazsa gün içinden bölünür (sağ sütun günün adıyla "devam" başlar)
    const at = (i) => {
      const left = rows.slice(0, i);
      let right = rows.slice(i);
      right = right[0].day ? [{ ...right[0], gap: false }, ...right.slice(1)] : [{ day: true, label: `${rows.find((r) => r.day && r.di === right[0].di).label} (devam)`, di: right[0].di }, ...right];
      return { left, right, h: Math.max(sum(left), sum(right)) };
    };
    let byDay = null;
    let any = null;
    for (let i = 1; i < rows.length; i++) {
      const c = at(i);
      if (rows[i].day && (!byDay || c.h < byDay.h)) byDay = c;
      if (!any || c.h < any.h) any = c;
    }
    const best = byDay && byDay.h <= avail ? byDay : any;
    if (!best) return { k, colW, tx, cols: [{ x: 0, rows }], h: sum(rows) };
    return { k, colW, tx, cols: [{ x: 0, rows: best.left }, { x: colW + 16, rows: best.right }], h: best.h };
  };
  const ks = [1, 0.92, 0.85, 0.78, 0.72, 0.66, 0.6];
  let last;
  for (const k of ks) {
    for (const n of [1, 2]) {
      last = build(k, n);
      if (last.h <= avail) return last;
    }
  }
  return last;
}

const W = 595.28;
const H = 841.89;
const L = 48;
const R = W - 48;

// list: seçili sporcular [{ id, studentName }]; count: yarıştaki sporcu sayısı; show: görünecek bölümler
export async function buildAthleteSheet(r, list, fonts, count = list.length, show = ALL) {
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
    const d = sheetData(r, a, count, show);
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
    const moneyH = d.money.lines.length ? 20 + d.money.lines.length * 16 + 26 + (d.money.club.length ? 14 : 0) : 0;
    const stayH = d.stay.hotels.length ? 28 + d.stay.hotels.reduce((n, h) => n + 28 + (h.rooms.length ? 16 + Math.ceil(h.rooms.length / (h.rooms.length > 2 ? 2 : 1)) * 12.5 : 0), 0) : 0;
    const datesH = d.deadlines.length ? 30 + d.deadlines.length * 16 : 0;

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

    // Program: hepsi gösterilir. Tek sütuna sığmazsa iki sütun (ilk günler solda, kalanı sağda), yine sığmazsa yazı küçülür
    if (d.days.length) {
      head("PROGRAM", y);
      y += 20;
      const bottom = H - 40 - moneyH - stayH - datesH;
      const lay = programLayout(d.days, bottom - y, R - L, (s, size) => w(s, f.r, size));
      for (const col of lay.cols) {
        let cy = y;
        for (const row of col.rows) {
          if (row.day) {
            if (row.gap) cy += 5 * lay.k;
            text(row.label, col.x + L, cy, f.b, 9.5 * lay.k, { max: lay.colW });
            cy += 14 * lay.k;
          } else {
            text(row.time || "—", col.x + L + 6 * lay.k, cy, f.r, 9.5 * lay.k, { color: MUT });
            row.lines.forEach((ln, i) => text(ln, col.x + L + lay.tx, cy + i * 11.5 * lay.k, f.r, 9.5 * lay.k, { max: lay.colW - lay.tx }));
            cy += (13 + (row.lines.length - 1) * 11.5) * lay.k;
          }
        }
      }
      if (lay.cols.length > 1) page.drawLine({ start: { x: L + lay.colW + 8, y: H - y + 8 }, end: { x: L + lay.colW + 8, y: H - y - lay.h + 6 }, thickness: 0.5, color: LINE });
      y += lay.h + 10;
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
        // Talimattaki odalar iki sütunda: oda (pansiyon), gecelik oda fiyatı, kişi başı. Pansiyon hepsinde aynıysa başlıkta bir kez
        if (h.rooms.length) {
          const boards = [...new Set(h.rooms.map((o) => o.board).filter(Boolean))];
          const one = boards.length === 1 && h.rooms.every((o) => o.board === boards[0]);
          const half = Math.ceil(h.rooms.length / 2);
          const cw = (R - L - 16) / 2;
          const cols = h.rooms.length > 2 ? [h.rooms.slice(0, half), h.rooms.slice(half)] : [h.rooms];
          cols.forEach((list, ci) => {
            const x = L + ci * (cw + 16);
            text(one ? `Oda · ${boards[0]}` : "Oda", x, y, f.b, 8, { color: MUT, max: cw - 130 });
            text("Gecelik", x + cw - 70, y, f.b, 8, { color: MUT, align: "right" });
            text("Kişi başı", x + cw, y, f.b, 8, { color: MUT, align: "right" });
            list.forEach((o, i) => {
              const ry = y + 12.5 * (i + 1);
              text(one || !o.board ? o.name : `${o.name} · ${o.board}`, x, ry, f.r, 9, { max: cw - 140 });
              text(o.night, x + cw - 70, ry, f.b, 9, { align: "right" });
              text(o.each || "-", x + cw, ry, f.r, 9, { align: "right", color: o.each ? INK : MUT });
            });
          });
          y += 12.5 * (cols[0].length + 1) + 3.5;
        }
      }
      y += 8;
    }

    // Yaklaşan son tarihler (bilgi için)
    if (d.deadlines.length) {
      head("YAKLAŞAN SON TARİHLER", y);
      y += 20;
      for (const x of d.deadlines) {
        text(shortDay(x.date), L, y, f.b, 9.5, { max: 100 });
        text(x.title, L + 110, y, f.r, 10, { max: R - L - 200 });
        if (x.done) text("Yapıldı", R, y, f.b, 9.5, { align: "right", color: rgb(0.1, 0.5, 0.3) });
        else text(leftText(x.left), R, y, x.left <= 7 ? f.b : f.r, 9.5, { align: "right", color: x.left <= 7 ? rgb(0.75, 0.33, 0.05) : MUT });
        y += 16;
      }
      y += 10;
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
  }
  return pdf.save();
}
