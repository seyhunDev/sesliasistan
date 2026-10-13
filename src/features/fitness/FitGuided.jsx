"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { exById } from "@/lib/fitness/exercises";
import { ExerciseMedia } from "./ExerciseMedia";
import { YtPlayer, YtToggle } from "./YtVideo";
import { guideSteps, stockPhotos } from "@/lib/fitness/exerciseGuide";
import { FEELS, bump, nextOpen } from "@/lib/fitness/model";
import { setGuideHandler } from "./guideVoice";

// Adım adım antrenman (FitWorkout'tan açılır, tam ekran): yalnız o anki hareket ve set görünür.
// "Tamamlandı" seti işaretler (FitWorkout kaydeder), dinlenme sayacı başlar, sonra sıradaki set / hareket gelir.
// Değer hedeften farklıysa − / + ile düzeltilir. Süreli harekette "Süreyi başlat" geri sayar.
// Her hareketin başında "Nasıl yapılır" ekranı (video/fotoğraf + açıklama, "Başla"); başladıktan sonra
// başlıktaki "Nasıl yapılır" düğmesi aynısını pencerede açar.
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
const hasHow = (it) => howOf(it).length > 0 || (it?.media || []).length > 0 || stockPhotos(it?.ex).length > 0 || !!it?.yt?.id;

// Hedef: "3 set × 12 tekrar · 20 kg"
function targetText(it, n) {
  const key = KEY[it.kind] || "reps";
  return [`${n} set`, it[key] ? `${it[key]} ${UNIT[key]}` : "", it.kg ? `${String(it.kg).replace(".", ",")} kg` : ""].filter(Boolean).join(" × ").replace(/ × (\S+ kg)$/, " · $1");
}

