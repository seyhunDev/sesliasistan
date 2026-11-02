"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { mmss } from "@/lib/raceScore";
import { UP_MAX, beepAt, ownedBy, upSec } from "@/lib/raceLive";

// Antrenman sayacı: hazır 2/5/10 dk ya da Ayarla (dakika + saniye). Son 5 saniye her saniye kısa bip, 0'da uzun bip;
// 0'dan sonra ileri sayar ("Startan beri") ve bu an yarış startı olarak kullanılabilir (readTimer().zero).
// Durum telefonda saklanır (bitiş zamanı): ekran kilitlenip geri gelince kalan süre doğru görünür. iPhone arka planda
// ses çalmaz; sayaç çalışırken ekran açık tutulur (Wake Lock, destekleyen tarayıcıda).
const KEY = "sa-sayac";
// Süre seçimi sayacın altında 5 · 4 · 2 · 1 dk (Seyhun 2026-11-01); son seçilen bu telefonda saklanır, duran sayaç hep onunla açılır
const PRESETS = [300, 240, 120, 60];
const DUR = "sa-sayac-dk";
const blank = { dur: 300, end: null, left: null };
const prefDur = () => {
  try {
    const v = +localStorage.getItem(DUR);
    return v > 0 ? v : null;
  } catch {
    return null;
  }
};
const noop = () => () => {};
const useClient = () => useSyncExternalStore(noop, () => true, () => false);

// zero: sayacın son 0'a ulaştığı an (yarışın startı); sayaç sıfırlansa da kalır
export function lastZero(t = readTimer(), now = Date.now()) {
  return t.end != null && t.end <= now ? t.end : (t.zero ?? null);
}
const parse = (raw) => {
  try {
    const t = JSON.parse(raw || "null");
    return t && Number.isFinite(t.dur) ? t : { ...blank, dur: prefDur() ?? blank.dur };
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
// at: bu telefonda son yazılış anı. Yarış sayfası açılırken belgedeki eski sayaç, burada sonradan bitirilmiş sayacı diriltmesin (useLiveSync)
const write = (t) => {
  const p = t.end == null && t.left == null ? prefDur() : null; // duran sayaç: asistanın ya da başka cihazın süresi değil, seçili süre
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...t, ...(p ? { dur: p } : {}), at: Date.now() }));
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
  const t = useTimer();
  const [now, setNow] = useState(0);
  const zeroed = useRef(null); // onZero çağrılan bitiş anı
  const zeroFn = useRef(onZero);
  useEffect(() => {
    zeroFn.current = onZero;
  }, [onZero]);

  const running = t.end != null;
  // Saat en az son yazış anı: Başlat'a basınca ilk karede eski saatle dev bir süre ("kod gibi" yazı) görünüp titremesin
  const n = Math.max(now, t.at || 0);
  const rem = running ? Math.ceil((t.end - n) / 1000) : t.left ?? t.dur;
  const up = running && rem <= 0; // 0'dan sonra ileri sayım

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n >= t.end && zeroed.current !== t.end) {
        zeroed.current = t.end;
        zeroFn.current?.(t.end, { mode: t.mode, rid: t.rid, own: t.own });
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running, t.end, t.mode, t.rid, t.own]);

  return { t, now: n, running, rem, up };
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

  return <LeadIn />;
}

