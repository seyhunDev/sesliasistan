"use client";

import { useEffect, useRef, useState } from "react";
import { card } from "@/components/ui/Page";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { findOurs, raceYear, withCats } from "@/lib/resultSheet";
import { sheetFilters, sheetRows, sheetTag } from "@/lib/raceLive";
import { loadSheets } from "@/features/athletes/raceLiveStore";
import { importResults, importToast } from "@/features/athletes/resultsImport";
import { saveRaceResults } from "@/features/athletes/races";
import { Bar } from "@/features/training/Countdown";

// Sonuçlar (Seyhun 2026-10-28 onayı): tek sıra süzgeç: Bizimkiler · Genel · Junior · Kızlar · Junior Kızlar (sınıf birden çoksa üstte sınıf seçimi).
// Bizimkiler: her sporcu kendi kartında; solda büyük genel sıra, yanında ad, sınıf, kategori, doğum yılı; altında Junior / Kızlar /
// Junior Kızlar sıraları ayrı kutularda (ilk 3 vurgu renginde), yazı kesilmez. Genel: sonuç PDF'inden bütün liste (sıra, ad, işaret
// "Junior kız" / "Junior" / "Kız", kulüp, doğum yılı, net puan; bizimkiler açık mavi satır; ilk 10, sonra Tümü).
// Sonuç yüklüyse en altta küçük "Değiştir"; yoksa büyük "Sonuç PDF'i yükle". Yükleme yarış sayfasındakiyle aynı akış (resultsImport.js).
const TOP = 10;
// Satırdaki işaret: Genel'de "Junior kız", "Junior", "Kız"; Kızlar'da yalnız kategori; diğer süzgeçlerde yok
const tagOf = (r, filter) => (filter === "all" ? sheetTag(r) : filter === "girls" && ["Junior", "Bambino"].includes(r.cat) ? r.cat : "");
const SUB = ["Junior", "Bambino"];
const shortDay = (s) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

// Sporcunun ek sıraları: kategori, kızlar, kategori kızları
const boxesOf = (x) =>
  [
    x?.cp && SUB.includes(x.cat) && [x.cat, x.cp, x.cn],
    x?.gp && ["Kızlar", x.gp, x.gn],
    x?.jp && SUB.includes(x.cat) && [`${x.cat} Kızlar`, x.jp, x.jn],
  ].filter(Boolean);

