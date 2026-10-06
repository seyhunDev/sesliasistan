"use client";

import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { noteDonePatch, noteReopenPatch } from "@/lib/noteState";
import { rel } from "@/lib/utils/format";

// Not ekranında: işi biten not "Yapıldı" denince Arşiv'e gider (silinmez). Yapılmış ya da arşivdeki notta
// durum ve "Notlara geri al".
export function NoteDone({ rec, by, onDone }) {
  const { updateRecord } = useData();
  const toast = useToast();
  const off = rec.done || rec.archived;
  const at = (rec.doneAt || rec.archivedAt || "").slice(0, 10);

  if (off)
    return (
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <Icon name={rec.done ? "check" : "archive"} className={`size-5 shrink-0 ${rec.done ? "text-ok" : "text-mut"}`} />
        <span className="min-w-0 flex-1 text-[0.875rem] leading-snug">
          <b className="block font-semibold">{rec.done ? "Yapıldı" : "Arşivde"}{at ? ` · ${rel(at)}` : ""}</b>
          <span className="text-mut">Not Arşiv’de duruyor.</span>
        </span>
        <button
          type="button"
          onClick={() => {
            updateRecord("note", rec.id, noteReopenPatch(), by);
            toast("Not, Notlar'a geri alındı");
          }}
          className="shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-acc ring-1 ring-line transition active:scale-95"
        >
          Notlara geri al
        </button>
      </div>
    );

  return (
    <button
      type="button"
      onClick={() => {
        updateRecord("note", rec.id, noteDonePatch(), by);
        navigator.vibrate?.(10);
        toast("Yapıldı, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("note", rec.id, noteReopenPatch(), by) } });
        onDone?.();
      }}
      className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-[0_1px_3px_rgba(38,40,44,.05)] transition active:scale-[.99]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ok/10 text-ok">
        <Icon name="check" className="size-5" />
      </span>
      <span className="min-w-0 flex-1 text-[0.875rem] leading-snug">
        <b className="block font-semibold">Yapıldı</b>
        <span className="text-mut">İşi bittiyse Arşiv’e kaldır; silinmez, istersen geri alırsın.</span>
      </span>
    </button>
  );
}
