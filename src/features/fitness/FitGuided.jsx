"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { exById } from "@/lib/fitness/exercises";
import { ExerciseMedia, MediaVideo } from "./ExerciseMedia";
import { YtPlayer } from "./YtVideo";
import { guideSteps } from "@/lib/fitness/exerciseGuide";
import { FEELS, bump, clockText, goalSec, isTimed, nextOpen } from "@/lib/fitness/model";
import { setGuideHandler } from "./guideVoice";

// Adım adım antrenman (FitWorkout'tan açılır, tam ekran): yalnız o anki hareket ve set görünür.
// "Tamamlandı" seti işaretler (FitWorkout kaydeder), dinlenme sayacı başlar, sonra sıradaki set / hareket gelir.
// Değer hedeften farklıysa − / + ile düzeltilir.
// Süreli harekette (süre ve kardiyo, 5 dk dahil) set geri sayımla yapılır: Başlat › Duraklat/Devam › süre dolunca set kendiliğinden
// tamamlanır; erken "Bitirdim" denirse kaç saniyede geçildiği yazılır (sette took, full; setTimeText).
// Hareketin videosu (YouTube ya da eklenen video/fotoğraf) ve açıklaması hareket ekranında doğrudan görünür,
// setler altında; ayrı "Nasıl yapılır" ekranı yok. Video oynatılmıyorken küçük kart (dokununca büyür), geri sayım
// arka plansız: ekran kaydırmadan sığsın.
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

