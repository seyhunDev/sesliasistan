"use client";

import { useState } from "react";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Countdown, useTimerRun } from "@/features/training/Countdown";
import { mmss } from "@/lib/raceScore";
import { saveBuoys } from "@/features/athletes/raceLiveStore";
import { raceDays } from "@/features/athletes/raceWeather";
import { COURSES, FLAGS, VOIDS, addBuoy, atOf, dropBuoy, nextBuoy, upSec, dirShort, dropRace, hm, newStart, raceName, raceTime, raceTitle, renumber, startsOn } from "@/lib/raceLive";
import { Button } from "@/components/ui/Button";

// Süre (Seyhun 2026-10-18): yarış akışı (useRaceFlow: Başlat · İptal · Yarışı bitir, sebep sorma, Geri al). Yarışlar bütün seri boyunca
// numaralanır (2. gün 4. yarıştan devam eder); adı, saatleri ve iptal durumu dokununca değişir. Yarış günü sayfa bu sekmeyle açılır.
// Düzen (Seyhun 2026-10-19 onayı, örnek yaris-tasarim/multimedya/sure-yeni-2.png): sayaca dokununca başlar; altta Start · Şamandıra ·
// Finish kareleri; günün yarışları tek satır ("Liste ›" açar). Alt şeritte ana düğme (Başlat · Durdur · Devam · Bitir; rüzgâr Hava sekmesinde, çekim alttaki Kayıt ile; Seyhun 2026-10-22).
// Sayaç dizisi: 5 dk açılır; başlatınca, 4:00 ve 1:00 kala, son 10 sn her saniye, 0'da uzun bip.
const PRESETS = [60, 120, 300, 600];
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });

