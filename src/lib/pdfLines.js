// PDF sayfasındaki yazı parçaları (pdf.js getTextContent items) → satırlar ve kayıt listesi tablosu.
// Uzun kayıt listeleri (200+ tekne) yapay zekaya tek seferde gidince okunamıyordu (Seyhun 2026-11-03, 9 sayfalık TYF sporcu listesi):
// Grup listesi üç biçimde gelir: grup sütunlu tek liste (sütun başlığı tarih ya da "Grup"), "MAVİ GRUP" başlıklı bölümler, ya da her grup ayrı dosya.
// sütun başlıkları tanınırsa liste yapay zekasız, sütun sütun okunur (tableOf); tanınmazsa yazı parça parça yapay zekaya gider (chunkLines).

// Aynı yükseklikteki parçalar bir satır: [{ y, parts: [{ x, s }] }] (yukarıdan aşağı, soldan sağa)
export function rowsOf(items) {
  const rows = [];
  for (const it of items || []) {
    const s = String(it?.str ?? "").trim();
    if (!s) continue;
    const x = Number(it.transform?.[4]) || 0;
    const y = Number(it.transform?.[5]) || 0;
    const h = Math.abs(Number(it.height) || Number(it.transform?.[3]) || 8);
    let r = rows.find((q) => Math.abs(q.y - y) <= Math.max(2, h * 0.4));
    if (!r) rows.push((r = { y, parts: [] }));
    r.parts.push({ x, s });
  }
  for (const r of rows) r.parts.sort((a, b) => a.x - b.x);
  return rows.sort((a, b) => b.y - a.y);
}

export const linesOf = (items) => rowsOf(items).map((r) => r.parts.map((p) => p.s).join("  "));

// Satırlar → en çok n satırlık parçalar; her parçanın başına belgenin başlığı eklenir ki sınıf/sütun adları bilinsin.
// Başlık: her sayfada tekrar eden sütun satırına kadar (yoksa ilk 3 satır)
export function chunkLines(lines, n = 45) {
  let head = 3;
  for (let i = 0; i < Math.min(10, lines.length); i++) if (lines.indexOf(lines[i], i + 1) > -1) head = i + 1;
  const top = lines.slice(0, head);
  const body = lines.slice(head);
  if (body.length <= n) return [lines.join("\n")];
  const out = [];
  for (let i = 0; i < body.length; i += n) out.push([...top, ...body.slice(i, i + n)].join("\n"));
  return out;
}

import { groupOf } from "./roundScore";

const plain = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c])
    .replace(/[^a-z0-9]/g, "");
// Sütun başlığı → alan ("Y.NO", "Yelken No", "Sail No"; "D.TARİHİ", "Doğum Tarihi"; tarih yazan sütun o günün grubu)
function colOf(s) {
  const p = plain(s);
  if (/^(yno|yelkenno|yelkennumarasi|yelken|sailno|sailnumber|sail|ylkno|no)$/.test(p)) return "sail";
  if (/^(adsoyad|adisoyadi|adsoyadi|isim|isimsoyisim|sporcu|sporcuadi|name|fullname|helmsman)$/.test(p)) return "name";
  if (/^(cinsiyet|cins|sex|gender)$/.test(p)) return "sex";
  if (/^(dtarihi|dtarih|dogumtarihi|dogum|dogumyili|dyili|dt|dob|birth|birthdate|yob)$/.test(p)) return "born";
  if (/^(kulup|kulubu|kulupadi|club|team)$/.test(p)) return "club";
  if (/^(sinif|sinifi|class|tekne|boat)$/.test(p)) return "cls";
  if (/^(grup|group|filo|fleet)$/.test(p) || /^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(String(s).trim())) return "grp";
  if (/^(il|sehir|city|ulke|country|kat|kategori|category)$/.test(p)) return "skip";
  return "";
}
// Başlık satırı: yelken no ve ad sütunu dahil en az 3 tanınan sütun
function headOf(row) {
  const cols = [];
  for (let i = 0; i < row.parts.length; i++) {
    const a = row.parts[i];
    const two = row.parts[i + 1] ? colOf(`${a.s} ${row.parts[i + 1].s}`) : "";
    const k = two && two !== colOf(a.s) && !colOf(row.parts[i + 1].s) ? two : colOf(a.s);
    if (k) {
      cols.push({ k, x: a.x });
      if (k === two && k !== colOf(a.s)) i++;
    }
  }
  const ks = cols.map((c) => c.k);
  return ks.includes("sail") && ks.includes("name") && new Set(ks).size >= 3 ? cols : null;
}
const titleCase = (s) =>
  String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase("tr-TR"));

// Sınıf adları Latin yazılır ("OPTIMIST" → "Optimist", Türkçe "Optımıst" değil)
const CLASSES = ["Optimist", "ILCA 4", "ILCA 6", "ILCA 7", "Laser", "420", "470", "29er", "49er", "Nacra 17", "Finn", "Techno 293", "iQFoil", "RS:X", "Kite"];
const clsName = (s) => CLASSES.find((c) => plain(c) === plain(s)) || String(s || "").trim();

