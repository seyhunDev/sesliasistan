// Parkur sahnesi (Seyhun 2026-11-02, olimpiyat yayını örneği): rota kartındaki parkur denizin üstünde eğik (kameradan bakar gibi) çizilir;
// komite botu ve pin botu arasında START, sarı şamandıralar, finiş botu ve hattı; seçilen rota (ör. 1 · 2 · 3 · F) ayak ayak sarı okla
// çizilir, sonra oklar rota boyunca akar. Şamandıra yerleri rota kartıyla aynı (courseCard geom): kart değişince sahne de değişir.
// Dönüşler: şamandıralar iskeleden (sola dönerek), kapıda (3, 4) iki seçenek: s sancaktan, p iskeleden.
import { geom } from "@/lib/courseCard";

const rad = (d) => (d * Math.PI) / 180;
const nrm = (d) => ((d % 360) + 360) % 360;
const dirv = (b, m) => [m * Math.sin(rad(b)), m * Math.cos(rad(b))];
const add = (p, b, m) => { const [x, y] = dirv(b, m); return [p[0] + x, p[1] + y]; };
const brg = (a, b) => nrm((Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI);
const midOf = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const f = (n) => n.toFixed(1);

export const ROUTE_TOKENS = ["1", "2", "3", "4", "F"];
// "1 2 3 F", "1·4·1·2·3·F" → ["1","2","3","F"]; bilinmeyen atılır, sonda F yoksa eklenmez (rota yarım kalabilir)
export const cleanRoute = (r) => (Array.isArray(r) ? r : String(r || "").split(/[\s·,>\-–]+/)).map((x) => { const t = String(x).trim().toLocaleLowerCase("tr"); return /^(f|fin|finiş|finis|finish)$/.test(t) ? "F" : t; }).filter((x) => ROUTE_TOKENS.includes(x)).slice(0, 12);
export const routeText = (r) => cleanRoute(r).map((x) => (x === "F" ? "Finiş" : x)).join(" · ");

// Rotanın plan üzerindeki noktaları: her ayak bir önceki dönüşün çıkışından bu dönüşün çıkışına (yay dahil)
function routePlan(g, route) {
  const r = Math.max(22, g.L * 0.045);
  const way = [];
  for (const t of route) {
    if (t === "1") way.push({ m: g.m1, side: 1, t: "1" }, { m: g.m1a, side: 1, t: "1A", join: true });
    else if (t === "2") way.push({ m: g.m2, side: 1, t: "2" });
    else if (t === "3") way.push({ m: g.p3, side: 1, t: "3", gate: [g.s3, g.p3], gm: g.g3 });
    else if (t === "4") way.push({ m: g.p4, side: 1, t: "4", gate: [g.s4, g.p4], gm: g.g4 });
    else if (t === "F") way.push({ end: midOf(g.fA, g.fB), t: "F" });
  }
  const start = g.mid;
  const legs = [];
  let cur = start, leg = [start];
  const alt = []; // kapıda öbür şamandıranın (sancak) dönüşü: soluk kısa kanca
  way.forEach((w, i) => {
    if (w.end) {
      leg.push(w.end);
      legs.push(leg);
      leg = [w.end];
      cur = w.end;
      return;
    }
    const nx = way[i + 1];
    const next = nx ? nx.end || nx.m : add(w.m, g.A + 180, g.L * 0.3);
    if (w.gate) {
      // kapı: önce kapının ortasına (rüzgâr üstünden) gelinir. Sonra rüzgâra dönülüyorsa iki seçenek (olimpiyat çizimindeki gibi):
      // p iskeleden (ana rota), s sancaktan (soluk kanca); finişe gidiliyorsa kapıdan geçilip düz devam edilir
      const entry = add(w.gm, g.A, g.L * 0.16);
      leg.push(entry);
      if (!nx || nx.end) {
        leg.push(w.gm);
        cur = w.gm;
        return;
      }
      const hook = (m, s) => {
        // kapının içinden rüzgâr altına inip dışa doğru döner, rüzgâra çıkar
        const hin = nrm(g.A + 180), hout = nrm(g.A);
        const sweep = s > 0 ? nrm(hin - hout) : nrm(hout - hin);
        const n = Math.max(8, Math.round(sweep / 12));
        return Array.from({ length: n + 1 }, (_, k) => add(m, nrm(hin - s * sweep * (k / n) + 90 * s), r));
      };
      const pa = hook(w.gate[1], 1), sa = hook(w.gate[0], -1);
      alt.push({ after: legs.length, pts: [entry, ...sa, add(sa.at(-1), g.A, g.L * 0.14)] });
      leg.push(...pa);
      legs.push(leg);
      leg = [pa.at(-1)];
      cur = pa.at(-1);
      return;
    }
    const hin = brg(cur, w.m), hout = brg(w.m, next);
    // iskeleden dönüş: tekne şamandıranın sağında, sola döner
    const s = w.side;
    const sweep = s > 0 ? nrm(hin - hout) : nrm(hout - hin);
    const n = Math.max(6, Math.round(sweep / 12));
    const arc = Array.from({ length: n + 1 }, (_, k) => add(w.m, nrm(hin - s * sweep * (k / n) + 90 * s), r));
    leg.push(...arc);
    // 1'den 1A'ya kısa geçişte ayrı ayak açma (1 ve 1A tek dönüş sayılır)
    if (nx?.join) { cur = arc.at(-1); return; }
    legs.push(leg);
    leg = [arc.at(-1)];
    cur = arc.at(-1);
  });
  if (leg.length > 1) legs.push(leg);
  return { legs, alt, way };
}

// Sahne: { W, H } piksel, rota, isteğe bağlı pre (animasyon adları için önek), title (alt yazı)
export function sceneSvg(card, route, { W = 1600, H = 900, pre = "cs", title = "", wind = true, sea = false } = {}) {
  if (!card) return "";
  const g = geom(card, { lineK: 0.38 }); // start hattı rota kartındaki gibi orsanın üçte biri kadar (Seyhun 2026-11-02 "start çok büyük")
  const rt = cleanRoute(route);
  const rot = g.A;
  const R = ([x, y]) => [x * Math.cos(rad(rot)) - y * Math.sin(rad(rot)), x * Math.sin(rad(rot)) + y * Math.cos(rad(rot))];
  const key = ["komite", "pin", "m1", "m1a", "m2", "s3", "p3", "s4", "p4", "fA", "fB"].map((k) => R(g[k]));
  const xs = key.map((p) => p[0]), ys = key.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const xc = (x0 + x1) / 2, span = Math.max(1, y1 - y0);
  // kamera startın arkasında, yüksekte, rüzgâra (1'e) bakar; eğim hafif (Seyhun 2026-11-02 "rota kartındaki gibi gerçekçi olsun"):
  // en ve boy aynı ölçekte (kart oranları korunur), derinlik yalnız biraz kısalır, uzak taraf biraz küçülür
  const D = span * 2.6;
  const zOf = (Y) => D + (Y - y0);
  const zm = D + span / 2;
  let near = H * 0.84, far = H * 0.16;
  let k = (near - far) / (1 / D - 1 / (D + span));
  let F = k / (zm * 0.78); // ortada yatay ölçek = dikey ölçek / 0.78
  let half = 0;
  for (const [X, Y] of key) half = Math.max(half, (Math.abs(X - xc) * F) / zOf(Y));
  if (half > W * 0.44) {
    const q = (W * 0.44) / half;
    F *= q;
    k *= q;
    const c = (near + far) / 2, b = (near - far) * q;
    near = c + b / 2;
    far = c - b / 2;
  }
  const H0 = near - k / D;
  const P = (p) => { const [X, Y] = R(p); const z = zOf(Y); return [W / 2 + ((X - xc) * F) / z, H0 + k / z, D / z]; };
  const u = W / 1600;
  let o = "";
  // deniz: istenirse degrade + derinliğe göre küçülen ince dalga çizgileri (yağmur/köpük gibi; canlı ekranda deniz zaten arkada)
  if (sea) {
    o += `<defs><linearGradient id="${pre}-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c5876"/><stop offset=".45" stop-color="#1a3d58"/><stop offset="1" stop-color="#0d2438"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${pre}-sea)"/>`;
  }
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const y = H * 0.08 + rnd() * H * 0.92, x = rnd() * W;
    const d = Math.max(0.15, (y - H * 0.05) / H);
    o += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - 3 * d * u)}" y2="${f(y + 16 * d * u)}" stroke="#fff" stroke-opacity="${f(0.08 + 0.18 * d)}" stroke-width="${f(1.2 * d * u + 0.4)}" stroke-linecap="round"/>`;
  }
  const Y_ = "#ffd400", Yd = "#c9a400", WH = "#f4f7fb";
  // nesneler derinliğe göre sıralanır (uzak önce)
  const items = [];
  const buoy = (p, t) => items.push({ z: P(p)[2], d: () => {
    const [x, y, s] = P(p); const w = Math.max(9, 15 * u * s), h = Math.max(20, 36 * u * s);
    return `<g><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w * 1.7)}" ry="${f(w * 0.5)}" fill="#000" opacity=".22"/><path d="M${f(x - w)} ${f(y)} L${f(x - w * 0.8)} ${f(y - h)} Q${f(x)} ${f(y - h - w * 0.6)} ${f(x + w * 0.8)} ${f(y - h)} L${f(x + w)} ${f(y)} Z" fill="${Y_}"/><path d="M${f(x + w * 0.15)} ${f(y)} L${f(x + w * 0.2)} ${f(y - h)} Q${f(x + w * 0.6)} ${f(y - h - w * 0.3)} ${f(x + w * 0.8)} ${f(y - h)} L${f(x + w)} ${f(y)} Z" fill="${Yd}" opacity=".7"/>${t ? `<text x="${f(x)}" y="${f(y - h - 12 * u * s - 4)}" text-anchor="middle" font-size="${f(Math.max(19, 26 * u * s))}" font-weight="700" fill="#fff" opacity=".92">${t}</text>` : ""}</g>`;
  } });
  // tekne: rüzgâra bakar (ekranda yukarı), uzunluk perspektifte kısalır; komitede turuncu bayrak, pin botu küçük, finiş botu mavi bayrak
  const boat = (p, len, flag, cab) => items.push({ z: P(p)[2], d: () => {
    const [x, y, s] = P(p); const L = len * u * s, B = L * 0.42, fy = 0.5;
    const hull = `M${f(x)} ${f(y - L * fy)} Q${f(x + B * 0.7)} ${f(y - L * fy * 0.5)} ${f(x + B / 2)} ${f(y + L * fy * 0.45)} L${f(x - B / 2)} ${f(y + L * fy * 0.45)} Q${f(x - B * 0.7)} ${f(y - L * fy * 0.5)} ${f(x)} ${f(y - L * fy)} Z`;
    let s2 = `<ellipse cx="${f(x)}" cy="${f(y + L * 0.2)}" rx="${f(B * 0.9)}" ry="${f(L * 0.16)}" fill="#000" opacity=".25"/>`;
    s2 += `<path d="${hull}" fill="#9fb0c2" transform="translate(0 ${f(L * 0.08)})"/><path d="${hull}" fill="${WH}"/>`;
    if (cab) s2 += `<rect x="${f(x - B * 0.28)}" y="${f(y - L * 0.12)}" width="${f(B * 0.56)}" height="${f(L * 0.3)}" rx="${f(B * 0.08)}" fill="#cfd8e3"/><rect x="${f(x - B * 0.22)}" y="${f(y - L * 0.08)}" width="${f(B * 0.44)}" height="${f(L * 0.08)}" fill="#33475e"/>`;
    const mh = L * (cab ? 1.1 : 0.9);
    s2 += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x)}" y2="${f(y - mh)}" stroke="#e8edf3" stroke-width="${f(Math.max(1.2, 2 * u * s))}"/>`;
    s2 += `<path d="M${f(x)} ${f(y - mh)} L${f(x + L * 0.38)} ${f(y - mh + L * 0.1)} L${f(x)} ${f(y - mh + L * 0.22)} Z" fill="${flag}"/>`;
    return `<g>${s2}</g>`;
  } });
  // hat: iki uç arası ince açık çizgi + üstüne eğik yazı
  const lineLab = (a, b, txt, at = 0.72) => {
    const A = P(a), B = P(b);
    const ang = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI;
    const fl = Math.abs(ang) > 90 ? ang + 180 : ang;
    const m = [A[0] + (B[0] - A[0]) * at, A[1] + (B[1] - A[1]) * at], s = (A[2] + B[2]) / 2;
    return `<line x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}" stroke="#dfe7f0" stroke-opacity=".75" stroke-width="${f(5 * u * s)}" stroke-linecap="round"/><text transform="translate(${f(m[0])} ${f(m[1] - 14 * u * s)}) rotate(${f(fl)})" text-anchor="middle" font-size="${f(Math.max(14, 26 * u * s))}" font-weight="800" font-style="italic" letter-spacing="1" fill="#fff">${txt}</text>`;
  };
  const used = new Set(rt);
  buoy(g.m1, "1"); buoy(g.m1a, "");
  buoy(g.m2, "2");
  buoy(g.s3, ""); buoy(g.p3, "3");
  if (used.has("4")) { buoy(g.s4, ""); buoy(g.p4, "4"); }
  // tekneler parkura göre küçük (rota kartındaki gibi hat ve ayaklar öne çıksın)
  boat(g.komite, 72, "#ff8a3d", true);
  boat(g.pin, 38, "#ff8a3d", false);
  boat(g.fA, 42, "#3d8bff", false);
  // finiş hattının öbür ucu: küçük turuncu yuvarlak şamandıra (Seyhun 2026-11-02 "çizginin ucu boş kalmasın")
  items.push({ z: P(g.fB)[2], d: () => {
    const [x, y, s] = P(g.fB); const r = Math.max(6, 11 * u * s);
    return `<g><ellipse cx="${f(x)}" cy="${f(y + r * 0.2)}" rx="${f(r * 1.5)}" ry="${f(r * 0.45)}" fill="#000" opacity=".22"/><circle cx="${f(x)}" cy="${f(y - r * 0.6)}" r="${f(r)}" fill="#ff7a1a"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.95)}" r="${f(r * 0.35)}" fill="#fff" opacity=".35"/></g>`;
  } });
  // çizgiler ve rota (nesnelerin altında)
  let under = lineLab(g.pin, g.komite, "START", 0.3) + lineLab(g.fB, g.fA, "FİNİŞ", 0.25);
  if (rt.length) {
    const { legs, alt } = routePlan(g, rt);
    const n = legs.length;
    const T = 3.2 + n * 1.6; // bir tur: ayaklar sırayla çizilir, 2 sn bekler, solar
    const drawEnd = (n * 1.6 + 0.4) / T;
    let css = "";
    const pathOf = (pts) => pts.map((p, i) => { const [x, y] = P(p); return `${i ? "L" : "M"}${f(x)} ${f(y)}`; }).join(" ");
    const sw = (p) => f(Math.max(3, 9 * u * P(p)[2]));
    legs.forEach((leg, i) => {
      const a = ((i * 1.6) / T) * 100, b = (((i + 1) * 1.6) / T) * 100;
      css += `@keyframes ${pre}-l${i}{0%,${f(a)}%{stroke-dashoffset:1;opacity:1}${f(b)}%{stroke-dashoffset:0;opacity:1}92%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}.${pre}-l${i}{animation:${pre}-l${i} ${f(T)}s linear infinite}`;
      // derinliğe göre kalınlık: parça parça çiz (yakında kalın, uzakta ince)
      const segs = [];
      for (let k = 1; k < leg.length; k++) segs.push([leg[k - 1], leg[k]]);
      under += `<path class="${pre}-l${i}" pathLength="1" stroke-dasharray="1 1" d="${pathOf(leg)}" fill="none" stroke="${Y_}" stroke-width="${sw(leg[Math.floor(leg.length / 2)])}" stroke-linecap="round" stroke-linejoin="round"/>`;
      // ayak sonu ok başı
      const e = P(leg.at(-1)), e0 = P(leg.at(-2));
      const ang = (Math.atan2(e[1] - e0[1], e[0] - e0[0]) * 180) / Math.PI;
      const hs = Math.max(8, 20 * u * e[2]);
      css += `@keyframes ${pre}-h${i}{0%,${f(b - 0.1)}%{opacity:0}${f(b)}%,92%{opacity:1}100%{opacity:0}}.${pre}-h${i}{animation:${pre}-h${i} ${f(T)}s linear infinite}`;
      under += `<path class="${pre}-h${i}" d="M${f(hs)} 0 L${f(-hs * 0.6)} ${f(-hs * 0.75)} L${f(-hs * 0.6)} ${f(hs * 0.75)} Z" fill="${Y_}" transform="translate(${f(e[0])} ${f(e[1])}) rotate(${f(ang)})"/>`;
    });
    // kapıda öbür seçenek: aynı anda soluk sarı kanca
    alt.forEach(({ after, pts }, i) => {
      const at = ((after + 1) * 1.6) / T;
      css += `@keyframes ${pre}-a${i}{0%,${f(at * 100 - 7)}%{stroke-dashoffset:1;opacity:1}${f(at * 100)}%,92%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}.${pre}-a${i}{animation:${pre}-a${i} ${f(T)}s linear infinite}`;
      under += `<path class="${pre}-a${i}" pathLength="1" stroke-dasharray="1 1" d="${pathOf(pts)}" fill="none" stroke="${Y_}" stroke-width="${sw(pts[1])}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".75"/>`;
      const e = P(pts.at(-1)), e0 = P(pts.at(-2));
      const ang = (Math.atan2(e[1] - e0[1], e[0] - e0[0]) * 180) / Math.PI, hs = Math.max(8, 20 * u * e[2]);
      css += `@keyframes ${pre}-ah${i}{0%,${f(at * 100 - 0.1)}%{opacity:0}${f(at * 100)}%,92%{opacity:.6}100%{opacity:0}}.${pre}-ah${i}{animation:${pre}-ah${i} ${f(T)}s linear infinite}`;
      under += `<path class="${pre}-ah${i}" d="M${f(hs)} 0 L${f(-hs * 0.6)} ${f(-hs * 0.75)} L${f(-hs * 0.6)} ${f(hs * 0.75)} Z" fill="${Y_}" transform="translate(${f(e[0])} ${f(e[1])}) rotate(${f(ang)})"/>`;
    });
    // çizim bitince rota üzerinde akan oklar (hareketli)
    const full = legs.flat();
    const d = pathOf(full);
    css += `@keyframes ${pre}-flow{0%,${f(drawEnd * 100)}%{opacity:0}${f(drawEnd * 100 + 3)}%,90%{opacity:1}96%,100%{opacity:0}}.${pre}-flow{animation:${pre}-flow ${f(T)}s linear infinite}`;
    let chev = "";
    for (let i = 0; i < 4; i++) chev += `<path d="M7 0 L-5 -6 L-2 0 L-5 6 Z" fill="#fff"><animateMotion dur="6s" begin="${f(-i * 1.5)}s" repeatCount="indefinite" rotate="auto" path="${d}"/></path>`;
    under += `<g class="${pre}-flow">${chev}</g>`;
    o += `<style>${css}@media (prefers-reduced-motion: reduce){[class^="${pre}-"]{animation:none!important}}</style>`;
  }
  o += under;
  items.sort((a, b) => a.z - b.z);
  o += items.map((it) => it.d()).join("");
  // rüzgâr: sol üstte ok (ekranda yukarıdan aşağı esen = eksende), değer
  if (wind && card.wind != null) {
    const sh = nrm(card.wind - g.A + 180) - 180;
    o += `<g transform="translate(${f(70 * u)} ${f(78 * u)})"><g transform="rotate(${f(sh)})"><line x1="0" y1="${f(-26 * u)}" x2="0" y2="${f(16 * u)}" stroke="#fff" stroke-width="${f(4 * u)}" stroke-linecap="round"/><path d="M0 ${f(30 * u)} L${f(-11 * u)} ${f(12 * u)} L${f(11 * u)} ${f(12 * u)} Z" fill="#fff"/></g><text x="${f(34 * u)}" y="${f(-2 * u)}" font-size="${f(26 * u)}" font-weight="700" fill="#fff">${Math.round(card.wind)}°${card.kn != null ? ` · ${card.kn} kn` : ""}</text><text x="${f(34 * u)}" y="${f(24 * u)}" font-size="${f(17 * u)}" font-weight="500" fill="#fff" opacity=".7">Rüzgâr</text></g>`;
  }
  if (title) o += `<text x="${f(W / 2)}" y="${f(H - 26 * u)}" text-anchor="middle" font-size="${f(24 * u)}" font-weight="600" letter-spacing="${f(1.5 * u)}" fill="#fff" opacity=".88">${title}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Inter,sans-serif">${o}</svg>`;
}
