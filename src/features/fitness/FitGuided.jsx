"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { exById } from "@/lib/fitness/exercises";
import { Viewer, useBlobUrl } from "./ExerciseMedia";
import { ytEmbed } from "@/lib/fitness/youtube";
import { guideSteps } from "@/lib/fitness/exerciseGuide";
import { FEELS, clockText, goalSec, isTimed, nextOpen, restAfter } from "@/lib/fitness/model";
import { setGuideHandler } from "./guideVoice";

// Adım adım antrenman (FitWorkout'tan açılır, tam ekran): yalnız o anki hareket ve set görünür.
// "Tamamlandı" seti işaretler (FitWorkout kaydeder), dinlenme sayacı başlar, sonra sıradaki set / hareket gelir.
// Sayılar programdaki gibi gösterilir (− / + yok).
// Süreli harekette (süre ve kardiyo, 5 dk dahil) set geri sayımla yapılır: Başlat › Duraklat/Devam › süre dolunca set kendiliğinden
// tamamlanır; erken "Bitirdim" denirse kaç saniyede geçildiği yazılır (sette took, full; setTimeText).
// Düzen: üstte fotoğraf/video/YouTube hep aynı boyda tek kutuda (birden çoksa kaydırılır, noktalar), altında hareketin adı,
// "Not" kartı ve yapılış adımları. Set, tekrar/süre ve düğme altta sabit panelde (hedef yalnız orada yazar; tekrar yok);
// dinlenmede panel koyulaşır, geri sayım orada.
// Sonda "Nasıl geçti?" ve "Antrenmanı bitir". Kapatınca ilerleme kalır (her set işaretlenince plana yazılır).
// Ana asistanla da yürür: ekran kayıt kubbesinin (z-55) altında durur; "tamam", "atla", "15 saniye ekle", "nasıl yapılır",
// "zor geçti", "antrenmanı bitir" buraya gelir (guideWord, words.js; setGuideHandler, guideVoice.js).
const KEY = { time: "sec", cardio: "min", reps: "reps" };
const UNIT = { sec: "sn", min: "dk", reps: "tekrar" };

function useCountdown() {
  const [run, setRun] = useState(null); // { end, total }
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => {
      const n = Date.now();
      if (n >= run.end) {
        clearInterval(t);
        navigator.vibrate?.([30, 60, 30]);
        setRun(null);
      } else setNow(n);
    }, 250);
    return () => clearInterval(t);
  }, [run]);
  const left = run ? Math.max(0, Math.ceil((run.end - now) / 1000)) : 0;
  const start = (sec) => {
    const n = Date.now();
    setNow(n);
    setRun({ end: n + sec * 1000, total: sec });
  };
  return { run, left, start, stop: () => setRun(null), add: (s) => setRun((r) => (r ? { end: r.end + s * 1000, total: r.total + s } : r)) };
}

// Set geri sayımı: duraklatılır, devam ettirilir; geçen süre saniye olarak tutulur
function useSetClock(onEnd) {
  const [run, setRun] = useState(null); // { total sn, base ms (duraklatmadan önce geçen), from ms|null (çalışıyorsa) }
  const [now, setNow] = useState(0);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  const beeped = useRef(0);
  const ac = useRef(null);
  const beep = (hz = 880, ms = 160) => {
    try {
      const c = ac.current;
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = hz;
      g.gain.setValueAtTime(0.25, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + ms / 1000);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + ms / 1000);
    } catch {}
  };
  const used = run ? run.base + (run.from ? Math.max(0, now - run.from) : 0) : 0;
  const left = run ? Math.max(0, Math.ceil(run.total - used / 1000)) : 0;
  useEffect(() => {
    if (!run?.from) return;
    // Ekran kararmasın
    let lock = null;
    navigator.wakeLock?.request?.("screen").then((l) => (lock = l), () => {});
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const u = run.base + (n - run.from);
      const l = Math.ceil(run.total - u / 1000);
      if (l <= 3 && l > 0 && beeped.current !== l) {
        beeped.current = l;
        beep(660, 90);
      }
      if (u >= run.total * 1000) {
        clearInterval(t);
        beep(990, 450);
        navigator.vibrate?.([60, 80, 60]);
        setRun(null);
        end.current?.(run.total, true);
      }
    }, 200);
    return () => {
      clearInterval(t);
      lock?.release?.().catch(() => {});
    };
  }, [run]);
  return {
    run,
    left,
    used: Math.round(used / 1000),
    going: !!run?.from,
    start(total) {
      // Ses için kilit dokunuşta açılır (iPhone)
      try {
        ac.current = ac.current || new (window.AudioContext || window.webkitAudioContext)();
        ac.current.resume?.();
      } catch {}
      beeped.current = 0;
      const n = Date.now();
      setNow(n);
      setRun({ total, base: 0, from: n });
    },
    pause: () => setRun((r) => (r?.from ? { ...r, base: r.base + (Date.now() - r.from), from: null } : r)),
    resume: () => {
      const n = Date.now();
      setNow(n);
      setRun((r) => (r && !r.from ? { ...r, from: n } : r));
    },
    stop: () => setRun(null),
  };
}

