"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { noteDonePatch, noteReopenPatch, noteText } from "@/lib/noteState";

const btn = "h-11 min-w-0 flex-1 truncate rounded-xl px-2 text-[0.9375rem] font-semibold transition active:scale-[.97]";
const plain = `${btn} bg-card text-fg ring-1 ring-line`;

// Not ekranının işlemleri: sekme çubuğunun hemen üstünde sabit tek satır (Seyhun, 2026-10-17).
// Yapıldı (Arşiv'e gider, silinmez), Sabitle/Sabitli, Paylaş (telefonun menüsünde Kopyala da var; menü yoksa kopyalar), Sil.
// Yapılmış/arşivdeki notta Yapıldı ve Sabitle yerine "Notlara al".
export function NoteActions({ rec, by, onDone, onDelete }) {
  const { updateRecord } = useData();
  const toast = useToast();
  const off = rec.done || rec.archived;
  const text = noteText(rec);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Not kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* vazgeçildi */
      }
    } else copy();
  };
  const done = () => {
    updateRecord("note", rec.id, noteDonePatch(), by);
    navigator.vibrate?.(10);
    toast("Yapıldı, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("note", rec.id, noteReopenPatch(), by) } });
    onDone?.();
  };
  const reopen = () => {
    updateRecord("note", rec.id, noteReopenPatch(), by);
    toast("Not, Notlar'a geri alındı");
  };
  const pin = () => {
    updateRecord("note", rec.id, { pinned: !rec.pinned }, by);
    toast(rec.pinned ? "Sabitleme kaldırıldı" : "Not sabitlendi");
  };

  return (
    <div className="flex w-full gap-2">
      {off ? (
        <button type="button" onClick={reopen} className={`${btn} flex-[1.4] bg-acc text-white`}>
          Notlara al
        </button>
      ) : (
        <>
          <button type="button" onClick={done} className={`${btn} bg-acc text-white`}>
            Yapıldı
          </button>
          <button type="button" onClick={pin} aria-pressed={!!rec.pinned} className={`${plain} ${rec.pinned ? "!text-amber-600" : ""}`}>
            {rec.pinned ? "Sabitli" : "Sabitle"}
          </button>
        </>
      )}
      <button type="button" onClick={share} className={plain}>
        Paylaş
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className={`${plain} !text-rec`}>
          Sil
        </button>
      )}
    </div>
  );
}
