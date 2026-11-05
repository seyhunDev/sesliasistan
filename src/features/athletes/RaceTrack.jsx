"use client";

// Yarış takip (Seyhun 2026-11-05 "yarış detay sayfasını yarış takip sayfasına çevirelim; duyurular, talimatlar, sonuçlar gösterilsin,
// yeni gelen varsa bildirim olsun ve gösterilsin"; örnek yaris-detay-sade/yaris-takip-ornek.png onaylı): yarış sayfasının ilk sekmesi.
// Siteden gelen belgeler (raceSite.js watchSiteDocs; işleme, görüldü yazma ve Geri al SiteDocs'ta kalır, "Tüm belgeler" altında)
// üç bölümde: Sonuçlar (bizim sporcuların sırası + sonuç belgeleri), Duyurular (renk listesi, final grupları, sporcu listesi, diğer),
// Talimatlar (talimat, ek talimat, program). Görülmemiş belge "Yeni"; bildirim (sunucu notifyDocs) bu sekmeyi açar (?sec=site).
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { ListHead, Tag } from "@/components/ui/Row";
import { Icon } from "@/components/ui/Icon";
import { ourPlaces } from "@/lib/raceDay";
import { kindLabel, resultState, version } from "@/lib/siteDocs";
import { siteDocBlob, watchSiteDocs } from "./raceSite";

const RULES = ["notice", "amend", "program"];
const when = (at) => {
  const d = new Date(`${String(at).slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${String(at).slice(11, 16)}`.trim();
};
// "Optimist / 120 · Gümüş 5. · Junior 4."
const subOf = (x) => [x.n ? `${x.cls} / ${x.n}` : x.cls, x.grp && x.fp && `${x.grp} ${x.fp}.`, x.cp && `${x.cat} ${x.cp}.`, x.gp && `Kızlar ${x.gp}.`].filter(Boolean).join(" · ");

// Satırın sağındaki kısa işaret: sonuçta geçici/kesin, ek talimatta sürüm
const markOf = (d) => (d.kind === "results" ? ({ kesin: "kesin", gecici: "geçici" })[resultState(d.name)] || "" : d.kind === "amend" && version(d.name) ? `V${version(d.name)}` : "");

export function trackGroups(docs) {
  const list = docs || [];
  return {
    results: list.filter((d) => d.kind === "results"),
    news: list.filter((d) => d.kind !== "results" && !RULES.includes(d.kind)),
    rules: list.filter((d) => RULES.includes(d.kind)),
  };
}

function DocRows({ list, onOpen }) {
  return list.map((d) => {
    const mark = markOf(d);
    return (
      <button key={d.id} type="button" data-press="row" onClick={() => onOpen(d)} className="flex min-h-[3.5rem] w-full items-center gap-2 border-t border-line py-2 text-left first:border-t-0">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{d.name}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{[kindLabel(d.kind), when(d.at)].filter(Boolean).join(" · ")}</small>
        </span>
        {!d.seen && <Tag tone="gen">Yeni</Tag>}
        {mark && <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[0.75rem] font-semibold text-mut">{mark}</span>}
        <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
      </button>
    );
  });
}

export function RaceTrack({ orgId, race, chosen = [], more = null }) {
  const [docs, setDocs] = useState(null);
  const [view, setView] = useState(null);
  const [all, setAll] = useState(false);
  useEffect(() => watchSiteDocs(orgId, race.id, setDocs, () => setDocs((d) => d || [])), [orgId, race.id]);
  const load = useCallback(() => siteDocBlob(race.id, view), [race.id, view]);
  const close = useCallback(() => setView(null), []);
  const g = trackGroups(docs);
  const places = ourPlaces(race.results, chosen);
  const box = "overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5";
  const empty = (t) => <p className="py-3.5 text-[0.9375rem] text-mut">{docs ? t : "Yükleniyor…"}</p>;
  return (
    <>
      <section className="mt-6" aria-label="Sonuçlar">
        <ListHead title="Sonuçlar" count={g.results.length} />
        <div className={box}>
          {places.map((x) => (
            <div key={x.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2 first:border-t-0">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{x.name}</b>
                {x.row?.cls && <small className="block truncate text-[0.8125rem] text-mut">{subOf(x.row)}</small>}
              </span>
              <b className="shrink-0 text-[1.375rem] font-bold tabular-nums">{x.place}.</b>
            </div>
          ))}
          <DocRows list={g.results} onOpen={setView} />
          {!places.length && !g.results.length && empty("Henüz sonuç yok")}
        </div>
      </section>
      <section className="mt-6" aria-label="Duyurular">
        <ListHead title="Duyurular" count={g.news.length} />
        <div className={box}>
          <DocRows list={g.news} onOpen={setView} />
          {!g.news.length && empty("Henüz duyuru yok")}
        </div>
      </section>
      <section className="mt-6" aria-label="Talimatlar">
        <ListHead title="Talimatlar" count={g.rules.length} />
        <div className={box}>
          <DocRows list={g.rules} onOpen={setView} />
          {!g.rules.length && empty("Henüz talimat yok")}
        </div>
      </section>
      {/* Belgelerin tamamı ve işlemleri (Geri al, Yeniden işle, Şimdi bak, İzlemeyi bırak): SiteDocs, özellik kaybolmasın */}
      {more && (
        <>
          <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} data-press className="btn btn-text btn-sm mt-3 w-full">
            {all ? "Kapat" : "Tüm belgeler ve işlemler"}
          </button>
          <div hidden={!all}>{more}</div>
        </>
      )}
      {view && createPortal(<PdfViewer title={view.name} load={load} onClose={close} />, document.body)}
    </>
  );
}
