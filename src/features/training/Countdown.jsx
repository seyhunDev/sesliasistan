"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "@/components/ui/Sheet";
import { mmss } from "@/lib/raceScore";
import { UP_MAX, beepAt, ownedBy, upSec } from "@/lib/raceLive";

// Antrenman sayacı: hazır 2/5/10 dk ya da Ayarla (dakika + saniye). Son 5 saniye her saniye kısa bip, 0'da uzun bip;
// 0'dan sonra ileri sayar ("Startan beri") ve bu an yarış startı olarak kullanılabilir (readTimer().zero).
// Durum telefonda saklanır (bitiş zamanı): ekran kilitlenip geri gelince kalan süre doğru görünür. iPhone arka planda
// ses çalmaz; sayaç çalışırken ekran açık tutulur (Wake Lock, destekleyen tarayıcıda).
const KEY = "sa-sayac";
const PRESETS = [120, 300, 600];
const blank = { dur: 300, end: null, left: null };
const noop = () => () => {};
const useClient = () => useSyncExternalStore(noop, () => true, () => false);

// zero: sayacın son 0'a ulaştığı an (yarışın startı); sayaç sıfırlansa da kalır
export function lastZero(t = readTimer(), now = Date.now()) {
  return t.end != null && t.end <= now ? t.end : (t.zero ?? null);
}
const parse = (raw) => {
  try {
    const t = JSON.parse(raw || "null");
    return t && Number.isFinite(t.dur) ? t : blank;
  } catch {
    return blank;
  }
};
const raw = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};
export const readTimer = () => parse(raw());
// Her yazış olay yayar: aynı sayfadaki bütün okuyucular (sayaç ekranı, sekmelerdeki küçük süre satırı) hemen güncellenir
const write = (t) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {}
  window.dispatchEvent(new Event(KEY));
};
const sub = (f) => {
  window.addEventListener(KEY, f);
  window.addEventListener("storage", f);
  return () => (window.removeEventListener(KEY, f), window.removeEventListener("storage", f));
};
// Bu sayfanın sayaç sahibi adı (lib/raceLive ownedBy): yol, antrenman gününde ?id=plan da
export function ownHere() {
  if (typeof window === "undefined") return "";
  const id = new URLSearchParams(window.location.search).get("id");
  return window.location.pathname + (id ? `?id=${id}` : "");
}
export const mineHere = (t) => ownedBy(t?.own, ownHere());
// Başka sayfanın sayacı bu sayfada boş görünür (süre seçimi kalır); burada başlatılınca onun yerine geçer
const hereView = (t) => (mineHere(t) ? t : { dur: t.dur, end: null, left: null, zero: null });
export function useTimer() {
  const r = useSyncExternalStore(sub, raw, () => "");
  return useMemo(() => parse(r), [r]);
}

// Asistan: "5 dakikalık sayacı başlat" sayacı burada başlatır (mode "start": yarış dizisi)
// Geri al: önceki sayaç kaydı olduğu gibi geri yazılır
export const writeTimer = (t) => write(t);
export function startTimer(sec, mode = "", own = ownHere()) {
  const t = readTimer();
  write({ dur: sec, end: Date.now() + sec * 1000, left: null, mode, zero: ownedBy(t.own, own) ? t.zero : null, own });
}

let ctx = null;
// iPhone ses oturumu (Safari 16.4+): "auto" iken bipler zil/sessiz düğmesine uyar ve sessiz modda hiç çalmaz (YouTube açıkken çalması
// bundan: oturum o an çalma kipindeydi). Sayaç sürerken "playback": sessiz modda da çalar (arka plandaki müzik durabilir); bitince "auto".
// Mikrofon açılırken lib/speech/audioSession.js micReset kipi zaten "auto"ya döndürür.
function session(on) {
  try {
    const s = navigator.audioSession;
    if (s && s.type !== (on ? "playback" : "auto") && (on || s.type === "playback")) s.type = on ? "playback" : "auto";
  } catch {}
}
// iPhone sesi ancak dokunuşla açar: Başlat'a basınca hazırlanır (sayaç sürerken her dokunuşta yeniden uyandırılır).
// Başka bir ses (arama, video, ekran kilidi) araya girince bağlam "interrupted"/"suspended" olur: her bipten önce yeniden uyandırılır.
export function audio() {
  try {
    session(true);
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== "running") ctx.resume().catch(() => {});
  } catch {}
  return ctx;
}
// kind: short (kısa), mid (yarım saniye: start dizisinde 4 ve 1 dakika kala), long (0'da)
function beep(kind) {
  const a = ctx || audio();
  if (a && a.state !== "running") a.resume().catch(() => {});
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "sine";
  o.frequency.value = kind === "long" ? 1320 : 880;
  const t = a.currentTime;
  const d = kind === "long" ? 1 : kind === "mid" ? 0.5 : 0.18;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
  g.gain.setValueAtTime(0.6, t + d - 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + d + 0.02);
}

