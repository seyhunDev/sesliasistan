"use client";

// Yayın › Belgeler (Seyhun 2026-11-04 "yarış dokümanlarını yayın yönetiminde de kullanabilmeliyim; geçici sonuçlar var ama gösterilmiyor;
// yüklenmemişse hemen yükleyip göstermeliyim"). Kaynak yarış sayfasıyla ortak: siteden gelen belgeler raceLive/{yarış}/site
// (features/athletes/raceSite.js), sonuçlar yarışın sonuçları + raceLive/{yarış}/sheets (resultsImport.js; canlı ekran /api/canli fleets).
// Siteden gelip işlenmemiş sonuç ve listeler burada da işlenir (yarış sayfası açılmasa da ekrana gelsin). Sonuç satırında "Ekrana al" 03 sahnesini açar.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { useToast } from "@/components/ui/ToastProvider";
import { kindLabel, resultState } from "@/lib/siteDocs";
import { stampResults } from "@/lib/raceDay";
import { todayStr } from "@/lib/utils/format";
import { isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { LIST_KINDS, applyList, siteDocBlob, checkSite, saveDocState, watchSiteDocs } from "@/features/athletes/raceSite";
import { importResults, importToast } from "@/features/athletes/resultsImport";
import { saveRaceResults } from "@/features/athletes/races";

// Gösterim sırası: önce sonuçlar, sonra listeler, talimatlar
const ORDER = ["results", "groups", "fleets", "entries", "amend", "notice", "program", "other"];
const when = (at) => {
  const d = new Date(`${String(at).slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${String(at).slice(11, 16)}`;
};
const kindText = (d) => (d.kind === "results" && resultState(d.name) ? `${resultState(d.name) === "kesin" ? "Kesin" : "Geçici"} sonuç` : kindLabel(d.kind));

export function DocsTab({ orgId, race, onRace, onShow, showing }) {
  const toast = useToast();
  const { data } = useDikili("list", loadAthletes);
  const athletes = data?.athletes || null;
  const [docs, setDocs] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState("");
  const file = useRef(null);
  const raceNow = useRef(race);
  useEffect(() => {
    raceNow.current = race;
  }, [race]);
  useEffect(() => (race?.id ? watchSiteDocs(orgId, race.id, setDocs, () => setDocs((d) => d || [])) : undefined), [orgId, race?.id]);

  // Sonuç PDF'i: yarış sayfasındaki "Sonuç yükle" ile aynı yol (yarışın sonuçları + canlı ekranın genel sıralaması)
  const takeResults = useCallback(
    async (f) => {
      const cur = raceNow.current;
      if (!athletes || !cur?.id) throw new Error("Sporcular yükleniyor, birazdan tekrar dene.");
      const ours = athletes.filter((a) => (cur.athleteIds || []).includes(a.id));
      const club = athletes.filter((a) => isActive(a) && !ours.includes(a));
      const got = await importResults({ orgId, race: cur, athletes: ours, club, file: f });
      got.results = stampResults(cur.results, got.results, todayStr());
      await saveRaceResults(orgId, cur.id, got.results, got.extra);
      const next = { ...cur, results: got.results, athleteIds: [...new Set([...(cur.athleteIds || []), ...got.extra])] };
      raceNow.current = next;
      onRace?.(next);
      return got;
    },
    [athletes, orgId, onRace],
  );

  // Siteden gelip henüz işlenmemiş sonuç ve listeler (yarış sayfasındaki SiteDocs ile aynı işlem; işlenen "used" olur)
  const going = useRef(false);
  useEffect(() => {
    if (!docs || !athletes || going.current || !race?.id) return;
    const todo = docs.filter((d) => d.state === "new" && (d.kind === "results" || LIST_KINDS.includes(d.kind))).reverse();
    if (!todo.length) return;
    going.current = true;
    (async () => {
      for (const d of todo) {
        try {
          let patch;
          if (d.kind === "results") {
            const f = new File([await siteDocBlob(race.id, d)], d.file?.name || `${d.name}.pdf`, { type: "application/pdf" });
            const got = await takeResults(f);
            patch = { state: "used", note: importToast(got), undo: { file: got.results.files?.at(-1)?.id || "" } };
          } else patch = await applyList(orgId, race.id, d);
          await saveDocState(orgId, race.id, d.id, patch);
          toast(`${d.name}: ${patch.note || "işlendi"}`);
        } catch (e) {
          await saveDocState(orgId, race.id, d.id, { state: "kept", note: e?.message || "İşlenemedi" }).catch(() => {});
        }
      }
      going.current = false;
    })();
  }, [docs, athletes, orgId, race?.id, takeResults, toast]);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy("up");
    try {
      const got = await takeResults(f);
      toast(importToast(got));
    } catch (err) {
      toast(err?.message || "Sonuç okunamadı");
    }
    setBusy("");
  };
  const check = async () => {
    setBusy("check");
    try {
      const r = await checkSite(race.id);
      toast(r.error || "Siteye bakılıyor, yeni belge gelirse burada görünür");
    } catch (e) {
      toast(e.message);
    }
    setBusy("");
  };
  const load = useCallback(() => siteDocBlob(race.id, view), [race?.id, view]);
  const close = useCallback(() => setView(null), []);

  const list = (docs || []).slice().sort((a, b) => ORDER.indexOf(ORDER.includes(a.kind) ? a.kind : "other") - ORDER.indexOf(ORDER.includes(b.kind) ? b.kind : "other") || String(b.at).localeCompare(String(a.at)));
  const files = race?.results?.files || [];
  const hasRes = files.length > 0 || (docs || []).some((d) => d.kind === "results" && d.state === "used");
  return (
    <>
      <section>
        <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1 text-[0.8125rem] font-semibold text-mut">
          <span>Genel sıralama</span>
        </div>
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.9375rem] font-semibold">{hasRes ? "Sonuç yüklü" : "Sonuç yok"}</b>
              <small className="block truncate text-[0.8125rem] text-mut">{hasRes ? `${files.length || 1} PDF · ekranda 03 Sıralama` : "Sonuç PDF'i yükle, ekranda gösterilsin"}</small>
            </span>
            {hasRes ? (
              <Button size="sm" full={false} variant={showing ? "secondary" : "primary"} onClick={onShow}>
                {showing ? "Ekranda" : "Ekrana al"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>
      <section>
        <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1 text-[0.8125rem] font-semibold text-mut">
          <span>Yarışın belgeleri</span>
          <span>{docs ? `${docs.length}` : ""}</span>
        </div>
        <div className={`${card} overflow-hidden`}>
          {!list.length ? <p className="px-4 py-3.5 text-[0.9375rem] text-mut">{docs ? "Henüz belge yok" : "Yükleniyor…"}</p> : null}
          {list.map((d) => (
            <button key={d.id} type="button" data-press onClick={() => setView(d)} className="flex w-full min-w-0 items-center gap-3 border-t border-line px-4 py-3 text-left first:border-t-0">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{d.name}</b>
                <small className="block truncate text-[0.8125rem] text-mut">{[kindText(d), when(d.at), d.state === "new" ? "İşleniyor" : d.state === "kept" ? d.note || "İşlenemedi" : d.note].filter(Boolean).join(" · ")}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <input ref={file} type="file" accept="application/pdf" className="hidden" onChange={pick} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" loading={busy === "check"} disabled={!race?.site?.act} onClick={check}>
          Siteye bak
        </Button>
        <Button loading={busy === "up"} onClick={() => file.current?.click()}>
          Sonuç yükle
        </Button>
      </div>
      {view && createPortal(<PdfViewer title={view.name} load={load} onClose={close} />, document.body)}
    </>
  );
}
