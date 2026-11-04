"use client";

// Yarış sayfasında "Siteden belgeler" (Seyhun 2026-11-03): yarış sitesinden alınan bütün belgeler, yeni önce.
// Yarış sayfasının Dokümanlar sekmesinde (2026-11-04 Evrak'tan ayrıldı) liste olarak (Seyhun 2026-11-04 "orada hepsini listeleyelim, yeni evrak olduğunu yarış sayfasında da gösterelim"):
// görülmemiş belge "Yeni" (kayıtta seen yok), sekme açılınca görüldü yazılır; sayısı onNew ile Dokümanlar sekmesinin düğmesine gider.
// Sekme kapalıyken de bağlı kalır (hidden): yeni gelenler işlenir, sayı güncel kalır.
// Açılınca yeni gelenler türüne göre işlenir (raceSite.js): renk listesi ve final grupları günün gruplarına, sporcu listesi
// kayıt listesine, sonuçlar yarışın sonuçlarına (onResults, page.jsx). Her satır açılır (PDF); işlenen belge "Geri al" ile döner.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { ListHead, Row, RowList, Tag } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { getStored } from "@/lib/firebase/fileStore";
import { currentAmend, kindLabel, resultState, version } from "@/lib/siteDocs";
import { LIST_KINDS, applyList, checkSite, redoDoc, saveDocState, undoDoc, unfollowSite, watchSiteDocs } from "./raceSite";

