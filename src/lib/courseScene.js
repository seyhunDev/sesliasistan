// Parkur sahnesi (Seyhun 2026-11-02, olimpiyat yayını örneği): rota kartındaki parkur denizin üstünde eğik (kameradan bakar gibi) çizilir;
// komite botu ve pin botu arasında START, sarı şamandıralar, finiş botu ve hattı; seçilen rota (ör. 1 · 2 · 3 · F) ayak ayak sarı okla
// çizilir, sonra oklar rota boyunca akar. Şamandıra yerleri rota kartıyla aynı (courseCard geom): kart değişince sahne de değişir.
// Dönüşler: şamandıralar iskeleden (sola dönerek), kapıda (3, 4) iki seçenek: s sancaktan, p iskeleden.
import { geom } from "@/lib/courseCard";
import { dirShort } from "@/lib/raceLive";

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
export function routePlan(g, route) {
  const r = Math.max(22, g.L * 0.045);
  const way = [];
  for (const t of route) {
    if (t === "1") way.push({ m: g.m1, side: 1, t: "1" }, ...(g.up ? [] : [{ m: g.m1a, side: 1, t: "1A", join: true }]));
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
      // finişe gidiliyorsa kapının ortasından düz geçilir (ara nokta yok: çizgi kırılmasın, Seyhun 2026-11-02 "çizgiler düzgün olsun")
      if (!nx || (nx.end && !g.up)) {
        leg.push(w.gm);
        cur = w.gm;
        return;
      }
      const entry = add(w.gm, g.A, g.L * 0.16);
      leg.push(entry);
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

// Örnek tekne (Seyhun 2026-11-02 "avantajlı taraftan bir nokta başlasın, iz bıraksın, tramola atsın"): start hattının avantajlı
// ucundan (şimdiki rüzgâra göre hat açısı) kalkar, rüzgâra 45° ile orsa çıkar, gerekirse bir tramola daha atar; pupada 30° açıkla
// kavança atar; apaz düz. Şamandıra dönüşleri rota okundaki gibi. Dönüş: { start, end: "pin"|"komite"|"", deg, pts }
const BEAT = 45, RUN = 30;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
function zig(a, b, h1, h2, prefer, long) {
  // b − a = s·u1 + t·u2 (iki kontra); s, t ≥ 0 olmalı
  const [u1, u2] = [dirv(h1, 1), dirv(h2, 1)];
  const [dx, dy] = sub(b, a);
  const det = u1[0] * u2[1] - u1[1] * u2[0];
  if (Math.abs(det) < 1e-9) return [b];
  let s = (dx * u2[1] - dy * u2[0]) / det, t = (u1[0] * dy - u1[1] * dx) / det;
  if (s < 0 || t < 0) return [b];
  let [p, q, us, ut] = prefer === 2 ? [t, s, u2, u1] : [s, t, u1, u2];
  const len = p + q;
  const go = (pt, u, m) => [pt[0] + u[0] * m, pt[1] + u[1] * m];
  // uzun ayakta iki tramola daha (ortada bir kez kontra değiştirir), kısa ayakta tek dönüş
  if (len > long) {
    const A = go(a, us, p * 0.6), B = go(A, ut, q * 0.5), C = go(B, us, p * 0.4);
    return [A, B, C, b];
  }
  return [go(a, us, p), b];
}
export function sailPlan(g, route, wind) {
  const rt = cleanRoute(route);
  const W = wind ?? g.A;
  const d = nrm(nrm(W + 90) - g.lineDeg + 180) - 180; // − komite, + pin önde (raceCourse lineBias ile aynı)
  const end = Math.abs(d) < 2 ? "" : d < 0 ? "pin" : "komite";
  const inset = (from, to) => [from[0] + (to[0] - from[0]) * 0.12, from[1] + (to[1] - from[1]) * 0.12];
  const start = end === "pin" ? inset(g.pin, g.komite) : end === "komite" ? inset(g.komite, g.pin) : g.mid;
  if (!rt.length) return { start, end, deg: Math.round(Math.abs(d)), pts: [start] };
  const { legs } = routePlan(g, rt);
  const pts = [start];
  let head = nrm(W - BEAT); // starttan sancak kontra
  legs.forEach((leg, li) => {
    for (let k = 1; k < leg.length; k++) {
      const a = pts.at(-1), b = leg[k];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const hb = brg(a, b);
      const off = Math.abs(nrm(hb - W + 180) - 180);
      let run = [b];
      if (dist > g.L * 0.12 && off < BEAT) run = zig(a, b, nrm(W - BEAT), nrm(W + BEAT), li === 0 && k === 1 ? 1 : Math.abs(nrm(head - (W - BEAT) + 180) - 180) < 20 ? 1 : 2, g.L * 0.7);
      else if (dist > g.L * 0.12 && off > 180 - RUN) run = zig(a, b, nrm(W + 180 - RUN), nrm(W + 180 + RUN), Math.abs(nrm(head - (W + 180 - RUN) + 180) - 180) < 60 ? 1 : 2, g.L * 0.7);
      for (const p of run) { head = brg(pts.at(-1), p); pts.push(p); }
    }
  });
  return { start, end, deg: Math.round(Math.abs(d)), pts };
}

// Sahne: { W, H } piksel, rota, isteğe bağlı pre (animasyon adları için önek), title (alt yazı)
export function sceneSvg(card, route, { W = 1600, H = 900, pre = "cs", title = "", wind = true, sea = false, sail = false, sailT = 16 } = {}) {
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
  // hat: iki uç arası ince açık çizgi; yazı hattın ORTASINDA, hattın hemen altında (kameraya doğru), nesnelerin üstünde, koyu kenarlı
  // (Seyhun 2026-11-02 "start ve finiş yazıları ortada olmalı, turuncu işaretin arkasına düşüyor")
  let labels = "";
  const lineLab = (a, b, txt) => {
    const A = P(a), B = P(b);
    const ang = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI;
    const fl = Math.abs(ang) > 90 ? ang + 180 : ang;
    const s = (A[2] + B[2]) / 2;
    const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const fs = Math.max(15, 24 * u * s);
    // ekranda aşağı bakan dik yön (yazı hattın altına)
    let nx = -(B[1] - A[1]), ny = B[0] - A[0];
    const nl = Math.hypot(nx, ny) || 1;
    if (ny < 0) { nx = -nx; ny = -ny; }
    const off = 10 * u * s + fs * 0.9;
    const tx = m[0] + (nx / nl) * off, ty = m[1] + (ny / nl) * off;
    labels += `<text transform="translate(${f(tx)} ${f(ty)}) rotate(${f(fl)})" text-anchor="middle" dominant-baseline="middle" font-size="${f(fs)}" font-weight="800" letter-spacing="${f(2 * u)}" fill="#fff" stroke="#0b1a2a" stroke-opacity=".55" stroke-width="${f(4 * u)}" paint-order="stroke" stroke-linejoin="round">${txt}</text>`;
    return `<line x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}" stroke="#dfe7f0" stroke-opacity=".8" stroke-width="${f(4 * u * s)}" stroke-linecap="round"/>`;
  };
  const used = new Set(rt);
  buoy(g.m1, "1"); if (!g.up) buoy(g.m1a, "");
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
  let under = lineLab(g.pin, g.komite, "START") + lineLab(g.fB, g.fA, "FİNİŞ");
  if (rt.length) {
    const { legs, alt } = routePlan(g, rt);
    const n = legs.length;
    const T = 3.2 + n * 1.6; // bir tur: ayaklar sırayla çizilir, 2 sn bekler, solar
    const drawEnd = (n * 1.6 + 0.4) / T;
    let css = "";
    const pathOf = (pts) => pts.map((p, i) => { const [x, y] = P(p); return `${i ? "L" : "M"}${f(x)} ${f(y)}`; }).join(" ");
    const sw = () => f(Math.max(3, 7 * u)); // tek kalınlık: ayaklar arasında kalınlık farkı yamuk gösteriyordu
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
      const hs = Math.max(8, 16 * u);
      css += `@keyframes ${pre}-h${i}{0%,${f(b - 0.1)}%{opacity:0}${f(b)}%,92%{opacity:1}100%{opacity:0}}.${pre}-h${i}{animation:${pre}-h${i} ${f(T)}s linear infinite}`;
      under += `<path class="${pre}-h${i}" d="M${f(hs)} 0 L${f(-hs * 0.6)} ${f(-hs * 0.75)} L${f(-hs * 0.6)} ${f(hs * 0.75)} Z" fill="${Y_}" transform="translate(${f(e[0])} ${f(e[1])}) rotate(${f(ang)})"/>`;
    });
    // kapıda öbür seçenek: aynı anda soluk sarı kanca
    alt.forEach(({ after, pts }, i) => {
      const at = ((after + 1) * 1.6) / T;
      css += `@keyframes ${pre}-a${i}{0%,${f(at * 100 - 7)}%{stroke-dashoffset:1;opacity:1}${f(at * 100)}%,92%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}.${pre}-a${i}{animation:${pre}-a${i} ${f(T)}s linear infinite}`;
      under += `<path class="${pre}-a${i}" pathLength="1" stroke-dasharray="1 1" d="${pathOf(pts)}" fill="none" stroke="${Y_}" stroke-width="${sw(pts[1])}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".75"/>`;
      const e = P(pts.at(-1)), e0 = P(pts.at(-2));
      const ang = (Math.atan2(e[1] - e0[1], e[0] - e0[0]) * 180) / Math.PI, hs = Math.max(8, 16 * u);
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
  if (sail && rt.length) {
    // örnek tekne: sarı rota soluk ve sabit kalır, beyaz nokta avantajlı uçtan kalkıp iz bırakarak gider (iz ve nokta aynı hızda)
    under = under.replace(new RegExp(`class="${pre}-(l|h|a|ah)\\d+"`, "g"), 'opacity=".6"').replace(/<g class="[^"]*-flow">[\s\S]*?<\/g>/, "");
    o = o.replace(/<style>[\s\S]*?<\/style>/, "");
    const sp = sailPlan(g, rt, card.wind);
    // köşeler yuvarlatılır (tramola ve kavança kısa yay gibi görünsün)
    const q = sp.pts.map((p) => P(p));
    let d = `M${f(q[0][0])} ${f(q[0][1])}`;
    for (let i = 1; i < q.length; i++) {
      const [a, b, c] = [q[i - 1], q[i], q[i + 1]];
      if (!c) { d += ` L${f(b[0])} ${f(b[1])}`; break; }
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const r = Math.min(14 * u, la / 3, lc / 3);
      if (r < 1) { d += ` L${f(b[0])} ${f(b[1])}`; continue; }
      d += ` L${f(b[0] - ((b[0] - a[0]) / la) * r)} ${f(b[1] - ((b[1] - a[1]) / la) * r)} Q${f(b[0])} ${f(b[1])} ${f(b[0] + ((c[0] - b[0]) / lc) * r)} ${f(b[1] + ((c[1] - b[1]) / lc) * r)}`;
    }
    const T = sailT;
    const anim = `dur="${T}s" repeatCount="indefinite"`;
    under += `<path d="${d}" pathLength="1" stroke-dasharray="1 1" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="${f(Math.max(2, 3.5 * u))}" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;.88;1" ${anim}/></path>`;
    under += `<g><circle r="${f(13 * u)}" fill="#fff" opacity=".25"/><circle r="${f(7 * u)}" fill="#fff"/><animateMotion ${anim} keyPoints="0;1;1" keyTimes="0;.88;1" calcMode="linear" path="${d}"/></g>`;
    if (sp.end) {
      const e = P(sp.start);
      labels += `<text x="${f(e[0])}" y="${f(e[1] + 58 * u)}" text-anchor="middle" font-size="${f(19 * u)}" font-weight="700" letter-spacing="${f(1.5 * u)}" fill="#ffd400" stroke="#0b1a2a" stroke-opacity=".55" stroke-width="${f(4 * u)}" paint-order="stroke">${sp.end === "pin" ? "PİN" : "KOMİTE"} AVANTAJLI · ${sp.deg}°</text>`;
    }
  }
  o += under;
  items.sort((a, b) => a.z - b.z);
  o += items.map((it) => it.d()).join("");
  o += labels;
  // rüzgâr: sol üstte ok (ekranda yukarıdan aşağı esen = eksende), değer
  // rüzgâr (Seyhun 2026-11-02 "parkurda rüzgâr yönü yok"): parkurun sağ üstünde, ekranda rüzgârın estiği yöne dönen büyük ok;
  // ok parkur eksenine göre çizilir (parkur yukarı bakar), rüzgâr eksenden döndüyse ok da o kadar yatık
  if (wind && card.wind != null) {
    const sh = nrm(card.wind - g.A + 180) - 180;
    const pts = ["komite", "pin", "m1", "m1a", "m2", "s3", "p3", "fA", "fB"].map((k) => P(g[k]));
    const wx = Math.min(W - 190 * u, Math.max(...pts.map((p) => p[0])) + 110 * u), wy = Math.max(70 * u, Math.min(...pts.map((p) => p[1])) + 30 * u);
    const L = 46 * u;
    o += `<g transform="translate(${f(wx)} ${f(wy)})"><circle r="${f(L * 1.05)}" fill="#071a2e" fill-opacity=".55" stroke="#fff" stroke-opacity=".25" stroke-width="${f(1.5 * u)}"/><g transform="rotate(${f(sh)})"><line x1="0" y1="${f(-L * 0.8)}" x2="0" y2="${f(L * 0.35)}" stroke="#fff" stroke-width="${f(6 * u)}" stroke-linecap="round"/><path d="M0 ${f(L * 0.82)} L${f(-L * 0.36)} ${f(L * 0.22)} L${f(L * 0.36)} ${f(L * 0.22)} Z" fill="#fff"/></g>`;
    o += `<text x="0" y="${f(L * 1.05 + 28 * u)}" text-anchor="middle" font-size="${f(24 * u)}" font-weight="800" fill="#fff" stroke="#0b1a2a" stroke-opacity=".55" stroke-width="${f(4 * u)}" paint-order="stroke">${dirShort(card.wind)} · ${Math.round(card.wind)}°</text>`;
    o += `<text x="0" y="${f(L * 1.05 + 52 * u)}" text-anchor="middle" font-size="${f(18 * u)}" font-weight="600" fill="#fff" fill-opacity=".8" stroke="#0b1a2a" stroke-opacity=".5" stroke-width="${f(3 * u)}" paint-order="stroke">${card.kn != null ? `Rüzgâr ${card.kn} knot` : "Rüzgâr"}</text></g>`;
  }
  if (title) o += `<text x="${f(W / 2)}" y="${f(H - 26 * u)}" text-anchor="middle" font-size="${f(24 * u)}" font-weight="600" letter-spacing="${f(1.5 * u)}" fill="#fff" opacity=".88">${title}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Inter,sans-serif">${o}</svg>`;
}