function Adjust({ label, value, unit, onChange }) {
  // onChange yoksa (sporcu) yalnız değer görünür, − / + yok
  if (!onChange) {
    return (
      <div className="text-center">
        <b className="block text-[2.75rem] font-bold leading-none tabular-nums">{value ? String(value).replace(".", ",") : "–"}</b>
        <small className="mt-1 block text-[0.8125rem] text-mut">{unit}</small>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-4">
      <button type="button" aria-label={`${label} azalt`} onClick={() => onChange(-1)} className="grid size-11 place-items-center rounded-full bg-card text-[1.375rem] font-semibold shadow-sm active:scale-90">
        −
      </button>
      <span className="min-w-[6.5rem] text-center">
        <b className="block text-[2.75rem] font-bold leading-none tabular-nums">{value ? String(value).replace(".", ",") : "–"}</b>
        <small className="mt-1 block text-[0.8125rem] text-mut">{unit}</small>
      </span>
      <button type="button" aria-label={`${label} artır`} onClick={() => onChange(1)} className="grid size-11 place-items-center rounded-full bg-card text-[1.375rem] font-semibold shadow-sm active:scale-90">
        +
      </button>
    </div>
  );
}

function howOf(it) {
  const steps = guideSteps(it?.ex);
  if (steps.length) return steps;
  return String(exById(it?.ex)?.how || "")
    .split(/;\s*/)
    .map((x) => x.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

// Hedef: "3 set × 12 tekrar · 20 kg"
function targetText(it, n) {
  const key = KEY[it.kind] || "reps";
  const to = key === "reps" ? it.repsTo : key === "sec" ? it.secTo : 0;
  const kg = (v) => `${String(v).replace(".", ",")} kg`;
  const head = [`${n} set`, it[key] ? `${it[key]}${to ? `–${to}` : ""} ${UNIT[key]}${it.side ? " (her yan)" : ""}` : ""].filter(Boolean).join(" × ");
  return [head, it.kg ? kg(it.kg) : "", it.bag ? `çanta ${kg(it.bag)}` : ""].filter(Boolean).join(" · ");
}

function HowBody({ it }) {
  const how = howOf(it);
  const more = [it.breath ? `Nefes: ${it.breath}` : "", it.tempo ? `Tempo: ${it.tempo}` : "", it.note || ""].filter(Boolean);
  return (
    <>
      {more.length > 0 && (
        <p className="mt-2 rounded-xl bg-acc/10 px-3 py-2 text-[0.875rem] leading-snug text-fg">{more.join(" · ")}</p>
      )}
      <MediaVideo media={it.media} className="mt-3" />
      <YtPlayer key={it.yt?.id} yt={it.yt} className="mt-2" />
      <ExerciseMedia media={it.media} ex={it.ex} noVideo className="mt-2" />
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

export function FitGuided({ items = [], sets = [], at = null, onCheck, onVal, feel, setFeel, onFinish, onClose }) {
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
    if (n) rest.start(items[i]?.rest || 60);
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
      return n ? `Tamam. ${items[pos.i]?.rest || 60} saniye dinlen. ${setText(n)}` : "Tamam, hepsi bitti. Nasıl geçti?";
    }
    return "";
  }
  useEffect(() => {
    setGuideHandler(voice);
  });
  useEffect(() => () => setGuideHandler(null), []);

  const top = (
    <div className="flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-10 place-items-center rounded-full bg-card text-mut shadow-sm active:scale-90">
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
            <button type="button" onClick={() => setPos(nextOpen(sets, 0, 0))} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
              Kalan setlere dön
            </button>
          ) : (
            <button type="button" onClick={() => onFinish("done")} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
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
  const key = KEY[it.kind] || "reps";
  const val = cur[key] || it[key] || "";
  const timed = isTimed(it);
  const goal = timed ? goalSec(it, cur) : 0;

  return (
    <div role="dialog" aria-label="Antrenman" className="fixed inset-0 z-[54] flex flex-col bg-bg">
      {top}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-4">
        <h2 className="text-[1.625rem] font-bold leading-tight">{it.name}</h2>
        <p className="mt-1 text-[0.9375rem] font-semibold text-mut">{targetText(it, s.length)}</p>
        <HowBody key={pos.i} it={it} />

        {rest.run ? (
          <div className="mt-6 rounded-3xl bg-deep px-5 py-7 text-center text-white">
            <small className="block text-[0.8125rem] font-bold tracking-[.08em] text-white/70">DİNLEN</small>
            <b className="mt-2 block text-[3.5rem] font-bold leading-none tabular-nums">{rest.left}</b>
            <small className="mt-1 block text-[0.875rem] text-white/70">saniye · sıradaki: set {pos.k + 1} / {s.length}</small>
            <span className="mx-auto mt-4 block h-1.5 max-w-[14rem] overflow-hidden rounded-full bg-white/20">
              <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${(rest.left / rest.run.total) * 100}%` }} />
            </span>
            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={() => rest.add(15)} className="h-10 rounded-full bg-white/15 px-4 text-[0.875rem] font-semibold">
                +15 sn
              </button>
              <button type="button" onClick={rest.stop} className="h-10 rounded-full bg-white px-5 text-[0.875rem] font-semibold text-deep">
                Geç
              </button>
            </div>
          </div>
        ) : (
          <div className={timed ? "mt-4" : "mt-6 rounded-3xl bg-card px-4 py-6 shadow-[0_1px_3px_rgba(38,40,44,.05)]"}>
            <p className="text-center text-[0.9375rem] font-semibold text-mut">
              Set {pos.k + 1} / {s.length}
            </p>
            {timed ? (
              <Clock left={timer.run ? timer.left : goal} total={goal} run={timer.run} going={timer.going} />
            ) : null}
            {!timer.run && (!timed || onVal) && (
              <div className="mt-4">
                <Adjust label={UNIT[key]} value={val} unit={UNIT[key]} onChange={onVal ? (d) => onVal(pos.i, pos.k, key, bump(val, key, d)) : null} />
              </div>
            )}
            {it.kind === "reps" && (cur.kg || it.kg) ? (
              <div className="mt-4">
                <Adjust label="kilo" value={cur.kg || it.kg} unit="kg" onChange={onVal ? (d) => onVal(pos.i, pos.k, "kg", bump(cur.kg || it.kg, "kg", d)) : null} />
              </div>
            ) : null}

          </div>
        )}
      </div>
      <div className="px-5 pb-[calc(var(--rec-h,0px)+0.75rem)]">
        {!rest.run && !timed && (
          <button type="button" onClick={() => complete()} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
            Tamamlandı
          </button>
        )}
        {!rest.run && timed && !timer.run && (
          <button type="button" onClick={() => timer.start(goal)} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
            <Icon name="clock" className="size-5" />
            Başlat · {clockText(goal)}
          </button>
        )}
        {!rest.run && timed && timer.run && (
          <div className="flex gap-2">
            <button type="button" onClick={timer.going ? timer.pause : timer.resume} className="h-14 flex-1 rounded-2xl bg-card text-[1.0625rem] font-semibold shadow-sm active:scale-[.98]">
              {timer.going ? "Duraklat" : "Devam et"}
            </button>
            <button type="button" onClick={() => complete()} className="h-14 flex-1 rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
              Bitirdim
            </button>
          </div>
        )}
        <button type="button" onClick={skipEx} className="mt-2 h-10 w-full text-[0.875rem] font-semibold text-mut">
          Bu hareketi atla
        </button>
      </div>
    </div>
  );
}

// Büyük geri sayım halkası: kalan süre (0:30, 5:00), duraklatılınca "Duraklatıldı"
function Clock({ left, total, run, going }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const part = total ? left / total : 1;
  return (
    <div className="relative mx-auto mt-2 size-[9.5rem]">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="10" className="stroke-line/60" />
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-acc transition-[stroke-dashoffset] duration-200" strokeDasharray={c} strokeDashoffset={c * (1 - part)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        <span>
          <b className={`block text-[2.5rem] font-bold leading-none tabular-nums ${left <= 3 && run ? "text-rec" : ""}`}>{clockText(left)}</b>
          <small className="mt-1 block text-[0.8125rem] text-mut">{!run ? "hazır" : going ? "kalan" : "Duraklatıldı"}</small>
        </span>
      </span>
    </div>
  );
}
