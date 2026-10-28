// Radardan yağış (Seyhun 2026-10-28: "yağış çok arkadan geliyor"): istasyon raporları yağışı 6-12 saatlik toplam olarak,
// 1-3 saat gecikmeyle verir; radar (RainViewer, ücretsiz, 10 dakikada bir) "şu an / son 2 saatte yağdı mı" sorusunu zamanında cevaplar.
// Seçilen noktanın üstündeki radar pikselinin rengi okunur: 0 yok, 1 hafif, 2 orta, 3 kuvvetli (renkten yaklaşık; mm değil).
import { inflateSync } from "node:zlib";

export const ZOOM = 7; // ücretsiz radarın en yakın ölçeği; bir piksel Ege'de yaklaşık 1 km

// Enlem/boylam → döşeme (x, y) ve döşeme içindeki piksel (px, py), 256 piksellik Web Mercator döşemeleri
export function tileOf(lat, lon, z = ZOOM) {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  const fx = ((lon + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const x = Math.floor(fx);
  const y = Math.floor(fy);
  return { z, x, y, px: Math.min(255, Math.floor((fx - x) * 256)), py: Math.min(255, Math.floor((fy - y) * 256)) };
}

// Radar rengi → şiddet. Mavi tonlar hafif/orta (koyulaştıkça orta), sarı-turuncu orta-kuvvetli, kırmızı-mor kuvvetli.
export function levelOf(r, g, b, a) {
  if (a < 24) return 0;
  if (r > 180 && g < 120) return 3;
  if (r > 180) return 2;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 110 ? 2 : 1;
}
export const LEVEL_NAME = ["yok", "hafif", "orta", "kuvvetli"];

// Küçük PNG çözücü (8 bit; RGBA, RGB, gri, gri+alfa ve paletli; araya alma yok). Dönen { w, h, px(x, y) → [r, g, b, a] }
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("PNG değil");
  let i = 8, w = 0, h = 0, depth = 0, type = 0, inter = 0, pal = null, trns = null;
  const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const kind = buf.toString("ascii", i + 4, i + 8);
    const d = buf.subarray(i + 8, i + 8 + len);
    if (kind === "IHDR") [w, h, depth, type, inter] = [d.readUInt32BE(0), d.readUInt32BE(4), d[8], d[9], d[12]];
    else if (kind === "PLTE") pal = d;
    else if (kind === "tRNS") trns = d;
    else if (kind === "IDAT") idat.push(d);
    else if (kind === "IEND") break;
    i += 12 + len;
  }
  if (depth !== 8 || inter) throw new Error("PNG biçimi desteklenmiyor");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!ch) throw new Error("PNG biçimi desteklenmiyor");
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= ch ? out[y * stride + x - ch] : 0;
      const up = y ? out[(y - 1) * stride + x] : 0;
      const ul = y && x >= ch ? out[(y - 1) * stride + x - ch] : 0;
      let v = src[x];
      if (f === 1) v += left;
      else if (f === 2) v += up;
      else if (f === 3) v += (left + up) >> 1;
      else if (f === 4) {
        const p = left + up - ul, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - ul);
        v += pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
      }
      out[y * stride + x] = v & 255;
    }
  }
  const px = (x, y) => {
    const o = y * stride + x * ch;
    if (type === 6) return [out[o], out[o + 1], out[o + 2], out[o + 3]];
    if (type === 2) return [out[o], out[o + 1], out[o + 2], 255];
    if (type === 4) return [out[o], out[o], out[o], out[o + 1]];
    if (type === 0) return [out[o], out[o], out[o], 255];
    const k = out[o];
    return [pal[k * 3], pal[k * 3 + 1], pal[k * 3 + 2], trns && k < trns.length ? trns[k] : 255];
  };
  return { w, h, px };
}

// Noktanın çevresindeki 3×3 pikselin en şiddetlisi (koy kıyısındaki tek pikselde kaçırmamak için)
export function levelAt(img, px, py) {
  let best = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const x = px + dx, y = py + dy;
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
      best = Math.max(best, levelOf(...img.px(x, y)));
    }
  return best;
}
