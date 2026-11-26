/* Velora Sailing – tekne sınıfına göre üstten görünüş (SVG)
   Ölçüler engine.js → BOAT_MODELS (mm). Her sınıf 1 tekne boyu = 50 px; tekne yerel koordinatı: baş −y, merkez (0,0).
   Optimist: baştan da kıçtan da düz aynalı kutu gövde (pram), açık tekne içi, yüzdürme torbaları, öne yakın direk,
   gırcala yelkeni (tepe köşesi gırcalayla kaldırılır; üstten yelkenin bükülmüş üst kısmı ve gırcala görünür), uzun bumba.
   ILCA: sivri baş, dar uzun gövde, kapalı güverte, kıçta küçük kokpit ve trevel, üçgen yelken.
   Kullanım: BoatDraw.draw(g, cls, { color, pose, t, seed, stroke, heading, speed, rich }) – g zaten tekneye taşınmış ve döndürülmüş olmalı.
   Zengin çizim (rich, varsayılan açık): suya düşen gövde/yelken gölgesi (güneş sabit, heading ile yerel koordinata çevrilir),
   gövdede ışık-gölge gradyanı, yelkende kambur gölgesi, speed (0..1,4 ≈ hız/taban hız) ile dümen suyu ve baş dalgası. */
(function (global) {
  const E = global.SailEngine, NS = 'http://www.w3.org/2000/svg', DEG = Math.PI / 180;
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const f1 = v => (Math.round(v * 10) / 10).toString();
  const cache = new Map();

  // Catmull-Rom → kübik Bezier; noktalar [x,y]
  function smooth(pts) {
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return d;
  }
  // Güverte hattı (inset mm içeriden): sağ yan baştan kıça, kıç aynası, sol yan kıçtan başa
  function outline(m, inset) {
    const K = E.BOAT_LEN_PX / m.loa, L = m.loa, i = inset || 0;
    const right = m.plan.map(([s, h]) => [Math.max(0, h - i) * K, (i + s * (L - 2 * i) / L - L / 2) * K]);
    const left = right.map(([x, y]) => [-x, y]).reverse();
    const b = right[0];
    return `M${f1(-b[0])},${f1(b[1])}` + (b[0] > 0.05 ? ` L${f1(b[0])},${f1(b[1])}` : '') + smooth(right) +
      ` L${f1(left[0][0])},${f1(left[0][1])}` + smooth(left) + ' Z';
  }
  // istasyondaki yarı genişlik (mm), doğrusal ara değer
  function halfAt(m, s) {
    const p = m.plan;
    if (s <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) if (s <= p[i][0]) return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * (s - p[i - 1][0]) / (p[i][0] - p[i - 1][0]);
    return p[p.length - 1][1];
  }
  function geo(cls) {
    const key = cls && cls.startsWith('ilca') ? 'ilca' : 'optimist';
    if (cache.has(key)) return cache.get(key);
    const m = E.boatModel(key === 'ilca' ? 'ilca7' : 'optimist'), K = E.BOAT_LEN_PX / m.loa;
    const g = { m, K, hull: outline(m, 0), inner: outline(m, m.rig === 'sprit' ? 45 : 55), Y: s => (s - m.loa / 2) * K, X: s => halfAt(m, s) * K };
    cache.set(key, g);
    return g;
  }
  const hullPath = cls => geo(cls).hull;

  // Ortak gradyanlar: belgede bir kez, görünmez bir <svg> içinde (url(#…) her SVG'den erişilir)
  let defsReady = false;
  function ensureDefs() {
    if (defsReady || typeof document === 'undefined' || !document.body) return defsReady;
    const svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
    const d = el('defs', {}, svg);
    const grad = (id, attrs, stops) => { const g = el('linearGradient', Object.assign({ id }, attrs), d); for (const [o, c, a] of stops) el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g); };
    // gövde: bordalar koyu, ortası (güverte tepesi) parlak; simetrik, yöne bağlı değil
    grad('bdHull', { x1: 0, y1: 0, x2: 1, y2: 0 }, [[0, '#020617', 0.42], [0.18, '#020617', 0.1], [0.42, '#ffffff', 0.2], [0.5, '#ffffff', 0.32], [0.58, '#ffffff', 0.2], [0.82, '#020617', 0.1], [1, '#020617', 0.42]]);
    // baştan kıça hafif ışık düşüşü
    grad('bdHullL', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#ffffff', 0.16], [0.5, '#ffffff', 0], [1, '#020617', 0.18]]);
    document.body.appendChild(svg);
    return (defsReady = true);
  }
  // dünya (ekran) yönündeki gölge kaydırmasını teknenin yerel koordinatına çevir
  const SUN = { x: 4.2, y: 5.4 };
  function localOff(h, k) {
    const a = (h || 0) * DEG, c = Math.cos(a), sn = Math.sin(a);
    return { x: (SUN.x * c + SUN.y * sn) * k, y: (-SUN.x * sn + SUN.y * c) * k };
  }

  function draw(g, cls, o) {
    o = o || {};
    const G = geo(cls), m = G.m, K = G.K, Y = G.Y, X = G.X;
    const stroke = o.stroke === undefined ? '#fff' : o.stroke;
    const rich = o.rich !== false && ensureDefs();
    const yS0 = Y(m.loa), yB0 = Y(0), spd = Math.max(0, Math.min(1.4, o.speed || 0));
    if (rich && spd > 0.05) {
      // dümen suyu: kıçtan iki yana açılan köpük izi ve baş dalgası; hızla uzar, hafifçe titreşir
      const t = o.t || 0, seed = o.seed || 0, len = 12 + 24 * spd, sp = 0.32, wb = X(m.loa * 0.92) + 1;
      const wob = k => (Math.sin(t * 5 + seed + k) * 1.2).toFixed(1);
      for (const sd of [-1, 1]) {
        el('path', { d: `M${f1(sd * wb)},${f1(yS0 - 2)} Q${f1(sd * (wb + len * sp * 0.45))},${f1(yS0 + len * 0.5)} ${f1(sd * (wb + len * sp) + +wob(sd))},${f1(yS0 + len)}`,
          fill: 'none', stroke: '#e0f2fe', 'stroke-opacity': (0.14 + 0.22 * Math.min(1, spd)).toFixed(2), 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g);
      }
      el('path', { d: `M${f1(-wb * 0.7)},${f1(yS0)} Q0,${f1(yS0 + len * 0.7)} ${f1(wb * 0.7)},${f1(yS0)}`, fill: '#e0f2fe', 'fill-opacity': (0.06 + 0.1 * Math.min(1, spd)).toFixed(2) }, g);
      const bw = X(m.loa * 0.06) + 1.5;
      el('path', { d: `M${f1(-bw - 3)},${f1(yB0 + 9)} Q${f1(-bw * 0.6)},${f1(yB0 - 3.5)} 0,${f1(yB0 - 4)} Q${f1(bw * 0.6)},${f1(yB0 - 3.5)} ${f1(bw + 3)},${f1(yB0 + 9)}`,
        fill: 'none', stroke: '#f0f9ff', 'stroke-opacity': (0.25 + 0.35 * Math.min(1, spd)).toFixed(2), 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
    }
    const sho = rich ? localOff(o.heading, 1) : null;
    if (rich) el('path', { d: G.hull, fill: '#010c18', 'fill-opacity': 0.38, transform: `translate(${f1(sho.x)},${f1(sho.y)})` }, g);   // suya düşen gölge
    el('path', { d: G.hull, fill: o.color || '#888', stroke: stroke || 'none', 'stroke-width': o.strokeW || 1.5, 'stroke-linejoin': 'round' }, g);
    if (rich) { el('path', { d: G.hull, fill: 'url(#bdHull)' }, g); el('path', { d: G.hull, fill: 'url(#bdHullL)' }, g); }
    const yS = Y(m.loa);                                                     // kıç aynası
    if (m.rig === 'sprit') {
      // açık tekne içi (koyu), yüzdürme torbaları (açık), direk ve orta oturak (thwart), salma yuvası
      el('path', { d: G.inner, fill: 'rgba(8,20,34,.24)' }, g);
      const inH = s => Math.max(0, X(s) - 45 * K);
      for (const [a, b, wk] of m.bags) {
        if (wk >= 0.6) { const w = Math.min(inH(a), inH(b)) * wk; el('rect', { x: f1(-w), y: f1(Y(a)), width: f1(2 * w), height: f1((b - a) * K), rx: 2, fill: 'rgba(240,244,248,.62)' }, g); }
        else for (const sd of [-1, 1]) {
          const w = Math.min(inH(a), inH(b)) * wk, x0 = sd > 0 ? Math.min(inH(a), inH(b)) - w : -Math.min(inH(a), inH(b));
          el('rect', { x: f1(x0), y: f1(Y(a)), width: f1(w), height: f1((b - a) * K), rx: 2.2, fill: 'rgba(240,244,248,.62)' }, g);
        }
      }
      const thw = (s, h) => el('rect', { x: f1(-inH(s)), y: f1(Y(s) - h * K / 2), width: f1(2 * inH(s)), height: f1(h * K), fill: 'rgba(255,255,255,.4)' }, g);
      thw(m.mast, 80); thw(m.board.at, 110);
    } else {
      // kapalı güverte (açık ton), kokpit (koyu), trevel
      el('path', { d: G.inner, fill: 'rgba(255,255,255,0.18)' }, g);
      const c = m.cockpit, cw = c.w * K, y0 = Y(c.from), y1 = Y(c.to);
      el('path', { d: `M${f1(-cw * 0.8)},${f1(y0)} L${f1(cw * 0.8)},${f1(y0)} Q${f1(cw)},${f1(y0)} ${f1(cw)},${f1(y0 + 3)} L${f1(cw * 0.92)},${f1(y1 - 1.5)} Q${f1(cw * 0.9)},${f1(y1)} ${f1(cw * 0.7)},${f1(y1)} L${f1(-cw * 0.7)},${f1(y1)} Q${f1(-cw * 0.9)},${f1(y1)} ${f1(-cw * 0.92)},${f1(y1 - 1.5)} L${f1(-cw)},${f1(y0 + 3)} Q${f1(-cw)},${f1(y0)} ${f1(-cw * 0.8)},${f1(y0)} Z`,
        fill: 'rgba(8,20,34,.3)' }, g);
      const ty = yS - 130 * K, tw = X(m.loa - 130) * 0.62;
      el('line', { x1: f1(-tw), y1: f1(ty), x2: f1(tw), y2: f1(ty), stroke: 'rgba(15,23,42,.55)', 'stroke-width': 0.9 }, g);
    }
    // salma yuvası (üstten salmanın başı)
    const bd = m.board;
    el('rect', { x: f1(-bd.w * K / 2 - 0.4), y: f1(Y(bd.at - bd.len / 2)), width: f1(bd.w * K + 0.8), height: f1(bd.len * K), rx: 0.8, fill: 'rgba(15,23,42,.75)' }, g);
    // dümen (kıçın arkasında) ve yeke
    el('rect', { x: -1, y: f1(yS - 0.5), width: 2, height: 3.2, rx: 0.8, fill: '#1e293b' }, g);
    el('line', { x1: 0, y1: f1(yS), x2: 0, y2: f1(Y(m.loa - m.rudder.tiller)), stroke: '#3f2d1c', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, g);

    // yelken
    const my = Y(m.mast), L = m.boom * K, t = o.t || 0, seed = o.seed || 0;
    let sh = null;
    // yelken: gölgesi suya/güverteye düşer; kumaş kamburu ortadaki dikiş çizgisiyle ve rüzgaraltı yüzün gölgesiyle görünür
    const sailFill = sh => {
      if (rich) { const so = localOff(o.heading, 3.2); el('path', { d: sh.d, fill: '#010c18', 'fill-opacity': 0.22, transform: `translate(${f1(so.x)},${f1(so.y)})` }, g); }
      el('path', { d: sh.d, fill: 'rgba(255,255,255,0.88)', stroke: '#fff', 'stroke-width': 1 }, g);
      if (rich && sh.tip) {
        const pose2 = Object.assign({}, o.pose, { belly: o.pose.belly * L / 27 * 0.45 });
        const mid = E.sailShape(pose2, o.t || 0, o.seed || 0, L, my);
        el('path', { d: mid.d, fill: '#64748b', 'fill-opacity': 0.16, stroke: 'rgba(100,116,139,.45)', 'stroke-width': 0.6 }, g);
      }
    };
    if (o.pose) {
      const pose = Object.assign({}, o.pose, { belly: o.pose.belly * L / 27 });
      if (m.rig === 'sprit') {
        // gırcala yelkeni: tepe köşesi yelkenin üst kısmıyla birlikte bumbadan daha dışa bükülür (twist)
        const sg = Math.abs(pose.beta) < 1 ? 0 : Math.sign(pose.beta), a = (pose.beta + sg * (9 + 14 * pose.flutter) + pose.flutter * 4 * Math.sin(t * 11 + seed)) * DEG;
        const d = L * 0.66, pk = { x: Math.sin(a) * d, y: my + Math.cos(a) * d };
        sh = E.sailShape(pose, t, seed, L, my);
        if (rich) { const so = localOff(o.heading, 2.2); el('path', { d: `M0,${f1(my)} L${f1(pk.x)},${f1(pk.y)} L${f1(sh.tip.x)},${f1(sh.tip.y)} Z`, fill: '#010c18', 'fill-opacity': 0.2, transform: `translate(${f1(so.x)},${f1(so.y)})` }, g); }
        el('path', { d: `M0,${f1(my)} L${f1(pk.x)},${f1(pk.y)} L${f1(sh.tip.x)},${f1(sh.tip.y)} Z`, fill: 'rgba(255,255,255,.42)', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 0.8 }, g);
        sailFill(sh);
        el('line', { x1: 0, y1: f1(my), x2: f1(pk.x), y2: f1(pk.y), stroke: '#5b4630', 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);
      } else {
        sh = E.sailShape(pose, t, seed, L, my);
        sailFill(sh);
      }
      el('line', { x1: 0, y1: f1(my), x2: f1(sh.tip.x), y2: f1(sh.tip.y), stroke: '#222', 'stroke-width': 1.5 }, g);
    }
    el('circle', { cx: 0, cy: f1(my), r: m.rig === 'sprit' ? 1.8 : 2.1, fill: '#222' }, g);
    return { tip: sh && sh.tip, mast: { x: 0, y: my } };
  }

  global.BoatDraw = { draw, hullPath, geo };
})(typeof window !== 'undefined' ? window : globalThis);