// Sesle başlatmada 3 · 2 · 1 (Seyhun 2026-11-02 "önce kendi geri sayım yapacak, 3, 2, 1 sonra başlatacak"): ekranın ortasında büyük
// rakam ve her saniye kısa bip; başlatmayı asistan yapar (isler/antrenmanSes.js). Uygulama düzeninde TimerSound'la bir kez durur.
const LEAD = "sa-lead";
export function leadIn(ms = 3000) {
  audio();
  const at = Date.now() + ms;
  window.dispatchEvent(new CustomEvent(LEAD, { detail: at }));
  return at;
}
function LeadIn() {
  const [at, setAt] = useState(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = (e) => setAt(e.detail || 0);
    window.addEventListener(LEAD, on);
    return () => window.removeEventListener(LEAD, on);
  }, []);
  useEffect(() => {
    if (!at) return;
    let last = 0;
    const tick = () => {
      const k = Math.ceil((at - Date.now()) / 1000);
      if (k <= 0) return beep("mid"), setAt(0); // başladı
      if (k !== last) (last = k), setN(k), beep("short");
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [at]);
  if (!at || !n) return null;
  return createPortal(
    <div role="status" aria-label={`Başlıyor ${n}`} className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-black/55">
      <span className="text-[9rem] font-bold leading-none text-white tabular-nums">{n}</span>
    </div>,
    document.body,
  );
}

// mode "start" (yarış multimedya sayfası, Seyhun 2026-10-18): yelken start dizisi; başlatınca, 4:00 ve 1:00 kala bip, son 10 saniye
// her saniye, 0'da uzun bip (lib/raceLive.js beepAt). Sayaç düğmelerinin işi (Countdown).
// TEK SAYAÇ (Seyhun 2026-10-21: "tek bir sayaç kullanalım, oradan yönetelim"): telefonda bir sayaç var; antrenman, yarış multimedya, kamera ve
// küre aynı sayacı gösterir ve yönetir. own/where: sayacın başlatıldığı sayfa ve adı (başka sayfada üstte yazar, dokununca oraya gider).
// race: o sayfanın yarış akışı; yalnız sayaç o sayfanın ve yarışa bağlıysa (rid) çağrılır. Akışa önceki kayıt verilir (Geri al için).
// own: sayacın sahibi sayfa (ana sayfadaki yarış şeridi yarışın multimedya sayfası adına başlatır/bitirir; Seyhun 2026-10-27)
const flowOf = (race, t, own) => (race && t.rid && (own ? ownedBy(t.own, own) : mineHere(t)) ? race : null);
export function raceStart(race, mode = "start", where = "", own = ownHere()) { // race yoksa düz start (yarış açılmaz)
  const t = { ...readTimer(), own, where };
  audio();
  const left = t.left ?? t.dur;
  if (mode === "start" && t.left == null && !beepAt(left, mode)) beep("mid"); // start dizisi: başlarken bip (1 ya da 4 dk'da zaten çalar)
  const end = Date.now() + left * 1000;
  const rid = race ? `s${end.toString(36)}` : undefined;
  write({ ...t, mode, end, left: null, rid });
  race?.onStart(end, rid, t);
}
export function raceCancel(race, own) {
  const t = readTimer();
  write({ dur: t.dur, end: null, left: null, zero: t.zero });
  flowOf(race, t, own)?.onCancel(t);
}
export function raceFinish(race, own) {
  const t = readTimer();
  write({ dur: t.dur, end: null, left: null, zero: t.end });
  flowOf(race, t, own)?.onFinish(t);
}
export function raceVoid(race) {
  const t = readTimer();
  write({ dur: t.dur, end: null, left: null, zero: t.end });
  flowOf(race, t)?.onVoid(t);
}
// Düz start yarışa çevrilir ("+ Yarış yap"): start anı yarışın startı
export function makeRace(race) {
  const t = readTimer();
  if (!race || t.end == null || t.rid) return;
  const rid = `s${t.end.toString(36)}`;
  write({ ...t, rid, own: ownHere() });
  race.onStart(t.end, rid, t);
}

// Süre ekranı (Seyhun 2026-10-21 onayı, örnek yaris-tasarim/sayac/tek-sayac.png): kartta üstte durum, büyük rakamlar, dururken altında
// 5 · 4 · 2 · 1 dk seçimi (start sırası şeridi ve üstteki "5 dk ▾" kalktı, Seyhun 2026-11-01); geri sayımda −1 dk · Eşitle (en yakın tam dakika, komitenin işaretiyle eşitlemek için) · +1 dk; startan sonra "+ Yarış yap" ve
// İptal. Kartın altında tek ana düğme: Başlat · Durdur · Devam · Bitir (çember yok, yanlış dokunuş sayacı değiştirmez).
// title: yarışa bağlı sayaçta yarışın adı; where: bu sayfanın adı (sayaç başlatılınca kayda yazılır). beforeStart: Başlat'tan önce (planı yoksa açar).
// startRace: Başlat yarışı hemen açar (0'da start saati yazılır, herkese açık ekran "Start'tan beri" sayar; Seyhun 2026-11-01).
// Alt şeritte lead ve tail. bottom: ana düğme kokpitte değil alt şeritte (başparmak yetişsin; Seyhun 2026-10-22), solunda side (Sonucu söyle). dark: lacivert kokpitin içinde (antrenman günü, 2026-10-21 yeni tasarım): kart yok, beyaz yazı.
// rec: ana düğmenin sağında yuvarlak düğme (yarışın Start sekmesinde Kayıt; Seyhun 2026-10-30)
// Açık zeminde (dark ve bottom yok; antrenman günü 2026-11-02 yeni tasarım): tek kart, üstte ortada durum ("Yarış 3 hazır", "Yarış 3 · Starta kalan"),
// geri sayım vurgu renginde; kartın altında mid (Bitiren kim? kareleri) ve ana düğme + rec yan yana.
// startText: Başlat düğmesinin yazısı (Yayın: "Başlat · Optimist · Mavi" ya da "Başlat · Start seçilmedi"); noHead: sayaç beklerken üstteki
// "Start sayacı" satırı çizilmez (Seyhun 2026-11-02 "boşuna yer kaplıyor").
export function Countdown({ mode = "", presets = PRESETS, onZero, race: all = null, title = "", where = "", beforeStart, startRace = false, lead = null, tail = null, dark = false, bottom = false, side = null, rec = null, startText = "", noHead = false, mid = null }) {
  const client = useClient();
  const { t: st, now, running, rem, up } = useTimerRun({ onZero });
  const t = client ? st : blank;
  const save = (x) => write({ ...x, own: x.own || ownHere(), where: x.where || where });
  const mine = !client || mineHere(t);
  const race = flowOf(all, t);
  const idle = !running && t.left == null;
  const paused = !running && t.left != null;
  // Başka sayfanın yarışına bağlı sayaç burada yalnız görünür: yarışı bitirmek, iptal ve kaydırma o sayfada (yarışın kaydı orada)
  const away = !mine && !!t.rid && !idle && !!t.own;
  const ownHref = t.own?.startsWith("/athletes/races/") ? `${t.own}?tab=sure` : t.own;

  // startRace: Başlat yarışı da açar (Yayın sayfası; yarış belli, "+ Yarış yap" gerekmez), yoksa düz start
  const start = () => (beforeStart?.(), raceStart(startRace ? all : null, mode, where));
  const pause = () => save({ ...t, end: null, left: Math.max(1, rem) });
  const resume = () => {
    audio();
    const end = Date.now() + (t.left ?? t.dur) * 1000;
    save({ ...t, end, left: null });
    race?.onShift(end, t.rid);
  };
  const reset = () => save({ dur: t.dur, end: null, left: null, zero: up ? t.end : t.zero }); // son start anı yarış için kalır
  const shift = (end) => (save({ ...t, end }), race?.onShift(end, t.rid));
  const add = (s) => running && shift(t.end + s * 1000);
  const even = () => running && shift(Date.now() + Math.round(rem / 60) * 60000);
  const choose = (s) => {
    try {
      localStorage.setItem(DUR, String(s));
    } catch {}
    save({ dur: s, end: null, left: null, zero: t.zero, own: "", where: "" });
  };

  const hot = running && !up && rem <= 10;
  const head = up ? "Startan beri" : running ? "Starta kalan" : paused ? "Durdu" : "Start sayacı";
  const time = up ? `+${mmss(upSec(t.end, now))}` : mmss(Math.max(0, paused ? t.left : rem));
  const btn = `flex h-12 min-w-0 flex-1 items-center justify-center rounded-[0.875rem] border px-2 text-[1rem] font-semibold active:translate-y-px active:shadow-none ${dark ? "ck-glass text-white shadow-[0_2px_0_rgba(0,0,0,.35)]" : "border-line bg-card shadow-[0_2px_0_var(--line)]"}`;
  const mainCls = (on) =>
    `mt-3 flex h-16 w-full items-center justify-center rounded-[1.125rem] text-[1.25rem] font-semibold active:translate-y-0.5 active:shadow-none ${
      dark
        ? on
          ? "bg-white text-[#11203a] shadow-[0_3px_0_rgba(0,0,0,.35)]"
          : "ck-glass text-white shadow-[0_3px_0_rgba(0,0,0,.35)]"
        : on
          ? "bg-acc text-white shadow-[0_3px_0_color-mix(in_srgb,var(--acc)_70%,#000)]"
          : "border border-line bg-card text-fg shadow-[0_3px_0_var(--line)]"
    }`;
  // Alt şeritte açık zeminde (bottom): kokpitin dışında
  const barCls = (on) =>
    `flex h-14 w-full items-center justify-center rounded-2xl text-[1.125rem] font-semibold active:translate-y-0.5 active:shadow-none ${
      on ? "bg-acc text-white shadow-[0_3px_0_color-mix(in_srgb,var(--acc)_70%,#000)]" : "border border-line bg-card text-fg shadow-[0_3px_0_var(--line)]"
    }`;
  const main = (cls) =>
    away ? (
      <Link href={ownHref} className={cls(true)}>
        {t.where || "Sayacın sayfası"} ›
      </Link>
    ) : (
      <button type="button" onClick={idle ? start : up ? (race ? () => raceFinish(race) : reset) : running ? pause : resume} className={cls(!running || up)}>
        <span className="truncate px-3">{idle ? startText || "Başlat" : up ? (race ? "Bitti" : "Bitir") : running ? "Durdur" : "Devam"}</span>
      </button>
    );
  const red = dark ? "text-[#f4a49c]" : "text-rec"; // lacivertte koyu kırmızı okunmuyor
  // iPhone saati gibi: ikinci düğme (Sıfırla / İptal) ana düğmenin hemen solunda; varken side (Sonucu söyle) yer açar
  const sub2 = bottom && !away && (paused || up) && (
    <button type="button" onClick={paused ? (race ? () => raceCancel(race) : reset) : race ? () => raceVoid(race) : reset} className={barCls(false).replace("text-fg", "text-rec")}>
      {paused ? "Sıfırla" : race ? "Abandone" : "İptal"}
    </button>
  );
  const left = sub2 || side;
  const accTx = dark ? "text-[#c4b5fd]" : "text-acc";
  const chip = (on) =>
    `h-11 min-w-0 flex-1 rounded-xl text-[1rem] font-semibold tabular-nums active:translate-y-px ${
      dark ? (on ? "bg-white text-[#11203a]" : "ck-glass text-white/85") : on ? "bg-acc text-white" : "bg-bg text-fg2"
    }`;

  return (
    <>
      <section onPointerDown={() => running && !up && audio()} className={dark ? "mt-4 text-center" : "mt-2 rounded-3xl border border-line bg-card px-4 pb-4 pt-3 text-center"}>
        {!dark && !bottom ? (
          <div className="flex h-7 items-center justify-center gap-1.5 truncate text-[0.9375rem] font-semibold text-mut">
            {idle ? (
              <span className="truncate">{title ? `${title} hazır` : "Start sayacı"}</span>
            ) : !mine && t.own ? (
              <Link href={ownHref} className="truncate text-acc">{t.where || "Sayacın sayfası"} ›</Link>
            ) : (
              <span className="truncate">{title && <b className="font-semibold text-fg">{title} · </b>}{head}</span>
            )}
          </div>
        ) : (
        <div className={`flex h-8 items-center justify-between gap-2 text-[0.9375rem] font-semibold ${dark ? "text-white/70" : "text-fg2"}`}>
          <span>{idle && noHead ? "" : head}</span>
          {idle ? null : !mine && t.own ? (
            <Link href={ownHref} className={`truncate ${accTx}`}>
              {t.where || "Sayacın sayfası"} ›
            </Link>
          ) : (
            <span className="truncate">{title}</span>
          )}
        </div>
        )}
        <b className={`mt-1 block font-semibold leading-[1.05] tabular-nums tracking-[-0.03em] ${up ? "text-[5.25rem]" : "text-[6.25rem]"} ${hot ? red : !dark && running && !up ? "text-acc" : ""}`}>{time}</b>
        {idle && presets?.length > 1 && (
          <div className="mt-4 flex gap-1.5">
            {presets.map((s) => (
              <button key={s} type="button" onClick={() => choose(s)} aria-pressed={t.dur === s} className={chip(t.dur === s)}>
                {s / 60} dk
              </button>
            ))}
          </div>
        )}
        {running && !up && !away && (
          <div className="mt-3.5 flex gap-2">
            <button type="button" onClick={() => add(-60)} disabled={rem <= 60} className={`${btn} disabled:opacity-40`}>−1 dk</button>
            <button type="button" onClick={even} className={btn}>Eşitle</button>
            <button type="button" onClick={() => add(60)} className={btn}>+1 dk</button>
          </div>
        )}
        {paused && !away && !bottom && (
          <div className="mt-3.5 flex gap-2">
            <button type="button" onClick={race ? () => raceCancel(race) : reset} className={`${btn} ${red}`}>Sıfırla</button>
          </div>
        )}
        {up && !away && (!bottom || (all && !race && mine)) && (
          <div className="mt-3.5 flex gap-2">
            {all && !race && mine && (
              <button type="button" onClick={() => makeRace(all)} className={`${btn} ${accTx}`}>+ Yarış yap</button>
            )}
            {!bottom && !(dark && race) && <button type="button" onClick={race ? () => raceVoid(race) : reset} className={`${btn} ${red}`}>{race ? "Abandone" : "İptal"}</button>}
          </div>
        )}
        {!dark && !bottom && (
          <>
            {mid}
            <div className="mt-4 flex items-stretch gap-2">
              {main((on) => mainCls(on).replace("mt-3 ", "").replace("w-full", "min-w-0 flex-1"))}
              {rec}
            </div>
          </>
        )}
      </section>
      {bottom ? (
        <Bar>
          <div className="flex items-center gap-2">
            {left && <div className="min-w-0 flex-1 [&>*]:w-full">{left}</div>}
            <div className="min-w-0 flex-1">{main(barCls)}</div>
            {rec}
          </div>
        </Bar>
      ) : dark && race && up && !away ? (
        // Yarışta yalnız iki düğme yan yana (Seyhun 2026-11-02 tasarım "startlar-yeni"): Abandone · Bitti
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => raceVoid(race)} className={mainCls(false).replace("mt-3 ", "").replace("w-full", "min-w-0 flex-1").replace("text-fg", "text-rec")}>
            <span className="truncate px-3 text-[#f4a49c]">Abandone</span>
          </button>
          {main((on) => mainCls(on).replace("mt-3 ", "").replace("w-full", "min-w-0 flex-1"))}
        </div>
      ) : (
        dark && main(mainCls)
      )}
      {(lead || tail) && (
        <Bar>
          <div className="flex gap-2 [&>*]:min-w-0 [&>*]:flex-1">
            {lead}
            {tail}
          </div>
        </Bar>
      )}
    </>
  );
}

// Eylem düğmesi sekme çubuğunun hemen üstünde sabit
// data-bar: şerit açıkken sayfanın alt boşluğu şerit kadar büyür (globals.css), en alttakiler düğmenin altında kalmaz (Seyhun 2026-10-18)
export function Bar({ children }) {
  if (!useClient()) return null;
  // --bar-b: sayfanın kendi alt çubuğu varsa (yarış multimedya sekmeleri) şerit onun üstünde durur
  return createPortal(<div data-bar className="fixed inset-x-0 bottom-[calc(var(--bar-b,var(--dome-h,var(--stage-h,5.5rem)))+0.75rem)] z-30 mx-auto w-full max-w-[30rem] px-5">{children}</div>, document.body);
}
