"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { dayOf, momentRaceName, momentText, raceTitle, startsOn } from "@/lib/raceLive";
import { MediaViewer } from "./MediaViewer";
import { Thumb } from "./Thumb";

// Kaydetmeden önce gözden geçir (Seyhun 2026-10-18: "kullanıcı yüklemeden önce değişiklik yapabilsin"): kameradan dönünce çekilenler
// burada; her biri çekildiği ana göre yarışına ve evresine konmuş gelir. Çoğu zaman değişmez, o yüzden satır sade (Seyhun: "çok dağınık,
// çok yer kaplıyor"): yarış tek dokunuşla açılan seçici, evre dört parçalı düğme. "Kaydet" yükler; liste yükleme bitene kadar açık
// kalır, her çekimde durum (yükleniyor, ✓, !) ve yüklenemezse sebebi görünür. Kapatılırsa çekimler telefonda bekler.
// Küçük resme dokununca tam ekran ön izleme (MediaViewer); videoda süre görünür, saat yok.
const ORDER = ["pre", "last", "race", "after"];
const SHORT = { pre: "Öncesi", last: "Son 1 dk", race: "Sırasında", after: "Sonrası" };

export function ReviewSheet({ open, items, starts, saving, err, onMom, onDrop, onSave, onClose }) {
  const failed = items.some((r) => r.st === "err");
  const [view, setView] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title={`Kaydetmeden önce · ${items.length}`}>
      {open && (
        <div className="pb-2">
          {err && <p className="mb-2 rounded-xl bg-rec/10 px-3 py-2 text-[0.875rem] font-semibold text-rec">Kaydedilemedi: {err}</p>}
          <ul className="divide-y divide-line">
            {items.map((r) => (
              <Row key={r.id} r={r} starts={starts} lock={saving} onMom={onMom} onDrop={onDrop} onView={() => setView(r.id)} />
            ))}
          </ul>
          <button type="button" disabled={!items.length || saving} onClick={onSave} className="mt-4 h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px disabled:opacity-50">
            {saving ? "Kaydediliyor…" : `${failed ? "Tekrar dene" : "Kaydet"} · ${items.length}`}
          </button>
        </div>
      )}
      {open && <Preview items={items} id={view} starts={starts} onPick={setView} onClose={() => setView("")} onDrop={(id) => (onDrop(id), setView(""))} />}
    </Sheet>
  );
}

// Ön izleme: yalnız gösterilen çekimin adresi açılır, değişince ya da kapanınca bırakılır
function Preview({ items, id, starts, onPick, onClose, onDrop }) {
  const r = items.find((x) => x.id === id);
  const url = useMemo(() => (r ? URL.createObjectURL(r.blob) : ""), [r?.blob]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  if (!r) return null;
  const list = items.map((x) => ({ id: x.id, kind: x.kind, at: x.at, ath: [], url: x.id === id ? url : "", mom: x.mom }));
  return (
    <MediaViewer
      items={list}
      id={id}
      onPick={onPick}
      onClose={onClose}
      label={(m) => (m.mom ? `${momentRaceName(m.mom, starts)} · ${momentText(m.mom)}` : "Yarışsız")}
      onDrop={(m) => onDrop(m.id)}
    />
  );
}

function Row({ r, starts, lock, onMom, onDrop, onView }) {
  const url = useMemo(() => URL.createObjectURL(r.blob), [r.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const list = startsOn(starts, dayOf(r.at));
  const m = r.mom;
  const pickRace = (id) => {
    const s = list.find((x) => x.id === id);
    onMom(r.id, s ? { rid: s.id, phase: m?.rid === s.id ? m.phase : "race", sec: Math.round((Date.parse(r.at) - Date.parse(s.at)) / 1000), end: s.at } : null);
  };
  return (
    <li className="flex items-center gap-3 py-2.5">
      <button type="button" onClick={onView} aria-label="Ön izleme" className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-line active:opacity-80">
        <Thumb kind={r.kind} url={url} dur={r.dur} />
        {r.st === "up" && (
          <span className="absolute inset-0 grid place-items-center bg-black/40">
            <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </span>
        )}
        {r.st === "err" && <span className="absolute inset-0 grid place-items-center bg-black/45 text-[1.25rem] font-bold text-white">!</span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <select
            value={m?.rid || ""}
            disabled={lock}
            onChange={(e) => pickRace(e.target.value)}
            aria-label="Yarış"
            className="h-8 min-w-0 max-w-[60%] appearance-none truncate rounded-lg bg-bg px-2.5 text-[0.875rem] font-semibold ring-1 ring-line"
          >
            {list.map((s) => (
              <option key={s.id} value={s.id}>
                {raceTitle(s)}
              </option>
            ))}
            <option value="">Yarışsız</option>
          </select>
          <span className="flex-1" />
          <button type="button" disabled={lock} onClick={() => onDrop(r.id)} className="h-8 px-1 text-[0.8125rem] font-semibold text-rec disabled:opacity-40">
            Sil
          </button>
        </div>
        {m && (
          <div role="radiogroup" aria-label="An" className="mt-1.5 grid grid-cols-4 gap-0.5 rounded-lg bg-bg p-0.5 ring-1 ring-line">
            {ORDER.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={m.phase === p}
                disabled={lock}
                onClick={() => onMom(r.id, { ...m, phase: p })}
                className={`h-7 truncate rounded-md px-0.5 text-[0.75rem] font-semibold ${m.phase === p ? "bg-card text-fg shadow-sm ring-1 ring-line" : "text-mut"}`}
              >
                {SHORT[p]}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
