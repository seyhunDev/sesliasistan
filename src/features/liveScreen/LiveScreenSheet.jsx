"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { ListHead } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { loadRoundsOf } from "@/features/athletes/raceLiveStore";
import { raceName } from "@/lib/raceLive";
import { currentStart, markName, ytId } from "@/lib/raceRounds";
import { ensurePublic, liveUrl, recName, roundJust, roundSay, roundUndo, setStream, showOnScreen } from "./liveActions";

// Canlı ekran penceresi (yarış multimedya sayfasının ⋯ menüsünden, yalnız ana hesap; Seyhun 2026-11-01).
// Ekranı aç / Linki kopyala; ekranda ne oynasın (canlı yayın ya da kayıt, Döngü); şamandıra dönüşleri (asistana söylenen cümlenin aynısı).
export function LiveScreenSheet({ open, onClose, orgId, raceId }) {
  return (
    <Sheet open={open} onClose={onClose} title="Canlı ekran">
      {open && <Body orgId={orgId} raceId={raceId} />}
    </Sheet>
  );
}

const rowCls = "flex w-full items-center gap-3 px-4 py-3 text-left text-[0.9375rem]";

function Body({ orgId, raceId }) {
  const toast = useToast();
  const [L, setL] = useState(null);
  const [sel, setSel] = useState(null); // { kind, mid }
  const [loop, setLoop] = useState(false);
  const [yt, setYt] = useState("");
  const [say, setSay] = useState("");
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState(false);
  const reload = () =>
    loadRoundsOf(orgId, raceId).then((d) => {
      setL(d);
      return d;
    });
  useEffect(() => {
    reload().then(
      (d) => {
        setSel(d.screen.kind ? { kind: d.screen.kind, mid: d.screen.mid } : null);
        setLoop(d.screen.loop);
        setYt(d.stream.url);
      },
      () => toast("Yüklenemedi, tekrar dene."),
    );
    ensurePublic(raceId).catch((e) => toast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, raceId]);

  const copy = async () => {
    try {
      await ensurePublic(raceId);
      await navigator.clipboard.writeText(liveUrl(raceId));
      toast("Link kopyalandı");
    } catch (e) {
      toast(e?.message || "Kopyalanamadı");
    }
  };
  const openScreen = async () => {
    const w = window.open("", "_blank");
    try {
      await ensurePublic(raceId);
      if (w) w.location.href = liveUrl(raceId);
      else window.location.href = liveUrl(raceId);
    } catch (e) {
      w?.close();
      toast(e?.message || "Açılamadı");
    }
  };
  const show = async (s) => {
    setBusy(true);
    try {
      if (s.kind === "live" && yt !== (L?.stream.url || "")) await setStream(orgId, raceId, yt);
      await showOnScreen(orgId, raceId, s);
      toast(s.kind ? "Ekranda" : "Ekrandan kaldırıldı");
      await reload();
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    }
    setBusy(false);
  };
  const write = async () => {
    if (!say.trim()) return;
    setBusy(true);
    try {
      const r = await roundSay(orgId, raceId, say);
      if (!r) toast("Örnek: 1. şamandıra 1302 1287");
      else if (r.fail) toast(r.fail);
      else {
        toast(r.text);
        setSay("");
        setUndo(roundJust());
        await reload();
      }
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    }
    setBusy(false);
  };

  if (!L) return <div className="h-40" />;
  const vids = [...L.media].filter((m) => m.kind === "video").reverse().slice(0, 12);
  const st = currentStart(L.starts, L.timer);
  const entry = st ? L.rounds[st.id] : null;
  const ytOk = !!ytId(yt);
  const isSel = (k, mid = "") => sel?.kind === k && (k !== "rec" || sel.mid === mid);
  return (
    <div className="space-y-5 pb-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={copy}>
          Linki kopyala
        </Button>
        <Button onClick={openScreen}>Ekranı aç</Button>
      </div>

      <section>
        <ListHead title="Ekranda" />
        <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
          <div className={`${rowCls} border-b border-line ${isSel("live") ? "bg-accbg" : ""}`}>
            <button type="button" className={`min-w-0 flex-1 text-left font-semibold ${isSel("live") ? "text-acc" : ""}`} onClick={() => ytOk && setSel({ kind: "live" })} disabled={!ytOk}>
              Canlı yayın
            </button>
            <input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="YouTube bağlantısı" inputMode="url" className="w-[55%] min-w-0 rounded-lg bg-bg px-2.5 py-1.5 text-[0.875rem] outline-none" />
          </div>
          {vids.map((m) => (
            <button key={m.id} type="button" onClick={() => setSel({ kind: "rec", mid: m.id })} className={`${rowCls} border-b border-line last:border-0 ${isSel("rec", m.id) ? "bg-accbg text-acc" : ""}`}>
              <span className="min-w-0 flex-1 truncate font-semibold">{recName(m, L.starts)}</span>
              <span className="tabular-nums text-mut">{m.dur ? `${Math.floor(m.dur / 60)}:${String(m.dur % 60).padStart(2, "0")}` : ""}</span>
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center justify-between rounded-[1.25rem] border border-line bg-card px-4 py-3 text-[0.9375rem] font-semibold">
          Döngü
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="size-5 accent-[var(--color-acc)]" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy || !L.screen.kind} onClick={() => (setSel(null), show({ kind: "" }))}>
            Ekrandan kaldır
          </Button>
          <Button disabled={busy || !sel || (sel.kind === "live" && !ytOk)} onClick={() => show({ ...sel, loop })}>
            Göster
          </Button>
        </div>
      </section>

      <section>
        <ListHead title={st ? `Dönüşler · ${raceName(st)}` : "Dönüşler"} />
        {entry?.route.length ? (
          <div className="mb-2 overflow-hidden rounded-[1.25rem] border border-line bg-card px-4">
            {entry.route.map((m, k) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[0.9375rem] last:border-0">
                <span className="font-semibold">{markName(m)}</span>
                <span className="min-w-0 truncate tabular-nums text-mut">{entry.legs[k].join(" ") || "–"}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <input
            value={say}
            onChange={(e) => setSay(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && write()}
            placeholder={st ? "1. şamandıra 1302 1287" : "Önce yarışı başlat"}
            disabled={!st}
            className="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 text-[0.9375rem] outline-none"
          />
          <Button full={false} disabled={busy || !say.trim()} onClick={write}>
            Yaz
          </Button>
        </div>
        {undo && roundJust() ? (
          <Button
            variant="text"
            className="mt-2"
            onClick={async () => {
              setUndo(false);
              await roundUndo();
              await reload();
              toast("Geri alındı");
            }}
          >
            Son yazılanı geri al
          </Button>
        ) : null}
      </section>
    </div>
  );
}
