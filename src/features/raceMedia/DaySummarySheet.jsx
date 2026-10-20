"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { loadRaceDay } from "@/features/athletes/raceWeather";
import { resultLine } from "@/lib/resultSheet";
import { daySummary } from "@/lib/raceLive";
import { drawDayCard } from "./dayCard";

// Gün özeti: o günün rüzgârı, yarışları ve bizimkilerin sırası tek kartta (resim) ve yazı olarak.
// "Resmi paylaş" telefonun paylaş menüsünü açar (WhatsApp veli grubu, Instagram); "Yazıyı paylaş" düz metin.
export function DaySummarySheet({ open, onClose, race, day, live, ours }) {
  const toast = useToast();
  const [card, setCard] = useState(null); // { key, url, blob, text }
  const key = `${race.id}:${day}:${live.wind.length}:${live.starts.length}:${JSON.stringify(race.results?.rows || {}).length}`;

  useEffect(() => {
    if (!open || card?.key === key) return;
    let on = true;
    (async () => {
      const rows = await loadRaceDay(race, day).then((d) => d.rows).catch(() => null);
      const s = daySummary({ race, day, live, ours, rows, line: resultLine });
      const blob = await drawDayCard(s);
      if (on) setCard((c) => (c?.url && URL.revokeObjectURL(c.url), { key, url: URL.createObjectURL(blob), blob, text: s.text }));
    })().catch(() => on && toast("Özet hazırlanamadı"));
    return () => {
      on = false;
    };
  }, [open, key, card?.key, race, day, live, ours, toast]);

  const name = `${race.name || "Yarış"} ${day}`.replace(/[\\/:*?"<>|]/g, "");
  const shareImage = async () => {
    try {
      const f = new File([card.blob], `${name}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
      else {
        const a = document.createElement("a");
        a.href = card.url;
        a.download = f.name;
        a.click();
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast("Paylaşılamadı");
    }
  };
  const shareText = async () => {
    try {
      if (navigator.share) await navigator.share({ text: card.text });
      else (await navigator.clipboard.writeText(card.text), toast("Yazı kopyalandı"));
    } catch (e) {
      if (e?.name !== "AbortError") toast("Paylaşılamadı");
    }
  };

  const ready = card?.key === key;
  return (
    <Sheet open={open} onClose={onClose} title="Gün özeti">
      {!ready ? (
        <Loading label="Özet hazırlanıyor" className="py-10" />
      ) : (
        <div className="pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.url} alt="Gün özeti kartı" className="mx-auto max-h-[55vh] w-auto rounded-xl ring-1 ring-line" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={shareImage} data-press className="btn btn-primary">Resmi paylaş</button>
            <button type="button" onClick={shareText} data-press className="btn btn-secondary">Yazıyı paylaş</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