// Sayfalar (her biri items dizisi) → kayıt listesi satırları { sail, name, club, cls, born, sex, grp }; başlık bulunamazsa []
export function tableOf(pages) {
  const out = [];
  let cols = null;
  let cur = "";
  for (const items of pages || []) {
    for (const row of rowsOf(items)) {
      const h = headOf(row);
      if (h) {
        cols = h;
        continue;
      }
      // "MAVİ GRUP", "Sarı Grup Listesi", "BLUE FLEET": sonraki satırların grubu (grup sütunu yoksa)
      const words = row.parts.map((p) => p.s).join(" ").split(/\s+/);
      const named = words.some((w) => /^(grup|grubu|group|fleet|filo|liste|listesi)$/.test(plain(w)));
      if (words.length <= 6 && (named || words.length === 1)) {
        const g = words.map(groupOf).find(Boolean);
        if (g) {
          cur = g;
          continue;
        }
      }
      if (!cols) continue;
      const cell = {};
      for (const p of row.parts) {
        // parça, başlangıcı kendisinden en çok 6 birim sağda olan son sütuna düşer
        let c = cols[0];
        for (const q of cols) if (q.x <= p.x + 6) c = q;
        cell[c.k] = cell[c.k] ? `${cell[c.k]} ${p.s}` : p.s;
      }
      const sail = String(cell.sail || "").replace(/\D/g, "");
      if (!sail || !cell.name) continue;
      out.push({ sail, name: titleCase(cell.name), club: cell.club || "", cls: clsName(cell.cls), born: cell.born || "", sex: cell.sex || "", grp: cell.grp || cur });
    }
  }
  return out;
}

// Sonuç listesi (Seyhun 2026-11-03, TYF "GEÇİCİ SONUÇLAR · ALTIN 03.11.2025"): Rank, SINIF, grup (tarih başlıklı sütun ya da
// "ALTIN" başlığı), Y.NO, AD SOYAD, CİNSİYET, D.TARİHİ, KULÜP, yarış sütunları (Q1…Q6, F1, R1…), Total, Nett.
// Ad ve kulüp alt satırlara taşabilir ("ERENDEMİR", "SPOR KULÜBÜ"), "(74.0" + "RET)" gibi: sırasız satır üstteki sporcuya eklenir.
// Dönen: cleanSheet'in okuduğu fleets [{ cls, rows: [{ rank, name, sail, club, born, pts, sex, grp, r }] }]; başlık yoksa []
function resCol(s) {
  const p = plain(s);
  if (/^(rank|sira|siralama|pos|position|place|no)$/.test(p) && !/^y/.test(p)) return "rank";
  if (/^(nett|net|netpuan|nettotal|netpts)$/.test(p)) return "pts";
  if (/^(total|toplam|brut|gross)$/.test(p)) return "skip";
  if (/^[qrfmsc]\d{1,2}$/.test(p) || /^race\d{1,2}$/.test(p) || /^\d{1,2}$/.test(p)) return "race";
  return colOf(s);
}
// Yarış puanı: "1.0" → "1", "(9.0)" → "(9)", "(74.0" + "RET)" → "(RET)", "74.0 UFD" → "UFD" (atılan parantezde)
export function raceCell(v) {
  const t = String(v || "").replace(/\s+/g, "");
  const out = t.match(/\(/) ? "(" : "";
  const code = t.match(/[A-Za-z]{2,4}/)?.[0];
  if (code) return out ? `(${code.toUpperCase()})` : code.toUpperCase();
  const n = t.match(/\d+(?:[.,]\d+)?/)?.[0];
  if (!n) return "";
  const x = String(Number(n.replace(",", ".")));
  return out ? `(${x})` : x;
}
export function resultTableOf(pages) {
  const fleets = [];
  let cols = null;
  let cur = "";
  let last = null;
  for (const items of pages || []) {
    for (const row of rowsOf(items)) {
      const ks = row.parts.map((p) => resCol(p.s));
      if (ks.includes("rank") && ks.includes("name") && ks.includes("race")) {
        cols = row.parts.map((p, i) => ({ k: ks[i] || "skip", x: p.x }));
        continue;
      }
      // "ALTIN 03.11.2025", "Gümüş Grup": sonraki satırların grubu
      const words = row.parts.map((p) => p.s).join(" ").split(/\s+/);
      const g = words.length <= 6 ? words.map(groupOf).find(Boolean) : "";
      if (g && words.every((w) => groupOf(w) || /^[\d./-]+$/.test(w) || /^(grup|grubu|group|fleet|filo|sonuc|sonuclar|gecici|results)$/.test(plain(w)))) {
        cur = g;
        continue;
      }
      if (!cols) continue;
      const cell = {};
      const races = [];
      for (const p of row.parts) {
        let c = 0;
        cols.forEach((q, i) => q.x <= p.x + 6 && (c = i));
        const k = cols[c].k;
        if (k === "race") races[c] = races[c] ? `${races[c]} ${p.s}` : p.s;
        else cell[k] = cell[k] ? `${cell[k]} ${p.s}` : p.s;
      }
      const rank = Number(String(cell.rank || "").replace(/\D/g, ""));
      if (!rank) {
        // alt satıra taşan ad, kulüp, yarış puanı
        if (!last) continue;
        for (const k of ["name", "club"]) if (cell[k]) last[k] = `${last[k]} ${cell[k]}`.trim();
        races.forEach((v, i) => v && (last.rc[i] = `${last.rc[i] || ""}${v}`));
        continue;
      }
      const cls = clsName(cell.cls || "");
      let f = fleets.find((x) => x.cls === cls);
      if (!f) fleets.push((f = { cls, rows: [] }));
      last = { rank, name: cell.name || "", sail: String(cell.sail || "").replace(/\D/g, ""), club: cell.club || "", born: cell.born || "", pts: Number(String(cell.pts || "").replace(",", ".")), sex: cell.sex || "", grp: groupOf(cell.grp || "") || cur, rc: races };
      f.rows.push(last);
    }
  }
  for (const f of fleets)
    f.rows = f.rows.map(({ rc, ...r }) => ({ ...r, name: titleCase(r.name), r: cols ? cols.map((q, i) => (q.k === "race" ? raceCell(rc[i]) : null)).filter((x) => x !== null) : [] }));
  return fleets.filter((f) => f.rows.length);
}
