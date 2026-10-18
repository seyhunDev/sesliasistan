"use client";

import { dayOf, raceTitle, startsOn } from "@/lib/raceLive";

// Çekimin yarışı ve anı (sonradan düzeltme, MediaViewer "Düzelt"): yarış tek dokunuşla açılan seçici (iPhone çarkı),
// an dört parçalı düğme (Öncesi · Son 1 dk · Sırasında · Sonrası). Görüntüleyicide koyu zemin üstünde durur.
const ORDER = ["pre", "last", "race", "after"];
const SHORT = { pre: "Öncesi", last: "Son 1 dk", race: "Sırasında", after: "Sonrası" };

export function MomentPicker({ at, mom, starts, onChange }) {
  const list = startsOn(starts, dayOf(at));
  const pickRace = (id) => {
    const s = list.find((x) => x.id === id);
    onChange(s ? { rid: s.id, phase: mom?.rid === s.id ? mom.phase : "race", sec: Math.round((Date.parse(at) - Date.parse(s.at)) / 1000), end: s.at } : null);
  };
  return (
    <div>
      <select value={mom?.rid || ""} onChange={(e) => pickRace(e.target.value)} aria-label="Yarış" className="h-9 max-w-full appearance-none truncate rounded-lg bg-white/15 px-3 text-[0.9375rem] font-semibold text-white">
        {list.map((s) => (
          <option key={s.id} value={s.id}>
            {raceTitle(s)}
          </option>
        ))}
        <option value="">Yarışsız</option>
      </select>
      {mom && (
        <div role="radiogroup" aria-label="An" className="mt-2 grid grid-cols-4 gap-0.5 rounded-lg bg-white/15 p-0.5">
          {ORDER.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={mom.phase === p}
              onClick={() => onChange({ ...mom, phase: p })}
              className={`h-8 truncate rounded-md px-0.5 text-[0.8125rem] font-semibold ${mom.phase === p ? "bg-white text-black" : "text-white/80"}`}
            >
              {SHORT[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