function HowBody({ it }) {
  const how = howOf(it);
  return (
    <>
      {it.yt?.id && <YtPlayer yt={it.yt} className="mt-4" />}
      <ExerciseMedia media={it.media} ex={it.ex} big={!it.yt?.id} className="mt-4" />
      {how.length > 0 && (
        <ol className="mt-4 space-y-2.5">
          {how.map((h, n) => (
            <li key={h} className="flex gap-3 text-[1rem] leading-snug">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-acc/15 text-[0.8125rem] font-bold text-acc">{n + 1}</span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function FitGuided({ items = [], sets = [], onCheck, onVal, feel, setFeel, onFinish, onClose }) {
  const [pos, setPos] = useState(() => nextOpen(sets, 0, 0));
  // Başlatılan hareketler; yarıda kalan hareket (ilk seti yapılmış) başlamış sayılır
  const [seen, setSeen] = useState(() => {
    const p = nextOpen(sets, 0, 0);
    return new Set(p && sets[p.i]?.some((x) => x.ok) ? [p.i] : []);
  });
  const [howOpen, setHowOpen] = useState(false);
  const intro = !!pos && !seen.has(pos.i) && hasHow(items[pos.i]);
  const begin = () => {
    if (!pos) return;
    rest.stop();
    setSeen((x) => new Set(x).add(pos.i));
  };
  const rest = useCountdown();
  const timer = useCountdown();
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

  function complete() {
    if (!pos) return null;
    const { i, k } = pos;
    timer.stop();
    onCheck(i, k);
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
      onFinish("done");
      return "Antrenmanı bitirdim.";
    }
    if (g.op === "feel") {
      setFeel(g.k);
      return `Not ettim: ${FEELS.find(([k]) => k === g.k)?.[1] || ""}.${pos ? "" : " Bitirmek için \"antrenmanı bitir\" de."}`;
    }
    if (!pos) return "Hepsi tamam. Nasıl geçti? Bitirmek için \"antrenmanı bitir\" de.";
    if (g.op === "how") {
      if (!intro && hasHow(items[pos.i])) setHowOpen(true);
      const h = String(exById(items[pos.i]?.ex)?.how || "").trim();
      return h ? `${items[pos.i]?.name}: ${h.replace(/;\s*/g, ". ")}` : `${items[pos.i]?.name} için açıklama yok.`;
    }
    if (g.op === "more") {
      if (!rest.run) return "Şu an dinlenme yok.";
      rest.add(15);
      return "15 saniye ekledim.";
    }
    if (g.op === "skip") {
      const n = skipEx();
      return n ? `Geçtim. ${setText(n)}` : "Geçtim. Hepsi tamam. Nasıl geçti?";
    }
    if (g.op === "done") {
      if (intro) {
        begin();
        return `Başladık. ${items[pos.i]?.name}, set ${pos.k + 1} / ${sets[pos.i]?.length || 0}.`;
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

  // Hepsi bitti (ya da kalanlar atlandı): nasıl geçti + bitir
  if (!pos) {
    return (
      <div role="dialog" aria-label="Antrenman" className="fixed inset-0 z-[54] flex flex-col bg-bg">
        {top}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-acc text-white">
            <Icon name="check" className="size-10 [stroke-width:2.5]" />
          </span>
          <h2 className="mt-5 text-[1.5rem] font-bold">Bu kadar</h2>
          <p className="mt-1 text-[0.9375rem] text-mut">
            {done} / {total} set yapıldı
          </p>
          <p className="mt-6 text-[0.875rem] font-semibold text-mut">Nasıl geçti?</p>
          <div className="mt-2 flex w-full max-w-xs gap-2">
            {FEELS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={feel === k} onClick={() => setFeel(feel === k ? 0 : k)} className={`h-12 flex-1 rounded-xl text-[0.9375rem] font-semibold ${feel === k ? "bg-acc text-white" : "bg-card shadow-sm"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 pb-[calc(var(--rec-h,0px)+0.75rem)]">
          <button type="button" onClick={() => onFinish("done")} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
            Antrenmanı bitir
          </button>
        </div>
      </div>
    );
  }

  const it = items[pos.i] || {};
  const s = sets[pos.i] || [];
  const cur = s[pos.k] || {};
  const key = KEY[it.kind] || "reps";
  const val = cur[key] || it[key] || "";

  // Hareket başlamadan önce: nasıl yapılır (video/fotoğraf + açıklama), sonra "Başla"
  if (intro) {
    return (
      <div role="dialog" aria-label="Nasıl yapılır" className="fixed inset-0 z-[54] flex flex-col bg-bg">
        {top}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5">
          <small className="block text-[0.75rem] font-bold tracking-[.08em] text-acc">NASIL YAPILIR</small>
          <h2 className="mt-1 text-[1.625rem] font-bold leading-tight">{it.name}</h2>
          <p className="mt-1 text-[0.9375rem] font-semibold text-mut">{targetText(it, s.length)}</p>
          <HowBody it={it} />
          {rest.run && <p className="mt-5 text-center text-[0.875rem] text-mut">Dinlenme: {rest.left} sn</p>}
        </div>
        <div className="px-5 pb-[calc(var(--rec-h,0px)+0.75rem)]">
          <button type="button" onClick={begin} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
            Başla
          </button>
          <button type="button" onClick={skipEx} className="mt-2 h-10 w-full text-[0.875rem] font-semibold text-mut">
            Bu hareketi atla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-label="Antrenman" className="fixed inset-0 z-[54] flex flex-col bg-bg">
      {top}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5">
        <h2 className="text-[1.625rem] font-bold leading-tight">{it.name}</h2>
        <YtToggle key={it.yt?.id || pos.i} yt={it.yt} className="mt-3" />
        {hasHow(it) && (
          <button type="button" onClick={() => setHowOpen(true)} className="mt-3 flex h-10 items-center gap-2 rounded-full bg-card px-4 text-[0.9375rem] font-semibold text-acc shadow-sm active:scale-95">
            <Icon name={it.yt?.id || (it.media || []).some((m) => m.kind === "video") ? "video" : "book"} className="size-4.5" />
            Nasıl yapılır
          </button>
        )}

        {rest.run ? (
          <div className="mt-8 rounded-3xl bg-deep px-5 py-7 text-center text-white">
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
          <div className="mt-8 rounded-3xl bg-card px-4 py-6 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            <p className="text-center text-[0.9375rem] font-semibold text-mut">
              Set {pos.k + 1} / {s.length}
            </p>
            <div className="mt-4">
              <Adjust label={UNIT[key]} value={val} unit={UNIT[key]} onChange={onVal ? (d) => onVal(pos.i, pos.k, key, bump(val, key, d)) : null} />
            </div>
            {it.kind === "reps" && (cur.kg || it.kg) ? (
              <div className="mt-4">
                <Adjust label="kilo" value={cur.kg || it.kg} unit="kg" onChange={onVal ? (d) => onVal(pos.i, pos.k, "kg", bump(cur.kg || it.kg, "kg", d)) : null} />
              </div>
            ) : null}
            {it.kind === "time" && (
              <button type="button" onClick={() => (timer.run ? timer.stop() : timer.start(Number(val) || 30))} className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-full bg-bg px-5 text-[0.9375rem] font-semibold">
                <Icon name="clock" className="size-5" />
                {timer.run ? `${timer.left} sn · Durdur` : "Süreyi başlat"}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="px-5 pb-[calc(var(--rec-h,0px)+0.75rem)]">
        {!rest.run && (
          <button type="button" onClick={complete} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
            Tamamlandı
          </button>
        )}
        <button type="button" onClick={skipEx} className="mt-2 h-10 w-full text-[0.875rem] font-semibold text-mut">
          Bu hareketi atla
        </button>
      </div>
      {howOpen && (
        <div role="dialog" aria-label="Nasıl yapılır" className="fixed inset-0 z-[56] flex flex-col bg-bg">
          <div className="flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span className="min-w-0 flex-1">
              <small className="block text-[0.75rem] font-bold tracking-[.08em] text-acc">NASIL YAPILIR</small>
              <b className="block truncate text-[1.25rem]">{it.name}</b>
            </span>
            <button type="button" onClick={() => setHowOpen(false)} aria-label="Kapat" className="grid size-10 place-items-center rounded-full bg-card text-mut shadow-sm active:scale-90">
              <Icon name="x" className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <HowBody it={it} />
          </div>
          <div className="px-5 pb-[calc(var(--rec-h,0px)+0.75rem)]">
            <button type="button" onClick={() => setHowOpen(false)} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:scale-[.98]">
              Devam et
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
