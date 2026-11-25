"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { exById } from "@/lib/fitness/exercises";
import { Viewer, useBlobUrl } from "./ExerciseMedia";
import { ytEmbed } from "@/lib/fitness/youtube";
import { guideSteps } from "@/lib/fitness/exerciseGuide";
import { FEELS, clockText, estMinutes, goalSec, isTimed, nextOpen, restAfter } from "@/lib/fitness/model";
import { setGuideHandler } from "./guideVoice";
import { useKind } from "@/features/auth/useKind";
import { useTts } from "@/features/speech/TtsProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { LIME, SahneAdd, SahneBtn, SahneIntro, SahneToggles, head } from "./FitSahne";

// Antrenör sesi: doğal Gemini sesi, "fitness" tarzı; metinler sabit olduğu için sunucuda saklanır (docs/seslendirme.md)
const FIT_VOICE = { style: "fitness", cache: true };

// Adım adım antrenman (FitWorkout'tan açılır, tam ekran): yalnız o anki hareket ve set görünür.
// "Tamamlandı" seti işaretler (FitWorkout kaydeder), dinlenme sayacı başlar, sonra sıradaki set / hareket gelir.
// Sayılar programdaki gibi gösterilir (− / + yok).
// Süreli harekette (süre ve kardiyo, 5 dk dahil) set geri sayımla yapılır: Başlat › Duraklat/Devam › süre dolunca set kendiliğinden
// tamamlanır; erken "Bitirdim" denirse kaç saniyede geçildiği yazılır (sette took, full; setTimeText).
// Düzen "Sahne" (Seyhun 2026-11-25, FitSahne.jsx): koyu zemin, fotoğraf/video üst yarıyı kenardan kenara doldurur, üstte hikâye
// çizgileri (her hareket bir çizgi); hareketin adı dev dar harflerle görüntünün üstüne biner, altında yapılış adımları. Tekrar/süre,
// set noktaları ve limon düğme altta sabit; dinlenmede sayaç orada. Hiç set yapılmadıysa önce giriş (SahneIntro) açılır ve sesli
// okunur; her yeni hareketin adı ve seti söylenir (Ayarlar'daki sesli yanıttan bağımsız, sağ üstteki hoparlörle susturulur,
// sa-fit-sessiz). Fotoğrafı olmayan harekette sporcu dev sıra numarasını, ana hesap "+" görür (SahneAdd).
// Sonda "Nasıl geçti?" ve "Antrenmanı bitir". Kapatınca ilerleme kalır (her set işaretlenince plana yazılır).
// Ana asistanla da yürür: ekran kayıt kubbesinin (z-55) altında durur; "tamam", "atla", "15 saniye ekle", "nasıl yapılır",
// "zor geçti", "antrenmanı bitir", "durdur", "otomatiğe geç / elle" buraya gelir (guideWord, words.js; setGuideHandler, guideVoice.js).
// Otomatik (Seyhun 2026-11-25; varsayılan açık, üstteki "Otomatik" düğmesi, sa-fit-oto): hareket/set söylenir, okuma bitince süre
// kendiliğinden başlar (tekrarlı harekette tahmini süre: tekrar × 4 sn, en az 20 sn; "Bitirdim" erken bitirir); süre dolunca set
// işaretlenir, dinlenme başlar ve sıradaki söylenir (yeni hareketse adı, yapılışı, seti); dinlenme bitince sıradaki set başlar.
// "Durdur" her şeyi bekletir (süre, dinlenme, okuma), "Devam et" sürdürür. Elle: eski düzen, her şeyi kullanıcı başlatır.
const KEY = { time: "sec", cardio: "min", reps: "reps" };
const UNIT = { sec: "sn", min: "dk", reps: "tekrar" };

