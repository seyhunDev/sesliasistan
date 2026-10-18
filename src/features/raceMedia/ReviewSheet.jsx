"use client";

import { useEffect, useMemo } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { dayOf, hm, raceName, startsOn } from "@/lib/raceLive";

// Kaydetmeden önce gözden geçir (Seyhun 2026-10-18: "kullanıcı yüklemeden önce değişiklik yapabilsin"): kameradan dönünce çekilenler
// burada; her biri çekildiği ana göre yarışına ve evresine (Start öncesi, Son 1 dakika, Yarış sırasında, Yarış sonrası) konmuş gelir,
// dokunarak değiştirilir ya da silinir. "Kaydet" hepsini yükler (fotoğrafa seçilen yarış ve an basılır). Kapatılırsa telefonda bekler.
const ORDER = ["pre", "last", "race", "after"];
const SHORT = { pre: "Öncesi", last: "Son 1 dk", race: "Sırasında", after: "Sonrası" };

export function ReviewSheet({ open, items, starts, onMom, onDrop, onSave, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title={`Kaydetmeden önce · ${items.length}`}>
      {open && (
        <div className="pb-2">
          <ul className="divide-y divide-line">
            {items.map((r) => (
              <Row key={r.id} r={r} starts={starts} onMom={onMom} onDrop={onDrop} />
            ))}
          </ul>
          <button type="button" disabled={!items.length} onClick={onSave} className="mt-4 h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px disabled:opacity-50">
            Kaydet · {items.length}
          </button>
        </div>
      )}
    </Sheet>
  );
}

function Row({ r, starts, onMom, onDrop }) {
  const url = useMemo(() => URL.createObjectURL(r.blob), [r.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const list = startsOn(starts, dayOf(r.at));
  const m = r.mom;
  const pickRace = (s) =>
    onMom(r.id, s ? { rid: s.id, phase: m?.rid === s.id ? m.phase : "race", sec: Math.round((Date.parse(r.at) - Date.parse(s.at)) / 1000), end: s.at } : null);
  const chip = (on) => `h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${on ? "bg-acc text-white" : "bg-bg ring-1 ring-line"}`;
  return (
    <li className="flex gap-3 py-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-line">
        {r.kind === "video" ? (
          <video src={`${url}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt="" className="size-full object-cover" />
        )}
        <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[0.6875rem] font-semibold text-white">{hm(r.at)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {list.map((s) => (
            <button key={s.id} type="button" onClick={() => pickRace(s)} className={chip(m?.rid === s.id)}>
              {raceName(s)}
            </button>
          ))}
          <button type="button" onClick={() => pickRace(null)} className={chip(!m)}>
            Yarışsız
          </button>
        </div>
        {m && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ORDER.map((p) => (
              <button key={p} type="button" onClick={() => onMom(r.id, { ...m, phase: p })} className={chip(m.phase === p)}>
                {SHORT[p]}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => onDrop(r.id)} className="mt-1.5 text-[0.8125rem] font-semibold text-rec">
          Sil
        </button>
      </div>
    </li>
  );
}
