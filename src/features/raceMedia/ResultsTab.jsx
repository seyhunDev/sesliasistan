"use client";

import { useEffect, useRef, useState } from "react";
import { card } from "@/components/ui/Page";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { bornYear, findOurs, followKey, raceYear, sheetMatch, withCats } from "@/lib/resultSheet";
import { sheetFilters, sheetRows, sheetTag } from "@/lib/raceLive";
import { fleetsOf } from "@/lib/sharedRace";
import { loadSheets } from "@/features/athletes/raceLiveStore";
import { importResults, importToast } from "@/features/athletes/resultsImport";
import { saveRaceFollow, saveRaceResults } from "@/features/athletes/races";
import { Bar } from "@/features/training/Countdown";

// Sonuçlar (Seyhun 2026-10-28 onayı, "tablo", örnek yaris-tasarim/sonuclar-tablo.png): süzgeçler Bizimkiler · Takip · Genel · Junior ·
// Kızlar · Junior Kızlar (sınıf birden çoksa üstte sınıf seçimi), altında arama (ad, yelken no, kulüp). Her liste aynı tablo:
// başlık "ILCA 4 · 42 kişi", sütunlar Sıra · Sporcu · Doğ. · Net (Genel/Takip'te sağda ☆). Sporcu hücresinde ad, altında işaret
// (Jun. kız / Junior / Kız) · yelken no · kulüp; hiçbir şey kesilmez, uzun kulüp alt satıra iner. Bizimkiler'de kulüp yok, yerine
// Junior / Kızlar / Junior Kızlar sıraları. ☆ ile genel listeden sporcu bu yarış için takibe alınır (race.follow, followKey), Takip'te görünür.
// Genel'de bizimkiler açık mavi, ilk 10, sonra Tümü. Üstte sınıf seçici (her yüklenen PDF kendi sınıfıyla; bizimkilerin sınıfı noktalı ve açılışta seçili; o sınıfta bizimkiler yoksa Bizimkiler düğmesi çıkmaz).
// Altta sınıf başına yükleme günü ve "Sonuç PDF'i ekle" (yeni sınıf eklenir, aynı sınıf güncellenir); hiç yoksa büyük "Sonuç PDF'i yükle" (resultsImport.js).
const TOP = 10;
// İşaret: Genel/Takip'te "Jun. kız", "Junior", "Kız"; Kızlar'da yalnız kategori; diğer süzgeçlerde yok
const short = (t) => t.replace(/^Junior kız$/, "Jun. kız").replace(/^Bambino kız$/, "Bam. kız");
const tagOf = (r, filter) => short(filter === "all" || filter === "follow" ? sheetTag(r) : filter === "girls" && ["Junior", "Bambino"].includes(r.cat) ? r.cat : "");
const SUB = ["Junior", "Bambino"];
const shortDay = (s) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const ptsOf = (p) => (p === "" || p == null ? "" : String(p).replace(".", ","));
const yearOf = (s) => String(bornYear(s) || "");

// Sporcunun ek sıraları: kategori, kızlar, kategori kızları
const boxesOf = (x) =>
  [
    x?.cp && SUB.includes(x.cat) && [x.cat, x.cp, x.cn],
    x?.gp && ["Kızlar", x.gp, x.gn],
    x?.jp && SUB.includes(x.cat) && [`${x.cat === "Junior" ? "Jun." : x.cat} Kızlar`, x.jp, x.jn],
  ].filter(Boolean);

// Tablo sütunları: Sıra · Sporcu · Doğ. · Net (· ☆)
const cols = (star) => `grid items-center gap-x-2 px-3.5 ${star ? "grid-cols-[2.25rem_1fr_2.75rem_2.5rem_1.75rem]" : "grid-cols-[2.25rem_1fr_2.75rem_2.5rem]"}`;

