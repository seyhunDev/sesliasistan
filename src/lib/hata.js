// Merkezî hata kaydının ortak parçaları (api/hata, lib/crash.js, features/admin/Hatalar.jsx). Saf, test edilir.
export const HATA_MAX = 50;
const str = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export const gunTR = (ms = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(ms));

// İstemciden gelen kaydı süzer: { msg, path, where, ver, ua } ya da null
export function cleanHata(b) {
  const msg = str(b?.msg, 300);
  if (!msg) return null;
  return { msg, path: str(b.path, 120), where: str(b.where, 40), ver: str(b.ver, 12), ua: str(b.ua, 80) };
}

// Aynı mesajlar tek satır: [{ msg, path, n, son, kisi: [ad] }] en yeniden eskiye
export function grupla(list = []) {
  const m = new Map();
  for (const h of list) {
    const k = `${h.msg}|${h.path}`;
    const g = m.get(k) || { msg: h.msg, path: h.path, where: h.where, n: 0, son: h.at, kisi: [] };
    g.n++;
    if (h.at > g.son) g.son = h.at;
    if (h.ad && !g.kisi.includes(h.ad)) g.kisi.push(h.ad);
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => (b.son > a.son ? 1 : -1));
}
