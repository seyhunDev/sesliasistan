"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { buildTasks, chunkState, chunkStats, dueChunks, fillText, markTr, patternText, taskRight } from "@/lib/englishChunkStudy";
import { primeEn, sayEn } from "./WordView";
import { WordTalk } from "./WordTalk";
import { hearSay } from "./wordData";
import { useEnMic } from "./useEnMic";
import { cachedPic, drawing, loadPic, makePic } from "./chunkPics";

// Kalıp bloklama (Seyhun 2026-11-02: "kalıplarla kelimeleri öğreneceğim… tek tek kelime öğrenmek istemiyorum"; örnek
// /mnt/project-files/ingilizce-kelime/kaliplar/ornek.png onaylandı 2026-11-04). Bir kalıp dört adımda: Dinle · Değiştir (parçaya
// dokununca boşluk değişir, cümle okunur) · Kur (Türkçesinden blokları dizerek İngilizcesini kur) · Konuş (yapay zeka, WordTalk).
// Renkler: kalıp bloğu camgöbeği, değişen parça logonun pembe-turuncusu.
// Resimle ezber (Seyhun 2026-11-15, örnek ingilizce-kelime/sekil/ornek.html): kalıbın sabit resmi Dinle'de üstte durur; Kur'dan sonra
// Hatırla: yazı yok, yalnız resim; kişi cümleyi söyler, yapay zeka dinler (/api/word hear). Göster ya da yanlış: kalıp yarın yeniden.
const GRAD = "bg-[linear-gradient(135deg,#ff3d77,#ff9a4d)]";
const SLOT = `${GRAD} text-white shadow-[0_8px_22px_-8px_rgba(255,61,119,.7)]`;
const BLOCK = "bg-[#67e8f9]/13 text-[#e6fbff] shadow-[inset_0_0_0_1.5px_rgba(103,232,249,.35)]";
const GO = `!h-[3.25rem] !rounded-full !border-0 ${GRAD} !px-8 !font-bold !text-white !shadow-[0_10px_24px_-10px_rgba(255,61,119,.8)]`;
const STEPS = ["Dinle", "Değiştir", "Kur", "Hatırla", "Konuş"];
const DAY_MS = 86400000;