// Sayacın saati (200 ms) ve onZero(an): sayaç 0'a ulaşınca (uygulama kapalıyken ulaştıysa açılınca bir kez). Ekranlar bunu kullanır;
// bipler ise TimerSound'da (uygulama düzeninde tek yerde): sayaç hangi sayfa açık olursa olsun öter.
export function useTimerRun({ onZero } = {}) {
  const all = useTimer();
  const t = useMemo(() => hereView(all), [all]);
  const [now, setNow] = useState(0);
  const zeroed = useRef(null); // onZero çağrılan bitiş anı
  const zeroFn = useRef(onZero);
  useEffect(() => {
    zeroFn.current = onZero;
  }, [onZero]);

  const running = t.end != null;
  const rem = running ? Math.ceil((t.end - now) / 1000) : t.left ?? t.dur;
  const up = running && rem <= 0; // 0'dan sonra ileri sayım

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n >= t.end && zeroed.current !== t.end) {
        zeroed.current = t.end;
        zeroFn.current?.(t.end, { mode: t.mode, rid: t.rid });
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running, t.end, t.mode, t.rid]);

  return { t, now, running, rem, up };
}

// Bipler, ses oturumu ve ekranın açık kalması: uygulama düzeninde bir kez durur ((app)/layout.jsx), sayfa ya da sekme değişse de çalışır.
// Dizi kayıttaki `mode`a göre (Başlat'a basılan ekranın): "start" yelken start dizisi, "" antrenman (lib/raceLive.js beepAt).
// Bipler yalnız zamanında (geç kalan bip çalmaz). Sayaç sürerken her dokunuş sesi yeniden uyandırır (iPhone sesi ancak dokunuşla açar).
export function TimerSound() {
  const t = useTimer();
  const running = t.end != null;
  const last = useRef(null); // son bip çalan saniye
  const lock = useRef(null);
  // Geri sayım bitti mi (0'dan 3 sn sonra): "Startan beri" ileri sayarken ses ve ekran bırakılır. Seyhun 2026-10-18: uygulamayı
  // açınca YouTube duruyordu; sebebi bitmiş ama "Bitir"e basılmamış sayaçta her dokunuşun ses oturumunu almasıydı.
  const [overEnd, setOverEnd] = useState(null);
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setOverEnd(t.end), Math.max(0, t.end + 3000 - Date.now()));
    return () => clearTimeout(id);
  }, [running, t.end]);
  const active = running && overEnd !== t.end;
  // 59:59'dan sonra sayaç durur (start anı yarış için kalır); uygulama kapalıyken geçtiyse açılınca hemen
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      const c = readTimer();
      if (c.end === t.end) write({ dur: c.dur, end: null, left: null, zero: c.end });
    }, Math.max(0, t.end + (UP_MAX + 1) * 1000 - Date.now()));
    return () => clearTimeout(id);
  }, [running, t.end]);

  useEffect(() => {
    if (!active) return;
    last.current = null;
    const tick = () => {
      const n = Date.now();
      const s = Math.ceil((t.end - n) / 1000);
      const late = (t.end - n) / 1000 - (s - 1); // bu saniyeye girileli geçen
      const kind = beepAt(s, t.mode || "");
      if (kind && last.current !== s && (s === 0 ? n - t.end < 1500 : late > 0.6)) {
        last.current = s;
        beep(kind);
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [active, t.end, t.mode]);

  // Ses: yalnız geri sayım sürerken oturum çalma kipinde; dokununca ve uygulamaya dönünce bağlam yeniden uyandırılır.
  // Sayaç yokken, durunca ya da bitince kip bırakılır: diğer uygulamaların sesine (YouTube, müzik) dokunulmaz.
  useEffect(() => {
    if (!active) {
      session(false);
      if (ctx?.state === "running") ctx.suspend().catch(() => {});
      return;
    }
    const touch = () => audio();
    const wake = () => document.visibilityState === "visible" && audio();
    document.addEventListener("pointerdown", touch, true);
    document.addEventListener("visibilitychange", wake);
    return () => {
      document.removeEventListener("pointerdown", touch, true);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [active]);

  // Ekran açık kalsın (geri sayım sürerken); uygulamaya dönünce yeniden istenir
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let off = false;
    const ask = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((l) => (off ? l.release() : (lock.current = l)))
        .catch(() => {});
    };
    ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      off = true;
      document.removeEventListener("visibilitychange", ask);
      lock.current?.release().catch(() => {});
      lock.current = null;
    };
  }, [active]);

  return null;
}

