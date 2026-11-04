// Saat saat hava tablosunun sütunları (HourTable; saf hesap, testli). Her saat bir sütun: seçilen günün saatleri, ardından ertesi gün.
// Gerçekleşen (Seyhun 2026-11-03 "her şeyi her zaman göstermeliyiz, gerçekleşmiş… canlı yayın sayfasındaki gibi"): geçmiş ve şimdiki sütunda
// istasyon ölçümü varsa (o saatin en son raporu) gökyüzü, sıcaklık, rüzgâr, sağanak, yön ve yağış ondan gelir, sütun "ölçülen" işaretlenir.
// Ölçülen yağış (obsMm): raporun kapsadığı saatlere bölünür; rapor yoksa tahmin.
export const STEP = 1; // her saat bir sütun (Seyhun 2026-11-03 "hava durumunda saatlik göstermeliyiz")

export function hourCols(rows, next = null, obs = [], { date = "", today = "", nowH = -1 } = {}) {
  const past = (hh) => date && today && (date < today || (date === today && +hh <= nowH));
  return [...pick(rows, false, obs, past, obsMm(obs)), ...pick(next, true, [], () => false, {})];
}

// Ölçülen yağış saat saat: istasyon raporu (saatinde biten h saatlik toplam mm) kapsadığı saatlere eşit bölünür (12:00'de biten 3 saatte 3 mm → 09, 10, 11'e
// 1'er mm); uzun rapor önce, kısa rapor üstüne yazar (kısa süreli rapor daha kesin)
function obsMm(obs) {
  const out = {};
  [...(obs || [])]
    .filter((o) => o.rain && o.rain.mm != null && o.rain.h > 0)
    .sort((a, b) => b.rain.h - a.rain.h)
    .forEach((o) => {
      for (let k = 1; k <= o.rain.h; k++) {
        const h = +o.hh - k;
        if (h >= 0) out[String(h).padStart(2, "0")] = Math.round((o.rain.mm / o.rain.h) * 10) / 10;
      }
    });
  return out;
}

function pick(rows, next, obs, past, mmAt) {
  if (!rows?.length) return [];
  const out = [];
  rows.forEach((h, i) => {
    if (+h.hh % STEP) return;
    const blk = Math.floor(+h.hh / STEP);
    const block = rows.slice(i, i + STEP).filter((r) => Math.floor(+r.hh / STEP) === blk);
    const mms = block.map((r) => r.mm).filter((v) => v != null);
    const col = { ...h, mm: mms.length ? mms.reduce((a, b) => a + b, 0) : h.mm, next, first: next && !out.length, dname: next ? dayShort(h.time) : "", obs: false };
    // Ölçülen rüzgâr ayrı "Ölçülen" satırında (Seyhun 2026-11-04 "gerçekleşen rüzgâr çok kötü tasarımla gösteriliyor"): istasyon 3 saatte bir
    // rapor verdiği için tahmin sütunlarının üstüne yazmak sütunları ölçülen/tahmin diye karışık (zebra) yapıyordu. Tahmin satırları hep tahmin kalır.
    const o = past(h.hh) ? [...(obs || [])].reverse().find((x) => Math.floor(+x.hh / STEP) === blk && x.wind != null) : null;
    if (o) {
      col.obs = true;
      col.ob = { wind: Math.round(o.wind), gust: o.gust != null ? Math.round(o.gust) : null, dir: o.dir ?? null };
    }
    if (past(h.hh) && mmAt[h.hh] != null) col.mm = mmAt[h.hh];
    out.push(col);
  });
  return out;
}

const dayShort = (time) => {
  const s = new Date(`${time.slice(0, 10)}T12:00`).toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "");
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
};

// Plan / start çizgisi: "HH:MM" → sütun sırası + sütun içindeki oran (0–1); seçilen günün dışında ya da saat yoksa null
export function markAt(cols, hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const v = h + m / 60;
  const i = cols.findIndex((c) => !c.next && +c.hh <= v && v < +c.hh + STEP);
  return i < 0 ? null : i + (v - +cols[i].hh) / STEP;
}

export const mmText = (v) => (v == null || v < 0.1 ? "" : v < 10 ? v.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : String(Math.round(v)));

// Ertesi günün tarihi (YYYY-MM-DD)
export function nextDay(date) {
  const d = new Date(`${date}T12:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