// Dinlenme sayacı: duraklatılır (otomatikte "Durdur"), süre dolunca onEnd çağrılır (Geç ile durdurulursa çağrılmaz)
function useCountdown(onEnd) {
  const [run, setRun] = useState(null); // { end, total, rem (duraklatılmışsa kalan ms) }
  const [now, setNow] = useState(0);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    if (!run || run.rem != null) return;
    const t = setInterval(() => {
      const n = Date.now();
      if (n >= run.end) {
        clearInterval(t);
        navigator.vibrate?.([30, 60, 30]);
        setRun(null);
        end.current?.();
      } else setNow(n);
    }, 250);
    return () => clearInterval(t);
  }, [run]);
  const left = run ? Math.max(0, Math.ceil((run.rem != null ? run.rem : run.end - now) / 1000)) : 0;
  const start = (sec) => {
    const n = Date.now();
    setNow(n);
    setRun({ end: n + sec * 1000, total: sec, rem: null });
  };
  return {
    run,
    left,
    start,
    stop: () => setRun(null),
    add: (s) => setRun((r) => (r ? (r.rem != null ? { ...r, rem: r.rem + s * 1000, total: r.total + s } : { ...r, end: r.end + s * 1000, total: r.total + s }) : r)),
    pause: () => setRun((r) => (r && r.rem == null ? { ...r, rem: Math.max(0, r.end - Date.now()) } : r)),
    resume: () => {
      const n = Date.now();
      setNow(n);
      setRun((r) => (r && r.rem != null ? { ...r, end: n + r.rem, rem: null } : r));
    },
  };
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

// Cümle cümle adımlar: programdaki anlatım (hazır programlar) önce, yoksa listedeki hareketin anlatımı
const sentences = (t) =>
  String(t || "")
    .split(/(?<=[.!?])\s+|;\s*/)
    .map((x) => x.trim().replace(/\.$/, ""))
    .filter(Boolean);
