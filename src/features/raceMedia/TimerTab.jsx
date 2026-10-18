"use client";

import { useState } from "react";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Countdown, useTimerRun } from "@/features/training/Countdown";
import { addWind } from "@/features/athletes/raceLiveStore";
import { raceDays } from "@/features/athletes/raceWeather";
import { COURSES, FLAGS, VOIDS, atOf, dirShort, dropRace, hm, newStart, raceName, raceTime, raceTitle, renumber, startsOn, windOn } from "@/lib/raceLive";
import { Icon } from "@/components/ui/Icon";
import { WindSheet } from "./WeatherTab";

// Süre (Seyhun 2026-10-18): yarış akışı (useRaceFlow: Başlat · İptal · Yarışı bitir, sebep sorma, Geri al). Yarışlar bütün seri boyunca
// numaralanır (2. gün 4. yarıştan devam eder); adı, saatleri ve iptal durumu dokununca değişir. Yarış günü sayfa bu sekmeyle açılır.
// Sayacın altında: rüzgâr (son elle kayıt; "Rüzgâr yaz" ile hemen, start bu rüzgârı alır) ve kamera (Medya'nın uygulama içi kamerası,
// içinde de Başlat/İptal/Bitir var). Sayaç dizisi: 5 dk açılır; başlatınca, 4:00 ve 1:00 kala, son 10 sn her saniye, 0'da uzun bip.
const PRESETS = [60, 120, 300];
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });

export function TimerTab({ orgId, race, day, live, onChange, rf, onCam }) {
  const tr = useTimerRun();
  const timer = tr.t;
  const [edit, setEdit] = useState(null); // düzenlenen yarış
  const [wind, setWind] = useState(false);
  const { flow, ridOf, save, undo } = rf;
  const cur = timer.end != null ? live.starts.find((x) => x.id === ridOf(timer)) : null;
  const rdays = raceDays(race);
  const lastWind = windOn(live.wind, day).at(-1);
  const add = () => {
    const now = new Date();
    const s = newStart(live.starts, atOf(day, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`), live.wind, null, rdays);
    if (s) setEdit({ ...s, fresh: true });
  };
  // Yarışlar gün gün; seçili gün en üstte, sonra öbür günler yeniden eskiye
  const days = [...new Set(live.starts.map((x) => x.day))].sort((a, b) => (a === day ? -1 : b === day ? 1 : b.localeCompare(a)));
  const state = (s) => (s.void ? "" : s.fin ? raceTime(s) : cur?.id === s.id ? (tr.up ? "yarışta" : "geri sayım") : "");

  return (
    <>
      {cur && <p className="mt-3 text-center text-[0.9375rem] font-semibold">{raceName(cur)}</p>}
      <Countdown mode="start" presets={PRESETS} race={flow} />
      {/* Seyhun 2026-10-18: Fotoğraf ve Video ikonlu, dikkat çekici renkte; "+" rüzgâr, akıntı ve not yazar */}
      <div className="mt-2 grid grid-cols-[1fr_1fr_3.5rem] gap-2">
        <button type="button" onClick={() => onCam("photo")} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-acc text-[1rem] font-semibold text-white shadow-sm active:translate-y-px">
          <Icon name="camera" />
          Fotoğraf
        </button>
        <button type="button" onClick={() => onCam("video")} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-rec text-[1rem] font-semibold text-white shadow-sm active:translate-y-px">
          <Icon name="video" />
          Video
        </button>
        <button type="button" onClick={() => setWind(true)} aria-label="Rüzgâr ve akıntı yaz" className="grid h-14 place-items-center rounded-2xl bg-deep text-white shadow-sm active:translate-y-px">
          <Icon name="plus" className="size-6" />
        </button>
      </div>
      <WindSheet
        open={wind}
        onClose={() => setWind(false)}
        day={day}
        last={lastWind}
        onSave={(w) => {
          setWind(false);
          onChange((l) => ({ wind: [...l.wind, w] }), () => addWind(orgId, race.id, w));
        }}
      />
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
                  <button type="button" onClick={() => setEdit(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                    <span className="min-w-0 flex-1">
                      <b className={`block text-[0.9375rem] font-semibold ${s.void ? "text-mut" : ""}`}>{raceTitle(s)}</b>
                      {(s.course || s.flag || s.note) && <span className="block truncate text-[0.8125rem] text-mut">{[s.course, s.flag, s.note].filter(Boolean).join(" · ")}</span>}
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
                  <button type="button" onClick={add} className="w-full px-4 py-3 text-left text-[0.9375rem] font-semibold text-acc active:bg-bg">
                    Yarış ekle
                  </button>
                </li>
              )}
            </ul>
          </section>
        );
      })}
      {!days.includes(day) && (
        <button type="button" onClick={add} className="mt-2 w-full py-2 text-[0.9375rem] font-semibold text-acc">
          Yarış ekle
        </button>
      )}
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
      <button type="button" onClick={() => onSave({ ...x, at: atOf(x.day, x.time), fin: x.finTime ? atOf(x.day, x.finTime) : "", time: undefined, finTime: undefined })} className="mt-4 h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px">
        Kaydet
      </button>
      {onDrop && (
        <button type="button" onClick={onDrop} className="mt-2 h-11 w-full text-[0.9375rem] font-semibold text-rec">
          Sil
        </button>
      )}
    </div>
  );
}
