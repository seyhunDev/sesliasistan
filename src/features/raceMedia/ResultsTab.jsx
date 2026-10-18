"use client";

import { useEffect, useRef, useState } from "react";
import { card } from "@/components/ui/Page";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { findOurs, resultLine } from "@/lib/resultSheet";
import { sheetFilters, sheetRows } from "@/lib/raceLive";
import { loadSheets } from "@/features/athletes/raceLiveStore";
import { importResults, importToast } from "@/features/athletes/resultsImport";
import { saveRaceResults } from "@/features/athletes/races";
import { Bar } from "@/features/training/Countdown";

// Sonuçlar: Genel (sonuç PDF'inden bütün liste: sıra, ad, kulüp, doğum yılı, net puan; bizimkiler yeşil satır; ilk 10, sonra Tümü)
// ve Bizimkiler (yarıştaki sporcular, sırasıyla). Sınıf birden çoksa sınıf seçilir; Genel · Junior · Bambino · Kızlar süzgeci.
// PDF yükleme yarış sayfasındakiyle aynı akış (resultsImport.js); yarış sayfasından yüklenenler de burada görünür.
const TOP = 10;

export function ResultsTab({ orgId, race, ours, club, onRace }) {
  const toast = useToast();
  const pick = useRef(null);
  const [view, setView] = useState("all"); // all | ours
  const [sheets, setSheets] = useState(null);
  const [fi, setFi] = useState(0);
  const [filter, setFilter] = useState("all");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let on = true;
    loadSheets(orgId, race.id).then(
      (l) => on && setSheets(l),
      () => on && setSheets([]),
    );
    return () => {
      on = false;
    };
  }, [orgId, race.id]);

  const upload = async (file) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const got = await importResults({ orgId, race, athletes: ours, club, file });
      await saveRaceResults(orgId, race.id, got.results, got.extra);
      onRace({ ...race, results: got.results, athleteIds: [...new Set([...race.athleteIds, ...got.extra])] });
      setSheets(await loadSheets(orgId, race.id).catch(() => sheets));
      setFi(0);
      setFilter("all");
      toast(importToast(got));
    } catch (e) {
      toast(e?.message || "Sonuçlar okunamadı");
    }
    setBusy(false);
  };

  const fleets = sheets?.length ? sheets[sheets.length - 1].fleets || [] : [];
  const fleet = fleets[Math.min(fi, fleets.length - 1)];
  const rows = sheetRows(fleet, filter);
  const hit = new Set(Object.values(findOurs(fleets, [...ours, ...club.filter((a) => !ours.some((o) => o.id === a.id))])).filter((x) => fleets[x.fi] === fleet).map((x) => x.ri));
  const res = race.results || {};
  const sorted = [...ours].sort((a, b) => (res.rows?.[a.id]?.place || 999) - (res.rows?.[b.id]?.place || 999));
  const chip = (on) => `h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${on ? "bg-acc text-white" : "bg-card ring-1 ring-line"}`;

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[["all", `Genel${fleet ? ` · ${fleet.rows.length}` : ""}`], ["ours", `Bizimkiler · ${ours.length}`]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setView(k)} aria-pressed={view === k} className={`h-10 rounded-xl text-[0.875rem] font-semibold ${view === k ? "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.1)] ring-1 ring-line" : "text-mut ring-1 ring-line"}`}>
            {l}
          </button>
        ))}
      </div>

      {view === "all" &&
        (!sheets ? (
          <Loading label="Sonuçlar yükleniyor" className="py-8" />
        ) : !fleet ? (
          <p className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>{res.files?.length ? "Genel sıralama için sonuç PDF'ini yeniden yükle." : "Sonuç PDF'i yüklenmedi."}</p>
        ) : (
          <>
            {fleets.length > 1 && (
              <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
                {fleets.map((f, i) => (
                  <button key={f.cls + i} type="button" onClick={() => (setFi(i), setFilter("all"), setMore(false))} className={chip(fleet === f)}>{f.cls}</button>
                ))}
              </div>
            )}
            {sheetFilters(fleet).length > 1 && (
              <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
                {sheetFilters(fleet).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => (setFilter(k), setMore(false))} className={chip(filter === k)}>{l}</button>
                ))}
              </div>
            )}
            <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
              {(more ? rows : rows.slice(0, TOP)).map((r) => (
                <li key={r.i} className={`flex items-center gap-3 px-4 py-2.5 ${hit.has(r.i) ? "bg-accbg" : ""}`}>
                  <span className="w-7 shrink-0 text-[0.9375rem] font-semibold tabular-nums text-fg2">{r.pos}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{r.name}</b>
                    <span className="block truncate text-[0.8125rem] text-mut">{[r.club, r.born, filter !== "all" ? `genel ${r.rank}.` : ""].filter(Boolean).join(" · ")}</span>
                  </span>
                  {r.pts !== "" && r.pts != null && <span className="shrink-0 text-[0.875rem] text-fg2 tabular-nums">{String(r.pts).replace(".", ",")} p</span>}
                </li>
              ))}
              {!more && rows.length > TOP && (
                <li>
                  <button type="button" onClick={() => setMore(true)} className="w-full py-3 text-center text-[0.9375rem] font-semibold text-acc">
                    Tümünü göster · {rows.length}
                  </button>
                </li>
              )}
            </ul>
          </>
        ))}

      {view === "ours" && (
        <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
          {!sorted.length && <li className="px-4 py-6 text-center text-[0.875rem] text-mut">Yarışta sporcu seçilmedi.</li>}
          {sorted.map((a) => {
            const x = res.rows?.[a.id];
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`w-9 shrink-0 text-[1rem] font-semibold tabular-nums ${x?.place ? "text-acc" : "text-mut"}`}>{x?.place ? `${x.place}.` : "–"}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{a.studentName}</b>
                  <span className="block truncate text-[0.8125rem] text-mut">{x?.cls ? resultLine(x) : x?.note || "Sonuç yok"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <input ref={pick} type="file" accept="application/pdf,image/*,.pdf" className="hidden" onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
      <Bar>
        <button type="button" disabled={busy} onClick={() => pick.current?.click()} className="h-14 w-full rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px disabled:opacity-60">
          {busy ? "Sonuçlar okunuyor…" : fleet ? "Yeni sonuç PDF'i" : "Sonuç PDF'i yükle"}
        </button>
      </Bar>
    </>
  );
}
