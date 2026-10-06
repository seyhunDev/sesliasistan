"use client";

import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { noteDonePatch, noteReopenPatch, noteText } from "@/lib/noteState";
import { rel } from "@/lib/utils/format";

const card = "rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";

// Tek işlem düğmesi: yuvarlak simge + kısa ad (ana sayfadaki işlemler gibi)
function Act({ icon, label, tone = "text-acc bg-acc/10", on, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition active:scale-95 active:bg-bg">
      <span className={`grid size-11 place-items-center rounded-full ${tone}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="w-full truncate text-center text-[0.8125rem] font-medium">{label}</span>
    </button>
  );
}

// Not ekranının işlemleri, içerikten ayrı: sık kullanılanlar üstte (Yapıldı, Sabitle, Kopyala, Paylaş),
// Sil en altta ayrı. Yapıldı denen not Arşiv'e gider (silinmez); yapılmış/arşivdeki notta durum + "Notlara geri al".
export function NoteActions({ rec, by, onDone, onDelete }) {
  const { updateRecord } = useData();
  const toast = useToast();
  const off = rec.done || rec.archived;
  const at = (rec.doneAt || rec.archivedAt || "").slice(0, 10);
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
    <section className="mt-6">
      <h3 className="px-1 text-[0.75rem] font-semibold tracking-wide text-mut">İŞLEMLER</h3>
      {off && (
        <div className={`mt-2 flex items-center gap-3 px-4 py-3 ${card}`}>
          <Icon name={rec.done ? "check" : "archive"} className={`size-5 shrink-0 ${rec.done ? "text-ok" : "text-mut"}`} />
          <span className="min-w-0 flex-1 text-[0.875rem] leading-snug">
            <b className="block font-semibold">{rec.done ? "Yapıldı" : "Arşivde"}{at ? ` · ${rel(at)}` : ""}</b>
            <span className="text-mut">Not Arşiv’de duruyor.</span>
          </span>
        </div>
      )}
      <div className={`mt-2 grid grid-cols-4 gap-1 p-1.5 ${card}`}>
        {off ? (
          <Act icon="back" label="Notlara al" onClick={reopen} />
        ) : (
          <Act icon="check" label="Yapıldı" tone="bg-ok text-white" onClick={done} />
        )}
        {!off && <Act icon="star" label={rec.pinned ? "Bırak" : "Sabitle"} on={!!rec.pinned} tone={rec.pinned ? "bg-amber-400 text-white" : "text-acc bg-acc/10"} onClick={pin} />}
        <Act icon="copy" label="Kopyala" onClick={copy} />
        <Act icon="share" label="Paylaş" onClick={share} />
      </div>
      {onDelete && (
        <button type="button" onClick={onDelete} className="mx-auto mt-6 flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.875rem] font-medium text-rec transition active:scale-95 active:bg-rec/10">
          <Icon name="trash" className="size-4" />
          Notu sil
        </button>
      )}
    </section>
  );
}