// mode "start" (yarış multimedya sayfası, Seyhun 2026-10-18): yelken start dizisi; başlatınca, 4:00 ve 1:00 kala bip, son 10 saniye
// her saniye, 0'da uzun bip (lib/raceLive.js beepAt). Hazır süreler 1/2/5 dk. Antrenman sayfası eskisi gibi (son 5 saniye).
// Sayaç düğmelerinin işi (Countdown ve uygulama içi kamera aynı yolu kullanır, CameraSheet). race: yarış akışı (TimerTab useRaceFlow);
// her biri o anki sayaç kaydını okur, yazar ve akışa önceki kaydı verir (Geri al için).
function plainStart(mode) {
  const t = { ...hereView(readTimer()), own: ownHere() };
  audio();
  const left = t.left ?? t.dur;
  if (mode === "start" && t.left == null && !beepAt(left, mode)) beep("mid"); // start dizisi: başlarken bip (1 ya da 4 dk'da zaten çalar)
  const end = Date.now() + left * 1000;
  return { t, end };
}
export function raceStart(race, mode = "start") { // race yoksa düz sayaç (antrenman)
  const { t, end } = plainStart(mode);
  const rid = race ? `s${end.toString(36)}` : undefined;
  write({ ...t, mode, end, left: null, rid });
  race?.onStart(end, rid, t);
}
export function raceCancel(race) {
  const t = readTimer();
  write({ dur: t.dur, end: null, left: null, zero: t.zero });
  race.onCancel(t);
}
export function raceFinish(race) {
  const t = readTimer();
  write({ dur: t.dur, end: null, left: null, zero: t.end });
  race.onFinish(t);
}
export function raceVoid(race) {
  const t = readTimer();
  write({ dur: t.dur, end: null, left: null, zero: t.end });
  race.onVoid(t);
}