export function TimerTab({ orgId, race, day, live, onChange, rf, onReset }) {
  const tr = useTimerRun();
  const timer = tr.t;
  const [edit, setEdit] = useState(null); // düzenlenen yarış
  const [list, setList] = useState(false); // bugünün yarışları (eskiden sayfanın altındaki liste)
  const { flow, ridOf, save, undo } = rf;
  const cur = timer.end != null || timer.left != null ? live.starts.find((x) => x.id === ridOf(timer)) : null; // durmuş geri sayım da (Devam bekler)
  const rdays = raceDays(race);
  const add = () => {
    setList(false);
    const now = new Date();
    const s = newStart(live.starts, atOf(day, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`), live.wind, null, rdays);
    if (s) setEdit({ ...s, fresh: true });
  };
  // Yarışlar gün gün; seçili gün en üstte, sonra öbür günler yeniden eskiye
  const days = [...new Set(live.starts.map((x) => x.day))].sort((a, b) => (a === day ? -1 : b === day ? 1 : b.localeCompare(a)));
  // Kareye dokununca o yarışın startından beri geçen süre yazılır (8 sn "Geri al")
  const mark = (b) => {
    if (!cur || timer.end == null) return;
    const sec = upSec(timer.end, Date.now());
    const before = live.starts;
    save(live.starts.map((x) => (x.id === cur.id ? { ...x, marks: { ...x.marks, [b]: sec } } : x)));
    undo(`${b} · ${mmss(sec)}`, before);
  };
  const setBuoys = (next) => onChange({ buoys: next }, () => saveBuoys(orgId, race.id, next));
  const state = (s) => (s.void ? "" : s.fin ? raceTime(s) : cur?.id === s.id ? (tr.up ? "yarışta" : "geri sayım") : "");

  const today = startsOn(live.starts, day);
  const last = [...today].reverse().find((x) => x.fin && !x.void);

  return (
    <>
      <Countdown
        mode="start"
        presets={PRESETS}
        race={flow}
        title={cur ? raceName(cur) : ""}
        where={race?.name || "Yarış"}
        bottom
      />
      {!!cur && tr.up && !cur.void && <Marks buoys={live.buoys} s={cur} on onMark={mark} onBuoys={setBuoys} />}
      <button type="button" onClick={() => setList(true)} data-press="row" className="mt-3 flex w-full items-center justify-between px-1 py-1 text-left text-[0.875rem]">
        <span className="min-w-0 truncate text-mut">
          {today.length ? `Bugün ${today.length} yarış${last ? ` · son ${raceName(last)} ${raceTime(last)}` : ""}` : "Bugün yarış yok"}
        </span>
        <b className="shrink-0 font-semibold">Liste ›</b>
      </button>
      <Sheet open={list} onClose={() => setList(false)} title="Yarışlar">
        {list && (
          <div className="-mt-3 pb-2">
            {!days.includes(day) && (
              <>
                <Label>{dayLabel(day)}</Label>
                <p className={`${card} px-4 py-4 text-center text-[0.875rem] text-mut`}>Bu gün yarış yok. Sıradaki: {flow.label}</p>
              </>
            )}
            {days.map((d) => {
              const list = startsOn(live.starts, d);
              return (
                <section key={d}>
                  <Label right={list.length}>{dayLabel(d)}</Label>
                  <ul className={`${card} divide-y divide-line overflow-hidden`}>
                    {[...list].reverse().map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => setEdit(s)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                          <span className="min-w-0 flex-1">
                            <b className={`block text-[0.9375rem] font-semibold ${s.void ? "text-mut" : ""}`}>{raceTitle(s)}</b>
                            {(s.course || s.flag || s.note || Object.keys(s.marks).length > 0) && (
                              <span className="block truncate text-[0.8125rem] text-mut">{[s.course, s.flag, markLine(live.buoys, s), s.note].filter(Boolean).join(" · ")}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-right text-[0.875rem] text-mut tabular-nums">
                            {[hm(s.at), s.kn != null && s.dir != null ? `${dirShort(s.dir)} ${s.kn} kn` : ""].filter(Boolean).join(" · ")}
                            {state(s) && <small className={`block text-[0.75rem] ${s.fin ? "" : "font-semibold text-acc"}`}>{state(s)}</small>}
                          </span>
                        </button>
                      </li>
                    ))}
                    {d === day && (
                      <li>
                        <button type="button" onClick={add} data-press="row" className="w-full px-4 py-3 text-left text-[0.9375rem] font-semibold text-acc">
                          Yarış ekle
                        </button>
                      </li>
                    )}
                  </ul>
                </section>
              );
            })}
            {!days.includes(day) && (
              <button type="button" onClick={add} data-press className="btn btn-text btn-sm mt-2 w-full text-acc">
                Yarış ekle
              </button>
            )}
            <button type="button" onClick={() => (setList(false), onReset?.())} data-press className="btn btn-danger btn-sm mt-6 w-full">
              Denemeleri sıfırla
            </button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? raceTitle(edit) : ""}>
        {edit && (
          <StartForm
            s={edit}
            onSave={(x) => {
              const { fresh, ...rest } = x;
              save(renumber(fresh ? [...live.starts, rest] : live.starts.map((o) => (o.id === x.id ? rest : o)), rdays));
              setEdit(null);
            }}
            onDrop={
              edit.fresh
                ? null
                : () => {
                    const before = live.starts;
                    save(dropRace(live.starts, edit.id, rdays));
                    undo(`${raceName(edit)} silindi`, before);
                    setEdit(null);
                  }
            }
          />
        )}
      </Sheet>
    </>
  );
}

function StartForm({ s, onSave, onDrop }) {
  const [x, setX] = useState({ ...s, time: hm(s.at), finTime: s.fin ? hm(s.fin) : "" });
  const put = (k) => (v) => setX((o) => ({ ...o, [k]: o[k] === v ? "" : v }));
  const chip = (on) => `h-9 rounded-full px-3.5 text-[0.875rem] font-medium active:scale-95 ${on ? "bg-acc text-white" : "bg-bg"}`;
  return (
    <div className="pb-2">
      <label className="flex items-center justify-between gap-3 border-b border-line py-3 text-[0.9375rem]">
        <span className="shrink-0 text-mut">Ad</span>
        <input value={x.name} placeholder={`${s.n}. yarış`} onChange={(e) => setX((o) => ({ ...o, name: e.target.value }))} className="min-w-0 flex-1 bg-transparent text-right font-semibold outline-none placeholder:text-fg2" />
      </label>
      <label className="flex items-center justify-between border-b border-line py-3 text-[0.9375rem]">
        <span className="text-mut">Bitiş saati</span>
        <input type="time" value={x.finTime} onChange={(e) => setX((o) => ({ ...o, finTime: e.target.value }))} className="bg-transparent text-right font-semibold tabular-nums outline-none" />
      </label>
      <label className="flex items-center justify-between border-b border-line py-3 text-[0.9375rem]">
        <span className="text-mut">Start saati</span>
        <input type="time" value={x.time} onChange={(e) => setX((o) => ({ ...o, time: e.target.value }))} className="bg-transparent text-right font-semibold tabular-nums outline-none" />
      </label>
      <p className="mb-2 mt-4 text-[0.875rem] font-semibold text-fg2">Parkur</p>
      <div className="flex flex-wrap gap-2">
        {COURSES.map((c) => (
          <button key={c} type="button" onClick={() => put("course")(c)} className={chip(x.course === c)}>{c}</button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[0.875rem] font-semibold text-fg2">İptal</p>
      <div className="flex flex-wrap gap-2">
        {VOIDS.map((c) => (
          <button key={c} type="button" onClick={() => put("void")(c)} className={chip(x.void === c)}>{c}</button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[0.875rem] font-semibold text-fg2">Bayrak</p>
      <div className="flex flex-wrap gap-2">
        {FLAGS.map((c) => (
          <button key={c} type="button" onClick={() => put("flag")(c)} className={chip(x.flag === c)}>{c}</button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[0.875rem] font-semibold text-fg2">Not</p>
      <textarea value={x.note} onChange={(e) => setX((o) => ({ ...o, note: e.target.value }))} rows={2} className="w-full rounded-xl bg-bg px-3 py-2.5 text-[0.9375rem] outline-none focus:ring-1 focus:ring-acc" />
      <button type="button" onClick={() => onSave({ ...x, at: atOf(x.day, x.time), fin: x.finTime ? atOf(x.day, x.finTime) : "", time: undefined, finTime: undefined })} data-press className="btn btn-primary mt-4 h-14 w-full">
        Kaydet
      </button>
      {onDrop && (
        <button type="button" onClick={onDrop} data-press className="btn btn-danger mt-2 w-full">
          Sil
        </button>
      )}
    </div>
  );
}

// Parkur noktaları: dokununca startan beri geçen süre; sıradaki çerçeveli. + / − şamandıra ekler, çıkarır.
// Yalnız açılmış yarış startı geçmişken görünür (Seyhun 2026-10-21: "Yarışta göster"; düz startta boş duruyordu).
// Start · Şamandıra · Finish kareleri (antrenman sayfası da kullanır, training/day): kareye dokununca startan beri geçen süre yazılır
export function Marks({ buoys, s, on, onMark, onBuoys }) {
  const next = on ? nextBuoy(buoys, s) : "";
  const small = "grid flex-1 place-items-center rounded-[0.625rem] border border-line bg-card text-[1.0625rem] text-fg2 active:bg-bg disabled:opacity-40";
  return (
    <div className="mt-3 flex gap-1.5">
      <div className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${buoys.length}, minmax(0, 1fr))` }}>
        {buoys.map((b) => {
          const v = s?.marks?.[b];
          return (
            <button
              key={b}
              type="button"
              disabled={!on || v != null}
              onClick={() => onMark(b)}
              className={`flex h-14 min-w-0 flex-col items-center justify-center rounded-[0.875rem] border px-0.5 active:translate-y-px disabled:active:translate-y-0 ${v != null ? "border-accbg bg-accbg" : b === next ? "border-2 border-acc bg-card" : "border-line bg-card"}`}
            >
              <small className="max-w-full truncate text-[0.6875rem] text-mut">{b.replace("Şamandıra ", buoys.length > 4 ? "Ş" : "Şamandıra ")}</small>
              <b className="text-[0.9375rem] font-semibold tabular-nums">{v != null ? mmss(v) : "–"}</b>
            </button>
          );
        })}
      </div>
      <div className="flex w-9 shrink-0 flex-col gap-1.5">
        <button type="button" aria-label="Şamandıra ekle" disabled={buoys.length >= 8} onClick={() => onBuoys(addBuoy(buoys))} className={small}>+</button>
        <button type="button" aria-label="Şamandıra çıkar" disabled={buoys.length <= 2} onClick={() => onBuoys(dropBuoy(buoys))} className={small}>−</button>
      </div>
    </div>
  );
}
const markLine = (buoys, s) =>
  buoys
    .filter((b) => s.marks?.[b] != null)
    .map((b) => `${b.replace("Şamandıra ", "Ş")} ${mmss(s.marks[b])}`)
    .join(" ");
