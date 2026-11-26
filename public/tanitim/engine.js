/* Velora Sailing – taktik animasyon motoru
   Koordinatlar: SVG, y aşağı doğru. Pusula: 0° = ekranın üstü (kuzey), 90° = sağ.
   windFrom: rüzgarın GELDİĞİ yön. heading: teknenin baktığı yön.
   TWA = heading - windFrom.  TWA < 0 → sancak kontra (rüzgar sancaktan), bumba iskeleye açılır.
*/
(function (global) {
  const DEG = Math.PI / 180;
  const norm180 = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
  const norm360 = a => ((a % 360) + 360) % 360;
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpAngle = (a, b, k) => a + norm180(b - a) * k;
  const fwd = h => ({ x: Math.sin(h * DEG), y: -Math.cos(h * DEG) });

  // ---------- Rüzgar ----------
  function windAt(wind, t) {
    if (typeof wind === 'number') return wind;
    if (typeof wind === 'function') return wind(t);
    const ks = wind;
    if (t <= ks[0].t) return ks[0].from;
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i].t) {
        const k = (t - ks[i - 1].t) / (ks[i].t - ks[i - 1].t);
        // yumuşak geçiş
        const s = k * k * (3 - 2 * k);
        return lerpAngle(ks[i - 1].from, ks[i].from, s);
      }
    }
    return ks[ks.length - 1].from;
  }

  const CLOSE_HAULED = 45;   // orsa açısı
  const RUN = 150;           // pupa VMG açısı (tam pupa 180)

  function tackHeading(windFrom, tack, angle) {
    angle = angle == null ? CLOSE_HAULED : angle;
    return tack === 'starboard' ? windFrom - angle : windFrom + angle;
  }
  function runHeading(windFrom, tack, angle) {
    angle = angle == null ? RUN : angle;
    // pupada sancak kontra: rüzgar sancak kıçtan → heading = windFrom - 150
    return tack === 'starboard' ? windFrom - angle : windFrom + angle;
  }

  // ---------- Hız modeli (göreli, px/s) ----------
  function speedFor(twaAbs, base) {
    if (twaAbs < 30) return base * 0.15;          // rüzgara karşı: durur
    if (twaAbs < 40) return base * 0.55;          // çok orsa (pinch)
    if (twaAbs < 60) return base;                 // orsa
    if (twaAbs < 120) return base * 1.15;         // apaz – en hızlı
    if (twaAbs < 165) return base * 1.0;          // geniş apaz
    return base * 0.8;                            // tam pupa
  }

  // ---------- Tekne sınıfı ve hızlanma (simülatör ve senaryolar ortak) ----------
  // Orsa tekne hızı (knot), rüzgar hızına (knot) göre. Kaynak: sınıfların bilinen ortalama orsa hızları
  // (Optimist: hafif havada ~2.5, orta havada ~3.5-4, kuvvetlide fazla güçlenir, artmaz; ILCA: 10 knot üstünde ~5-5.5).
  // acc: hızlanma süresi sabiti (gerçek sn) – yelkeni doldurduktan sonra tam hıza ~3×acc sn'de çıkar.
  const BOAT_CLASSES = {
    optimist: { name: 'Optimist', acc: 4, up: [[3, 1.9], [4, 2.4], [6, 3.0], [8, 3.5], [10, 3.8], [12, 4.0], [14, 4.1], [16, 4.1], [20, 3.9], [25, 3.6]] },
    ilca4: { name: 'ILCA 4', acc: 5, up: [[3, 2.0], [4, 2.6], [6, 3.5], [8, 4.1], [10, 4.5], [12, 4.7], [14, 4.8], [16, 4.8], [20, 4.7], [25, 4.5]] },
    ilca6: { name: 'ILCA 6', acc: 5, up: [[3, 2.1], [4, 2.8], [6, 3.7], [8, 4.4], [10, 4.8], [12, 5.1], [14, 5.2], [16, 5.3], [20, 5.3], [25, 5.1]] },
    ilca7: { name: 'ILCA 7', acc: 5.5, up: [[3, 2.1], [4, 2.8], [6, 3.8], [8, 4.5], [10, 5.0], [12, 5.3], [14, 5.5], [16, 5.6], [20, 5.7], [25, 5.6]] }
  };
  // ---------- Tekne modelleri: sınıfa göre gövde ve donanım ölçüleri (mm) ----------
  // Üstten 2D çizim (boat-draw.js), elle sürmede çarpışma (hullOf) ve ileride 3D / tekne içinden görünüş aynı ölçüleri kullanır.
  // Ekranda her sınıf 1 tekne boyu = 50 px çizilir (kurallardaki mesafeler tekne boyuyla ölçülür: zone 3 boy); bu yüzden
  // ILCA gerçekte Optimist'in 1,8 katı uzun olsa da ekranda aynı boyda, ama kendi oranında (dar, sivri) görünür.
  // plan: [baştan uzaklık, yarı genişlik] istasyonları (güverte hattı). Ölçüler sınıf kuralları / yaygın ölçülerden, yaklaşık.
  const BOAT_LEN_PX = 50;
  const BOAT_MODELS = {
    optimist: {
      name: 'Optimist', loa: 2310, beam: 1130, bow: 'pram',                       // baş da kıç gibi düz ayna (pram)
      plan: [[0, 300], [180, 410], [600, 520], [1150, 565], [1700, 550], [2310, 470]],
      mast: 400, mastH: 2350, boom: 2010, rig: 'sprit',                            // gırcala yelkeni (sprit): tepe köşesi gırcalayla kaldırılır
      sail: { luff: 1730, head: 1240, leech: 2800, foot: 1900, sprit: 2286, area: 3.3 },
      board: { at: 980, len: 300, w: 28 }, rudder: { tiller: 820 },
      bags: [[120, 330, 0.8], [1250, 1900, 0.42]]                                   // yüzdürme torbaları: [baştan, bitiş, genişlik oranı]
    },
    ilca: {
      name: 'ILCA', loa: 4230, beam: 1370, bow: 'pointed',
      plan: [[0, 0], [260, 170], [750, 400], [1450, 580], [2350, 675], [3200, 680], [4230, 560]],
      mast: 1000, boom: 2740, rig: 'bermuda',
      cockpit: { from: 2380, to: 3800, w: 330 },                                    // yarı genişlik
      board: { at: 2180, len: 330, w: 30 }, rudder: { tiller: 1050 }
    }
  };
  // ILCA 4 / 6 / 7: aynı gövde, farklı direk alt parçası ve yelken (m²); direk boyu 3D için yaklaşık
  const RIGS = { ilca4: { sailArea: 4.7, mastH: 5500 }, ilca6: { sailArea: 5.76, mastH: 5900 }, ilca7: { sailArea: 7.06, mastH: 6430 } };
  function boatModel(cls) {
    if (cls && cls.startsWith('ilca')) return Object.assign({}, BOAT_MODELS.ilca, RIGS[cls] || RIGS.ilca7, { cls, name: (BOAT_CLASSES[cls] || {}).name || 'ILCA' });
    return Object.assign({ cls: 'optimist' }, BOAT_MODELS.optimist);
  }
  // Elle sürmede çarpışma için gövde kapsülü (px): baş-kıç doğrusu ±half, yarıçap r. Çizilen gövdenin en geniş yerinin %90'ı.
  function hullOf(cls) {
    const m = boatModel(cls), K = BOAT_LEN_PX / m.loa;
    const r = Math.round(Math.max(...m.plan.map(p => p[1])) * K * 0.9 * 10) / 10;
    return { r, half: BOAT_LEN_PX / 2 - r };
  }
  // Teknenin dünyadaki dış hattı (gövde planı + bumba ucu + yelken karnı): "gövdenin, donanımın herhangi bir parçası"
  // (K29.1 erken çıkış, K30 yasaklı bölge) için. Çizimle aynı ölçüler (boat-draw: baş −y, 1 boy = 50 px).
  // opts: { v, base, sheet, back } (sailPose ile aynı; zaman titreşimi yok, deterministik)
  function boatOutline(cls, x, y, h, windFrom, opts) {
    const m = boatModel(cls), K = BOAT_LEN_PX / m.loa, Y = s => -BOAT_LEN_PX / 2 + s * K;
    const loc = [];
    for (const [s, hw] of m.plan) { loc.push([hw * K, Y(s)]); if (hw > 0) loc.push([-hw * K, Y(s)]); }
    const pose = sailPose(h, windFrom, opts || {}), b = pose.beta * DEG, my = Y(m.mast), L = m.boom * K;
    const tx = Math.sin(b) * L, ty = my + Math.cos(b) * L, nx = Math.cos(b), ny = -Math.sin(b), bl = pose.belly * L / 27;
    loc.push([tx, ty]);
    // yelken karnı (sailShape'in kübik eğrisi, titreşimsiz): 1/3, 1/2, 2/3
    const c1 = [tx / 3 + nx * bl * 1.1, my + (ty - my) / 3 + ny * bl * 1.1], c2 = [tx * 2 / 3 + nx * bl * 0.9, my + (ty - my) * 2 / 3 + ny * bl * 0.9];
    for (const u of [1 / 3, 0.5, 2 / 3]) {
      const a = (1 - u) ** 3, bb = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
      loc.push([bb * c1[0] + c * c2[0] + d * tx, a * my + bb * c1[1] + c * c2[1] + d * ty]);
    }
    const f = fwd(h), r = fwd(h + 90);
    return loc.map(([lx, ly]) => ({ x: x + r.x * lx - f.x * ly, y: y + r.y * lx - f.y * ly }));
  }
  function upwindKn(cls, wind) {
    const t = (BOAT_CLASSES[cls] || BOAT_CLASSES.optimist).up;
    if (wind <= t[0][0]) return t[0][1];
    for (let i = 1; i < t.length; i++) if (wind <= t[i][0]) { const [a, va] = t[i - 1], [b, vb] = t[i]; return va + (vb - va) * (wind - a) / (b - a); }
    return t[t.length - 1][1];
  }
  // Yelkeni boş bekleyen teknenin hızlanma zaman sabiti, animasyon saniyesi cinsinden.
  // clockScale: 1 animasyon (simülasyon) saniyesi kaç gerçek saniye. Hafif havada daha yavaş hızlanır.
  function accelTau(cls, windKn, clockScale) {
    const c = BOAT_CLASSES[cls] || BOAT_CLASSES.optimist, k = Math.max(0.8, Math.min(1.5, 8 / (windKn || 8)));
    return c.acc * k / (clockScale || 1);
  }
  // Senaryonun ivme sabiti: start senaryosunda sınıf tablosundan (simülatördeki start hızlanmasıyla aynı),
  // diğerlerinde simülatörün yarış içi sabiti (1.2). scn.tau verilirse o kullanılır.
  const RACE_TAU = 1.2;
  function scenarioTau(scn) {
    if (scn.tau != null) return scn.tau;
    if (scn.line && scn.startAt > 0) return accelTau(scn.boatClass || 'optimist', scn.windKn || 8, scn.clockScale || 1);
    return RACE_TAU;
  }

  // ---------- Engel kaçınma ----------
  // Senaryodaki şamandıralar, pin ve hakem botu: [{x,y,r}]
  /* Hakem botu artık bir daire değil, çizimdeki gövdenin biçimi: gövde (drawCommitteeBoat, yerel koordinat
     x 0..24, y -32..+30) baş-kıç doğrusu boyunca bir kapsülle (iki uçlu yuvarlak çubuk) kaplanır. Eskiden hat ucunu
     merkez alan 38 px'lik daire (+16 pay) hat tarafına ~2 tekne genişliği taşıyordu: hakem botuyla başka tekne
     arasındaki gerçek boşluğa girilemiyordu (kullanıcı 2026-11-14). Bot rüzgara baş verdiği için kapsül rüzgarla döner. */
  const CB_HULL = { x: 12, y0: -20, y1: 18, r: 12 };
  // hakem botu engelini rüzgara göre yerleştir (o.x, o.y = gövde ortası; a/b = kapsül doğrusunun uçları)
  function orientObstacle(o, w) {
    if (!o.hull || o.w === w) return o;
    const f = fwd(w), r = { x: Math.cos(w * DEG), y: Math.sin(w * DEG) };
    const P = (lx, ly) => ({ x: o.ax + r.x * lx - f.x * ly, y: o.ay + r.y * lx - f.y * ly });
    const hx = o.flip ? -CB_HULL.x : CB_HULL.x;   // flip: ayna (finiş hakem botu hattın solunda)
    o.w = w; o.a = P(hx, CB_HULL.y0); o.b = P(hx, CB_HULL.y1);
    o.x = (o.a.x + o.b.x) / 2; o.y = (o.a.y + o.b.y) / 2;
    return o;
  }
  // engelin (x,y) noktasına en yakın merkezi: daire için kendisi, hakem botu için kapsül doğrusunun en yakın noktası
  function obstacleNear(o, x, y) {
    if (!o.hull) return o;
    const dx = o.b.x - o.a.x, dy = o.b.y - o.a.y, L2 = dx * dx + dy * dy;
    const k = L2 > 0 ? Math.max(0, Math.min(1, ((x - o.a.x) * dx + (y - o.a.y) * dy) / L2)) : 0;
    return { x: o.a.x + dx * k, y: o.a.y + dy * k };
  }
  // (x,y) noktasının engelin kenarına uzaklığı (içerideyse < 0)
  function obstacleGap(o, x, y) { const c = obstacleNear(o, x, y); return Math.hypot(x - c.x, y - c.y) - o.r; }
  // Tekne gövdesinin (baş-kıç doğrusu ±half px) engelin kenarına en kısa uzaklığı
  function hullObstacleGap(o, x, y, h, half) {
    const f = fwd(h), L = half == null ? 19 : half;
    if (!o.hull) return segPointDist(x - f.x * L, y - f.y * L, x + f.x * L, y + f.y * L, o.x, o.y) - (o.rDraw || o.r);
    return segSegDist(x - f.x * L, y - f.y * L, x + f.x * L, y + f.y * L, o.a.x, o.a.y, o.b.x, o.b.y) - o.r;
  }
  function segPointDist(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const k = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
    return Math.hypot(px - ax - dx * k, py - ay - dy * k);
  }
  function segSegDist(ax, ay, bx, by, cx, cy, dx, dy) {
    // kesişiyorsa 0
    const cr = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const d1 = cr(ax, ay, bx, by, cx, cy), d2 = cr(ax, ay, bx, by, dx, dy), d3 = cr(cx, cy, dx, dy, ax, ay), d4 = cr(cx, cy, dx, dy, bx, by);
    if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
    return Math.min(segPointDist(ax, ay, bx, by, cx, cy), segPointDist(ax, ay, bx, by, dx, dy),
      segPointDist(cx, cy, dx, dy, ax, ay), segPointDist(cx, cy, dx, dy, bx, by));
  }
  // Senaryodaki şamandıralar, pin ve hakem botu: [{x,y,r}] (hakem botu: {hull:true, ax, ay, a, b, r}; w = rüzgar)
  function obstaclesOf(scn, w) {
    const o = [];
    for (const m of scn.marks || []) o.push({ x: m.x, y: m.y, r: 14, rDraw: 9 });
    if (scn.line) {
      o.push({ x: scn.line.pin.x, y: scn.line.pin.y, r: 14, rDraw: 7 });
      const wd = w != null ? w : (scn.wind != null ? windAt(scn.wind, 0) : 0);
      o.push(orientObstacle({ hull: true, ax: scn.line.boat.x, ay: scn.line.boat.y, r: CB_HULL.r, w: null }, wd));
    }
    return o;
  }
  // Önümüzde engel varsa kaçınma yönü: +1 sağa dön, -1 sola dön, 0 yok
  function avoidDir(x, y, h, obstacles, v) {
    const f = fwd(h), r = { x: Math.cos(h * DEG), y: Math.sin(h * DEG) };   // sağ yön
    const look = 40 + Math.max(0, v || 0) * 1.2;                              // ileri bakış (px)
    let best = 0, bestAlong = 1e9;
    for (const o of obstacles || []) {
      const c = obstacleNear(o, x, y), dx = c.x - x, dy = c.y - y;
      const along = dx * f.x + dy * f.y, across = dx * r.x + dy * r.y;
      const margin = o.r + 16;
      if (along > -10 && along < look && Math.abs(across) < margin && along < bestAlong) {
        bestAlong = along; best = across >= 0 ? -1 : 1;                      // engel sağdaysa sola dön
      }
    }
    return best;
  }
  /* Yumuşak engel kaçınma: istenen rota (h) engelin güvenlik çemberine çarpıyorsa çembere TEĞET rotayı verir.
     Teğet, rotanın çembere değdiği sınırda istenen rotayla aynıdır; böylece kaçış ve geri dönüş sürekli,
     tekne engelin yanından tek ve temiz bir yayla geçer (eski ±1 "aç-kapa" kaçınma titretiyordu).
     opts: { mem: {} (taraf hafızası: aynı engelde taraf değişmez), side(o, def, hL, hR) → ±1 (taraf seçimi),
             ok(h, o) → rota gidilebilir mi (değilse öbür taraf), maxTurn (en büyük sapma, derece),
             pad (güvenlik payı, 16), look (ileri bakış) }
     Dönen: { h, side, o, k } ya da null (engel yok). side +1 = sağa dön (engel solda kalır). */
  function steerAround(x, y, h, obstacles, v, opts) {
    opts = opts || {};
    const f = fwd(h), r = { x: Math.cos(h * DEG), y: Math.sin(h * DEG) };
    const look = opts.look != null ? opts.look : 40 + Math.max(0, v || 0) * 1.2;
    const pad = opts.pad != null ? opts.pad : 16, mem = opts.mem;
    let best = null;
    (obstacles || []).forEach((o, i) => {
      const c = obstacleNear(o, x, y);                         // hakem botu: gövdenin en yakın noktası
      const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || 0.01;
      const along = dx * f.x + dy * f.y, across = dx * r.x + dy * r.y, R = o.r + pad;
      const gap = d - R;                                       // çembere uzaklık
      if (along < -R * 0.6 || gap > look || Math.abs(across) >= R) return;
      if (along < 0 && d > R) return;                          // geride kaldı
      if (best && gap >= best.gap) return;
      const brg = Math.atan2(dx, -dy) / DEG, a = d > R ? Math.asin(R / d) / DEG : 90;
      const hL = brg - a, hR = brg + a;                        // engeli sağda / solda bırakan teğetler
      let side = across >= 0 ? -1 : 1;                         // engel sağdaysa sola
      if (mem && mem.i === i && mem.side) side = mem.side;      // aynı engelde taraf değiştirme (karar bir kez)
      else if (opts.side) side = opts.side(o, side, hL, hR) || side;   // taraf kuralı (ör. rüzgarın içine kaçma)
      // seçilen teğetle gidilemiyorsa (ör. rüzgarın içi) ve öbürüyle gidilebiliyorsa taraf değişir
      if (opts.ok && !opts.ok(side < 0 ? hL : hR, o) && opts.ok(side < 0 ? hR : hL, o)) side = -side;
      // ileri bakışın ucunda yumuşak başla (0 → 1)
      const k = Math.max(0, Math.min(1, (look - gap) / 25));
      let dev = norm180((side < 0 ? hL : hR) - h);
      const mt = typeof opts.maxTurn === 'function' ? opts.maxTurn(o) : opts.maxTurn;
      if (mt) dev = Math.max(-mt, Math.min(mt, dev));            // çok büyük sapma yok
      best = { o, i, gap, side, k, hL, hR, h: h + dev * k };
    });
    // hafıza yalnız sayı tutar (kopyalanabilir, kayıtta birebir aynı)
    if (mem) { if (best) { mem.i = best.i; mem.side = best.side; mem.t = 0; } else if (mem.side && ++mem.t > 20) { mem.i = -1; mem.side = 0; } }
    return best;
  }

  // ---------- Rota üretici ----------
  // segs: [{mode:'closehauled'|'run'|'heading'|'hold'|'back'|'goto', tack, h, dur, turn, speed, angle, x, y, r, rate}]
  // Örnekleme adımı DT ile konum/heading entegre edilir; sonuç: [{t,x,y,h}]
  const DT = 0.05;
  function buildTrack(scn, start, segs, opts) {
    opts = opts || {};
    const base = opts.baseSpeed || scn.baseSpeed || 55;
    const samples = [];
    let x = start.x, y = start.y, h = start.h, t = 0;
    let v = opts.v0 || 0;                 // mevcut hız (ivme için)
    const TAU = opts.tau || scenarioTau(scn);   // hızlanma zaman sabiti (s): sınıf tablosundan (bkz. scenarioTau)
    const obstacles = opts.obstacles || obstaclesOf(scn);
    let avoid = 0;                        // engel kaçınma açısı (derece), zamanla sıfıra döner
    const mem = {};                       // kaçınma tarafı hafızası
    const t0 = opts.t0 || 0;
    // t0'dan önce yerinde bekle
    samples.push({ t: 0, x, y, h });
    if (t0 > 0) { samples.push({ t: t0, x, y, h }); t = t0; }
    for (const seg of segs) {
      const turn = seg.turn == null ? 1.2 : seg.turn;
      const hStart = h;
      const tStart = t;
      // goto: (x, y) noktasına git (Taktik oluştur rotaları). Nokta rüzgara 45°'den yakınsa orsada kalır;
      // dönüş hızı sınırlı (rate °/sn), noktaya varınca (ya da yanından geçip uzaklaşınca) segment biter, dur yalnız üst sınır.
      const go = seg.mode === 'goto';
      const tEnd = t + (go ? (seg.dur || 120) : seg.dur);
      let best = Infinity;
      while (t < tEnd - 1e-9) {
        const w = windAt(scn.wind, t);
        for (const o of obstacles) if (o.hull) orientObstacle(o, w);   // hakem botu rüzgarla döner
        let target;
        if (go) {
          const dx = seg.x - x, dy = seg.y - y, d = Math.hypot(dx, dy);
          if (d < (seg.r || 10) || (best < 40 && d > best + 0.5)) break;
          best = Math.min(best, d);
          target = Math.atan2(dx, -dy) / DEG;
          const off = norm180(target - w), lim = seg.angle || 42;
          // nokta rüzgarın içinde (ör. rüzgar döndü): bulunduğu kontrada orsada kal, nokta öbür kontranın
          // layline'ına gelince oraya döner (tramola). Kontra belirsizse noktanın olduğu yana.
          if (Math.abs(off) < lim) { const cur = norm180(h - w), side = Math.abs(cur) > 5 ? Math.sign(cur) : (off < 0 ? -1 : 1); target = w + side * lim; }
          const dh = norm180(target - h), mx = (seg.rate || 120) * DT;
          h += Math.max(-mx, Math.min(mx, dh));
          target = h;
        }
        else if (seg.mode === 'closehauled') target = tackHeading(w, seg.tack, seg.angle);
        else if (seg.mode === 'run') target = runHeading(w, seg.tack, seg.angle);
        else if (seg.mode === 'hold') target = seg.h != null ? seg.h : w; // rüzgara karşı dur
        else if (seg.mode === 'back') target = seg.h != null ? seg.h : hStart;   // yelken ters: rota aynı, tekne geri gider
        else target = seg.h;
        const k = go ? 1 : turn > 0 ? Math.min(1, (t - tStart) / turn) : 1;
        h = go ? target : lerpAngle(hStart, target, k);
        // dönüş bitince hedefi takip et (rüzgar değişirse rota değişir)
        if (k >= 1) h = target;
        const twa = Math.abs(norm180(h - w));
        let vt = speedFor(twa, base) * (seg.speed == null ? 1 : seg.speed) * gustK(scn, x, y, t);
        if (seg.mode === 'hold') vt = base * (seg.speed == null ? 0.1 : seg.speed);
        if (seg.mode === 'back') vt = -base * (seg.speed == null ? 0.2 : seg.speed);   // K22.3: geri giden tekne
        v += (vt - v) * Math.min(1, DT / TAU);
        // engel kaçınma: önümüzde şamandıra/hakem botu varsa yana kaç, sonra rotaya dön
        // istenen rota (h) engele çarpıyorsa teğet rotaya yumuşakça dön, geçince yumuşakça rotaya dön
        const st = steerAround(x, y, h, obstacles, v, { mem });
        const want = st ? Math.max(-100, Math.min(100, norm180(st.h - h))) : 0;
        const dA = (want - avoid) * Math.min(1, DT / 0.2);
        avoid += Math.max(-120 * DT, Math.min(120 * DT, dA));
        const hUsed = h + avoid;
        const f = fwd(hUsed);
        x += f.x * v * DT; y += f.y * v * DT;
        // kuvvetli rüzgarda bekleyen tekne kayar: hold.drift px/sn, driftH yönüne (varsayılan rüzgaraltı, kontraya göre 30° yana)
        if (seg.mode === 'hold' && seg.drift) {
          const dh = seg.driftH != null ? seg.driftH : w + 180 + (norm180(h - w) <= 0 ? 30 : -30), fd = fwd(dh);
          x += fd.x * seg.drift * DT; y += fd.y * seg.drift * DT;
        }
        // salma kalkık: tekne her segmentte rüzgaraltına kayar (seg.slip px/sn, rüzgaraltı kontraya göre 30° yana)
        if (seg.slip) {
          const dh = w + 180 + (norm180(h - w) <= 0 ? 30 : -30), fd = fwd(dh);
          x += fd.x * seg.slip * DT; y += fd.y * seg.slip * DT;
        }
        t += DT;
        samples.push(seg.mode === 'back' ? { t, x, y, h: hUsed, v, note: seg.note || '', back: true } : { t, x, y, h: hUsed, v, note: seg.note || '' });
      }
    }
    return samples;
  }

  // ---------- Sağanak (Taktik oluştur): rüzgarla birlikte rüzgaraltına kayan daha sert rüzgar alanı ----------
  // scn.gusts: [{x, y, r, from, to, k}] (x,y: t=0 anındaki merkez; drift px/sn; k hız çarpanı, varsayılan 1.25)
  const GUST = { drift: 8, k: 1.25 };
  function gustAt(scn, g, t) {
    const d = fwd(windAt(scn.wind, t) + 180), m = (g.drift != null ? g.drift : GUST.drift) * t;
    return { x: g.x + d.x * m, y: g.y + d.y * m, r: g.r || 90 };
  }
  function gustK(scn, x, y, t) {
    if (!scn.gusts || !scn.gusts.length) return 1;
    let k = 1;
    for (const g of scn.gusts) {
      if ((g.from != null && t < g.from) || (g.to != null && t > g.to)) continue;
      const c = gustAt(scn, g, t), d = Math.hypot(x - c.x, y - c.y);
      if (d < c.r) k = Math.max(k, 1 + ((g.k || GUST.k) - 1) * Math.min(1, (c.r - d) / 25));   // kenarda yumuşak geçiş
    }
    return k;
  }

  // sağanak çizimi (oynatıcı ve kurucu ortak): koyu su lekesi + rüzgar yönünde kısa kıvrımlar
  function drawGust(el, parent, c, w, t, label) {
    const g = el('g', { 'pointer-events': 'none' }, parent);
    el('circle', { cx: c.x, cy: c.y, r: c.r, fill: 'rgba(2,12,28,.32)', stroke: 'rgba(147,197,253,.55)', 'stroke-width': 1.5, 'stroke-dasharray': '3 7' }, g);
    const d = fwd(w + 180), p = fwd(w + 90);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, rr = c.r * (0.25 + 0.55 * ((i * 37) % 10) / 10);
      const sh = ((t || 0) * 12 + i * 13) % 30 - 15;
      const x = c.x + Math.cos(a) * rr + d.x * sh, y = c.y + Math.sin(a) * rr + d.y * sh;
      el('path', { d: `M${(x - p.x * 9).toFixed(1)},${(y - p.y * 9).toFixed(1)} q${(d.x * 4 + p.x * 9).toFixed(1)},${(d.y * 4 + p.y * 9).toFixed(1)} ${(p.x * 18).toFixed(1)},${(p.y * 18).toFixed(1)}`,
        fill: 'none', stroke: 'rgba(191,219,254,.45)', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
    }
    if (label !== false) el('text', { x: c.x, y: c.y - c.r - 6, 'text-anchor': 'middle', fill: '#bfdbfe', 'font-size': 12, 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.5)', 'stroke-width': 3 }, g).textContent = label || 'Sağanak';
    return g;
  }

  function sampleTrack(track, t) {
    if (t <= track[0].t) return track[0];
    const last = track[track.length - 1];
    if (t >= last.t) return last;
    // ikili arama
    let lo = 0, hi = track.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (track[m].t <= t) lo = m; else hi = m; }
    const a = track[lo], b = track[hi];
    const k = (t - a.t) / (b.t - a.t);
    return { t, x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), h: lerpAngle(a.h, b.h, k), v: a.v != null && b.v != null ? lerp(a.v, b.v, k) : a.v, note: a.note, back: a.back };
  }

  // ---------- Yelken geometrisi ----------
  function sailState(h, windFrom) {
    const twa = norm180(h - windFrom);
    const abs = Math.abs(twa);
    const tack = twa < 0 ? 'starboard' : 'port';
    // bumba merkez hattına göre açı
    let boom;
    if (abs < 30) boom = 0;                               // rüzgara karşı – yelken boş
    else boom = 10 + Math.max(0, abs - 45) / 135 * 75;    // 45°→10°, 180°→85°
    boom = Math.min(boom, 88);
    const side = tack === 'starboard' ? -1 : 1;           // -1: bumba iskeleye (sol)
    return { twa, abs, tack, boom, side, luffing: abs < 30 };
  }

  // ---------- Yelken pozu (bekleyen/yavaş teknede pırpırlama) ----------
  // opts: { v, base, t, seed }. Yavaş tekne (v/base küçük) yelkeni boşaltmış sayılır:
  //  - rüzgara tam dönükse bumba ortada, iki yana sallanır;
  //  - baş rüzgardan biraz açıksa bumba rüzgar yönünde (rüzgaraltına) uzanır ve yelken pırpırlar.
  // Dönen: { beta (bumba açısı, + sağa / − sola, derece), flutter (0..1), belly (yelken karnı, px, + sağa) }
  function sailPose(h, windFrom, opts) {
    opts = opts || {};
    const st = sailState(h, windFrom);
    const t = opts.t || 0, seed = opts.seed || 0;
    // yelken terslenmiş (backing): bumba rüzgar tarafına itilmiş, yelken öbür yüzünden dolu (tekne frenler / geri gider)
    if (opts.back) { const side = st.abs < 8 ? 1 : -st.side; return { beta: side * 72 + 1.5 * Math.sin(t * 9 + seed), flutter: 0.15, belly: -side * 8, slack: 0, sail: st, back: true }; }
    const base = opts.base || 55;
    let slack = 0;
    if (opts.v != null) slack = Math.max(0, Math.min(1, (0.45 - opts.v / base) / 0.3)); // v ≤ %15 → tamamen boş, ≥ %45 → trimli
    if (st.abs > 100) slack *= Math.max(0, 1 - (st.abs - 100) / 40);                   // pupada boş yelken de dolu durur
    const stream = Math.min(st.abs, 85);                                               // boş yelken rüzgarla hizalanır
    // opts.sheet: iskota (bumbanın en fazla açılabileceği açı). Fazla salınmışsa yelken pırpırlar, fazla çekikse bumba içeride kalır
    const trim = st.luffing ? 0 : opts.sheet != null ? Math.min(opts.sheet, stream) : st.boom;
    if (opts.sheet != null && !st.luffing) slack = Math.max(slack, Math.min(1, Math.max(0, (opts.sheet - st.boom - 6) / 28)));
    let mag = trim + (stream - trim) * slack;
    let beta = st.side * mag;
    // rüzgara tam dönük: bumba iki yana sallanır
    const headUp = Math.max(0, 1 - st.abs / 18) * Math.max(slack, st.luffing ? 0.6 : 0);
    beta += headUp * 16 * Math.sin(t * 2.4 + seed);
    const flutter = Math.max(slack, st.luffing ? 0.8 : 0);
    beta += flutter * 2.5 * Math.sin(t * 13 + seed * 1.7);                              // bumba ucunda titreme
    const belly = st.side * 9 * (1 - flutter);
    return { beta, flutter, belly, slack, sail: st };
  }
  // Yelken çizimi (tekne yerel koordinatı: baş −y). Dönen: { d (yelken yolu), tip {x,y} }
  function sailShape(pose, t, seed, L, my) {
    L = L || 27; my = my == null ? -6 : my;
    const b = pose.beta * DEG;
    const tx = Math.sin(b) * L, ty = my + Math.cos(b) * L;
    const nx = Math.cos(b), ny = -Math.sin(b);                 // bumbaya dik (sağ yön, beta=0 iken +x)
    const ph = t * 22 + (seed || 0);
    const A = 7 * pose.flutter;
    const o1 = pose.belly * 1.1 + A * Math.sin(ph), o2 = pose.belly * 0.9 - A * Math.sin(ph + 1.4);
    const c1x = tx / 3 + nx * o1, c1y = my + (ty - my) / 3 + ny * o1;
    const c2x = tx * 2 / 3 + nx * o2, c2y = my + (ty - my) * 2 / 3 + ny * o2;
    const f = v => v.toFixed(1);
    return { d: `M0,${my} C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(tx)},${f(ty)} L0,${my} Z`, tip: { x: tx, y: ty } };
  }
  // ---------- Rüzgar gölgesi (pis rüzgar) – senaryolar, kural motoru ve simülatör ortak ----------
  // Her teknenin rüzgaraltında kısa bir koni: kıçtan yaklaşık 1 tekne boyu. İçindeki tekne yavaşlar.
  // along: rüzgaraltı yönünde tekne merkezinden uzaklık; half: o uzaklıkta koninin yarı genişliği.
  const SHADOW = { from: 12, len: 72, w0: 16, spread: 0.25, loss: 0.3 };
  // Yelkeni boş (bekleyen) tekne daha zayıf gölge yapar: 0.4 … 1
  function shadowStrength(v, base) {
    if (v == null) return 1;
    const rel = v / (base || 55);
    return 0.4 + 0.6 * Math.max(0, Math.min(1, (rel - 0.15) / 0.45));
  }
  // p noktası c teknesinin gölgesinde mi? 0..1 (gölge gücü hariç)
  // len: koninin boyu (px); senaryo `shadowLen` ile uzatabilir (kalabalık filonun bozduğu hava 2-3 boy uzanır)
  function shadowOf(p, c, w, len) {
    const L = len || SHADOW.len;
    const d = fwd(w + 180), r = fwd(w + 90);
    const dx = p.x - c.x, dy = p.y - c.y, along = dx * d.x + dy * d.y;
    if (along < SHADOW.from || along > L) return 0;
    const half = SHADOW.w0 + along * SHADOW.spread, lat = Math.abs(dx * r.x + dy * r.y);
    if (lat > half) return 0;
    const a = (along - SHADOW.from) / (L - SHADOW.from), l = lat / half;
    // koninin içindeki her tekne yavaşlar: kenarda ve uçta da en az %30 etki (en çok kıçın hemen arkasında)
    return 0.3 + (1 - 0.3) * (1 - 0.7 * a) * (1 - l * l);
  }
  // casters: [{x,y,v?,str?,ref?}] → { k (0..1, hız kaybı = SHADOW.loss·k), by (gölgeyi yapan) }
  function shadowK(p, casters, w, base, len) {
    let best = { k: 0, by: null };
    for (const c of casters) {
      if (c === p || (c.ref != null && c.ref === p.ref)) continue;
      const k = shadowOf(p, c, w, len) * (c.str != null ? c.str : shadowStrength(c.v, base));
      if (k > best.k) best = { k: Math.min(1, k), by: c.ref != null ? c.ref : c };
    }
    return best;
  }
  // Koninin çokgen noktaları (SVG points)
  function shadowPolygon(c, w, len) {
    const d = fwd(w + 180), r = fwd(w + 90), S = SHADOW, L = len || S.len;
    const p = (a, l) => `${(c.x + d.x * a + r.x * l).toFixed(1)},${(c.y + d.y * a + r.y * l).toFixed(1)}`;
    const h0 = S.w0 + S.from * S.spread, h1 = S.w0 + L * S.spread;
    return [p(S.from, -h0), p(S.from, h0), p(L, h1), p(L, -h1)].join(' ');
  }

  // ---------- Hakem botu (start hattının sağ ucu) ----------
  // Demirli motorlu tekne: demirde başını rüzgara verir; turuncu bayrak direği tam hat ucunda (0,0), bayrak rüzgaraltına dalgalanır.
  // el(tag, attrs, parent) çağıranın SVG üreticisi. Dönen grup (0,0) merkezli; konum/yön için
  // committeeBoatTransform(x, y, windFrom) kullanılır. Dalgalanma SMIL ile sürekli (oynatma dursa da).
  function flagWaveFrames(len, h, n) {
    const fr = [];
    for (let f = 0; f <= n; f++) {
      const ph = (f % n) / n * Math.PI * 2, top = [], bot = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6, x = len * u * (1 - 0.06 * u * (1 + Math.sin(ph)));   // dalgada boy hafif kısalır
        const a = 5 * u * Math.sin(u * 2.4 * Math.PI - ph);                   // uca doğru büyüyen dalga
        const hh = h / 2 * (1 - 0.18 * u);                                      // uç biraz daralır
        top.push(`${x.toFixed(1)},${(a - hh).toFixed(1)}`);
        bot.unshift(`${x.toFixed(1)},${(a + hh).toFixed(1)}`);
      }
      fr.push('M' + top.join(' L') + ' L' + bot.join(' L') + ' Z');
    }
    return fr.join(';');
  }
  function drawCommitteeBoat(el, parent) {
    const g = el('g', { class: 'committee-boat' }, parent);
    // (0,0) = start hattının ucu: bayrak direği burada; gövde iskele küpeştesi direğe gelecek şekilde yana kayık
    const hg = el('g', { transform: 'translate(12,0)' }, g);
    // demir zinciri (rüzgarüstüne)
    el('path', { d: 'M0,-30 L0,-50', stroke: 'rgba(222,226,230,.7)', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }, hg);
    el('circle', { cx: 0, cy: -51, r: 1.8, fill: 'rgba(222,226,230,.8)' }, hg);
    // gölge ve gövde
    el('path', { d: 'M2,-28 C10,-22 14,-11 14,1 L14,25 Q14,30 9,30 L-5,30 Q-10,30 -10,25 L-10,1 C-10,-11 -6,-22 2,-28 Z', fill: 'rgba(0,0,0,.28)' }, hg);
    el('path', { d: 'M0,-32 C8,-25 12,-13 12,0 L12,24 Q12,28 8,28 L-8,28 Q-12,28 -12,24 L-12,0 C-12,-13 -8,-25 0,-32 Z', fill: '#f8f9fa', stroke: '#1d3557', 'stroke-width': 1.6 }, hg);
    // güverte (iç küpeşte çizgisi)
    el('path', { d: 'M0,-27.5 C6.4,-21.5 9.6,-11.5 9.6,0 L9.6,22 L-9.6,22 L-9.6,0 C-9.6,-11.5 -6.4,-21.5 0,-27.5 Z', fill: '#e9ecef', stroke: '#ced4da', 'stroke-width': .8 }, hg);
    el('rect', { x: -3, y: -19, width: 6, height: 5, rx: 1, fill: '#adb5bd' }, hg);                 // baş kaporta
    // kıç kokpit (tik) ve yüzme platformu
    el('rect', { x: -9.6, y: 9, width: 19.2, height: 13, fill: '#c69c6d' }, hg);
    for (const y of [12, 15, 18]) el('line', { x1: -9.6, y1: y, x2: 9.6, y2: y, stroke: '#a47148', 'stroke-width': .6 }, hg);
    el('rect', { x: -10, y: 28, width: 20, height: 4, rx: 1, fill: '#c69c6d', stroke: '#8d6440', 'stroke-width': .7 }, hg);
    // kaptan köşkü: beyaz çatı, ön cam, yan camlar
    el('rect', { x: -8, y: -9, width: 16, height: 17, rx: 4, fill: '#ffffff', stroke: '#868e96', 'stroke-width': 1 }, hg);
    el('path', { d: 'M-7.2,-6.5 Q0,-11 7.2,-6.5 L7.2,-3.5 Q0,-7.5 -7.2,-3.5 Z', fill: '#1d3557' }, hg);
    el('rect', { x: -8, y: -2, width: 1.6, height: 7, fill: '#1d3557' }, hg);
    el('rect', { x: 6.4, y: -2, width: 1.6, height: 7, fill: '#1d3557' }, hg);
    // hat ucundaki direkten rüzgaraltına dalgalanan turuncu bayrak
    const fl = el('g', { transform: 'rotate(90)' }, g);
    const fp = el('path', { fill: '#ff7a1a', stroke: '#c2410c', 'stroke-width': .9, 'stroke-linejoin': 'round' }, fl);
    const frames = flagWaveFrames(28, 15, 8);
    fp.setAttribute('d', frames.split(';')[0]);
    el('animate', { attributeName: 'd', values: frames, dur: '0.75s', repeatCount: 'indefinite', begin: '0s' }, fp);
    el('circle', { cx: 0, cy: 0, r: 2.4, fill: '#343a40', stroke: '#fff', 'stroke-width': 1 }, fl);  // direk = hat ucu
    return g;
  }
  const committeeBoatTransform = (x, y, windFrom) => `translate(${x},${y}) rotate(${norm360(windFrom).toFixed(1)})`;

  /* Start hattı layline'ları (ayarlardaki anahtar, senaryolar ve simülatör): pin'den ve hakem botundan
     rüzgaraltına, iki kontranın orsa rotası boyunca. Bu çizginin üstünde (rüzgarüstünde) olan tekne o kontrada
     ucu tutar; altında kalan tutamaz. Pin çizgileri belirgin, hakem botununkiler soluk.
     line: {pin, boat}, w: rüzgarın geldiği yön, opts: { len, angle, scale (yazı ölçeği) } */
  function drawStartLaylines(el, g, line, w, opts) {
    opts = opts || {};
    const len = opts.len || 520, fs = 11 * (opts.scale || 1);
    const ends = [
      { p: line.pin, name: 'pin', strong: true },
      { p: line.boat, name: 'hakem botu', strong: false }
    ];
    const COL = { starboard: '#4ade80', port: '#f87171' };
    for (const e of ends) {
      for (const tack of ['starboard', 'port']) {
        const f = fwd(tackHeading(w, tack, opts.angle)), bx = -f.x, by = -f.y;   // uçtan rüzgaraltına
        const x2 = e.p.x + bx * len, y2 = e.p.y + by * len;
        el('line', { x1: e.p.x, y1: e.p.y, x2, y2, stroke: COL[tack], 'stroke-width': e.strong ? 2 : 1.5,
          'stroke-dasharray': e.strong ? '10 6' : '3 7', opacity: e.strong ? 0.9 : 0.55, 'stroke-linecap': 'round', class: 'start-layline' }, g);
        // yazı çizgi boyunca, soldan sağa okunur; uçtaki yazı ve tekneyle çakışmasın diye 150-200 px uzakta
        let ang = Math.atan2(by, bx) / DEG; if (ang > 90 || ang < -90) ang += 180;
        const d = e.strong ? 150 : 200, tx = e.p.x + bx * d, ty = e.p.y + by * d;
        const t = el('text', { x: 0, y: -5, transform: `translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${ang.toFixed(1)})`,
          'text-anchor': 'middle', fill: COL[tack], 'font-size': fs, 'font-weight': e.strong ? 700 : 500,
          opacity: e.strong ? 0.95 : 0.7, 'paint-order': 'stroke', stroke: 'rgba(2,21,38,.75)', 'stroke-width': 3 }, g);
        t.textContent = `${e.name} · ${tack === 'starboard' ? 'sancak' : 'iskele'} layline`;
      }
    }
  }

  function seedOf(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 1000; return h / 37; }

  global.SailEngine = {
    sailPose, sailShape, seedOf, drawCommitteeBoat, committeeBoatTransform, drawStartLaylines,
    SHADOW, shadowStrength, shadowOf, shadowK, shadowPolygon,
    DEG, norm180, norm360, lerp, lerpAngle, fwd,
    windAt, tackHeading, runHeading, buildTrack, sampleTrack, sailState, speedFor, obstaclesOf, orientObstacle, obstacleNear, obstacleGap, hullObstacleGap, avoidDir, steerAround,
    CLOSE_HAULED, RUN, BOAT_CLASSES, upwindKn, accelTau, scenarioTau, RACE_TAU,
    GUST, gustAt, gustK, drawGust, BOAT_LEN_PX, BOAT_MODELS, boatModel, hullOf, boatOutline, CB_HULL
  };
})(typeof window !== 'undefined' ? window : globalThis);