// Bipler TimerSound'da (her sayfada çalışır); bu ekran gösterir ve düğmeleri tutar.
// race (yarış multimedya Süre sekmesi): sayaç yarışa bağlı; Başlat yarışı açar (race.onStart(end, rid)), +30 sn/+1 dk start anını kaydırır
// (onShift), geri sayımda Duraklat yerine "İptal" (onCancel), startan sonra "Yarışı bitir" (onFinish) ve yanında "İptal" (onVoid). Her biri önceki sayaç kaydını verir
// (Geri al için, writeTimer ile geri yazılır). race.label: sıradaki yarışın adı.
// compact (yarış multimedya ve antrenman Süre, Seyhun 2026-10-20): Başlat düğmesi yok, büyük çemberin kendisi düğme. Hazırken dokununca başlar,
// geri sayımda dokununca durur; durunca çemberin altında Devam ve Sıfırla (yarışta Sıfırla geri sayımı iptal eder, sebep sorulur). Startan sonra
// çember dokunuşa kapalı (yanlışlıkla bitmesin): Bitir ve İptal alt şeritte. Süre seçimi (presets + başka süre) sağ üstteki "⋯" penceresinde.
// Halkanın içinde yarışın adı (title); alt şeritte lead (Fotoğraf, Video) ve tail (+); ana düğme yokken lead geniş durur.
export function Countdown({ mode = "", presets = PRESETS, onZero, race = null, compact = false, title = "", lead = null, tail = null }) {
  const client = useClient();
  const { t: st, now, running, rem, up } = useTimerRun({ onZero });
  const t = client ? st : blank;
  const [pick, setPick] = useState(false);
  const save = (x) => write({ ...x, own: ownHere() });

  const start = () => raceStart(race, mode);
  const cancel = () => raceCancel(race);
  const finish = () => raceFinish(race);
  const voidIt = () => raceVoid(race); // startan sonra yarışı iptal (genel geri çağırma, tehir): sayaç durur, sebebi çağıran sorar
  const pause = () => save({ ...t, end: null, left: Math.max(1, rem) });
  // Durmuş geri sayım sürer; yarışa bağlıysa start anı yeni bitişe kayar
  const resume = () => {
    audio();
    const end = Date.now() + (t.left ?? t.dur) * 1000;
    save({ ...t, end, left: null });
    if (race && t.rid) race.onShift(end, t.rid);
  };
  const reset = () => save({ dur: t.dur, end: null, left: null, zero: up ? t.end : t.zero }); // son start anı yarış için kalır
  const add = (s) => {
    if (!running) return save({ ...t, left: (t.left ?? t.dur) + s });
    save({ ...t, end: t.end + s * 1000 });
    race?.onShift(t.end + s * 1000, t.rid);
  };
  const choose = (s) => save({ dur: s, end: null, left: null, zero: t.zero });
  const custom = !presets.includes(t.dur);

  const big = compact;
  const R = big ? 134 : 105;
  const V = big ? 288 : 230;
  const C = 2 * Math.PI * R;
  const frac = up ? 0 : Math.max(0, Math.min(1, rem / Math.max(1, running ? Math.max(t.dur, rem) : t.dur)));
  const hot = running && !up && rem <= 5;
  const idle = !running && t.left == null;
  const paused = !running && t.left != null;
  const chip = (on) => `h-9 rounded-full border px-4 text-[0.9375rem] font-medium active:scale-95 ${on ? "border-acc bg-acc text-white" : "border-line bg-bg"}`;
  // compact: çember düğme (hazır → başlat, geri sayım → durdur, durdu → devam); startan sonra kapalı
  const tap = compact && !up ? (idle ? start : running ? pause : resume) : undefined;
  const tapLabel = idle ? "Başlat" : running ? "Durdur" : "Devam";
  const main = compact ? up : true; // compact: ana düğme yalnız startan sonra (Bitir)

  return (
    <section onPointerDown={() => running && !up && audio()} className={`relative mt-3 rounded-2xl border border-line bg-card px-4 text-center ${compact ? "pb-3 pt-3" : "pb-4 pt-5"}`}>
      {compact && idle && (
        <button type="button" onClick={() => setPick(true)} aria-label="Süre seç" className="absolute right-2.5 top-2.5 z-[1] grid size-10 place-items-center rounded-full bg-bg text-[1.25rem] leading-none tracking-wider text-fg2 active:scale-95">
          ⋯
        </button>
      )}
      <div
        className={`relative mx-auto ${big ? "size-[18rem] max-w-full" : "size-[13.5rem]"} ${tap ? "cursor-pointer select-none rounded-full active:scale-[.98]" : ""}`}
        onClick={tap}
        role={tap ? "button" : undefined}
        aria-label={tap ? tapLabel : undefined}
      >
        <svg viewBox={`0 0 ${V} ${V}`} className="absolute inset-0 size-full -rotate-90">
          <circle cx={V / 2} cy={V / 2} r={R} fill="none" stroke="var(--line)" strokeWidth={big ? 10 : 8} />
          {!idle && !up && <circle cx={V / 2} cy={V / 2} r={R} fill="none" stroke={hot ? "var(--rec)" : paused ? "var(--mut)" : "var(--acc)"} strokeWidth={big ? 10 : 8} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {title && <span className="text-[0.875rem] font-semibold text-fg2">{title}</span>}
          <b className={`${big ? "text-[4.5rem] leading-[1.1]" : "text-[3.75rem]"} font-semibold tabular-nums tracking-tight ${hot ? "text-rec" : ""}`}>{mmss(up ? upSec(t.end, now) : Math.max(0, rem))}</b>
          {compact && idle ? (
            <svg viewBox="0 0 24 24" className="mt-0.5 size-8 text-acc" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <small className="text-[0.875rem] text-mut">{up ? "Startan beri" : running ? "Kalan" : paused ? "Durdu" : "Sayaç"}</small>
          )}
        </div>
      </div>
      {compact ? (
        running && !up ? (
          <div className="mt-1.5 flex justify-center gap-2">
            <button onClick={() => add(30)} className={chip(false)}>+30 sn</button>
            <button onClick={() => add(60)} className={chip(false)}>+1 dk</button>
          </div>
        ) : paused ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={resume} data-press className="btn btn-primary">Devam</button>
            <button onClick={race ? cancel : reset} data-press className="btn btn-danger">Sıfırla</button>
          </div>
        ) : null
      ) : (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {idle ? (
            <>
              {presets.map((s) => (
                <button key={s} onClick={() => choose(s)} className={chip(t.dur === s)}>
                  {`${s / 60} dk`}
                </button>
              ))}
              <button onClick={() => setPick(true)} aria-label="Ayarla" className={chip(custom)}>
                {custom ? mmss(t.dur) : "Ayarla"}
              </button>
            </>
          ) : (
            <>
              {!up && (
                <>
                  <button onClick={() => add(30)} className={chip(false)}>+30 sn</button>
                  <button onClick={() => add(60)} className={chip(false)}>+1 dk</button>
                </>
              )}
              {!race && <button onClick={reset} className={chip(false)}>Sıfırla</button>}
            </>
          )}
        </div>
      )}
      <Pick open={pick} dur={t.dur} presets={compact ? presets : null} onClose={() => setPick(false)} onPick={(s) => (choose(s), setPick(false))} />
      <Bar>
        <div className="flex gap-2">
          {main ? lead : lead && <div className="flex min-w-0 flex-1 gap-2 [&>*]:flex-1">{lead}</div>}
          {race && up && (
            <button onClick={voidIt} className={`h-14 shrink-0 rounded-2xl border border-line bg-card text-[1.0625rem] font-semibold text-rec active:translate-y-px ${compact ? "px-3.5" : "px-5"}`}>
              İptal
            </button>
          )}
          {main && (
            <button
              onClick={race ? (up ? finish : running ? cancel : start) : up ? reset : running ? pause : start}
              className={`h-14 min-w-0 flex-1 rounded-2xl font-semibold active:translate-y-px ${compact ? "text-[1rem]" : "text-[1.0625rem]"} ${running && !up ? "border border-line bg-card text-fg" : "bg-acc text-white"}`}
            >
              {race ? (up ? (compact ? "Bitir" : "Yarışı bitir") : running ? "Geri sayımı iptal et" : `Başlat · ${race.label}`) : up ? "Bitir" : running ? "Duraklat" : t.left != null ? "Devam" : "Başlat"}
            </button>
          )}
          {tail}
        </div>
      </Bar>
    </section>
  );
}