function Table({ title, count, star, children }) {
  return (
    <div className={`${card} mt-3 overflow-hidden`}>
      <div className="flex justify-between gap-3 px-3.5 pt-2.5 text-[0.8125rem] font-bold">
        <span className="truncate">{title}</span>
        <span className="shrink-0 font-semibold text-mut">{count}</span>
      </div>
      <div className={`${cols(star)} border-b border-line pb-1.5 pt-2 text-[0.6875rem] font-semibold text-mut`}>
        <span>Sıra</span>
        <span>Sporcu</span>
        <span className="text-center">Doğ.</span>
        <span className="text-right">Net</span>
        {star && <span />}
      </div>
      <ul className="divide-y divide-line">{children}</ul>
    </div>
  );
}

// Satır: sıra · ad / işaret · yelken no · kulüp (kesilmez) · doğum yılı · net (· ☆)
function Row({ pos, name, tag, sail, club, born, pts, on, hi, star, followed, onStar, children }) {
  return (
    <li className={`${cols(star)} py-2.5 ${on ? "bg-accbg" : ""}`}>
      <span className={`text-[0.9375rem] font-bold tabular-nums ${on || hi ? "text-acc" : ""}`}>{pos || "–"}</span>
      <span className="min-w-0">
        <b className="block break-words text-[0.9375rem] font-semibold leading-snug">{name}</b>
        {(tag || sail || club) && (
          <span className="mt-0.5 block text-[0.78rem] leading-snug text-mut">
            {tag && <b className="mr-1.5 rounded-md bg-accbg px-1.5 py-px text-[0.6875rem] font-bold text-acc">{tag}</b>}
            {[sail, club].filter(Boolean).join(" · ")}
          </span>
        )}
        {children}
      </span>
      <span className="text-center text-[0.8125rem] tabular-nums text-fg2">{born}</span>
      <span className="text-right text-[0.875rem] tabular-nums">{pts}</span>
      {star &&
        (onStar ? (
          <button type="button" onClick={onStar} aria-pressed={followed} aria-label={followed ? "Takibi bırak" : "Takip et"} className={`-my-2 py-2 text-center text-[1.125rem] leading-none active:scale-90 ${followed ? "text-acc" : "text-mut"}`}>
            {followed ? "★" : "☆"}
          </button>
        ) : (
          <span />
        ))}
    </li>
  );
}

