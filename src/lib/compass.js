// Telefon pusulası (Parkur › Pusula, CompassSight): kameranın baktığı yön.
// Neden (Seyhun 2026-10-29 "20 ölçtüğümde 277 ölçtü, bir yerden sonra dönmüyor"): iPhone'un webkitCompassHeading'i telefonun ÜST
// KENARININ yönüdür, telefon düz tutulunca doğrudur. Nişan alırken telefon dik tutulur, üst kenar göğe bakar; değer kayar ve takılır.
// Burada yön, telefonun duruş açılarından (alpha/beta/gamma) arka kameranın baktığı yöne çevrilir. iPhone'da alpha kuzeye bağlı
// olmadığından, telefon düze yakınken webkitCompassHeading ile kuzey farkı (off) ölçülüp saklanır; dik tutulunca o farkla hesaplanır.
const R = Math.PI / 180;
const norm = (d) => ((d % 360) + 360) % 360;

// İki açının farkı (−180…180)
export const angDiff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

// Arka kameranın yatay yönü (alpha kuzeye bağlıyken); kamera dikey yere/göğe bakıyorsa ok=false
export function camHeading(alpha, beta, gamma) {
  const [x, y, z] = [beta * R, gamma * R, alpha * R];
  const vx = -Math.cos(z) * Math.sin(y) - Math.sin(z) * Math.sin(x) * Math.cos(y);
  const vy = -Math.sin(z) * Math.sin(y) + Math.cos(z) * Math.sin(x) * Math.cos(y);
  return { deg: norm(Math.atan2(vx, vy) / R), ok: Math.hypot(vx, vy) >= 0.5 };
}

// Olay olay okuyucu: feed(e) → derece (0-359) ya da null (henüz okunamadı)
export function compassReader() {
  let off = null; // iPhone: kuzey − alpha farkı
  let last = null;
  return (e) => {
    const { alpha, beta, gamma } = e || {};
    if (typeof alpha !== "number" || typeof beta !== "number" || typeof gamma !== "number") return last;
    let abs = null;
    if (typeof e.webkitCompassHeading === "number" && e.webkitCompassHeading >= 0) {
      // Düze yakınken (ekran yukarı, 60°'den az eğik) üst kenar yönü güvenilir: farkı yumuşakça güncelle
      if (beta > -30 && beta < 60 && Math.abs(gamma) < 60) {
        const o = norm(360 - e.webkitCompassHeading - alpha);
        off = off === null ? o : norm(off + angDiff(o, off) * 0.2);
      }
      if (off !== null) abs = norm(alpha + off);
    } else if (e.absolute) abs = alpha;
    if (abs === null) return last;
    const c = camHeading(abs, beta, gamma);
    const h = c.ok ? c.deg : norm(360 - abs); // telefon düzken üst kenarın yönü (el pusulası gibi)
    last = last === null ? h : norm(last + angDiff(h, last) * 0.35);
    return last;
  };
}

// Açıların ortalaması (Seyhun 2026-10-29 "10 sn ortalama": rüzgâr yönü sürekli oynar, Al 10 sn ölçer). 350° ve 10° → 0°.
// Dönüş { deg (0-359), spread (en uzak örneğin ortalamaya farkı) } ya da null
export function meanDeg(list) {
  const xs = (list || []).filter((d) => Number.isFinite(d));
  if (!xs.length) return null;
  const s = xs.reduce((a, d) => a + Math.sin(d * R), 0);
  const c = xs.reduce((a, d) => a + Math.cos(d * R), 0);
  const deg = Math.round(norm(Math.atan2(s, c) / R)) % 360;
  return { deg, spread: Math.round(Math.max(...xs.map((d) => Math.abs(angDiff(d, deg))))) };
}
