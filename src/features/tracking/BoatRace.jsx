"use client";

// Tekne animasyonu (Seyhun 2026-11-03, tasarım project-files/tekne-animasyon/f1–f3.png): veri setinden (lib/boatPlay.js) teknelerin yeri,
// ilerleme yönüne dönen burun, rüzgâr açısına göre açılan yelken, yelken numarası, arkada grup renginde iz. Yalnız seçili grubun tekneleri.
// 2026-11-06 (onaylı örnek project-files/tekne-animasyon/gruplu): parkur tam tepeden değil, start hattının arkasından alçak açıyla
// (uzak küçülür); kamera grubu takip eder (kesitte o yere bakar); üstte yalnız "● SARI GRUP · 10 TEKNE"; şamandıra yakınında iz uzun
// kalır (dönüş görünür); üst üste binen yelken numarası çizilmez. ctl: alttaki şerit (boatCtl) ile durdur, geri al, kesit, yakınlık.
import { useEffect, useMemo, useRef, useState } from "react";
import { angDiff, boomOf, clockText, cutsOf, groupSet, lineMid, localFn, spanOf, tracksOf } from "@/lib/boatPlay";
import { boatCtl } from "./boatStore";
import { groupColor } from "@/lib/roundScore";
import "./boatRace.css";

// ekranın oranına göre çizim alanı: yatayda 1600 birim, dar (telefon dik) ekranda 900 birim ve tekneler/yazılar büyür
const sizeOf = (w, h) => {
  const W = w && h && w / h < 1.2 ? 900 : 1600;
  return { W, H: Math.round(W * (h && w ? h / w : 9 / 16)) };
};
const TRAIL = 30000; // arkadaki iz (ms)
const TRAIL_MK = 90000; // şamandıra yakınında (dönüş görünsün)
const PAUSE = 2500; // klip bitince bekleme, sonra baştan
const TILT = 0.75; // bakış eğimi (rad, 0 = tam tepeden)
const DEPTH = 1400; // derinlik (m): uzaktaki bu oranda küçülür
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// sıralı izde t anındaki yer (yerel metre) ve yön (eksene göre derece)
function poseLoc(list, t) {
  if (!list.length || t < list[0].t || t > list.at(-1).t + 3000) return null;
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (list[m].t <= t) lo = m;
    else hi = m - 1;
  }
  const a = list[lo];
  const b = list[lo + 1];
  if (!b) return { x: a.x, y: a.y, h: a.h };
  const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, h: a.h + angDiff(a.h, b.h) * f };
}

// rasgele ama her çizimde aynı yağmur/dalga çizgileri
const RAIN = Array.from({ length: 160 }, (_, i) => [(i * 137.5) % 1600, (i * 89.3) % 2000]);