function Steps({ at }) {
  return (
    <div aria-label={`Adım: ${STEPS[at]}`} className="relative pt-4">
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <i key={s} className={`h-1 flex-1 rounded-full ${i <= at ? GRAD : "bg-white/12"}`} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.75rem] text-white/40">
        {STEPS.map((s, i) => (
          <span key={s} className={i === at ? "font-semibold text-[#ffb38a]" : ""}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// Türkçe cümle: parçanın Türkçesi turuncu
function TrLine({ text, part, className = "" }) {
  const m = markTr(text, part);
  return (
    <p className={className}>
      {m ? (
        <>
          {m[0]}
          <b className="font-semibold text-[#ffb38a]">{m[1]}</b>
          {m[2]}
        </>
      ) : (
        text
      )}
    </p>
  );
}

// Kalıbın resmi: bellekte ya da Firestore'da; yoksa ana hesapta bir kez çizilir. Çizilemezse yer kaplamaz.
export function usePic(orgId, id) {
  const [img, setImg] = useState(() => cachedPic(id));
  const [fail, setFail] = useState(false);
  useEffect(() => {
    let live = true;
    const on = (e) => e.detail === id && setImg(cachedPic(id));
    window.addEventListener("sa-en-pic", on);
    if (orgId && cachedPic(id) === undefined)
      loadPic(orgId, id).then((x) => {
        if (!live) return;
        setImg(x);
        if (!x && !drawing(id)) makePic(orgId, id).catch(() => live && setFail(true));
      });
    return () => {
      live = false;
      window.removeEventListener("sa-en-pic", on);
    };
  }, [orgId, id]);
  return { img, wait: !!orgId && !img && !fail };
}

export function Pic({ pic, className = "" }) {
  if (pic.img) return <img src={pic.img} alt="" className={`aspect-square w-full rounded-[1.5rem] object-cover ${className}`} />;
  if (pic.wait) return <div aria-label="Resim hazırlanıyor" className={`aspect-square w-full animate-pulse rounded-[1.5rem] bg-white/6 ${className}`} />;
  return null;
}

const tailOf = (c) => (c.tail && !/^[?.!,]/.test(c.tail) ? c.tail : "");
const puncOf = (c) => (c.tail ? (/^[?.!,]/.test(c.tail) ? c.tail : "") : "");

function dueSay(due, today) {
  const n = Math.round((new Date(`${due}T12:00:00`) - new Date(`${today}T12:00:00`)) / DAY_MS);
  return n <= 1 ? "Yarın yeniden soracağım." : `${n} gün sonra yeniden soracağım.`;
}

// c: kalıp; deck; today; topic: üstte görünen konu; onSave(fn) → Promise; onNext(): sıradaki kalıp; onOpen(id): başka kalıp;
// onMenu(): ⋯; onSkip(): Geç. Kur bitince sonuç kaydedilir (sayfa kalıbı sabitler, sıradaki kalıba kendiliğinden geçmez) ve
// dördüncü adım Konuş açılır (Atla ile doğrudan sonuç); konuşma kapanınca sonuç ekranı.
export function ChunkStudy({ c, deck, today, topic, orgId, onSave, onNext, onOpen, onMenu, onSkip }) {
  const [fi, setFi] = useState(0);
  const [tried, setTried] = useState(() => new Set([0]));
  const [phase, setPhase] = useState("learn");
  const [tasks, setTasks] = useState([]);
  const [ti, setTi] = useState(0);
  const [built, setBuilt] = useState([]);
  const [check, setCheck] = useState(null); // "ok" | "bad"
  const [miss, setMiss] = useState(false);
  const [saved, setSaved] = useState(null); // { right }
  const [heard, setHeard] = useState(null); // Hatırla: { ok, heard } | { shown: true }
  const [listening, setListening] = useState(false);
  const pic = usePic(orgId, c.id);
  const say0 = fillText(c, c.fills[0]);

  const f = c.fills[fi];
  const stats = useMemo(() => chunkStats(deck, today), [deck, today]);
  const due = useMemo(() => dueChunks(deck, today).filter((x) => x.id !== c.id).slice(0, 3), [deck, today, c.id]);

  const pickFill = (i) => {
    primeEn();
    setFi(i);
    setTried((t) => new Set([...t, i]));
    sayEn(fillText(c, c.fills[i]));
  };
  const startBuild = () => {
    primeEn();
    setTasks(buildTasks(c));
    setTi(0);
    setBuilt([]);
    setCheck(null);
    setMiss(false);
    setPhase("build");
  };
  const t = tasks[ti];
  const place = (b) => {
    if (check || built.some((x) => x.k === b.k)) return;
    lay([...built, b]);
  };
  const lay = (nb) => {
    setBuilt(nb);
    if (nb.length === t.answer.length) {
      const ok = taskRight(t, nb);
      setCheck(ok ? "ok" : "bad");
      if (!ok) setMiss(true);
      sayEn(t.en);
    }
  };
  const unplace = (k) => !check && setBuilt((l) => l.filter((x) => x.k !== k));
  // İpucu: sıradaki doğru blok yerine konur (bu kalıp "hatalı" sayılır)
  const hint = () => {
    if (check) return;
    const good = built.filter((b, i) => b.t === t.answer[i]?.t);
    const need = t.answer[good.length];
    const b = t.pool.find((x) => x.t === need.t && !good.some((g) => g.k === x.k));
    setMiss(true);
    lay(b ? [...good, b] : good);
  };
  const goOn = async (talk = true) => {
    if (ti + 1 < tasks.length) {
      setTi(ti + 1);
      setBuilt([]);
      setCheck(null);
      return;
    }
    if (talk) {
      setHeard(null);
      setPhase("recall");
      return;
    }
    await finish(!miss, false);
  };
  const finish = async (right, talk) => {
    setSaved({ right });
    if (talk) primeEn();
    setPhase(talk ? "talk" : "done");
    await onSave(right);
  };
  const lvRef = useRef(null);
  const mic = useEnMic({ onFail: (m) => setHeard({ err: m }), onLong: () => tapMic(), levelRef: lvRef });
  // Açılırken, dururken ve yapay zeka bakarken dokunuş yok sayılır (önceden ikinci dokunuş kaydı boş gönderiyordu)
  const tapMic = async () => {
    if (listening || mic.state === "opening" || mic.state === "stopping") return;
    if (!mic.on) {
      primeEn();
      setHeard(null);
      return mic.start();
    }
    setListening(true);
    try {
      const blob = await mic.stop();
      if (!blob) return setHeard({ err: "Sesini duyamadım. Bas, cümleyi söyle, sonra yeniden bas." });
      const r = await hearSay(say0, blob);
      setHeard(r);
      if (!r.ok) setMiss(true);
      sayEn(say0);
    } catch (e) {
      setHeard({ err: e.message || "Dinleyemedim, tekrar dene." });
    } finally {
      setListening(false);
    }
  };
  const again = () => {
    setHeard(null);
    tapMic();
  };
  const show = () => {
    mic.cancel();
    setMiss(true);
    setHeard({ shown: true });
    sayEn(say0);
  };
  const last = ti + 1 >= tasks.length;

  const top = (left, mid, right) => (
    <header className="relative flex items-center justify-between gap-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-[0.875rem] text-white/50">
      {left}
      <span className="min-w-0 truncate">{mid}</span>
      {right}
    </header>
  );
  const menuBtn = (
    <Button variant="icon" size="sm" aria-label="Konular ve listeler" onClick={onMenu} className="!text-white/50">
      <Icon name="more" className="size-5" />
    </Button>
  );

  if (phase === "build" && t) {
    const left = t.pool.filter((b) => !built.some((x) => x.k === b.k));
    return (
      <>
        {top(
          <Button variant="icon" size="sm" aria-label="Kur'u kapat" onClick={() => setPhase("learn")} className="!text-white/50">
            <Icon name="x" className="size-5" />
          </Button>,
          <>
            <b className="font-semibold text-white/88">Kur</b>
            <span className="tabular-nums">{` · ${ti + 1} / ${tasks.length}`}</span>
          </>,
          <Button variant="icon" size="sm" aria-label="Dinle" onClick={() => sayEn(t.en)} className="!text-[#ffb38a]">
            <Icon name="volume" className="size-5" />
          </Button>,
        )}
        <Steps at={2} />
        <section aria-label="Kur" className="relative flex flex-1 flex-col justify-center py-6">
          <small className="text-[0.78rem] font-semibold tracking-[.06em] text-white/42">TÜRKÇESİ</small>
          <p className="mt-3 text-[1.5rem] font-semibold leading-[1.3]">{t.tr}</p>
          <div
            className={`mt-6 flex min-h-[7.5rem] flex-wrap content-start gap-2 rounded-[1.25rem] border-[1.5px] border-dashed p-3 text-[1.25rem] font-bold ${check === "ok" ? "border-[#9fe7c6]/50" : check === "bad" ? "border-[#f3a39a]/50" : "border-white/18"}`}
          >
            {built.map((b) => (
              <button key={b.k} type="button" onClick={() => unplace(b.k)} className={`animate-[pop_.2s_ease-out] rounded-2xl px-3.5 py-2 ${b.slot ? SLOT : BLOCK}`}>
                {b.t}
              </button>
            ))}
          </div>
          <div className="mt-4 min-h-6 text-[1rem] font-semibold">
            {check === "ok" && (
              <button type="button" onClick={() => sayEn(t.en)} className="inline-flex items-center gap-1.5 text-[#9fe7c6]">
                <Icon name="check" className="size-4" /> Doğru · dinle
              </button>
            )}
            {check === "bad" && (
              <button type="button" onClick={() => sayEn(t.en)} className="text-left text-[#f3a39a]">
                Doğrusu: <span className="text-white/85">{t.en}</span>
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5 text-[1.1875rem] font-bold">
            {t.pool.map((b) => {
              const used = !left.includes(b);
              return (
                <button key={b.k} type="button" disabled={used || !!check} onClick={() => place(b)} className={`rounded-[0.95rem] px-4 py-2.5 transition-opacity ${used ? "bg-white/8 opacity-20" : "bg-white/8 active:translate-y-[2px]"}`}>
                  {b.t}
                </button>
              );
            })}
          </div>
        </section>
        <footer className="relative flex items-center justify-between gap-3">
          {check && last ? (
            <Button variant="text" onClick={() => goOn(false)} className="!px-0 !text-white/50">
              Atla
            </Button>
          ) : (
            <Button variant="text" onClick={hint} disabled={!!check} className="!px-0 !text-white/50">
              İpucu
            </Button>
          )}
          {check && (
            <Button variant="secondary" full={false} onClick={() => goOn(true)} className={GO}>
              {last ? "Hatırla" : "Devam"}
            </Button>
          )}
        </footer>
      </>
    );
  }

  if (phase === "recall") {
    const answered = heard && (heard.shown || typeof heard.ok === "boolean");
    const wrong = answered && !heard.ok && !heard.shown;
    const st = listening || mic.state === "stopping" ? "wait" : mic.state === "opening" ? "open" : mic.rec ? "rec" : "idle";
    return (
      <>
        {top(
          <Button variant="icon" size="sm" aria-label="Hatırla'yı kapat" onClick={() => (mic.cancel(), setPhase("learn"))} className="!text-white/50">
            <Icon name="x" className="size-5" />
          </Button>,
          <b className="font-semibold text-white/88">Hatırla</b>,
          <span className="size-9" />,
        )}
        <Steps at={3} />
        <section aria-label="Hatırla" className="relative flex flex-1 flex-col justify-center gap-5 py-6">
          {pic.img ? <Pic pic={pic} className="mx-auto max-w-[20rem]" /> : <TrLine text={c.fills[0][2]} part={c.fills[0][1]} className="text-[1.5rem] font-semibold leading-[1.3]" />}
          <div aria-live="polite" className="min-h-[3.25rem] text-[1.25rem] font-bold leading-snug">
            {answered ? (
              <button type="button" onClick={() => sayEn(say0)} className="text-left">
                {heard.ok ? (
                  <span className="inline-flex items-center gap-1.5 text-[#9fe7c6]">
                    <Icon name="check" className="size-5" /> {say0}
                  </span>
                ) : (
                  <>
                    {wrong && <span className="block text-[0.9375rem] font-semibold text-[#f3a39a]">Sen: {heard.heard}</span>}
                    <span className="text-white/90">{say0}</span>
                  </>
                )}
              </button>
            ) : heard?.err && st === "idle" ? (
              <p className="text-[1rem] font-semibold text-[#f3a39a]">{heard.err}</p>
            ) : null}
          </div>
          {(!answered || wrong) && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={wrong ? again : tapMic}
                aria-label={st === "rec" ? "Bitti" : "Bas ve konuş"}
                aria-busy={st === "wait" || st === "open"}
                className={`relative grid place-items-center rounded-full text-white transition-transform active:scale-95 ${wrong ? "size-14" : "size-[5.5rem]"} ${st === "rec" ? "bg-[#ff3d77]" : st === "idle" ? GRAD : "bg-white/10"}`}
              >
                {st === "rec" && (
                  <span
                    ref={lvRef}
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-[#ff3d77]/35 transition-transform duration-75"
                    style={{ transform: "scale(calc(1 + var(--lv, 0) * 0.7))" }}
                  />
                )}
                {(st === "wait" || st === "open") && <span aria-hidden className="absolute inset-0 animate-spin rounded-full border-[3px] border-white/15 border-t-[#ffb38a]" />}
                <Icon name={st === "rec" ? "up" : "mic"} className={`relative ${wrong ? "size-6" : "size-8"}`} />
              </button>
              <span className={`text-[0.9375rem] font-semibold ${st === "rec" ? "text-[#ff9ab4]" : "text-white/60"}`}>
                {st === "rec" ? "Dinliyorum · bitince bas" : st === "open" ? "Mikrofon açılıyor…" : st === "wait" ? "Bakıyorum…" : wrong ? "Tekrar söyle" : "Bas ve konuş"}
              </span>
            </div>
          )}
        </section>
        <footer className="relative flex items-center justify-between gap-3">
          {answered ? (
            <Button variant="text" onClick={() => (mic.cancel(), finish(!miss, false))} disabled={st !== "idle"} className="!px-0 !text-white/50">
              Atla
            </Button>
          ) : (
            <Button variant="text" onClick={show} disabled={st === "wait"} className="!px-0 !text-white/50">
              Göster
            </Button>
          )}
          {answered && (
            <Button variant="secondary" full={false} onClick={() => (mic.cancel(), finish(!miss, true))} disabled={st === "wait"} className={GO}>
              Konuş
            </Button>
          )}
        </footer>
      </>
    );
  }

  if (phase === "talk") return <WordTalk w={{ en: patternText(c), tr: c.tr, kind: "phrase" }} onClose={() => setPhase(saved ? "done" : "learn")} />;

  if (phase === "done" && saved) {
    const st = chunkState(deck, c.id);
    return (
      <>
        {top(<BackButton href="/" className="opacity-60" />, <b className="font-semibold text-white/88">Kalıplar</b>, menuBtn)}
        <Steps at={3} />
        <section aria-label="Sonuç" className="relative flex flex-1 flex-col justify-center py-6">
          <b className={`bg-clip-text text-[3.25rem] font-extrabold leading-none tracking-[-.03em] text-transparent ${GRAD}`}>{saved.right ? "Kalıp tamam" : "Az kaldı"}</b>
          <p className="mt-3 text-[1.0625rem] leading-snug text-white/65">
            {saved.right ? `Bu kalıpla ${c.fills.length} yeni ifade öğrendin. ` : "Birkaç yer karıştı. "}
            {st?.st === "known" ? "Artık öğrendiklerinde." : st?.due ? dueSay(st.due, today) : ""}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {[
              [stats.known + stats.study, "kalıp"],
              [stats.words, "ifade"],
              [`${stats.days} gün`, "üst üste"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-[1.1rem] bg-white/6 p-3.5">
                <b className="block text-[1.5rem] font-bold tabular-nums">{n}</b>
                <small className="text-[0.8125rem] text-white/50">{l}</small>
              </div>
            ))}
          </div>
          {due.length > 0 && (
            <>
              <h2 className="mb-1 mt-8 text-[0.78rem] font-semibold tracking-[.06em] text-white/42">BUGÜN TEKRAR</h2>
              {due.map((x) => (
                <button key={x.id} type="button" onClick={() => onOpen(x.id)} className="flex w-full items-baseline justify-between gap-3 border-b border-white/7 py-3 text-left">
                  <b className="min-w-0 truncate text-[1rem] font-semibold">
                    {x.head} <span className="text-[#ffb38a]">…</span>
                    {x.tail ? ` ${x.tail}`.replace(/\s+([?.!,])/, "$1") : ""}
                  </b>
                  <span className="shrink-0 text-[0.875rem] text-white/45">{x.tr}</span>
                </button>
              ))}
            </>
          )}
        </section>
        <footer className="relative flex items-center justify-between gap-3">
          <Button variant="text" onClick={() => (primeEn(), setPhase("talk"))} className="!px-0 !text-white/50">
            Konuş
          </Button>
          <Button variant="secondary" full={false} onClick={onNext} className={GO}>
            Sıradaki kalıp
          </Button>
        </footer>
      </>
    );
  }

  const tail = tailOf(c);
  const punc = puncOf(c);
  return (
    <>
      {top(
        <BackButton href="/" className="opacity-60" />,
        <>
          <b className="font-semibold text-white/88">Kalıplar</b>
          {topic ? ` · ${topic}` : ""}
        </>,
        menuBtn,
      )}
      <Steps at={tried.size > 1 ? 1 : 0} />
      <section aria-label="Kalıp" className="relative flex flex-1 flex-col justify-center py-6">
        <Pic pic={pic} className="mb-5 max-w-[13rem]" />
        <button type="button" onClick={() => (primeEn(), sayEn(fillText(c, f)))} aria-label="Dinle" className="flex flex-wrap items-center gap-2 text-left text-[1.875rem] font-bold leading-[1.15] tracking-[-.02em]">
          <span className={`rounded-2xl px-3.5 py-2 ${BLOCK}`}>{c.head}</span>
          <span key={fi} className={`animate-[pop_.25s_ease-out] rounded-2xl px-3.5 py-2 ${SLOT}`}>
            {f[0]}
            {!tail && punc ? punc.replace(/^,\s*/, ", ") : ""}
          </span>
          {tail && <span className={`rounded-2xl px-3.5 py-2 ${BLOCK}`}>{tail}</span>}
        </button>
        <TrLine text={f[2]} part={f[1]} className="mt-4 text-[1.1875rem] leading-snug text-white/75" />
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[0.875rem]">
          <span className="rounded-full bg-white/7 px-2.5 py-1 text-white/75">{c.rule}</span>
          <button type="button" onClick={() => (primeEn(), sayEn(fillText(c, f)))} aria-label="Dinle" className="grid size-8 place-items-center rounded-full bg-white/7">
            <Icon name="volume" className="size-4 text-[#ffb38a]" />
          </button>
        </div>
        <h2 className="mb-3 mt-8 text-[0.78rem] font-semibold tracking-[.06em] text-white/42">DEĞİŞTİR</h2>
        <div className="flex flex-wrap gap-2">
          {c.fills.map((x, i) => (
            <button
              key={x[0]}
              type="button"
              aria-pressed={i === fi}
              onClick={() => pickFill(i)}
              className={`rounded-[0.9rem] px-3.5 py-2 text-left transition-colors ${i === fi ? "bg-[#ff3d77]/16 shadow-[inset_0_0_0_1.5px_#ff6b8f]" : "bg-white/7"}`}
            >
              <span className="block text-[1rem] font-semibold text-white">
                {x[0]}
                {i !== fi && tried.has(i) && <Icon name="check" className="ml-1 inline size-3.5 text-[#9fe7c6]" />}
              </span>
              <small className={`block text-[0.78rem] ${i === fi ? "text-[#ffb38a]" : "text-white/45"}`}>{x[1]}</small>
            </button>
          ))}
        </div>
      </section>
      <footer className="relative flex items-center justify-between gap-3">
        <Button variant="text" onClick={onSkip} className="!px-0 !text-white/50">
          Geç
        </Button>
        <Button variant="secondary" full={false} onClick={startBuild} className={GO}>
          Kur
        </Button>
      </footer>
    </>
  );
}
