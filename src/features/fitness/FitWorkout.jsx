"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { useKind } from "@/features/auth/useKind";
import { exById } from "@/lib/fitness/exercises";
import { useAuth } from "@/features/auth/AuthProvider";
import { MediaShow, useBlobUrl } from "./ExerciseMedia";
import { YtPlayer } from "./YtVideo";
import { FitGuided } from "./FitGuided";
import { clearStart, isStart } from "./guideVoice";
import { ytThumb } from "@/lib/fitness/youtube";
import { FEELS, PARTS, cheerOf, clockText, cleanRes, isTimed, restAfter, itemLine, itemMore, resRows, setTimeText, statusOf, STATUS, targetFor } from "@/lib/fitness/model";
import { todayStr, when } from "@/lib/utils/format";

// Fitness planının ekranında (AddSheet): antrenman. Her hareketin setleri tek tek işaretlenir (yapılan tekrar, kilo, süre);
// önerilen değer hazır gelir (geçen sefer bütün setler tamamsa biraz artırılmış; targetFor). Set işaretlenince dinlenme sayacı.
// Sonuç planın fit.res alanına yazılır (her işaretlemede); "Antrenmanı bitir" yapıldı, "Atladım" atlandı yapar.
// Sesle de: "squat 3 set 10 tekrar 60 kilo yaptım", "bugünkü antrenmanı yaptım" (ana asistan, bu plana yazar).
// Sade görünüm: set satırında değer yazı olarak durur (dokununca düzenlenir); süre ve not "Süre ve not ekle" altında.
const box = "rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const inp = "h-9 w-full min-w-0 rounded-lg bg-bg px-1 text-center text-[0.9375rem] tabular-nums outline-none";
const n = (v) => (v === "" || v == null ? "" : String(v).replace(",", "."));

// Formdaki setler: kayıtlı sonuç, yoksa hedeften
function startSets(fit, plans, date) {
  return (fit.items || []).map((it, i) => {
    const saved = fit.res?.ex?.[i]?.sets;
    if (saved?.length) return saved.map((s) => ({ reps: s.reps ?? "", kg: s.kg ?? "", sec: s.sec ?? "", min: s.min ?? "", ok: !!s.ok, ...(s.took ? { took: s.took, full: !!s.full } : {}) }));
    const t = targetFor(it, plans, date);
    return Array.from({ length: it.sets || 1 }, () => ({ reps: t.reps || "", kg: t.kg || "", sec: t.sec || "", min: t.min || "", ok: false }));
  });
}

// Hareketin resmi: ilk fotoğrafı, yoksa YouTube kapağı; yoksa boş (kart düz renk kalır)
function Pic({ it, className = "" }) {
  const { profile } = useAuth();
  const ph = (it?.media || []).find((m) => m.kind === "photo" && !m.stock);
  const { url, err, fail } = useBlobUrl(profile?.orgId, ph);
  const src = ph && !err ? url : it?.yt?.id ? ytThumb(it.yt.id) : "";
  if (!src) return null;
  return <img src={src} alt="" onError={ph ? fail : undefined} className={`object-cover ${className}`} />;
}

// Hareketler bölüm bölüm (Hazırlık, Ana bölüm, Soğuma); bölüm yazılmamışsa tek liste
function partsOf(items) {
  const has = items.some((it) => it.part && it.part !== "ana");
  if (!has) return [["", items.map((it, i) => i)]];
  return PARTS.map(([k, l]) => [l, items.map((it, i) => ((it.part || "ana") === k ? i : -1)).filter((i) => i >= 0)]).filter(([, l]) => l.length);
}