const when = (at) => {
  const d = new Date(`${String(at).slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${String(at).slice(11, 16)}`;
};
const kindText = (d) => (d.kind === "results" && resultState(d.name) ? `${kindLabel(d.kind)} (${resultState(d.name) === "kesin" ? "kesin" : "geçici"})` : d.kind === "amend" ? `${kindLabel(d.kind)} V${version(d.name)}` : kindLabel(d.kind));
const work = (d) => LIST_KINDS.includes(d.kind) || d.kind === "results";

export function SiteDocs({ orgId, race, shown = false, onNew, onResults, onUndo, onRefresh, ready = true }) {
  const toast = useToast();
  const [docs, setDocs] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState("");
  const running = useRef(false);

  useEffect(() => watchSiteDocs(orgId, race.id, setDocs, () => setDocs((d) => d || [])), [orgId, race.id]);
  // Sayfa açıkken sunucu talimatı / ek talimatı işlerse yarış yeniden okunur (program ekranda güncel kalsın)
  const used = useRef(null);
  useEffect(() => {
    if (!docs) return;
    const now = new Set(docs.filter((d) => d.state === "used" && !work(d)).map((d) => d.id));
    if (used.current && [...now].some((id) => !used.current.has(id))) onRefresh?.();
    used.current = now;
  }, [docs, onRefresh]);

  // Yeni gelenler sırayla işlenir (eskiden yeniye: aynı günün yeni renk listesi eskisinin yerine geçsin)
  useEffect(() => {
    if (!docs || running.current) return;
    // Sonuç belgesi sporcular yüklenince (bizimkiler aranır); listeler hemen
    const todo = docs.filter((d) => d.state === "new" && work(d) && (d.kind !== "results" || ready)).reverse();
    if (!todo.length) return;
    running.current = true;
    (async () => {
      let n = 0;
      for (const d of todo) {
        try {
          const patch = d.kind === "results" ? await onResults(d) : await applyList(orgId, race.id, d);
          if (!patch) continue;
          await saveDocState(orgId, race.id, d.id, patch);
          n++;
        } catch (e) {
          await saveDocState(orgId, race.id, d.id, { state: "kept", note: e?.message?.slice(0, 80) || "Okunamadı" }).catch(() => {});
        }
      }
      running.current = false;
      if (n) toast(`Siteden ${n} belge işlendi`);
    })();
  }, [docs, ready, orgId, race.id, onResults, toast]);

  const undo = async (d) => {
    setBusy(d.id);
    try {
      const r = await undoDoc(orgId, race, d);
      if (r.results || r.notice) onUndo?.(r);
      toast("Geri alındı");
    } catch {
      toast("Geri alınamadı");
    }
    setBusy("");
  };
  const redo = async (d) => {
    setBusy(d.id);
    // Talimat ve ek talimat sunucuda yeniden okunur (Şimdi bak gibi); listeler ve sonuçlar burada
    await redoDoc(orgId, race.id, d).catch(() => {});
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
  const stop = async () => {
    if (!confirm("Bu yarış siteden izlenmesin mi? Alınmış belgeler kalır.")) return;
    setBusy("stop");
    try {
      await unfollowSite(race.id);
      toast("İzleme bırakıldı");
    } catch (e) {
      toast(e.message);
    }
    setBusy("");
  };

  const load = useCallback(() => getStored(view.file, "application/pdf"), [view]);
  const close = useCallback(() => setView(null), []);
  // Görülmemiş sayısı Dokümanlar düğmesine; sekmeden çıkınca (ya da sayfa kapanınca) görüldü yazılır, Yeni yazısı bakarken kalır
  const unseen = (docs || []).filter((d) => !d.seen);
  useEffect(() => onNew?.(unseen.length), [unseen.length, onNew]);
  const seenNow = useRef([]);
  useEffect(() => {
    seenNow.current = shown ? unseen.map((d) => d.id) : [];
  }, [shown, unseen]);
  useEffect(() => {
    if (!shown) return;
    return () => {
      for (const id of seenNow.current) saveDocState(orgId, race.id, id, { seen: true }).catch(() => {});
    };
  }, [shown, orgId, race.id]);
  const amend = currentAmend(docs || []);
  return (
    <>
      <section className="mt-6">
        <ListHead title="Siteden belgeler" count={docs?.length || 0} />
        {amend && (
          <RowList className="mb-3">
            <Row onClick={() => setView(amend)} title={amend.name} sub={`Geçerli ek talimat · ${when(amend.at)}`} />
          </RowList>
        )}
        <RowList>
          {!docs?.length && <p className="py-3.5 text-[0.9375rem] text-mut">{docs ? "Henüz belge yok" : "Yükleniyor…"}</p>}
          {(docs || []).map((d) => (
            <div key={d.id} className="flex min-h-[3.5rem] items-center gap-2 border-t border-line py-2 first:border-t-0">
              <button type="button" data-press="row" onClick={() => setView(d)} className="min-w-0 flex-1 text-left">
                <b className="block truncate text-[0.9375rem] font-semibold">{d.name}</b>
                <small className="block truncate text-[0.8125rem] text-mut">{[kindText(d), when(d.at), d.state === "undone" ? "Geri alındı" : d.note].filter(Boolean).join(" · ")}</small>
              </button>
              {!d.seen && <Tag tone="gen">Yeni</Tag>}
              {d.state === "used" && d.undo && (
                <Button variant="secondary" size="sm" full={false} className="shrink-0" loading={busy === d.id} onClick={() => undo(d)}>
                  Geri al
                </Button>
              )}
              {d.state === "undone" && work(d) && (
                <Button variant="secondary" size="sm" full={false} className="shrink-0" loading={busy === d.id} onClick={() => redo(d)}>
                  Yeniden işle
                </Button>
              )}
            </div>
          ))}
        </RowList>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" full loading={busy === "check"} onClick={check}>
            Şimdi bak
          </Button>
          <Button variant="secondary" full loading={busy === "stop"} onClick={stop}>
            İzlemeyi bırak
          </Button>
        </div>
      </section>
      {/* Belge sayfanın katmanından (page-in) bağımsız, en üstte açılsın (Seyhun 2026-11-04 "tıkladığımda gösterilmiyor evrak") */}
      {view && createPortal(<PdfViewer title={view.name} load={load} onClose={close} />, document.body)}
    </>
  );
}