function OurCard({ a, x, born }) {
  const boxes = boxesOf(x);
  const sub = [x?.cls, SUB.includes(x?.cat) ? x.cat : "", born].filter(Boolean).join(" · ");
  return (
    <li className={`${card} p-3.5`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-[3.625rem] shrink-0 flex-col items-center justify-center rounded-2xl ${x?.place ? "bg-accbg text-acc" : "bg-bg text-mut"}`}>
          <b className="text-[1.5rem] font-bold leading-none tabular-nums">{x?.place || "–"}</b>
          {x?.place && x.n ? <small className="mt-1 text-[0.6875rem] font-semibold">genel / {x.n}</small> : null}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[1rem] font-bold leading-snug">{a.studentName}</b>
          <span className="block text-[0.8125rem] leading-snug text-mut">{x?.place ? sub || "Genel sıra" : x?.note || "Sonuç yok"}</span>
        </span>
      </div>
      {boxes.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {boxes.map(([l, p, n]) => (
            <span key={l} className="rounded-xl bg-bg px-2.5 py-2">
              <small className="block text-[0.71875rem] font-semibold text-mut">{l}</small>
              <b className={`text-[1rem] font-bold tabular-nums ${p <= 3 ? "text-acc" : ""}`}>
                {p}.{n ? <span className="text-[0.78rem] font-medium text-mut"> / {n}</span> : null}
              </b>
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

export function ResultsTab({ orgId, race, ours, club, onRace }) {
  const toast = useToast();
  const pick = useRef(null);
  const [view, setView] = useState(ours.length ? "ours" : "all"); // ours | all | Junior | girls | Junior-girls …
  const [sheets, setSheets] = useState(null);
  const [fi, setFi] = useState(0);
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
      setView(ours.length ? "ours" : "all");
      toast(importToast(got));
    } catch (e) {
      toast(e?.message || "Sonuçlar okunamadı");
    }
    setBusy(false);
  };

  // Yaş kategorileri (ILCA 4 Junior) doğum yılından; daha önce yüklenen listelerde de
  const fleets = withCats(sheets?.length ? sheets[sheets.length - 1].fleets || [] : [], raceYear(race));
  const fleet = fleets[Math.min(fi, fleets.length - 1)];
  const filter = view === "ours" ? "all" : view;
  const rows = sheetRows(fleet, filter);
  const pool = [...ours, ...club.filter((a) => !ours.some((o) => o.id === a.id))];
  const found = findOurs(fleets, pool);
  const hit = new Set(Object.values(found).filter((x) => fleets[x.fi] === fleet).map((x) => x.ri));
  const res = race.results || {};
  // Bizimkiler: sınıf birden çoksa seçili sınıftakiler; sonucu olmayanlar en sonda
  const mine = ours.filter((a) => fleets.length < 2 || !res.rows?.[a.id]?.cls || res.rows[a.id].cls === fleet?.cls);
  const sorted = [...mine].sort((a, b) => (res.rows?.[a.id]?.place || 999) - (res.rows?.[b.id]?.place || 999));
  const bornOf = (id) => {
    const f = found[id];
    return f ? fleets[f.fi]?.rows[f.ri]?.born || "" : "";
  };
  const lastFile = (res.files || []).at(-1);
  const loaded = !!fleet || !!lastFile;
  const chip = (on) => `h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${on ? "bg-acc text-white" : "bg-card ring-1 ring-line"}`;
  const filters = [["ours", `Bizimkiler · ${mine.length}`], ...(fleet ? sheetFilters(fleet) : [["all", "Genel"]])];

  return (
    <>
      {fleets.length > 1 && (
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {fleets.map((f, i) => (
            <button
              key={f.cls + i}
              type="button"
              onClick={() => (setFi(i), setView((v) => (v === "ours" ? v : "all")), setMore(false))}
              aria-pressed={fleet === f}
              className={`h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${fleet === f ? "bg-deep text-white" : "ring-1 ring-line"}`}
            >
              {f.cls} · {f.rows.length}
            </button>
          ))}
        </div>
      )}
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
        {filters.map(([k, l]) => (
          <button key={k} type="button" onClick={() => (setView(k), setMore(false))} aria-pressed={view === k} className={chip(view === k)}>
            {l}
          </button>
        ))}
      </div>

      {view === "ours" ? (
        <ul className="mt-3 space-y-2.5">
          {!sorted.length && <li className={`${card} px-4 py-6 text-center text-[0.875rem] text-mut`}>Yarışta sporcu seçilmedi.</li>}
          {sorted.map((a) => (
            <OurCard key={a.id} a={a} x={res.rows?.[a.id]} born={bornOf(a.id)} />
          ))}
        </ul>
      ) : !sheets ? (
        <Loading label="Sonuçlar yükleniyor" className="py-8" />
      ) : !fleet ? (
        <p className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>{res.files?.length ? "Genel sıralama için sonuç PDF'ini yeniden yükle." : "Sonuç PDF'i yüklenmedi."}</p>
      ) : (
        <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
          {(more ? rows : rows.slice(0, TOP)).map((r) => (
            <li key={r.i} className={`flex items-center gap-3 px-4 py-2.5 ${hit.has(r.i) ? "bg-accbg" : ""}`}>
              <span className="w-7 shrink-0 text-[0.9375rem] font-bold tabular-nums text-fg2">{r.pos}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{r.name}</b>
                <span className="block truncate text-[0.8125rem] text-mut">
                  {tagOf(r, filter) && <b className="font-semibold text-acc">{tagOf(r, filter)} · </b>}
                  {[r.club, r.born, filter !== "all" ? `genel ${r.rank}.` : ""].filter(Boolean).join(" · ")}
                </span>
              </span>
              {r.pts !== "" && r.pts != null && <span className="shrink-0 text-[0.875rem] text-fg2 tabular-nums">{String(r.pts).replace(".", ",")} p</span>}
            </li>
          ))}
          {!more && rows.length > TOP && (
            <li>
              <button type="button" onClick={() => setMore(true)} data-press className="btn btn-text btn-sm w-full text-acc">
                Tümünü göster · {rows.length}
              </button>
            </li>
          )}
        </ul>
      )}

      <input ref={pick} type="file" accept="application/pdf,image/*,.pdf" className="hidden" onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
      {loaded ? (
        <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[0.8125rem] text-mut">
          <span className="truncate">{"Sonuç PDF'i"}{lastFile?.at ? ` · ${shortDay(lastFile.at)}` : ""}</span>
          <button type="button" disabled={busy} onClick={() => pick.current?.click()} className="shrink-0 py-2 font-semibold text-acc active:opacity-70">
            {busy ? "Okunuyor…" : "Değiştir"}
          </button>
        </div>
      ) : (
        <Bar>
          <button type="button" disabled={busy} onClick={() => pick.current?.click()} data-press className="btn btn-primary h-14 w-full">
            {busy ? "Sonuçlar okunuyor…" : "Sonuç PDF'i yükle"}
          </button>
        </Bar>
      )}
    </>
  );
}