function Boat({ x, y, hdg, wind, up, col, sail, s = 1.6, label = true, flat = 1, ly = null }) {
  const rot = hdg - up;
  const { b, side, luff } = boomOf(hdg, wind);
  const rad = (b * Math.PI) / 180;
  const L = 24;
  const bx = side * Math.sin(rad) * L;
  const by = -6 + Math.cos(rad) * L;
  const mx = 0;
  const my = -6;
  const dl = Math.hypot(bx - mx, by - my) || 1;
  let nx = -(by - my) / dl;
  let ny = (bx - mx) / dl;
  if (nx * side - ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = luff ? 6 : 17;
  const qx = (mx + bx) / 2 + nx * k;
  const qy = (my + by) / 2 + ny * k;
  return (
    <>
      <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(1,${flat.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(2)})`}>
        <ellipse cx="2" cy="4" rx="10" ry="21" fill="rgba(0,0,0,.25)" />
        <path d="M0 -21 C8 -13 10 3 8 19 Q0 22 -8 19 C-10 3 -8 -13 0 -21Z" fill="#fbfdff" />
        <path d="M0 -15 C5 -9 6.5 3 5 15 Q0 17 -5 15 C-6.5 3 -5 -9 0 -15Z" fill="#e6edf4" />
        <path d={`M${mx} ${my} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} L${mx} ${my}Z`} fill={col} fillOpacity=".92" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
        <line x1={mx} y1={my} x2={bx.toFixed(1)} y2={by.toFixed(1)} stroke="#1d2b3a" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx={mx} cy={my} r="2.2" fill="#1d2b3a" />
      </g>
      {label ? (
        <g transform={`translate(${x.toFixed(1)},${(ly ?? y - 30 * s).toFixed(1)}) scale(${Math.max(0.75, Math.min(1.15, s)).toFixed(2)})`}>
          <rect x="-24" y="-13" width="48" height="22" rx="7" fill="rgba(6,24,43,.72)" stroke={col} strokeOpacity=".9" />
          <text x="0" y="3.5" textAnchor="middle" className="br-sail">
            {sail}
          </text>
        </g>
      ) : null}
    </>
  );
}

function Committee({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="22" rx="20" ry="6" fill="rgba(0,0,0,.25)" />
      <path d="M0 -26 C12 -14 14 6 12 22 L-12 22 C-14 6 -12 -14 0 -26Z" fill="#fff" />
      <rect x="-6" y="-2" width="12" height="12" rx="2" fill="#cdd6df" />
      <line x1="0" y1="-26" x2="0" y2="-62" stroke="#fff" strokeWidth="2" />
      <path d="M0 -62 L24 -55 L0 -48Z" fill="#ff7a1a" />
    </g>
  );
}
function Pin({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="10" rx="12" ry="4" fill="rgba(0,0,0,.25)" />
      <circle r="10" fill="#ff7a1a" />
      <circle cx="-3" cy="-3" r="3" fill="#ffb27a" />
    </g>
  );
}

// set: cleanSet; grp: gösterilen grup ("" = hepsi); loop: canlı an bilinmiyorsa baştan
// bare: yayının içinde (canlı ekranın kendi süre kartı var): üstte yalnız grup yazısı; değilse rüzgâr ve sayaç
// startAt: yarışın start anı (ms); varsa canlı = şimdi − start. ctl: alttaki şerit (boatCtl) bu oynatıcıyı yönetir
export function BoatRace({ set, grp = "", loop = true, bare = false, startAt = null, ctl = false }) {
  const box = useRef(null);
  const [size, setSize] = useState(() => sizeOf(0, 0));
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setSize(sizeOf(el.clientWidth, el.clientHeight));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { W, H } = size;
  const narrow = W < 1600;
  const view = useMemo(() => groupSet(set, grp), [set, grp]);
  const up = set.wind.dir;
  // yerel düzlem: start hattının ortası (0,0), parkur ekseni +y
  const geo = useMemo(() => {
    const o = lineMid(set.marks) || view.fixes[0] || { lat: 0, lon: 0 };
    const L = localFn(o, up);
    const tracks = new Map();
    for (const [sail, list] of tracksOf(view)) tracks.set(sail, list.map((f) => ({ t: f.t, ...L(f), h: angDiff(up, f.hdg ?? up) })));
    const marks = Object.fromEntries(Object.entries(set.marks).map(([k, v]) => [k, L(v)]));
    const cuts = cutsOf(view).map((c) => ({ ...c, focus: c.focus ? { ...L(c.focus), span: c.focus.span } : null }));
    return { L, tracks, marks, cuts };
  }, [set, view, up]);
  const { t0, t1 } = useMemo(() => spanOf(view), [view]);
  // şerit: kesitler ve aralık (grup değişince baştan, canlı)
  useEffect(() => {
    if (ctl) boatCtl.reset({ cuts: cutsOf(view), t0, t1 });
  }, [ctl, view, t0, t1]);
  const [v, setV] = useState({ t: t0, cam: null });
  useEffect(() => {
    let id = 0;
    let begin = 0;
    let last = 0;
    let cam = null;
    const mk = Object.values(geo.marks);
    const tick = (now) => {
      if (!begin) begin = now;
      const dt = last ? now - last : 16;
      last = now;
      const len = t1 - t0;
      // canlı an: yarışın start'ından bu yana; bilinmiyorsa klip baştan oynar
      const lt = startAt ? clamp(Date.now() - startAt, t0, t1) : t0 + Math.min((now - begin) % (len + PAUSE), len);
      const s = ctl ? boatCtl.get() : null;
      let t = lt;
      if (s && !s.live) {
        t = boatCtl.at(s);
        // yarış başladıysa ileri sarma canlıya yetişince canlıya döner (öncesinde örnek veri serbestçe oynar)
        if (startAt && Date.now() > startAt && t >= lt && lt < t1) boatCtl.goLive();
        else if (s.playing && t >= t1) boatCtl.set({ t: t1, playing: false });
      }
      if (ctl) boatCtl.cur = t;
      if (!loop && !startAt && now - begin > len) t = t1;
      // kamera: kesitte o yer (grup ortasıyla karışık), değilse grubun kapladığı alan
      const ps = [];
      for (const list of geo.tracks.values()) {
        const p = poseLoc(list, t);
        if (p) ps.push(p);
      }
      let want;
      const fc = s?.focus && !s.live ? geo.L(s.focus) : null;
      if (ps.length) {
        const xs = ps.map((p) => p.x);
        const ys = ps.map((p) => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        want = fc ? { cx: fc.x * 0.6 + cx * 0.4, cy: fc.y * 0.6 + cy * 0.4, span: s.focus.span } : { cx, cy, span: Math.max(150, Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.4) * 1.15 };
      } else if (mk.length) {
        const xs = mk.map((p) => p.x);
        const ys = mk.map((p) => p.y);
        want = { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, span: Math.max(300, Math.max(...xs) - Math.min(...xs)) };
      } else want = { cx: 0, cy: 0, span: 300 };
      want.span /= s?.zk || 1;
      const a = cam ? 1 - Math.exp(-dt / 450) : 1;
      cam = cam ? { cx: cam.cx + (want.cx - cam.cx) * a, cy: cam.cy + (want.cy - cam.cy) * a, span: Math.exp(Math.log(cam.span) + (Math.log(want.span) - Math.log(cam.span)) * a) } : want;
      setV({ t, cam });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [geo, t0, t1, startAt, ctl, loop]);

  const { t, cam } = v;
  if (!cam || !W) return <div className="br" ref={box} />;
  // izdüşüm: kamera ortası ekranda (W/2, Y0); uzak (+y) küçülür ve yukarı kayar
  const px = (W * (narrow ? 0.86 : 0.72)) / cam.span; // metre başına birim
  const Y0 = H * (bare ? 0.55 : 0.58);
  const P = (q) => {
    const f = DEPTH / Math.max(DEPTH * 0.25, DEPTH + (q.y - cam.cy) * Math.sin(TILT));
    return { x: W / 2 + (q.x - cam.cx) * px * f, y: Y0 - (q.y - cam.cy) * Math.cos(TILT) * px * f, f };
  };
  const big = narrow ? 1.1 : 1;
  const mk = (k) => geo.marks[k] && P(geo.marks[k]);
  const pin = mk("pin");
  const kom = mk("komite");
  const ms = (p) => clamp(p.f * (0.55 + px * 0.12), 0.55, 1.25) * big; // şamandıra boyu
  const buoys = [["m1", "1"], ["m2", "2"], ["m3s", "3S"], ["m3p", "3P"]].map(([k, n]) => ({ k, n, p: mk(k) })).filter((b) => b.p);
  const f1 = mk("fin1");
  const f2 = mk("fin2");
  const half = (a, b) => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a || b);
  const route = pin && kom && mk("m1") ? [half(pin, kom), mk("m1"), mk("m2"), half(mk("m3s"), mk("m3p")), half(f1, f2)].filter(Boolean) : [];
  const col = groupColor(grp) || "#fff";
  const who = Object.fromEntries(view.boats.map((b) => [b.sail, b]));
  const mkLoc = ["m1", "m2", "m3s", "m3p"].map((k) => geo.marks[k]).filter(Boolean);
  const nearMk = (q) => mkLoc.some((m) => Math.hypot(q.x - m.x, q.y - m.y) < 160);
  const flat = Math.cos(TILT * 0.5);
  const rows = [...geo.tracks.entries()]
    .map(([sail, list]) => {
      const p = poseLoc(list, t);
      if (!p) return null;
      const q = P(p);
      const trail = list.filter((f) => f.t <= t && f.t >= t - (nearMk(f) ? TRAIL_MK : TRAIL)).map(P);
      const s = clamp((9 * px * q.f) / 42, 0.55, 1.15) * big;
      return { sail, ...q, s, hdg: up + p.h, col: groupColor(who[sail]?.grp) || col, trail: [...trail, q] };
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  // yelken numarası: önde (aşağıda) olan önce yer alır, üst üste binen çizilmez
  const used = [];
  const label = new Set();
  for (const r of [...rows].reverse()) {
    const ly = r.y - 30 * r.s - 4;
    const k = clamp(r.s, 0.75, 1.15);
    if (used.some(([x, y]) => Math.abs(x - r.x) < 50 * k && Math.abs(y - ly) < 24 * k)) continue;
    used.push([r.x, ly]);
    label.add(r.sail);
  }
  // derinlik ızgarası (100 m)
  const grid = [];
  const gx = Math.round(cam.cx / 100) * 100;
  const gy = Math.round(cam.cy / 100) * 100;
  const R = Math.ceil(cam.span / 100) + 4;
  for (let i = -R; i <= R; i++) {
    const a1 = P({ x: gx - R * 100, y: gy + i * 100 });
    const b1 = P({ x: gx + R * 100, y: gy + i * 100 });
    const a2 = P({ x: gx + i * 100, y: gy - R * 100 });
    const b2 = P({ x: gx + i * 100, y: gy + R * 100 });
    grid.push([a1, b1], [a2, b2]);
  }
  const ck = clockText(t);
  const pts = (l) => l.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <div className="br" ref={box}>
      <svg className="br-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-label="Tekneler">
        {RAIN.map(([x, y], i) => (
          <line key={i} x1={x} y1={y} x2={x - 3} y2={y + 12} stroke="rgba(255,255,255,.07)" strokeWidth="1.4" />
        ))}
        {grid.map(([a, b], i) => (
          <line key={`g${i}`} x1={a.x.toFixed(1)} y1={a.y.toFixed(1)} x2={b.x.toFixed(1)} y2={b.y.toFixed(1)} stroke="rgba(255,255,255,.04)" strokeWidth="1.2" />
        ))}
        {route.length > 2 ? <polyline points={pts(route)} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" /> : null}
        {pin && kom ? (
          <>
            <line x1={pin.x} y1={pin.y} x2={kom.x} y2={kom.y} stroke={`rgba(255,255,255,${t < 0 ? 0.75 : 0.4})`} strokeWidth="2.5" strokeDasharray="10 8" />
            <g transform={`translate(${pin.x.toFixed(1)},${pin.y.toFixed(1)}) scale(${ms(pin).toFixed(2)})`}>
              <Pin x={0} y={0} />
            </g>
            <g transform={`translate(${kom.x.toFixed(1)},${kom.y.toFixed(1)}) scale(${ms(kom).toFixed(2)})`}>
              <Committee x={10} y={0} />
            </g>
          </>
        ) : null}
        {f1 && f2 ? (
          <>
            <line x1={f1.x} y1={f1.y} x2={f2.x} y2={f2.y} stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeDasharray="6 6" />
            <g transform={`translate(${f1.x.toFixed(1)},${f1.y.toFixed(1)}) scale(${(ms(f1) * 0.6).toFixed(2)})`}>
              <Committee x={0} y={0} />
            </g>
            <circle cx={f2.x} cy={f2.y} r={7 * ms(f2)} fill="#5ad1ff" />
            <text x={(f1.x + f2.x) / 2} y={Math.min(f1.y, f2.y) - 18 * ms(f1)} textAnchor="middle" className="br-mk br-fin">
              Finiş
            </text>
          </>
        ) : null}
        {buoys.map((b) => (
          <g key={b.k} transform={`translate(${b.p.x.toFixed(1)},${b.p.y.toFixed(1)}) scale(${ms(b.p).toFixed(2)})`}>
            <ellipse cx="0" cy="12" rx="13" ry="4" fill="rgba(0,0,0,.25)" />
            <path d="M-12 12 L-11 -8 Q0 -18 11 -8 L12 12 Z" fill="#f5c518" />
            <text x="0" y="-26" textAnchor="middle" className="br-mk">
              {b.n}
            </text>
          </g>
        ))}
        {rows.map((r) => (r.trail.length > 1 ? <polyline key={`t${r.sail}`} points={pts(r.trail)} fill="none" stroke={r.col} strokeOpacity=".4" strokeWidth={2.2 * big} strokeLinecap="round" strokeLinejoin="round" /> : null))}
        {rows.map((r) => (
          <Boat key={r.sail} x={r.x} y={r.y} hdg={r.hdg} wind={set.wind.dir} up={up} col={r.col} sail={r.sail} s={r.s} flat={flat} label={label.has(r.sail)} ly={r.y - 30 * r.s - 4} />
        ))}
      </svg>
      {bare ? (
        grp ? (
          <div className="br-grp">
            <i style={{ background: col }} aria-hidden="true" />
            {`${grp.toLocaleUpperCase("tr")} GRUP · ${view.boats.length} TEKNE`}
          </div>
        ) : null
      ) : (
        <>
          <div className="br-wind">
            <svg width="34" height="60" viewBox="0 0 34 60" aria-hidden="true">
              <path d="M17 4v44M7 38l10 14 10-14" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <b>{`${set.wind.dir}° · ${set.wind.kn} kn`}</b>
              <span>Rüzgâr</span>
            </div>
          </div>
          <div className="br-clock">
            <div>{ck.label}</div>
            <div className="n">{ck.n}</div>
          </div>
        </>
      )}
    </div>
  );
}
