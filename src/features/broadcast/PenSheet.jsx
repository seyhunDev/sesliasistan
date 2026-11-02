"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { PEN_CODES, PEN_NAME, penRows } from "@/lib/raceRounds";

const digits = (s) => String(s || "").replace(/\D/g, "");

// Ceza ve sonuç kodu elle (Seyhun 2026-11-02 "DNC, DNF, DSQ, DNE, UFD olanlar olacak; arayarak seçerek"): kayıt listesinden yelken no ya da
// adla aranır, önce startın grubu (günün grup listesi), "Tüm liste" ile herkes; tekneye dokununca kodlar, koda dokununca yazılır.
// Puanı grup sayısı + 1 (lib/roundScore.js). Listede olmayan numara da yazılabilir. Sesle: "DSQ 512", "512'nin cezası kalksın".
export function PenSheet({ open, onClose, title, entries = [], members = null, pen = {}, onSet }) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [pick, setPick] = useState("");
  const rows = penRows({ entries, members, all, q });
  const d = digits(q);
  // listede olmayan numara
  const extra = d && !rows.some((r) => digits(r.sail) === d) ? { sail: d, name: "", club: "" } : null;
  const who = Object.fromEntries(entries.map((r) => [r.sail, r]));
  const set = (sail, code) => {
    onSet(sail, code);
    setPick("");
    setQ("");
  };
  const codes = (sail) => (
    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
      {PEN_CODES.map((c) => (
        <button key={c} type="button" onClick={() => set(sail, c)} aria-pressed={pen[sail] === c} className={`rounded-lg px-2.5 py-1.5 text-left ${pen[sail] === c ? "bg-acc text-white" : "bg-chip"}`}>
          <b className="block text-[0.875rem]">{c}</b>
          <span className={`block text-[0.6875rem] font-semibold ${pen[sail] === c ? "text-white/80" : "text-mut"}`}>{PEN_NAME[c]}</span>
        </button>
      ))}
      {pen[sail] ? (
        <button type="button" onClick={() => set(sail, "")} className="rounded-lg bg-chip px-2.5 py-1.5 text-[0.875rem] font-bold text-rec">
          Kaldır
        </button>
      ) : null}
    </div>
  );
  const row = (r) => (
    <div key={r.sail} className="border-t border-line first:border-t-0">
      <button type="button" onClick={() => setPick(pick === r.sail ? "" : r.sail)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <b className="w-14 text-[0.9375rem] tabular-nums">{r.sail}</b>
        <span className="min-w-0 flex-1 truncate font-semibold">{r.name || "Listede yok"}</span>
        {pen[r.sail] ? <span className="rounded-md bg-acc px-1.5 py-0.5 text-[0.75rem] font-bold text-white">{pen[r.sail]}</span> : null}
      </button>
      {pick === r.sail ? codes(r.sail) : null}
    </div>
  );
  const penned = Object.keys(pen);
  return (
    <Sheet open={open} onClose={() => (setPick(""), setQ(""), onClose())} title={title || "Ceza ve sonuç kodu"}>
      <div className="flex flex-col gap-3">
        {penned.length ? (
          <div className="flex flex-wrap gap-1.5">
            {penned.map((s) => (
              <button key={s} type="button" onClick={() => setPick(pick === s ? "" : s)} className="rounded-lg bg-chip px-2.5 py-1.5 text-[0.8125rem] font-bold tabular-nums">
                {`${s} · ${pen[s]}`}
              </button>
            ))}
          </div>
        ) : null}
        {pick && penned.includes(pick) && !rows.some((r) => r.sail === pick) ? (
          <div className="rounded-xl bg-card">
            {row(who[pick] || { sail: pick, name: "" })}
          </div>
        ) : null}
        <div className="flex gap-2">
          <input value={q} onChange={(e) => (setQ(e.target.value), setPick(""))} inputMode="search" placeholder="Yelken no ya da ad" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2.5 text-[1rem]" />
          {members ? (
            <button type="button" onClick={() => setAll((v) => !v)} aria-pressed={all} className={`rounded-xl px-3 text-[0.8125rem] font-bold ${all ? "bg-acc text-white" : "bg-chip"}`}>
              Tüm liste
            </button>
          ) : null}
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-xl bg-card">
          {extra ? row(extra) : null}
          {rows.slice(0, 60).map(row)}
          {!rows.length && !extra ? <p className="px-4 py-3 text-[0.875rem] text-mut">{entries.length ? "Bulunamadı" : "Kayıt listesi boş. Yelken numarasını yaz."}</p> : null}
        </div>
      </div>
    </Sheet>
  );
}