export function FitWorkout({ rec, by, hero = false }) {
  const { plans, updateRecord } = useData();
  const toast = useToast();
  const fit = rec.fit || { items: [] };
  // Sporcu kendisine hazırlanan programı yalnız işaretler ve bitirir; set, tekrar, kilo, süre değiştiremez
  const kind = useKind();
  const lock = !!fit.for && (kind === "athlete" || kind === "student");
  const today = todayStr();
  const st = statusOf(rec, today);
  const [sets, setSets] = useState(() => startSets(fit, plans, rec.date));
  const [mins, setMins] = useState(fit.res?.min || rec.durationMin || "");
  const [feel, setFeel] = useState(fit.res?.feel || 0);
  const [note, setNote] = useState(fit.res?.note || "");
  const [rest, setRest] = useState(null); // { end, total }
  const [now, setNow] = useState(0);
  const [edit, setEdit] = useState(!fit.res?.st);
  const [cell, setCell] = useState(""); // düzenlenen set "i-k"
  const [extra, setExtra] = useState(!!(fit.res?.note || fit.res?.min));
  const [guide, setGuide] = useState(() => !fit.res?.st && isStart(rec.id)); // adım adım ekran (asistanla "antrenmana başla" açar)
  const [open, setOpen] = useState(-1); // açık hareket (nasıl yapılır, setler)
  const [at, setAt] = useState(null); // adım adım ekran hangi setten açılsın (süreli sette listeden dokununca)
  const tick = useRef(null);
  useEffect(() => {
    if (isStart(rec.id)) clearStart();
  }, [rec.id]);

  // Dinlenme sayacı: süre dolunca titreşir ve kapanır
  useEffect(() => {
    if (!rest) return;
    tick.current = setInterval(() => {
      const t = Date.now();
      if (t >= rest.end) {
        clearInterval(tick.current);
        navigator.vibrate?.([30, 60, 30]);
        setRest(null);
      } else setNow(t);
    }, 250);
    return () => clearInterval(tick.current);
  }, [rest]);
  const left = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0;
  const startRest = (sec) => {
    const t = Date.now();
    setNow(t);
    setRest({ end: t + sec * 1000, total: sec });
  };

  const resOf = (patch = {}) => cleanRes({ ...(fit.res || {}), ex: sets.map((s) => ({ sets: s })), min: mins, feel, note, ...patch }, fit.items || []);
  const save = (res) => updateRecord("plan", rec.id, { fit: { ...fit, res } }, by);

  // quiet: adım adım ekrandan (yalnız işaretler); rec: süreli sette geri sayım kaydı { took, full }
  function toggle(i, k, quiet = false, rec = null) {
    const flip = (x) => {
      const ok = quiet ? true : !x.ok;
      if (!ok) {
        const { took, full, ...rest } = x;
        return { ...rest, ok };
      }
      return { ...x, ok, ...(rec || {}) };
    };
    const next = sets.map((s, a) => (a === i ? s.map((x, b) => (b === k ? flip(x) : x)) : s));
    setSets(next);
    const on = next[i][k].ok;
    save(cleanRes({ ...(fit.res || {}), ex: next.map((s) => ({ sets: s })), st: fit.res?.st || "", at: fit.res?.at || new Date().toISOString() }, fit.items || []));
    const r = restAfter(fit.items[i], !next[i].some((x) => !x.ok)); // setler bittiyse hareketler arası
    if (on && !quiet) startRest(r); // adım adım ekran kendi sayacını kullanır
  }
  // Baştan başlat: yarım kalan setlerin işaretleri ve değerleri silinir, adım adım ekran ilk setten açılır
  function restart() {
    if (!confirm("Antrenman baştan başlasın mı? İşaretlenen setler sıfırlanır.")) return;
    const fresh = startSets({ ...fit, res: null }, plans, rec.date);
    setSets(fresh);
    setFeel(0);
    setRest(null);
    setAt(null);
    save(cleanRes({ ex: fresh.map((s) => ({ sets: s })), st: "", at: new Date().toISOString() }, fit.items || []));
    setGuide(true);
  }
  const setVal = (i, k, key, v) => setSets((p) => p.map((s, a) => (a === i ? s.map((x, b) => (b === k ? { ...x, [key]: n(v) } : x)) : s)));
  const addSet = (i) => setSets((p) => p.map((s, a) => (a === i ? [...s, { ...(s.at(-1) || {}), ok: false }] : s)));

  async function finish(stv) {
    // Bitir'de işaretlenmemiş ama değeri yazılmış setler yapılmış sayılmaz; hiçbiri işaretlenmediyse hepsi yapılmış sayılır
    const anyOk = sets.some((s) => s.some((x) => x.ok));
    const ex = stv === "done" && !anyOk ? sets.map((s) => ({ sets: s.map((x) => ({ ...x, ok: true })) })) : sets.map((s) => ({ sets: s }));
    const res = resOf({ st: stv, ex, at: new Date().toISOString() });
    await save(res);
    setRest(null);
    setGuide(false);
    setEdit(false);
    toast(stv === "done" ? "Antrenman kaydedildi" : "Atlandı olarak işaretlendi");
  }

  const done = sets.reduce((t, s) => t + s.filter((x) => x.ok).length, 0);
  const total = sets.reduce((t, s) => t + s.length, 0);

  if (!edit && fit.res?.st) return <ResultCard rec={rec} fit={fit} hero={hero} onEdit={() => setEdit(true)} />;

  const items = fit.items || [];
  const allDone = total > 0 && done === total;
  // Sıradaki set: ilk işaretlenmemiş
  const next = (() => {
    for (let i = 0; i < sets.length; i++) {
      const k = sets[i].findIndex((x) => !x.ok);
      if (k >= 0) return { i, k };
    }
    return null;
  })();
  const name = fit.name || String(rec.title || "").replace(/^Fitness · /, "") || "Antrenman";

  return (
    <div className={hero ? "" : "mt-3"}>
      {/* Üst kart: ilk (ya da sıradaki) hareketin fotoğrafı üstünde saat, antrenmanın adı; altında süre, hareket, set ya da ilerleme */}
      <section className="relative h-64 overflow-hidden rounded-[1.625rem] bg-deep text-white">
        <Pic key={next?.i ?? 0} it={items[next?.i ?? 0]} className="absolute inset-0 size-full" />
        <span className="absolute inset-0 bg-gradient-to-b from-black/0 from-30% to-black/75" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] font-semibold">
            <span className="rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">{when(rec)}</span>
            {rec.place && <span className="max-w-full truncate rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">{rec.place}</span>}
            {st === "missed" && <span className="rounded-full bg-rec px-2.5 py-1">Günü geçti</span>}
          </div>
          <h3 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight">{name}</h3>
          {items.length > 0 && (
            <p className="mt-0.5 truncate text-[0.875rem] text-white/85">
              {allDone ? "Bütün setler yapıldı" : done && next ? `Sıradaki: ${items[next.i]?.name} · ${next.k + 1}. set` : `İlk hareket: ${items[0].name}`}
            </p>
          )}
        </div>
      </section>
      {done > 0 ? (
        <section className={`${box} mt-2.5 px-4 py-3`}>
          <div className="flex justify-between text-[0.8125rem] font-semibold">
            <span>{allDone ? "Bütün setler yapıldı" : "Devam ediyor"}</span>
            <span className="tabular-nums text-mut">
              {done} / {total} set
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accbg">
            <div className="h-full rounded-full bg-acc transition-all" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </section>
      ) : (
        <section className={`${box} mt-2.5`}>
          <div className="grid grid-cols-2 divide-x divide-line py-3 text-center">
            {[
              [items.length, "hareket"],
              [total, "set"],
            ].map(([v, l]) => (
              <div key={l}>
                <b className="block text-[1.25rem] font-semibold tabular-nums">{v}</b>
                <small className="text-[0.75rem] text-mut">{l}</small>
              </div>
            ))}
          </div>
          {total > 0 && <p className="border-t border-line px-4 py-2.5 text-center text-[0.875rem] text-fg2">{cheerOf(rec.date)}</p>}
        </section>
      )}
      {guide && (
        <FitGuided
          items={items}
          sets={sets}
          at={at}
          onCheck={(i, k, r) => toggle(i, k, true, r)}
          feel={feel}
          setFeel={setFeel}
          onFinish={finish}
          onClose={() => {
            setGuide(false);
            setAt(null);
          }}
        />
      )}

      {/* Bitirme: yalnız bütün setler yapılınca (adım adım ekranda bitirmeyen sporcu buradan bitirir) */}
      {allDone && (
        <section className={`${box} mt-3 p-4`}>
          <b className="block text-[1rem] font-semibold">Tebrikler, hepsi tamam</b>
          <small className="mt-2 block text-[0.8125rem] font-semibold text-mut">Nasıl geçti?</small>
          <div className="mt-1.5 flex gap-1.5">
            {FEELS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={feel === k} onClick={() => setFeel(feel === k ? 0 : k)} className={`h-11 flex-1 rounded-xl text-[0.875rem] font-semibold ${feel === k ? "bg-acc text-white" : "bg-bg"}`}>
                {l}
              </button>
            ))}
          </div>
          {extra ? (
            <div className="mt-2 flex gap-2">
              {!lock && (
                <label className="flex w-24 shrink-0 items-center gap-1 rounded-xl bg-bg pr-3">
                  <input inputMode="numeric" value={mins} onChange={(e) => setMins(n(e.target.value))} aria-label="Süre" className="h-10 w-full min-w-0 bg-transparent px-3 text-[0.9375rem] tabular-nums outline-none" />
                  <span className="text-[0.8125rem] text-mut">dk</span>
                </label>
              )}
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı)" className="h-10 w-full min-w-0 rounded-xl bg-bg px-3 text-[0.9375rem] outline-none" />
            </div>
          ) : (
            <button type="button" onClick={() => setExtra(true)} className="mt-2 px-1 text-[0.8125rem] font-semibold text-acc">
              {lock ? "+ Not ekle" : "+ Süre ve not ekle"}
            </button>
          )}
          <button type="button" onClick={() => finish("done")} className="mt-3 h-12 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]">
            Antrenmanı bitir
          </button>
        </section>
      )}

      {/* Hareketler: ne, ne kadar; dokununca nasıl yapılır, fotoğraf/video ve setler */}
      {items.length > 0 &&
        partsOf(items).map(([label, idx]) => (
          <div key={label || "all"}>
            <p className="mt-5 px-1 text-[0.9375rem] font-semibold text-mut">{label || "Bu antrenmanda"}</p>
            <ul className={`${box} mt-2 divide-y divide-line`}>
              {idx.map((i) => {
            const it = items[i];
            const ex = exById(it.ex);
            const t = targetFor(it, plans, rec.date);
            const s = sets[i] || [];
            const key = it.kind === "time" ? "sec" : it.kind === "cardio" ? "min" : "reps";
            const unit = it.kind === "time" ? "sn" : it.kind === "cardio" ? "dk" : "tekrar";
            const all = s.length > 0 && s.every((x) => x.ok);
            const on = open === i;
            return (
              <li key={i}>
                <button type="button" onClick={() => setOpen(on ? -1 : i)} aria-expanded={on} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                  <span className="relative size-13 shrink-0">
                    <span className="grid size-13 place-items-center overflow-hidden rounded-[0.875rem] bg-accbg text-[0.875rem] font-semibold text-acc">
                      <Pic it={it} className="size-full" />
                    </span>
                    <span className={`absolute -left-1 -top-1 grid size-5 place-items-center rounded-full text-[0.6875rem] font-semibold ring-1 ${all ? "bg-acc text-white ring-acc" : "bg-card text-fg ring-line"}`}>
                      {all ? <Icon name="check" className="size-3 [stroke-width:3]" /> : i + 1}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className={`block truncate text-[0.9375rem] font-semibold ${all ? "text-mut" : ""}`}>{it.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">
                      {itemLine(it)}
                      {t.up && <span className="ml-1 font-semibold text-acc">↑</span>}
                    </small>
                  </span>
                  {done > 0 && (
                    <span className="shrink-0 text-[0.8125rem] tabular-nums text-mut">
                      {s.filter((x) => x.ok).length}/{s.length}
                    </span>
                  )}
                </button>
                {on && (
                  <div className="px-4 pb-4">
                    {ex?.how && <p className="text-[0.8125rem] leading-snug text-mut">{ex.how}</p>}
                    {itemMore(it) && <p className="mt-1 text-[0.8125rem] leading-snug text-mut">{itemMore(it)}</p>}
                    {it.note && <p className="mt-1 text-[0.875rem] leading-snug">{it.note}</p>}
                    {it.alt && <p className="mt-1 text-[0.8125rem] leading-snug text-mut">Kolay seçenek: {it.alt}</p>}
                    {t.up && <p className="mt-1 text-[0.75rem] font-semibold text-acc">↑ geçen sefere göre artırıldı</p>}
                    <MediaShow media={it.media} className="mt-2" />
                    <YtPlayer yt={it.yt} className="mt-2" />
                    <div className="mt-2 space-y-1.5">
                      {s.map((x, k) => (
                        <div key={k}>
                        <div className="flex items-center gap-2">
                          <span className="w-9 shrink-0 text-[0.75rem] font-semibold text-mut">Set {k + 1}</span>
                          {!lock && cell === `${i}-${k}` ? (
                            <>
                              <label className="flex min-w-0 flex-1 items-center gap-1">
                                <input autoFocus inputMode="numeric" aria-label={unit} value={x[key]} onChange={(e) => setVal(i, k, key, e.target.value)} onBlur={() => it.kind !== "reps" && setCell("")} className={inp} />
                                <span className="w-10 shrink-0 text-[0.75rem] text-mut">{unit}</span>
                              </label>
                              {it.kind === "reps" && (
                                <label className="flex min-w-0 flex-1 items-center gap-1">
                                  <input inputMode="decimal" aria-label="kilo" value={x.kg} onChange={(e) => setVal(i, k, "kg", e.target.value)} placeholder="–" className={inp} />
                                  <span className="w-5 shrink-0 text-[0.75rem] text-mut">kg</span>
                                </label>
                              )}
                            </>
                          ) : lock ? (
                            <span className={`flex h-9 min-w-0 flex-1 items-center truncate px-2 text-[0.9375rem] tabular-nums ${x.ok ? "text-mut" : ""}`}>
                              {[x[key] ? `${x[key]} ${unit}` : "", x.kg ? `${String(x.kg).replace(".", ",")} kg` : ""].filter(Boolean).join(" · ") || "–"}
                            </span>
                          ) : (
                            <button type="button" onClick={() => setCell(`${i}-${k}`)} className={`h-9 min-w-0 flex-1 truncate rounded-lg px-2 text-left text-[0.9375rem] tabular-nums ${x.ok ? "text-mut" : ""}`}>
                              {[x[key] ? `${x[key]} ${unit}` : "", x.kg ? `${String(x.kg).replace(".", ",")} kg` : ""].filter(Boolean).join(" · ") || "Değer yaz"}
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={x.ok ? "Yapılmadı" : isTimed(it) ? "Süreyi başlat" : "Yapıldı"}
                            aria-pressed={x.ok}
                            onClick={() => {
                              setCell("");
                              // Süreli sette geri sayım şart: adım adım ekran o setten açılır
                              if (!x.ok && isTimed(it)) {
                                setAt({ i, k });
                                setGuide(true);
                              } else toggle(i, k);
                            }}
                            className={`grid size-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${x.ok ? "bg-acc text-white" : "border-2 border-line text-transparent"}`}
                          >
                            <Icon name={!x.ok && isTimed(it) ? "clock" : "check"} className={`size-4 ${!x.ok && isTimed(it) ? "text-mut" : ""}`} />
                          </button>
                        </div>
                        {setTimeText(it, x) && <small className={`ml-11 block text-[0.75rem] ${x.full ? "text-acc" : "text-rec"}`}>{setTimeText(it, x)}</small>}
                        </div>
                      ))}
                    </div>
                    {!lock && (
                      <button type="button" onClick={() => addSet(i)} className="mt-1.5 text-[0.75rem] font-semibold text-acc">
                        + Set
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
              })}
            </ul>
          </div>
        ))}

      {rest && (
        <div className="sticky bottom-[calc(var(--rec-h,6rem)+0.5rem)] z-10 mt-3 flex items-center gap-3 rounded-2xl bg-deep px-4 py-3 text-white shadow-lg">
          <Icon name="clock" className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] tabular-nums">Dinlen · {left} sn</b>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/20">
              <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${(left / rest.total) * 100}%` }} />
            </span>
          </span>
          <button type="button" onClick={() => setRest((r) => ({ ...r, end: r.end + 15000, total: r.total + 15 }))} className="rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-semibold">
            +15
          </button>
          <button type="button" onClick={() => setRest(null)} className="rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-semibold">
            Geç
          </button>
        </div>
      )}

      {!allDone && total > 0 && (
        <button type="button" onClick={() => finish("skip")} className="mt-4 h-10 w-full text-center text-[0.8125rem] font-semibold text-mut">
          Bugün yapamayacağım
        </button>
      )}

      {/* Başla / devam et: ekranın altında sabit */}
      {total > 0 && !allDone && !rest && (
        <div className="sticky bottom-0 z-10 -mx-5 mt-3 bg-gradient-to-b from-bg/0 to-bg to-30% px-5 pb-1 pt-4">
          <button type="button" onClick={() => setGuide(true)} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white shadow-[0_8px_20px_-10px_var(--acc)] active:scale-[.98]">
            {done ? "Kaldığın yerden devam et" : "Antrenmana başla"}
          </button>
          {done > 0 && (
            <button type="button" onClick={restart} className="h-10 w-full text-[0.875rem] font-semibold text-acc">
              Baştan başlat
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Listede video kapalı durur (çok video aynı anda yüklenmesin); dokununca açılır, yeniden dokununca kapanır
// Biten antrenman: üstte durum, ad ve tarih; üç kutu (süre, set, nasıl geçti); altında hareketler satır satır.
// Süreli hareketlerde her set ayrı hap: süresi dolan yeşil, erken geçilen kırmızı "0:18 / 0:30" (resRows).
function ResultCard({ rec, fit, hero, onEdit }) {
  const r = fit.res;
  const ok = r.st === "done";
  const { rows, done, total, active } = resRows(fit);
  const feel = r.feel && FEELS.find(([k]) => k === r.feel)?.[1];
  const time = r.min ? `${r.min} dk` : active ? clockText(active) : "";
  const stats = [
    ["Süre", time || "–"],
    ["Set", `${done}/${total}`],
    ["Nasıl geçti", feel || "–"],
  ];
  return (
    <div className={`${box} ${hero ? "" : "mt-3"} overflow-hidden`}>
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${ok ? "bg-acc/10 text-acc" : "bg-rec/10 text-rec"}`}>
            {ok && <Icon name="check" className="size-3.5" />}
            {STATUS[r.st]}
          </span>
          <Link href="/fitness" className="text-[0.8125rem] font-semibold text-acc">
            Fitness
          </Link>
        </div>
        {hero && <h3 className="mt-2 text-[1.25rem] font-bold leading-snug">{fit.name || String(rec.title || "").replace(/^Fitness · /, "")}</h3>}
        {hero && <p className="text-[0.8125rem] text-mut">{when(rec)}</p>}
        {ok && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {stats.map(([k, v]) => (
              <span key={k} className="rounded-xl bg-bg px-2 py-2 text-center">
                <b className="block truncate text-[1.0625rem] font-bold tabular-nums">{v}</b>
                <small className="block text-[0.6875rem] font-semibold text-mut">{k}</small>
              </span>
            ))}
          </div>
        )}
      </div>
      {ok && rows.length > 0 && (
        <ul className="border-t border-line/60">
          {rows.map((x, i) => (
            <li key={i} className="border-b border-line/60 px-4 py-2.5 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`min-w-0 truncate text-[0.9375rem] font-semibold ${x.none ? "text-mut" : ""}`}>{x.name}</span>
                <span className={`shrink-0 text-[0.875rem] tabular-nums ${x.none ? "text-rec" : "text-mut"}`}>{x.line}</span>
              </div>
              {x.sets.length > 0 && !x.none && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {x.sets.map((t) => (
                    <span key={t.n} className={`rounded-full px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums ${t.state === "early" ? "bg-rec/10 text-rec" : t.state === "no" ? "bg-bg text-mut line-through" : "bg-acc/10 text-acc"}`}>
                      {t.n}. set {t.text}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {r.note && <p className="border-t border-line/60 px-4 py-2.5 text-[0.875rem] text-mut">{r.note}</p>}
      <div className="px-4 pb-4 pt-1">
        <button type="button" onClick={onEdit} className="h-10 w-full rounded-xl bg-bg text-[0.875rem] font-semibold">
          Düzenle
        </button>
      </div>
    </div>
  );
}

