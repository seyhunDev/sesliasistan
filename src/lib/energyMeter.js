// Enerji kullanımı ölçümü (Ayarlar › Veri ve cihaz › Enerji kullanımı): uygulama açık ve görünürken birkaç dakika
// telefonun bir web uygulamasına izin verdiği sayaçlar okunur. Pil yüzdesi, GPU yükü ve ısı iPhone'da okunamaz.
// - İşlemci: 100 ms'lik zamanlayıcının gecikmesi (ana iş parçacığı meşgulken zamanlayıcı geç çalışır) ve destekleyen
//   tarayıcıda uzun görevler; ikisinden büyüğü, görünür sürenin yüzdesi olarak.
// - Sürekli hareket: her saniye çalışan bir animasyon (ekranı yeniden çizdiren) var mı; görünür sürenin yüzdesi.
// - İnternet: ölçüm sırasında biten isteklerin sayısı ve boyutu (Resource Timing).
// - Pil: yalnız Android Chrome'da (navigator.getBattery); bellek yalnız Chrome'da (performance.memory).
// Sonuç yalnız bu cihazda saklanır (localStorage). Sayfa değişse de ölçüm sürer (modül düzeyinde durum).

const KEY = "sa-energy";
const TICK = 100;

let run = null; // { until, visibleMs, busyMs, animSec, sec, lastAt, timer, sampler, obs, startRes, battery0, onVis, listeners }
const subs = new Set();
let snap = null; // useSyncExternalStore için aynı nesne (değişince yenilenir)
const emit = () => {
  snap = null;
  subs.forEach((f) => f());
};

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function snapshot() {
  return (snap ||= state());
}
export const SERVER = { running: false, last: null };

export function lastResult() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function state() {
  if (!run) return { running: false, last: lastResult() };
  return { running: true, left: Math.max(0, Math.ceil((run.until - Date.now()) / 1000)), last: lastResult() };
}

// İşlemci yüzdesine göre kısa değerlendirme (boşta iyi bir uygulama %0-1)
export function levelOf(cpu) {
  if (cpu == null) return "";
  return cpu < 3 ? "Düşük" : cpu < 10 ? "Orta" : "Yüksek";
}

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

function resources() {
  try {
    return performance.getEntriesByType("resource");
  } catch {
    return [];
  }
}

export async function start(seconds = 120) {
  if (run || typeof window === "undefined") return;
  try {
    performance.setResourceTimingBufferSize?.(2000);
  } catch {}
  let battery0 = null;
  try {
    const b = await navigator.getBattery?.();
    if (b) battery0 = { level: b.level, charging: b.charging, b };
  } catch {}
  const r = {
    until: Date.now() + seconds * 1000,
    seconds,
    visibleMs: 0,
    lagMs: 0,
    longMs: 0,
    animSec: 0,
    sec: 0,
    lastAt: performance.now(),
    startRes: resources().length,
    battery0,
  };
  run = r;
  // Uzun görevler (Chrome/Android); Safari desteklemez
  try {
    r.obs = new PerformanceObserver((l) => {
      if (!visible()) return;
      for (const e of l.getEntries()) r.longMs += e.duration;
    });
    r.obs.observe({ type: "longtask", buffered: false });
  } catch {
    r.obs = null;
  }
  const tick = () => {
    const now = performance.now();
    const dt = now - r.lastAt;
    r.lastAt = now;
    if (visible() && dt < 5000) {
      r.visibleMs += dt;
      r.lagMs += Math.max(0, dt - TICK);
    }
    if (Date.now() >= r.until) return finish();
    r.sampler = setTimeout(tick, TICK);
  };
  r.sampler = setTimeout(tick, TICK);
  r.timer = setInterval(() => {
    if (!visible()) return;
    r.sec += 1;
    try {
      if (document.getAnimations().some((a) => a.playState === "running")) r.animSec += 1;
    } catch {}
    emit();
  }, 1000);
  emit();
}

export function stop() {
  if (run) finish(true);
}

function finish(cut) {
  const r = run;
  if (!r) return;
  run = null;
  clearTimeout(r.sampler);
  clearInterval(r.timer);
  r.obs?.disconnect();
  const list = resources().slice(r.startRes);
  const bytes = list.reduce((n, e) => n + (e.transferSize || e.encodedBodySize || 0), 0);
  const vis = Math.max(1, r.visibleMs);
  const busy = Math.max(r.lagMs, r.longMs);
  const b = r.battery0;
  const res = {
    at: new Date().toISOString(),
    sec: Math.round(r.visibleMs / 1000),
    cut: !!cut,
    cpu: Math.round((busy / vis) * 1000) / 10,
    anim: r.sec ? Math.round((r.animSec / r.sec) * 100) : 0,
    reqs: list.length,
    bytes,
    battery: b ? { from: Math.round(b.level * 100), to: Math.round(b.b.level * 100), charging: b.b.charging } : null,
    heap: performance.memory?.usedJSHeapSize || null,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(res));
  } catch {}
  emit();
}

const mb = (n) => `${(n / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;

// Satır satır sonuç: [ad, değer]
export function resultRows(x) {
  if (!x) return [];
  return [
    ["İşlemci", `%${x.cpu.toLocaleString("tr-TR")} · ${levelOf(x.cpu)}`],
    ["Ekranı sürekli çizen hareket", `Sürenin %${x.anim}'i`],
    ["İnternet", `${mb(x.bytes)} · ${x.reqs} istek`],
    ["Pil", x.battery ? (x.battery.charging ? "Şarjda, ölçülmedi" : `%${x.battery.from} → %${x.battery.to}`) : "Bu telefon göstermiyor"],
    ...(x.heap ? [["Bellek", mb(x.heap)]] : []),
  ];
}

export function resultText(x) {
  if (!x) return "";
  const when = new Date(x.at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return [`Enerji ölçümü · ${when} · ${x.sec} sn görünür`, ...resultRows(x).map(([k, v]) => `${k}: ${v}`)].join("\n");
}