function howOf(it) {
  const steps = guideSteps(it?.ex);
  if (steps.length) return steps;
  return String(exById(it?.ex)?.how || "")
    .split(/;\s*/)
    .map((x) => x.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

const kgText = (v) => `${String(v).replace(".", ",")} kg`;
// Paneldeki büyük sayı ve altındaki ek bilgi: "8–12" tekrar · "her yan · çanta 3 kg"
function goalOf(it, cur) {
  const key = KEY[it.kind] || "reps";
  const v = cur[key] || it[key] || "";
  const to = key === "reps" ? it.repsTo : key === "sec" ? it.secTo : 0;
  const more = [it.side ? "her yan" : "", (cur.kg || it.kg) && it.kind === "reps" ? kgText(cur.kg || it.kg) : "", it.bag ? `çanta ${kgText(it.bag)}` : ""];
  return { big: v ? `${String(v).replace(".", ",")}${to && key === "reps" ? `–${to}` : ""}` : "–", unit: UNIT[key], more: more.filter(Boolean), to: key === "sec" && to ? `hedef ${v}–${to} sn` : "" };
}

// Fotoğraf, video ve YouTube aynı kutuda (4:3, ekran genişliği); birden çoksa yana kaydırılır
function MediaBox({ it }) {
  const list = (it.media || []).filter((x) => !x.stock && (x.kind === "video" || x.kind === "photo"));
  const slides = [...list.map((m) => ({ k: m.id, m })), ...(it.yt?.id ? [{ k: `yt${it.yt.id}`, yt: it.yt }] : [])];
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(null);
  const { profile } = useAuth();
  if (!slides.length) return null;
  const onScroll = (e) => {
    const el = e.currentTarget;
    setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  return (
    <div className="relative">
      <div onScroll={onScroll} className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-3xl bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((x) => (
          <div key={x.k} className="relative size-full shrink-0 snap-center">
            {x.yt ? (
              <iframe src={ytEmbed(x.yt.id, x.yt.start)} title="Hareket videosu" className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              <Slide orgId={profile?.orgId} m={x.m} onOpen={setOpen} />
            )}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
          {slides.map((x, i) => (
            <i key={x.k} className={`size-[0.4375rem] rounded-full ${i === at ? "bg-white" : "bg-white/50"}`} />
          ))}
        </div>
      )}
      {open && <Viewer orgId={profile?.orgId} m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
function Slide({ orgId, m, onOpen }) {
  const { url, err, fail } = useBlobUrl(orgId, m);
  if (err) return <span className="grid size-full place-items-center text-[0.8125rem] text-white/70">{m.kind === "video" ? "Video açılamadı" : "Fotoğraf açılamadı"}</span>;
  if (!url) return <span className="shimmer block size-full" />;
  if (m.kind === "video") return <video src={url} controls autoPlay loop muted playsInline onError={fail} className="size-full object-cover" />;
  return (
    <button type="button" onClick={() => onOpen(m)} aria-label="Fotoğrafı büyüt" className="block size-full">
      <img src={url} alt="" onError={fail} className="size-full object-cover" />
    </button>
  );
}

function HowBody({ it }) {
  const how = howOf(it);
  const more = [it.breath ? `Nefes: ${it.breath}` : "", it.tempo ? `Tempo: ${it.tempo}` : "", it.note || ""].filter(Boolean);
  return (
    <>
      {more.length > 0 && (
        <div className="mt-3 rounded-2xl border border-line bg-card px-3.5 py-2.5">
          <small className="block text-[0.75rem] font-semibold text-mut">Not</small>
          <p className="text-[0.9375rem] leading-snug">{more.join(" · ")}</p>
        </div>
      )}
      {how.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {how.map((h, n) => (
            <li key={h} className="flex gap-3 text-[0.9375rem] leading-snug">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-acc/15 text-[0.8125rem] font-bold text-acc">{n + 1}</span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

// Set çubukları: yapılan dolu, şu anki çerçeveli
function SetBars({ s, k, dark = false }) {
  return (
    <span className="mt-1.5 flex justify-end gap-1">
      {s.map((x, i) => (
        <i key={i} className={`h-2 w-5 rounded-full ${x.ok ? (dark ? "bg-white" : "bg-acc") : i === k ? (dark ? "bg-white/25 ring-2 ring-inset ring-white" : "bg-acc/15 ring-2 ring-inset ring-acc") : dark ? "bg-white/20" : "bg-line"}`} />
      ))}
    </span>
  );
}

export function FitGuided({ items = [], sets = [], at = null, onCheck, feel, setFeel, onFinish, onClose }) {
  const [pos, setPos] = useState(() => (at && !sets[at.i]?.[at.k]?.ok ? at : nextOpen(sets, 0, 0)));
  const rest = useCountdown();
  const timer = useSetClock((took, full) => complete({ took, full }));
  const total = sets.reduce((t, s) => t + s.length, 0);
  const done = sets.reduce((t, s) => t + s.filter((x) => x.ok).length, 0);

  // Ekran açıkken arkadaki sayfa kaymasın
  useEffect(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = o;
    };
  }, []);

  // rec: süreli sette { took, full }; verilmezse ve geri sayım sürüyorsa erken geçildi sayılır
  function complete(rec = null) {
    if (!pos) return null;
    const { i, k } = pos;
    const it = items[i] || {};
    let r = rec;
    if (!r && isTimed(it) && timer.run) {
      const goal = goalSec(it, sets[i]?.[k]);
      r = { took: Math.max(1, timer.used), full: timer.used >= goal };
    }
    timer.stop();
    onCheck(i, k, r);
    const next = sets.map((s, a) => (a === i ? s.map((x, b) => (b === k ? { ...x, ok: true } : x)) : s));
    const n = nextOpen(next, i, k + 1);
    setPos(n);
    if (n) rest.start(restAfter(items[i], n.i !== i));
    return n;
  }
  function skipEx() {
    if (!pos) return null;
    rest.stop();
    timer.stop();
    const n = nextOpen(sets, pos.i + 1, 0);
    setPos(n);
    return n;
  }

  // Sesle söylenenler: yapılan işi kısa söyler
  const setText = (p) => (p ? `${p.i === pos?.i ? "" : `Sıradaki hareket: ${items[p.i]?.name}. `}Set ${p.k + 1} / ${sets[p.i]?.length || 0}.` : "");
  function voice(g) {
    if (!g) return "";
    if (g.op === "finish") {
      if (done < total) return `Bitirmek için bütün setleri tamamla. ${total - done} set kaldı.`;
      onFinish("done");
      return "Antrenmanı bitirdim.";
    }
    if (g.op === "feel") {
      setFeel(g.k);
      return `Not ettim: ${FEELS.find(([k]) => k === g.k)?.[1] || ""}.${pos ? "" : " Bitirmek için \"antrenmanı bitir\" de."}`;
    }
    if (!pos) return done < total ? `${total - done} set kaldı. Kalan setlere dönmek için ekrandaki düğmeye dokun.` : "Hepsi tamam. Nasıl geçti? Bitirmek için \"antrenmanı bitir\" de.";
    if (g.op === "how") {
      const h = howOf(items[pos.i]);
      return h.length ? `${items[pos.i]?.name}: ${h.join(". ")}.` : `${items[pos.i]?.name} için açıklama yok.`;
    }
    if (g.op === "more") {
      if (!rest.run) return "Şu an dinlenme yok.";
      rest.add(15);
      return "15 saniye ekledim.";
    }
    if (g.op === "skip") {
      const n = skipEx();
      return n ? `Geçtim. ${setText(n)}` : "Geçtim. Atladığın setler kaldı, bitirmek için onları da tamamla.";
    }
    if (g.op === "done") {
      if (!rest.run && isTimed(items[pos.i]) && !timer.run) {
        timer.start(goalSec(items[pos.i], sets[pos.i]?.[pos.k]));
        return "Süre başladı.";
      }
      if (rest.run) {
        rest.stop();
        return `Dinlenme bitti. ${items[pos.i]?.name}, set ${pos.k + 1} / ${sets[pos.i]?.length || 0}.`;
      }
      const n = complete();
      return n ? `Tamam. ${restAfter(items[pos.i], n.i !== pos.i)} saniye dinlen. ${setText(n)}` : "Tamam, hepsi bitti. Nasıl geçti?";
    }
    return "";
  }
  useEffect(() => {
    setGuideHandler(voice);
  });
  useEffect(() => () => setGuideHandler(null), []);

  const top = (
    <div className="flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button type="button" onClick={onClose} aria-label="Kapat" data-press className="btn btn-round size-10 text-mut">
        <Icon name="x" className="size-5" />
      </button>
      <span className="min-w-0 flex-1">
        <small className="block text-[0.75rem] font-bold tracking-[.08em] text-mut">{pos ? `HAREKET ${pos.i + 1} / ${items.length}` : "ANTRENMAN BİTTİ"}</small>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line/60">
          <span className="block h-full rounded-full bg-acc transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </span>
      </span>
      <span className="text-[0.8125rem] tabular-nums text-mut">
        {done}/{total}
      </span>
    </div>
  );

  // Hepsi bitti: nasıl geçti + bitir. Atlanan set kaldıysa bitirilemez, kalanlara dönülür
  if (!pos) {
    const left = total - done;
    return (
      <div role="dialog" aria-label="Antrenman" className="fixed inset-0 z-[54] flex flex-col bg-bg">
        {top}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <span className={`grid size-20 place-items-center rounded-full text-white ${left ? "bg-mut" : "bg-acc"}`}>
            <Icon name={left ? "clock" : "check"} className="size-10 [stroke-width:2.5]" />
          </span>
          <h2 className="mt-5 text-[1.5rem] font-bold">{left ? `${left} set kaldı` : "Bu kadar"}</h2>
          <p className="mt-1 text-[0.9375rem] text-mut">
            {left ? "Antrenmanı bitirmek için bütün setleri tamamla" : `${done} / ${total} set yapıldı`}
          </p>
          {!left && (
            <>
              <p className="mt-6 text-[0.875rem] font-semibold text-mut">Nasıl geçti?</p>
              <div className="mt-2 flex w-full max-w-xs gap-2">
                {FEELS.map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={feel === k} onClick={() => setFeel(feel === k ? 0 : k)} className={`h-12 flex-1 rounded-xl text-[0.9375rem] font-semibold ${feel === k ? "bg-acc text-white" : "bg-card shadow-sm"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="px-5 pb-[calc(var(--rec-h,0px)+0.75rem)]">
          {left ? (
            <button type="button" onClick={() => setPos(nextOpen(sets, 0, 0))} data-press className="btn btn-primary h-14 w-full">
              Kalan setlere dön
            </button>
          ) : (
            <button type="button" onClick={() => onFinish("done")} data-press className="btn btn-primary h-14 w-full">
              Antrenmanı bitir
            </button>
          )}
        </div>
      </div>
    );
  }

  const it = items[pos.i] || {};
  const s = sets[pos.i] || [];
  const cur = s[pos.k] || {};
  const timed = isTimed(it);
  const goal = timed ? goalSec(it, cur) : 0;
  const g = goalOf(it, cur);
  const left = timer.run ? timer.left : goal;

  return (
    <div role="dialog" aria-label="Antrenman" className="fixed inset-0 z-[54] flex flex-col bg-bg">
      {top}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3.5">
        <MediaBox key={pos.i} it={it} />
        <h2 className="mt-3.5 text-[1.5625rem] font-semibold leading-tight">{it.name}</h2>
        <HowBody key={`h${pos.i}`} it={it} />
      </div>
      {rest.run ? (
        <div className="rounded-t-[1.625rem] bg-deep px-5 pt-4 text-white pb-[calc(var(--rec-h,0px)+0.75rem)]">
          <div className="flex items-end justify-between gap-3">
            <span>
              <b className="text-[3rem] font-semibold leading-none tabular-nums">{rest.left}</b>
              <span className="ml-1.5 text-[1.0625rem] text-white/70">sn dinlen</span>
              <small className="mt-1 block text-[0.8125rem] text-white/70">
                sıradaki: set {pos.k + 1} / {s.length}
              </small>
            </span>
            <SetBars s={s} k={pos.k} dark />
          </div>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/20">
            <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${(rest.left / rest.run.total) * 100}%` }} />
          </span>
          <div className="mt-3.5 flex gap-2">
            <button type="button" onClick={() => rest.add(15)} className="h-14 flex-1 rounded-2xl bg-white/15 text-[1.0625rem] font-semibold active:scale-[.98]">
              +15 sn
            </button>
            <button type="button" onClick={rest.stop} className="h-14 flex-1 rounded-2xl bg-white text-[1.0625rem] font-semibold text-deep active:scale-[.98]">
              Geç
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-t-[1.625rem] border-t border-line bg-card px-5 pt-4 shadow-[0_-6px_20px_rgba(38,40,44,.06)] pb-[calc(var(--rec-h,0px)+0.5rem)]">
          <div className="flex items-end justify-between gap-3">
            <span className="min-w-0">
              {timed ? (
                <b className={`text-[3rem] font-semibold leading-none tabular-nums ${left <= 3 && timer.run ? "text-rec" : ""}`}>{clockText(left)}</b>
              ) : (
                <>
                  <b className="text-[3rem] font-semibold leading-none tabular-nums">{g.big}</b>
                  <span className="ml-1.5 text-[1.0625rem] text-mut">{g.unit}</span>
                </>
              )}
              {(() => {
                const sub = [...g.more, timed && timer.run ? (timer.going ? "kalan" : "Duraklatıldı") : g.to].filter(Boolean);
                return sub.length > 0 && <small className="mt-1 block truncate text-[0.8125rem] text-mut">{sub.join(" · ")}</small>;
              })()}
            </span>
            <span className="shrink-0 text-right">
              <small className="block text-[0.8125rem] font-semibold text-mut">
                Set {pos.k + 1} / {s.length}
              </small>
              <SetBars s={s} k={pos.k} />
            </span>
          </div>
          {timed && timer.run && (
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-acc transition-all" style={{ width: `${goal ? (left / goal) * 100 : 0}%` }} />
            </span>
          )}
          <div className="mt-3.5">
            {!timed && (
              <button type="button" onClick={() => complete()} data-press className="btn btn-primary h-14 w-full">
                Tamamlandı
              </button>
            )}
            {timed && !timer.run && (
              <button type="button" onClick={() => timer.start(goal)} data-press className="btn btn-primary h-14 w-full">
                <Icon name="clock" className="size-5" />
                Başlat
              </button>
            )}
            {timed && timer.run && (
              <div className="flex gap-2">
                <button type="button" onClick={timer.going ? timer.pause : timer.resume} data-press className="btn btn-secondary h-14 flex-1">
                  {timer.going ? "Duraklat" : "Devam et"}
                </button>
                <button type="button" onClick={() => complete()} data-press className="btn btn-primary h-14 flex-1">
                  Bitirdim
                </button>
              </div>
            )}
          </div>
          <button type="button" onClick={skipEx} data-press className="btn btn-text btn-sm mt-1 w-full text-mut">
            Bu hareketi atla
          </button>
        </div>
      )}
    </div>
  );
}