function howOf(it) {
  if (it?.how) return sentences(it.how);
  const steps = guideSteps(it?.ex);
  if (steps.length) return steps;
  return String(exById(it?.ex)?.how || "")
    .split(/;\s*/)
    .map((x) => x.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

// Sesli anlatım: önce hazırlık, sonra nasıl yapılır (listedeki harekette ilk 3 adım); boşsa ""
function howSay(it) {
  const h = it?.how ? howOf(it) : howOf(it).slice(0, 3);
  const t = [it?.setup ? `Hazırlık: ${String(it.setup).replace(/\.$/, "")}` : "", ...h].filter(Boolean);
  return t.length ? ` ${t.join(". ")}.` : "";
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

// Fotoğraf, video ve YouTube ekranın üst kısmını kenardan kenara doldurur (Sahne); birden çoksa yana kaydırılır.
// Fotoğrafa ya da videoya dokununca tam ekran açılır (Viewer).
export const mediaOf = (it) => [...(it?.media || []).filter((x) => !x.stock && (x.kind === "video" || x.kind === "photo")).map((m) => ({ k: m.id, m })), ...(it?.yt?.id ? [{ k: `yt${it.yt.id}`, yt: it.yt }] : [])];
function MediaBox({ it, still = false }) {
  const slides = mediaOf(it);
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(null);
  const { profile } = useAuth();
  if (!slides.length) return null;
  const onScroll = (e) => {
    const el = e.currentTarget;
    setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  return (
    <div className="relative size-full">
      <div onScroll={onScroll} className="flex size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((x) => (
          <div key={x.k} className="relative size-full shrink-0 snap-center">
            {x.yt ? (
              <iframe src={ytEmbed(x.yt.id, x.yt.start)} title="Hareket videosu" className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              <Slide orgId={profile?.orgId} m={x.m} still={still} onOpen={setOpen} />
            )}
          </div>
        ))}
      </div>
      {slides.length > 1 && !still && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center gap-1.5">
          {slides.map((x, i) => (
            <i key={x.k} className={`size-[0.4375rem] rounded-full ${i === at ? "bg-white" : "bg-white/45"}`} />
          ))}
        </div>
      )}
      {open && <Viewer orgId={profile?.orgId} m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
function Slide({ orgId, m, onOpen, still }) {
  const { url, err, fail } = useBlobUrl(orgId, m);
  if (err) return <span className="grid size-full place-items-center text-[0.8125rem] text-white/70">{m.kind === "video" ? "Video açılamadı" : "Fotoğraf açılamadı"}</span>;
  if (!url) return <span className="block size-full bg-[#1a1c20]" />;
  // Hareket hiç kesilmez (Seyhun 2026-11-25): fotoğraf/video kendi oranında, üst çubuk ile hareket adı arasındaki alana
  // ortalanır (telefon/iPad, dik/yatay). Boş kalan yer aynı fotoğrafın bulanık hâliyle dolar.
  const fit = "size-full object-contain";
  return (
    <button type="button" onClick={() => !still && onOpen(m)} aria-label={m.kind === "video" ? "Videoyu büyüt" : "Fotoğrafı büyüt"} className="relative block size-full overflow-hidden">
      {m.kind !== "video" && <img src={url} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-55 blur-2xl" />}
      <span className={`absolute inset-x-3 flex items-center justify-center ${still ? "bottom-[38%] top-[calc(env(safe-area-inset-top)+3.75rem)]" : "bottom-[6.5rem] top-[calc(env(safe-area-inset-top)+4.25rem)]"}`}>
        {m.kind === "video" ? (
          <video src={url} autoPlay={!still} loop muted playsInline onError={fail} className={fit} />
        ) : (
          <img src={url} alt="" onError={fail} className={fit} />
        )}
      </span>
    </button>
  );
}

function HowBody({ it }) {
  const how = howOf(it);
  const more = [it.breath ? `Nefes: ${it.breath}` : "", it.tempo ? `Tempo: ${it.tempo}` : "", it.note || ""].filter(Boolean);
  return (
    <>
      {it.setup && (
        <p className="mt-2 text-[1rem] leading-snug text-white/85">
          <b className="mr-1.5 text-[0.75rem] font-bold uppercase tracking-[.12em]" style={{ color: LIME }}>
            Hazırlık
          </b>
          {it.setup}
        </p>
      )}
      {more.length > 0 && <p className="mt-2 text-[1rem] leading-snug text-white/80">{more.join(" · ")}</p>}
      {how.length > 0 && (
        <ol className="mt-3 space-y-2">
          {how.map((h, n) => (
            <li key={h} className="flex gap-3 text-[1rem] leading-snug text-white/85">
              <span className={`${head} w-5 shrink-0 text-[1.25rem] text-white/40`}>{n + 1}</span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

// Set noktaları: yapılan limon, şu anki çerçeveli
function SetDots({ s, k }) {
  return (
    <span className="flex gap-1.5">
      {s.map((x, i) => (
        <i key={i} className="size-3 rounded-full border-2" style={x.ok || i === k ? { borderColor: LIME, background: x.ok ? LIME : "transparent" } : { borderColor: "rgba(255,255,255,.35)" }} />
      ))}
    </span>
  );
}

// Sesle söylenecek hedef: "10 tekrar", "40 saniye", "20 dakika"
const ORD = ["Birinci", "İkinci", "Üçüncü", "Dördüncü", "Beşinci", "Altıncı", "Yedinci", "Sekizinci", "Dokuzuncu", "Onuncu"];
function sayGoal(it, cur = {}) {
  if (it.kind === "cardio") return `${cur.min || it.min || ""} dakika`;
  if (it.kind === "time") return `${cur.sec || it.sec || ""} saniye`;
  const v = cur.reps || it.reps;
  return v ? `${v}${it.repsTo ? ` ile ${it.repsTo}` : ""} tekrar` : "";
}
const QUIET = "sa-fit-sessiz";
const AUTO = "sa-fit-oto";
// Otomatikte setin süresi: süreli harekette hedef, tekrarlıda tekrar × 4 sn (en az 20 sn)
const workSec = (it, cur = {}) => (isTimed(it) ? goalSec(it, cur) : Math.max(20, (+(cur.reps || it.reps) || 10) * 4));
const readKey = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const saveKey = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

export function FitGuided({ name = "", items = [], sets = [], at = null, onCheck, feel, setFeel, onFinish, onClose }) {
  const [pos, setPos] = useState(() => (at && !sets[at.i]?.[at.k]?.ok ? at : nextOpen(sets, 0, 0)));
  const [quiet, setQuiet] = useState(() => readKey(QUIET) === "1");
  const [auto, setAuto] = useState(() => readKey(AUTO) !== "0");
  const [held, setHeld] = useState(false); // otomatikte "Durdur"
  const seq = useRef(0); // bekleyen "okuma bitince başla" işini iptal etmek için
  const posRef = useRef(pos);
  const autoRef = useRef(auto);
  const heldRef = useRef(held);
  useEffect(() => {
    posRef.current = pos;
    autoRef.current = auto;
    heldRef.current = held;
  });
  const ends = useRef({}); // süre/dinlenme bitince çağrılacaklar (aşağıda tanımlanan işlevler; her çizimde güncellenir)
  const rest = useCountdown(() => ends.current.rest?.());
  const timer = useSetClock((took, full) => ends.current.set?.(took, full));
  const total = sets.reduce((t, s) => t + s.length, 0);
  const done = sets.reduce((t, s) => t + s.filter((x) => x.ok).length, 0);
  // Hiç set yapılmadıysa önce giriş (bugünkü antrenman, süre, hareketler; sesli okunur)
  const [intro, setIntro] = useState(() => done === 0 && !at && items.length > 0);
  const kind = useKind();
  const tts = useTts();
  const [added, setAdded] = useState({}); // ana hesabın bu ekranda eklediği fotoğraf/video (kütüphaneden plana gelene kadar)
  const byVoice = useRef(false);
  const talk = useRef(false); // dinlenmede anlatım sürüyor
  const talkId = useRef(0);
  const waitGo = useRef(false); // dinlenme bitti, anlatım bitince başlanacak
  const min = estMinutes(items);
  const say = (t) => {
    if (!quiet && t) tts.speak(t, undefined, FIT_VOICE);
  };
  const introText = `Bugün ${name || "antrenman"} var. ${items.length} hareket, ${total} set${min ? `, yaklaşık ${min} dakika sürecek` : ""}. ${items[0]?.name || ""} ile başlıyoruz. Hazır olunca devam et.`;
  const moveText = (p) => {
    const it = items[p.i] || {};
    const g = sayGoal(it, sets[p.i]?.[p.k]);
    return `${ORD[p.i] ? `${ORD[p.i]} hareket` : "Sıradaki hareket"}: ${it.name}. ${sets[p.i]?.length || 0} set${g ? `, ${g}` : ""}.${p.k ? "" : howSay(it)}`;
  };

  // Ekran açıkken arkadaki sayfa kaymasın; kapanınca okuma susar
  useEffect(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const q = seq;
    return () => {
      document.body.style.overflow = o;
      q.current++;
      tts.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Yeni harekete geçince adı ve seti söylenir (asistanla geçildiyse asistan zaten söyler)
  useEffect(() => {
    if (intro || !pos || pos.k !== 0 || auto) return;
    if (byVoice.current) byVoice.current = false;
    else say(moveText(pos));
  }, [intro, pos?.i]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleQuiet() {
    const q = !quiet;
    setQuiet(q);
    try {
      localStorage.setItem(QUIET, q ? "1" : "0");
    } catch {}
    if (q) {
      hush();
      tts.stop();
    }
  }

  // Dinlenmede sıradaki hareketin anlatımı: bitene kadar talk açık (dinlenme erken biterse "Başla" anlatımdan sonra gelir).
  // Ses çıkmazsa (sessiz, okuma hatası) en geç metin uzunluğu kadar beklenir.
  function restSay(t) {
    const id = ++talkId.current;
    waitGo.current = false;
    const end = () => {
      if (talkId.current !== id || !talk.current) return;
      talk.current = false;
      if (waitGo.current) {
        waitGo.current = false;
        if (autoRef.current && !heldRef.current) begin(posRef.current, true);
      }
    };
    if (quiet || !t) {
      talk.current = false;
      return;
    }
    talk.current = true;
    tts.speak(t, end, FIT_VOICE);
    setTimeout(end, 8000 + t.length * 90); // ilk sefer doğal ses üretilirken birkaç sn sürebilir
  }
  const hush = () => {
    talkId.current++;
    talk.current = false;
    waitGo.current = false;
  };
  // Otomatik: söyler, okuma bitince (ses çıkmazsa biraz sonra) setin süresini başlatır
  function cueThen(t, fn) {
    const id = ++seq.current;
    const fire = () => {
      if (seq.current !== id) return;
      seq.current++;
      fn();
    };
    if (quiet || !t) {
      setTimeout(fire, 1500);
      return;
    }
    tts.speak(t, fire, FIT_VOICE);
    setTimeout(fire, 8000 + t.length * 90);
  }
  const startSet = (p) => {
    seq.current++;
    if (p) timer.start(workSec(items[p.i], sets[p.i]?.[p.k]));
  };
  // afterRest: dinlenme bitti (sıradaki hareket dinlenmede anlatıldı, kısa "başla")
  function begin(p, afterRest = false) {
    if (!p) return;
    hush();
    const t = afterRest ? (p.k ? `Set ${p.k + 1}. Başla.` : "Başla.") : p.k ? `${items[p.i]?.name}, set ${p.k + 1}. ${sayGoal(items[p.i], sets[p.i]?.[p.k])}.` : moveText(p);
    cueThen(t, () => startSet(posRef.current));
  }
  // Dinlenmede söylenen: süre ve sıradaki (yeni hareketse adı, yapılışı, seti)
  function restText(n, sec, newEx) {
    if (!newEx) return `${sec} saniye dinlen. Sonra set ${n.k + 1}.`;
    return `${sec} saniye dinlen. ${moveText({ ...n, k: 0 })}`;
  }
  function pauseAll() {
    seq.current++;
    hush();
    tts.stop();
    timer.pause();
    rest.pause();
    setHeld(true);
  }
  function resumeAll() {
    setHeld(false);
    if (timer.run) timer.resume();
    else if (rest.run) rest.resume();
    else begin(pos);
  }
  function setMode(on) {
    setAuto(on);
    saveKey(AUTO, on ? "1" : "0");
    seq.current++;
    setHeld(false);
    if (on) {
      if (timer.run) timer.resume();
      else if (rest.run) rest.resume();
      else if (pos && !intro) begin(pos);
    } else {
      hush();
      tts.stop();
      if (rest.run) rest.resume();
      if (timer.run && pos && !isTimed(items[pos.i])) timer.stop();
    }
  }

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
    seq.current++;
    if (n) {
      const sec = restAfter(items[i], n.i !== i);
      rest.start(sec);
      if (auto && !byVoice.current) restSay(restText(n, sec, n.i !== i));
    } else if (auto && !byVoice.current) say("Hepsi bitti. Nasıl geçti?");
    return n;
  }
  function skipEx() {
    if (!pos) return null;
    rest.stop();
    timer.stop();
    const n = nextOpen(sets, pos.i + 1, 0);
    setPos(n);
    seq.current++;
    setHeld(false);
    if (auto && n) {
      if (byVoice.current) cueThen("", () => startSet(posRef.current));
      else begin(n);
    }
    return n;
  }

  function go() {
    hush();
    tts.stop();
    setIntro(false);
    if (auto && pos) begin(pos);
  }
  useEffect(() => {
    ends.current = {
      // Dinlenme bittiğinde sıradaki hareketin anlatımı sürüyorsa kesilmez: anlatım bitince "Başla"
      rest: () => {
        if (!autoRef.current || heldRef.current) return;
        if (talk.current) waitGo.current = true;
        else begin(posRef.current, true);
      },
      set: (took, full) => complete(isTimed(items[posRef.current?.i]) ? { took, full } : null),
    };
  });

  // Açılınca: giriş okunur; yarım kalan antrenman otomatikte kaldığı setten sürer
  useEffect(() => {
    if (intro) say(introText);
    else if (auto && pos) begin(pos);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sesle söylenenler: yapılan işi kısa söyler
  const setText = (p) => (p ? `${p.i === pos?.i ? "" : `Sıradaki hareket: ${items[p.i]?.name}. `}Set ${p.k + 1} / ${sets[p.i]?.length || 0}.` : "");
  // Otomatikte sesle yapılan işin cevabını asistan söyler; bayrak hemen iner (elle düzende hareket değişince iner)
  function voice(g) {
    const out = voiceDo(g);
    if (auto) byVoice.current = false;
    return out;
  }
  function voiceDo(g) {
    if (!g) return "";
    if (intro && (g.op === "done" || g.op === "skip")) {
      byVoice.current = true;
      go();
      return pos ? moveText(pos) : "Başlıyoruz.";
    }
    if (g.op === "auto") {
      setMode(g.k);
      return g.k ? "Otomatik. Süreler ve dinlenmeler kendiliğinden başlar." : "Elle. Her seti sen başlatırsın.";
    }
    if (g.op === "pause") {
      if (!auto) return timer.run && timer.going ? (timer.pause(), "Durdurdum.") : "Durduracak bir şey yok.";
      pauseAll();
      return "Durdurdum. Devam etmek için devam et de.";
    }
    if (held && g.op === "done") {
      byVoice.current = true;
      resumeAll();
      return "Devam ediyorum.";
    }
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
      const h = howSay(items[pos.i]);
      return h ? `${items[pos.i]?.name}.${h}` : `${items[pos.i]?.name} için açıklama yok.`;
    }
    if (g.op === "more") {
      if (!rest.run) return "Şu an dinlenme yok.";
      rest.add(15);
      return "15 saniye ekledim.";
    }
    if (g.op === "skip") {
      byVoice.current = true;
      const n = skipEx();
      return n ? `Geçtim. ${setText(n)}` : "Geçtim. Atladığın setler kaldı, bitirmek için onları da tamamla.";
    }
    if (g.op === "done") {
      if (auto && !rest.run && !timer.run) {
        startSet(pos);
        return "Süre başladı.";
      }
      if (!rest.run && isTimed(items[pos.i]) && !timer.run) {
        timer.start(goalSec(items[pos.i], sets[pos.i]?.[pos.k]));
        return "Süre başladı.";
      }
      if (rest.run) {
        rest.stop();
        if (auto) cueThen("", () => startSet(posRef.current));
        return `Dinlenme bitti. ${items[pos.i]?.name}, set ${pos.k + 1} / ${sets[pos.i]?.length || 0}.`;
      }
      byVoice.current = true;
      const n = complete();
      return n ? `Tamam. ${restAfter(items[pos.i], n.i !== pos.i)} saniye dinlen. ${setText(n)}` : "Tamam, hepsi bitti. Nasıl geçti?";
    }
    return "";
  }
  useEffect(() => {
    setGuideHandler(voice);
  });
  useEffect(() => () => setGuideHandler(null), []);

  const withAdded = (it, i) => (added[i]?.length ? { ...it, media: [...(it.media || []), ...added[i].filter((m) => !(it.media || []).some((x) => x.id === m.id))] } : it);

  const toggles = <SahneToggles auto={auto} onMode={setMode} quiet={quiet} onQuiet={toggleQuiet} />;

  if (intro) {
    const first = withAdded(items[0] || {}, 0);
    return (
      <div className={liveHead.variable}>
        <SahneIntro
          name={name}
          items={items}
          sets={sets}
          min={min}
          bg={mediaOf(first).some((x) => x.m) ? <MediaBox it={{ ...first, yt: null }} still /> : null}
          speaking={tts.speaking}
          onSay={() => (tts.speaking ? tts.stop() : tts.speak(introText, undefined, FIT_VOICE))}
          onGo={go}
          onClose={onClose}
          toggles={toggles}
        />
      </div>
    );
  }

  // Üstte hikâye çizgileri (her hareket bir çizgi, yapılan set kadar dolar), kapat, ses ve sıra
  const top = (
    <div className="absolute inset-x-0 top-0 z-10 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex gap-1">
        {sets.map((s, i) => (
          <i key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <b className="block h-full bg-white transition-all" style={{ width: `${s.length ? (s.filter((x) => x.ok).length / s.length) * 100 : 0}%` }} />
          </i>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
          <Icon name="x" className="size-5" />
        </button>
        <span className="flex-1" />
        {toggles}
        <span className={`${head} min-w-[2.75rem] text-right text-[1.125rem] text-white tabular-nums`}>{pos ? `${pos.i + 1} / ${items.length}` : `${done}/${total}`}</span>
      </div>
    </div>
  );

  // Hepsi bitti: nasıl geçti + bitir. Atlanan set kaldıysa bitirilemez, kalanlara dönülür
  if (!pos) {
    const left = total - done;
    return (
      <div role="dialog" aria-label="Antrenman" className={`${liveHead.variable} fixed inset-0 z-[54] flex flex-col bg-[#0c0d0f] text-[#f4f4f2]`}>
        {top}
        <div className="flex min-h-0 flex-1 flex-col justify-end px-5 pb-4">
          <h2 className={`${head} text-[4rem]`} style={left ? undefined : { color: LIME }}>
            {left ? `${left} set kaldı` : "Bu kadar"}
          </h2>
          <p className="mt-2 text-[1rem] text-white/70">{left ? "Antrenmanı bitirmek için bütün setleri tamamla" : `${done} / ${total} set yapıldı`}</p>
          {!left && (
            <>
              <p className="mt-7 text-[0.75rem] font-bold uppercase tracking-[.12em] text-white/60">Nasıl geçti?</p>
              <div className="mt-2 flex gap-2">
                {FEELS.map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={feel === k} onClick={() => setFeel(feel === k ? 0 : k)} className={`h-12 flex-1 rounded-2xl text-[1rem] font-semibold ${feel === k ? "text-[#0c0d0f]" : "bg-white/10"}`} style={feel === k ? { background: LIME } : undefined}>
                    {l}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="px-5 pb-[calc(var(--rec-h,0px)+1rem)]">
          {left ? <SahneBtn
              onClick={() => {
                const n = nextOpen(sets, 0, 0);
                setPos(n);
                setHeld(false);
                if (auto) begin(n);
              }}
            >
              Kalan setlere dön
            </SahneBtn> : <SahneBtn onClick={() => onFinish("done")}>Antrenmanı bitir</SahneBtn>}
        </div>
      </div>
    );
  }

  const it = withAdded(items[pos.i] || {}, pos.i);
  const s = sets[pos.i] || [];
  const cur = s[pos.k] || {};
  const timed = isTimed(it);
  const goal = timed ? goalSec(it, cur) : 0;
  const g = goalOf(it, cur);
  const left = timer.run ? timer.left : goal;
  const has = mediaOf(it).length > 0;
  const state = held ? "Durduruldu" : timer.run ? (timer.going ? (timed ? "kalan" : `${clockText(timer.left)} kalan`) : "Duraklatıldı") : auto ? "Hazırlan" : g.to;
  const sub = [...g.more, state].filter(Boolean);

  return (
    <div role="dialog" aria-label="Antrenman" className={`${liveHead.variable} fixed inset-0 z-[54] flex flex-col bg-[#0c0d0f] text-[#f4f4f2]`}>
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="relative h-[58dvh] min-h-[22rem] landscape:h-[80dvh]">
          {has ? (
            <MediaBox key={pos.i} it={it} />
          ) : kind === "owner" ? (
            <SahneAdd it={items[pos.i]} onAdded={(m) => setAdded((o) => ({ ...o, [pos.i]: [...(o[pos.i] || []), m] }))} />
          ) : (
            <span aria-hidden className={`${head} absolute left-5 top-[calc(env(safe-area-inset-top)+5rem)] text-[11rem] text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,.16)]`}>
              {String(pos.i + 1).padStart(2, "0")}
            </span>
          )}
          {has && <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,15,.45)_0%,rgba(12,13,15,0)_22%,rgba(12,13,15,0)_55%,#0c0d0f_100%)]" />}
        </div>
        <div className="relative -mt-24 px-5 pb-5">
          <h2 className={`${head} text-[3rem] [overflow-wrap:anywhere]`}>{it.name}</h2>
          <HowBody key={`h${pos.i}`} it={it} />
        </div>
      </div>
      {top}
      <div className="flex-none px-5 pb-[calc(var(--rec-h,0px)+1rem)] pt-3">
        {rest.run ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <span>
                <b className={`${head} text-[5rem] tabular-nums`} style={{ color: LIME }}>
                  {rest.left}
                </b>
                <small className="ml-2 text-[0.8125rem] font-bold uppercase tracking-[.12em] text-white/60">{held ? "durduruldu" : "sn dinlen"}</small>
              </span>
              <SetDots s={s} k={pos.k} />
            </div>
            <span className="mt-3 block h-1 overflow-hidden rounded-full bg-white/15">
              <span className="block h-full rounded-full transition-all" style={{ width: `${(rest.left / rest.run.total) * 100}%`, background: LIME }} />
            </span>
            <div className="mt-4 flex gap-2">
              {auto ? (
                <SahneBtn ghost onClick={held ? resumeAll : pauseAll}>
                  {held ? "Devam et" : "Durdur"}
                </SahneBtn>
              ) : (
                <SahneBtn ghost onClick={() => rest.add(15)}>
                  +15 sn
                </SahneBtn>
              )}
              <SahneBtn
                onClick={() => {
                  rest.stop();
                  if (auto) {
                    setHeld(false);
                    begin(pos, true);
                  }
                }}
              >
                Geç
              </SahneBtn>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <span className="min-w-0">
                {timed ? (
                  <b className={`${head} text-[5rem] tabular-nums`} style={left <= 3 && timer.run ? { color: LIME } : undefined}>
                    {clockText(left)}
                  </b>
                ) : (
                  <>
                    <b className={`${head} text-[5rem] tabular-nums`}>{g.big}</b>
                    <small className="ml-2 text-[0.8125rem] font-bold uppercase tracking-[.12em] text-white/60">{g.unit}</small>
                  </>
                )}
                {sub.length > 0 && <small className="mt-1 block truncate text-[0.875rem] text-white/60">{sub.join(" · ")}</small>}
              </span>
              <span className="shrink-0 pb-2 text-right">
                <small className="mb-1.5 block text-[0.8125rem] font-semibold text-white/60">
                  Set {pos.k + 1} / {s.length}
                </small>
                <SetDots s={s} k={pos.k} />
              </span>
            </div>
            {timer.run && (
              <span className="mt-3 block h-1 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${timer.run.total ? (timer.left / timer.run.total) * 100 : 0}%` }} />
              </span>
            )}
            <div className="mt-4">
              {auto && held && <SahneBtn onClick={resumeAll}>Devam et</SahneBtn>}
              {auto && !held && (
                <div className="flex gap-2">
                  <SahneBtn ghost onClick={pauseAll}>
                    Durdur
                  </SahneBtn>
                  {timer.run ? <SahneBtn onClick={() => complete()}>{timed ? "Bitirdim" : "Tamamlandı"}</SahneBtn> : <SahneBtn onClick={() => startSet(pos)}>Başla</SahneBtn>}
                </div>
              )}
              {!auto && !timed && <SahneBtn onClick={() => complete()}>Tamamlandı</SahneBtn>}
              {!auto && timed && !timer.run && <SahneBtn onClick={() => timer.start(goal)}>Başlat</SahneBtn>}
              {!auto && timed && timer.run && (
                <div className="flex gap-2">
                  <SahneBtn ghost onClick={timer.going ? timer.pause : timer.resume}>
                    {timer.going ? "Duraklat" : "Devam et"}
                  </SahneBtn>
                  <SahneBtn onClick={() => complete()}>Bitirdim</SahneBtn>
                </div>
              )}
            </div>
            <button type="button" onClick={skipEx} className="mt-1 h-10 w-full text-[0.875rem] font-semibold text-white/55">
              Bu hareketi atla
            </button>
          </>
        )}
      </div>
    </div>
  );
}
