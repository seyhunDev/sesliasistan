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

// Sonuçlar (Seyhun 2026-10-28 onayı, "tek liste"): tek sıra süzgeç: Bizimkiler · Genel · Junior · Kızlar · Junior Kızlar (sınıf birden
// çoksa üstte sınıf seçimi). Bizimkiler ve Genel aynı kartta, aynı satır biçiminde: başlıkta "ILCA 4 · 42 kişi" + "Net puan"; satırda solda
// sıra, ad, altında işaret ("Junior kız" / "Junior" / "Kız") · kulüp · doğum yılı (yıl hiç kesilmez, yalnız kulüp kısalır), sağda net puan.
// Bizimkiler'de adın altında Junior / Kızlar / Junior Kızlar sıraları küçük etiketler (ilk 3 vurgu renginde); Genel'de bizimkiler açık mavi
// satır, ilk 10, sonra Tümü. Sonuç yüklüyse en altta küçük "Değiştir"; yoksa büyük "Sonuç PDF'i yükle" (resultsImport.js akışı).
const TOP = 10;
// Satırdaki işaret: Genel'de "Junior kız", "Junior", "Kız"; Kızlar'da yalnız kategori; diğer süzgeçlerde yok
const tagOf = (r, filter) => (filter === "all" ? sheetTag(r) : filter === "girls" && ["Junior", "Bambino"].includes(r.cat) ? r.cat : "");
const SUB = ["Junior", "Bambino"];
const shortDay = (s) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const ptsOf = (p) => (p === "" || p == null ? "" : `${String(p).replace(".", ",")} p`);

// Sporcunun ek sıraları: kategori, kızlar, kategori kızları
const boxesOf = (x) =>
  [
    x?.cp && SUB.includes(x.cat) && [x.cat, x.cp, x.cn],
    x?.gp && ["Kızlar", x.gp, x.gn],
    x?.jp && SUB.includes(x.cat) && [`${x.cat} Kızlar`, x.jp, x.jn],
  ].filter(Boolean);

// Ortak satır: sıra · ad / işaret · kulüp · yıl · puan
function Row({ pos, name, tag, club, born, pts, on, hi, children }) {
  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${on ? "bg-accbg" : ""}`}>
      <span className={`w-7 shrink-0 text-center text-[1.0625rem] font-bold tabular-nums ${on || hi ? "text-acc" : ""}`}>{pos || "–"}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{name}</b>
        <span className="flex gap-1 text-[0.8125rem] text-mut">
          <span className="min-w-0 truncate">
            {tag && <b className="font-semibold text-acc">{tag}</b>}
            {tag && club ? " · " : ""}
            {club}
          </span>
          {born && <span className="shrink-0">{tag || club ? "· " : ""}{born}</span>}
        </span>
        {children}
      </span>
      {pts && <span className="shrink-0 text-[0.875rem] tabular-nums text-fg2">{pts}</span>}
    </li>
  );
}

function Head({ left, pts }) {
  return (
    <li className="flex justify-between gap-3 px-4 pb-2 pt-2.5 text-[0.75rem] font-semibold text-mut">
      <span className="truncate">{left}</span>
      {pts && <span className="shrink-0">Net puan</span>}
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
  const rowOf = (id) => {
    const f = found[id];
    return f ? fleets[f.fi]?.rows[f.ri] : null;
  };
  const firstX = sorted.map((a) => res.rows?.[a.id]).find((x) => x?.place);
  const oursCls = fleet?.cls || firstX?.cls || "";
  const oursN = fleet?.rows.length || firstX?.n || 0;
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
        <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
          {sorted.length > 0 && <Head left={[oursCls, oursN ? `${oursN} kişi` : ""].filter(Boolean).join(" · ") || "Bizimkiler"} pts={sorted.some((a) => ptsOf(rowOf(a.id)?.pts))} />}
          {!sorted.length && <li className="px-4 py-6 text-center text-[0.875rem] text-mut">Yarışta sporcu seçilmedi.</li>}
          {sorted.map((a) => {
            const x = res.rows?.[a.id];
            const r = rowOf(a.id);
            const boxes = boxesOf(x);
            return (
              <Row
                key={a.id}
                pos={x?.place}
                hi={x?.place > 0 && x.place <= 3}
                name={a.studentName}
                tag={x?.place ? (r ? sheetTag(r) : SUB.includes(x?.cat) ? x.cat : "") : ""}
                club={x?.place ? r?.club || "" : x?.note || "Sonuç yok"}
                born={x?.place ? r?.born || "" : ""}
                pts={x?.place ? ptsOf(r?.pts) : ""}
              >
                {boxes.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {boxes.map(([l, p, n]) => (
                      <span key={l} className="whitespace-nowrap rounded-lg bg-bg px-2 py-0.5 text-[0.75rem] font-semibold text-fg2">
                        {l} <b className={p <= 3 ? "text-acc" : "text-fg"}>{p}.</b>
                        {n ? ` / ${n}` : ""}
                      </span>
                    ))}
                  </span>
                )}
              </Row>
            );
          })}
        </ul>
      ) : !sheets ? (
        <Loading label="Sonuçlar yükleniyor" className="py-8" />
      ) : !fleet ? (
        <p className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>{res.files?.length ? "Genel sıralama için sonuç PDF'ini yeniden yükle." : "Sonuç PDF'i yüklenmedi."}</p>
      ) : (
        <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
          <Head left={[fleet.cls, filter !== "all" ? filters.find(([k]) => k === view)?.[1] : "", `${rows.length} kişi`].filter(Boolean).join(" · ")} pts={rows.some((r) => ptsOf(r.pts))} />
          {(more ? rows : rows.slice(0, TOP)).map((r) => (
            <Row
              key={r.i}
              pos={r.pos}
              name={r.name}
              tag={tagOf(r, filter)}
              club={[r.club, filter !== "all" ? `Genel ${r.rank}.` : ""].filter(Boolean).join(" · ")}
              born={r.born}
              pts={ptsOf(r.pts)}
              on={hit.has(r.i)}
            />
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
