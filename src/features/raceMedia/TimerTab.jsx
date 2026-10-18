"use client";

import { useState } from "react";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Countdown } from "@/features/training/Countdown";
import { saveStarts } from "@/features/athletes/raceLiveStore";
import { COURSES, FLAGS, atOf, dirShort, hm, newStart, renumber, startsOn } from "@/lib/raceLive";

// Süre: start sayacı (Countdown, yarış dizisi: 5 dk açılır; başlatınca, 4:00 ve 1:00 kala, son 10 sn her saniye, 0'da uzun bip).
// Sayacı ve biplerini sayfa yürütür (RaceMedia, sekmeler arasında da sürer); 0 olunca o günün sıradaki yarışı start saati
// ve o anki rüzgârla (son elle kayıt) kendiliğinden yazılır.
// Yarışa dokununca saat, parkur, bayrak (ertelendi, geri çağırma, iptal) ve not yazılır; "Yarış ekle" elle ekler.
const PRESETS = [60, 120, 300];

export function TimerTab({ orgId, race, day, live, onChange }) {
  const [edit, setEdit] = useState(null); // düzenlenen start
  const list = startsOn(live.starts, day);
  const save = (next) => onChange({ starts: next }, () => saveStarts(orgId, race.id, next));
  const add = () => {
    const now = new Date();
    const s = newStart(live.starts, atOf(day, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`), live.wind);
    if (s) setEdit({ ...s, fresh: true });
  };

  return (
    <>
      <Countdown mode="start" presets={PRESETS} run={false} />
      <Label right={list.length || ""}>Bugün</Label>
      <ul className={`${card} divide-y divide-line overflow-hidden`}>
        {list.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => setEdit(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-semibold">{s.n}. yarış</b>
                {(s.course || s.flag || s.note) && <span className="block truncate text-[0.8125rem] text-mut">{[s.course, s.flag, s.note].filter(Boolean).join(" · ")}</span>}
              </span>
              <span className="shrink-0 text-[0.875rem] text-mut tabular-nums">{[hm(s.at), s.kn != null && s.dir != null ? `${dirShort(s.dir)} ${s.kn} kn` : ""].filter(Boolean).join(" · ")}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" onClick={add} className="w-full px-4 py-3 text-left text-[0.9375rem] font-semibold text-acc active:bg-bg">
            Yarış ekle
          </button>
        </li>
      </ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.n}. yarış` : ""}>
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
                    if (!confirm(`${edit.n}. yarış silinsin mi?`)) return;
                    save(renumber(live.starts.filter((o) => o.id !== edit.id)));
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
  const [x, setX] = useState({ ...s, time: hm(s.at) });
  const put = (k) => (v) => setX((o) => ({ ...o, [k]: o[k] === v ? "" : v }));
  const chip = (on) => `h-9 rounded-full px-3.5 text-[0.875rem] font-medium active:scale-95 ${on ? "bg-acc text-white" : "bg-bg"}`;
  return (
    <div className="pb-2">
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
      <p className="mb-2 mt-4 text-[0.875rem] font-semibold text-fg2">Bayrak</p>
      <div className="flex flex-wrap gap-2">
        {FLAGS.map((c) => (
          <button key={c} type="button" onClick={() => put("flag")(c)} className={chip(x.flag === c)}>{c}</button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[0.875rem] font-semibold text-fg2">Not</p>
      <textarea value={x.note} onChange={(e) => setX((o) => ({ ...o, note: e.target.value }))} rows={2} className="w-full rounded-xl bg-bg px-3 py-2.5 text-[0.9375rem] outline-none focus:ring-1 focus:ring-acc" />
      <button type="button" onClick={() => onSave({ ...x, at: atOf(x.day, x.time), time: undefined })} className="mt-4 h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px">
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