// Eylem düğmesi sekme çubuğunun hemen üstünde sabit
// data-bar: şerit açıkken sayfanın alt boşluğu şerit kadar büyür (globals.css), en alttakiler düğmenin altında kalmaz (Seyhun 2026-10-18)
export function Bar({ children }) {
  if (!useClient()) return null;
  // --bar-b: sayfanın kendi alt çubuğu varsa (yarış multimedya sekmeleri) şerit onun üstünde durur
  return createPortal(<div data-bar className="fixed inset-x-0 bottom-[calc(var(--bar-b,var(--dome-h,var(--stage-h,5.5rem)))+0.75rem)] z-30 mx-auto w-full max-w-[30rem] px-5">{children}</div>, document.body);
}

// Ayarla: dakika ve saniye (iPhone'da çark olarak açılır)
// presets verilirse (compact "⋯"): üstte hazır süreler, altta başka süre
function Pick({ open, dur, presets, onClose, onPick }) {
  return (
    <Sheet open={open} onClose={onClose} title="Süre">
      {open && presets && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {presets.map((s) => (
            <button key={s} onClick={() => onPick(s)} className={`h-13 rounded-2xl text-[1rem] font-semibold active:scale-95 ${dur === s ? "bg-acc text-white" : "bg-bg"}`}>
              {s / 60} dk
            </button>
          ))}
        </div>
      )}
      {open && presets && <p className="mb-1 text-left text-[0.875rem] font-semibold text-fg2">Başka süre</p>}
      {open && <PickBody dur={dur} onPick={onPick} />}
    </Sheet>
  );
}
function PickBody({ dur, onPick }) {
  const [m, setM] = useState(Math.floor(dur / 60));
  const [s, setS] = useState(dur % 60 - ((dur % 60) % 5));
  const sel = "h-14 w-28 rounded-xl bg-bg px-3 text-center text-[1.5rem] font-semibold tabular-nums";
  return (
    <>
      <div className="flex justify-center gap-4 pt-2">
        <label className="text-center">
          <select value={m} onChange={(e) => setM(+e.target.value)} className={sel}>
            {Array.from({ length: 60 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
            ))}
          </select>
          <small className="mt-1 block text-[0.8125rem] text-mut">dakika</small>
        </label>
        <label className="text-center">
          <select value={s} onChange={(e) => setS(+e.target.value)} className={sel}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i * 5}>{String(i * 5).padStart(2, "0")}</option>
            ))}
          </select>
          <small className="mt-1 block text-[0.8125rem] text-mut">saniye</small>
        </label>
      </div>
      <button onClick={() => onPick(m * 60 + s || 5)} data-press className="btn btn-primary mt-5 w-full">
        Tamam
      </button>
    </>
  );
}