export function ResultsTab({ orgId, race, ours, club, onRace }) {
  const toast = useToast();
  const pick = useRef(null);
  const [want, setView] = useState(ours.length ? "ours" : "all"); // ours | follow | all | Junior | girls | Junior-girls …
  const [sheets, setSheets] = useState(null);
  const [cls, setCls] = useState(""); // seçili sınıf; boşsa bizimkilerin sınıfı
  const [more, setMore] = useState(false);
  const [q, setQ] = useState("");
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
      setCls("");
      setView(ours.length ? "ours" : "all");
      toast(importToast(got));
    } catch (e) {
      toast(e?.message || "Sonuçlar okunamadı");
    }
    setBusy(false);
  };

  // Her sınıfın son yüklenen listesi (birden çok PDF: Optimist, ILCA 4, ILCA 6 …; aynı sınıf yeniden yüklenirse yenisi; sharedRace.fleetsOf).
  // Yaş kategorileri (ILCA 4 Junior) doğum yılından; daha önce yüklenen listelerde de
  const fleets = withCats(fleetsOf(sheets || []), raceYear(race));
  const pool = [...ours, ...club.filter((a) => !ours.some((o) => o.id === a.id))];
  const found = findOurs(fleets, pool);
  const res = race.results || {};
  // Bizimkilerin sınıfları (noktalı); açılışta ilki seçili
  const oursFi = new Set(ours.map((a) => found[a.id]?.fi).filter((i) => i != null));
  const fleet = fleets.find((f) => f.cls === cls) || fleets[[...oursFi][0] ?? 0];
  // Bizimkiler: seçili sınıftakiler (listede bulunanlar ya da sonucu bu sınıfa yazılanlar); sonucu olmayanlar en sonda
  const inFleet = (a) => (found[a.id] ? fleets[found[a.id].fi] === fleet : !res.rows?.[a.id]?.cls || res.rows[a.id].cls === fleet?.cls);
  const mine = ours.filter((a) => fleets.length < 2 || inFleet(a));
  // Bu sınıfta bizimkiler yoksa Bizimkiler düğmesi çıkmaz, Genel açılır
  const view = want === "ours" && fleet && !mine.length ? "all" : want;
  const filter = view === "ours" ? "all" : view;
  // Takip: bu yarış için yıldızlananlar (sınıf + yelken no ya da ad)
  const follow = new Set(race.follow || []);
  const isFollowed = (r) => !!fleet && follow.has(followKey(fleet.cls, r));
  const all = view === "follow" ? sheetRows(fleet, "all").filter(isFollowed).map((r) => ({ ...r, pos: r.rank || r.pos })) : sheetRows(fleet, filter);
  const rows = q.trim() ? all.filter((r) => sheetMatch(r, q)) : all;
  const nFollow = fleet ? fleet.rows.filter(isFollowed).length : 0;
  const toggle = (r) => {
    const k = followKey(fleet.cls, r);
    const next = follow.has(k) ? [...follow].filter((x) => x !== k) : [...follow, k];
    onRace({ ...race, follow: next });
    saveRaceFollow(orgId, race.id, next).catch(() => toast("Takip kaydedilemedi"));
  };
  const hit = new Set(Object.values(found).filter((x) => fleets[x.fi] === fleet).map((x) => x.ri));
  const rowOf = (id) => {
    const f = found[id];
    return f ? fleets[f.fi]?.rows[f.ri] : null;
  };
  const sailOf = (a) => rowOf(a.id)?.sail || a.sailNo || "";
  const sorted = [...mine]
    .filter((a) => !q.trim() || sheetMatch({ name: a.studentName, club: rowOf(a.id)?.club, sail: sailOf(a) }, q))
    .sort((a, b) => (res.rows?.[a.id]?.place || 999) - (res.rows?.[b.id]?.place || 999));
  const firstX = sorted.map((a) => res.rows?.[a.id]).find((x) => x?.place);
  const oursCls = fleet?.cls || firstX?.cls || "";
  const oursN = fleet?.rows.length || firstX?.n || 0;
  // Yüklenenler: sınıf başına son yükleme günü
  const upAt = new Map();
  for (const sh of sheets || []) for (const f of sh.fleets || []) if (f?.cls && f.rows?.length) upAt.set(f.cls, sh.at);
  const lastFile = (res.files || []).at(-1);
  const loaded = !!fleet || !!lastFile;
  const chip = (on) => `h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${on ? "bg-acc text-white" : "bg-card ring-1 ring-line"}`;
  const filters = [...(mine.length || !fleet ? [["ours", `Bizimkiler · ${mine.length}`]] : []), ...(fleet ? [["follow", `Takip · ${nFollow}`], ...sheetFilters(fleet)] : [["all", "Genel"]])];
  const star = view === "all" || view === "follow";

  return (
    <>
      {fleets.length > 0 && (
        <div className="mt-3 flex gap-1 overflow-x-auto rounded-2xl bg-line/60 p-1 [scrollbar-width:none]" role="tablist" aria-label="Sınıf">
          {fleets.map((f, i) => (
            <button
              key={f.cls}
              type="button"
              role="tab"
              onClick={() => (setCls(f.cls), setView((v) => (v === "follow" ? v : oursFi.has(i) ? "ours" : "all")), setMore(false))}
              aria-selected={fleet === f}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[0.84375rem] font-semibold active:scale-95 ${fleet === f ? "bg-deep text-white" : "text-fg2"}`}
            >
              {oursFi.has(i) && <i className={`size-1.5 rounded-full ${fleet === f ? "bg-white" : "bg-acc"}`} />}
              {f.cls}
              <small className={`text-[0.71875rem] font-semibold ${fleet === f ? "text-white/70" : "text-mut"}`}>{f.rows.length}</small>
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
      {(fleet || mine.length > 0) && (
        <input
          type="search"
          value={q}
          onChange={(e) => (setQ(e.target.value), setMore(false))}
          placeholder="Ara: ad, yelken no, kulüp"
          aria-label="Sonuçlarda ara"
          enterKeyHint="search"
          className="mt-3 h-10 w-full rounded-xl bg-card px-3.5 text-[0.9375rem] ring-1 ring-line placeholder:text-mut focus:outline-none focus:ring-acc"
        />
      )}

      {view === "ours" ? (
        <Table title={oursCls || "Bizimkiler"} count={oursN ? `${oursN} kişi` : ""}>
          {!sorted.length && <li className="px-4 py-6 text-center text-[0.875rem] text-mut">{q.trim() && mine.length ? "Bulunamadı." : "Yarışta sporcu seçilmedi."}</li>}
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
                sail={sailOf(a)}
                tag={x?.place ? short(r ? sheetTag(r) : SUB.includes(x?.cat) ? x.cat : "") : ""}
                club={x?.place ? "" : x?.note || "Sonuç yok"}
                born={yearOf(r?.born)}
                pts={x?.place ? ptsOf(r?.pts) : ""}
              >
                {boxes.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {boxes.map(([l, p, n]) => (
                      <span key={l} className="whitespace-nowrap rounded-md bg-bg px-1.5 py-0.5 text-[0.71875rem] font-semibold text-fg2">
                        {l} <b className={p <= 3 ? "text-acc" : "text-fg"}>{p}.</b>
                        {n ? `/${n}` : ""}
                      </span>
                    ))}
                  </span>
                )}
              </Row>
            );
          })}
        </Table>
      ) : !sheets ? (
        <Loading label="Sonuçlar yükleniyor" className="py-8" />
      ) : !fleet ? (
        <p className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>{res.files?.length ? "Genel sıralama için sonuç PDF'ini yeniden yükle." : "Sonuç PDF'i yüklenmedi."}</p>
      ) : (
        <Table
          title={[fleet.cls, filter !== "all" ? filters.find(([k]) => k === view)?.[1].replace(/ · \d+$/, "") : ""].filter(Boolean).join(" · ")}
          count={q.trim() ? `${rows.length} / ${all.length} kişi` : `${rows.length} kişi`}
          star={star}
        >
          {!rows.length && <li className="px-4 py-6 text-center text-[0.875rem] text-mut">{view === "follow" && !q.trim() ? "Takip ettiğin sporcu yok." : "Bulunamadı."}</li>}
          {(more || q.trim() || view === "follow" ? rows : rows.slice(0, TOP)).map((r) => (
            <Row
              key={r.i}
              pos={r.pos}
              name={r.name}
              sail={r.sail}
              tag={tagOf(r, filter)}
              club={[r.club, filter !== "all" && filter !== "follow" ? `Genel ${r.rank}.` : ""].filter(Boolean).join(" · ")}
              born={yearOf(r.born)}
              pts={ptsOf(r.pts)}
              on={hit.has(r.i)}
              star={star}
              followed={isFollowed(r)}
              onStar={hit.has(r.i) ? null : () => toggle(r)}
            />
          ))}
          {!more && !q.trim() && view !== "follow" && rows.length > TOP && (
            <li>
              <button type="button" onClick={() => setMore(true)} data-press className="btn btn-text btn-sm w-full text-acc">
                Tümünü göster · {rows.length}
              </button>
            </li>
          )}
        </Table>
      )}

      <input ref={pick} type="file" accept="application/pdf,image/*,.pdf" className="hidden" onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
      {loaded ? (
        <>
          {upAt.size > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 px-1 text-[0.8125rem] text-mut">
              {[...upAt].map(([c, at]) => (
                <span key={c} className="truncate">
                  {c}
                  {at ? ` · ${shortDay(at)}` : ""}
                </span>
              ))}
            </div>
          )}
          <button type="button" disabled={busy} onClick={() => pick.current?.click()} data-press className="btn btn-secondary mt-3 h-12 w-full">
            {busy ? "Sonuçlar okunuyor…" : "Sonuç PDF'i ekle"}
          </button>
        </>
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
