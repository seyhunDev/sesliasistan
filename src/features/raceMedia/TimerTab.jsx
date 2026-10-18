"use client";

import { useState } from "react";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { Countdown, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { saveStarts } from "@/features/athletes/raceLiveStore";
import { COURSES, FLAGS, VOIDS, atOf, beginRace, dirShort, dropRace, finishRace, hm, newStart, nextRaceNo, raceName, raceTime, raceTitle, renumber, shiftRace, startsOn, voidRace } from "@/lib/raceLive";

// Süre (Seyhun 2026-10-18): yarış akışı. "Başlat · 4. yarış" geri sayımı başlatır ve yarışı açar; 0'da yarış başlar (RaceMedia onZero,
// o anki rüzgârla); "Yarışı bitir" bitiş saatini yazar. Geri sayımda Duraklat yok: "Geri sayımı iptal et" (ertelendi / geri çağırma).
// Yarışlar bütün seri boyunca numaralanır (2. gün 4. yarıştan devam eder); adı ve saatleri dokununca değişir.
// Yanlış dokunuşa karşı her adımdan sonra birkaç saniye "Geri al" (önceki liste ve sayaç geri yazılır).
// İptal (Seyhun 2026-10-18): geri sayımı iptal edince ya da startan sonra "İptal"de sebep sorulur: Tehir, Genel geri çağırma, İptal
// (sebepsiz; kapatınca da bu). Yarış geçersiz sayılır, numarası tekrarına geçer, çekimlerinin başlığına sebep eklenir. Geri sayımda
// "Yanlış başlattım" yarışı tamamen siler. Durum sonradan yarışa dokunarak da değişir (ör. bitirdikten sonra genel geri çağırma).
// Sayaç dizisi: 5 dk açılır; başlatınca, 4:00 ve 1:00 kala, son 10 sn her saniye, 0'da uzun bip (bipler her sayfada: TimerSound).
const PRESETS = [60, 120, 300];
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });

export function TimerTab({ orgId, race, day, live, onChange }) {
  const toast = useToast();
  const tr = useTimerRun();
  const timer = tr.t;
  const [edit, setEdit] = useState(null); // düzenlenen yarış
  const [ask, setAsk] = useState(null); // iptal sebebi sorulan: { id, prevT, canDrop, at }
  const save = (next) => onChange({ starts: next }, () => saveStarts(orgId, race.id, next));
  const undo = (msg, before, prevT) =>
    toast(msg, { duration: 8000, action: { label: "Geri al", onClick: () => (save(before), prevT && writeTimer(prevT)) } });
  const ridOf = (t) => t?.rid || live.starts.find((x) => t?.end && Math.abs(Date.parse(x.at) - t.end) < 5000)?.id || "";
  const cur = timer.end != null ? live.starts.find((x) => x.id === ridOf(timer)) : null;
  const flow = {
    label: `${nextRaceNo(live.starts)}. yarış`,
    onStart: (end, rid, prevT) => {
      const before = live.starts;
      const got = beginRace(live.starts, Date.now(), end);
      save(got.starts);
      undo(`${raceName(got.starts.find((x) => x.id === got.id))} geri sayımı başladı`, before, prevT);
    },
    onShift: (end, rid) => rid && save(shiftRace(live.starts, rid, end)),
    onCancel: (prevT) => {
      const id = ridOf(prevT);
      if (live.starts.some((x) => x.id === id)) setAsk({ id, prevT, canDrop: true, at: Date.now() });
      else undo("Geri sayım iptal edildi", live.starts, prevT);
    },
    onVoid: (prevT) => {
      const id = ridOf(prevT);
      if (live.starts.some((x) => x.id === id)) setAsk({ id, prevT, canDrop: false, at: Date.now() });
    },
    onFinish: (prevT) => {
      const before = live.starts;
      const id = ridOf(prevT);
      const next = id ? finishRace(live.starts, id, Date.now()) : live.starts;
      save(next);
      const s = next.find((x) => x.id === id);
      undo(s ? `${raceName(s)} bitti${raceTime(s) ? ` · ${raceTime(s)}` : ""}` : "Yarış bitti", before, prevT);
    },
  };
  const choose = (reason) => {
    if (!ask) return;
    const before = live.starts;
    setAsk(null);
    if (!reason) {
      save(dropRace(live.starts, ask.id));
      return undo("Geri sayım iptal edildi, yarış silindi", before, ask.prevT);
    }
    const next = voidRace(live.starts, ask.id, reason, ask.at); // bitiş: İptal'e basılan an
    save(next);
    const s = next.find((x) => x.id === ask.id);
    undo(s ? raceTitle(s) : reason, before, ask.prevT);
  };
  const add = () => {
    const now = new Date();
    const s = newStart(live.starts, atOf(day, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`), live.wind);
    if (s) setEdit({ ...s, fresh: true });
  };
  // Yarışlar gün gün; seçili gün en üstte, sonra öbür günler yeniden eskiye
  const days = [...new Set(live.starts.map((x) => x.day))].sort((a, b) => (a === day ? -1 : b === day ? 1 : b.localeCompare(a)));
  const state = (s) => (s.void ? "" : s.fin ? raceTime(s) : cur?.id === s.id ? (tr.up ? "yarışta" : "geri sayım") : "");

  return (
    <>
      {cur && <p className="mt-3 text-center text-[0.9375rem] font-semibold">{raceName(cur)}</p>}
      <Countdown mode="start" presets={PRESETS} race={flow} />
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
      <Sheet open={!!ask} onClose={() => choose("İptal")} title="Neden iptal?">
        {ask && (
          <div className="grid gap-2 pb-2">
            {VOIDS.map((v) => (
              <button key={v} type="button" onClick={() => choose(v)} className="h-12 rounded-2xl bg-bg text-[1rem] font-semibold ring-1 ring-line active:translate-y-px">
                {v === "İptal" ? "İptal (sebepsiz)" : v}
              </button>
            ))}
            {ask.canDrop && (
              <button type="button" onClick={() => choose("")} className="h-11 text-[0.9375rem] font-semibold text-rec">
                Yanlış başlattım · yarışı sil
              </button>
            )}
          </div>
        )}
      </Sheet>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? raceTitle(edit) : ""}>
        {edit && (
          <StartForm
            s={edit}
            onSave={(x) => {
              const { fresh, ...rest } = x;
              save(renumber(fresh ? [...live.starts, rest] : live.starts.map((o) => (o.id === x.id ? rest : o))));
              setEdit(null);
            }}
            onDrop={
              edit.fresh
                ? null
                : () => {
                    const before = live.starts;
                    save(dropRace(live.starts, edit.id));
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
