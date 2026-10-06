"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { canCancel } from "@/lib/cancelPlan";
import { icsName, planIcs, planText, postponePatch } from "@/lib/planActions";
import { todayStr } from "@/lib/utils/format";
import { CancelPlan } from "./CancelPlan";

const card = "rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";

// Tek işlem düğmesi: yuvarlak simge + kısa ad (not ekranındaki işlemler gibi)
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

// Plan ekranının işlemleri, içerikten ayrı: Ertele (1 gün), İptal et (haber ver formu açılır), Kopyala, Paylaş, Takvime ekle.
// İptal edilmiş planda durum + "Geri al". Sil en altta ayrı: "Planı sil", haftalık seride "Bu ve sonrakileri sil" (ana hesap).
export function PlanActions({ rec, by, cancelStart = false, onDelete, onDeleteSeries }) {
  const { updateRecord } = useData();
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(cancelStart);
  const [seriesAsk, setSeriesAsk] = useState(false);
  const cancelled = rec.status === "cancelled";
  const text = planText(rec);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Plan kopyalandı");
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
  // Takvim dosyası: paylaşım menüsünde Takvim seçilir; desteklenmezse dosya iner (açınca "Takvime ekle")
  const toCalendar = async () => {
    const file = new File([planIcs(rec)], icsName(rec), { type: "text/calendar" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        /* vazgeçildi */
      }
      return;
    }
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const postpone = () => {
    const back = { date: rec.date, ...(rec.endDate ? { endDate: rec.endDate } : {}) };
    updateRecord("plan", rec.id, postponePatch(rec), by);
    navigator.vibrate?.(10);
    toast("Bir gün ertelendi", { action: { label: "Geri al", onClick: () => updateRecord("plan", rec.id, back, by) } });
  };
  const uncancel = () => {
    updateRecord("plan", rec.id, { status: "planned", cancelReason: "", cancelledAt: null }, by);
    toast("İptal geri alındı");
  };

  const acts = cancelled
    ? [<Act key="u" icon="back" label="Geri al" onClick={uncancel} />]
    : [
      rec.date && <Act key="p" icon="clock" label="Ertele" onClick={postpone} />,
      canCancel(rec, todayStr()) && <Act key="c" icon="x" label="İptal et" on={cancelOpen} tone={cancelOpen ? "bg-rec text-white" : "bg-rec/10 text-rec"} onClick={() => setCancelOpen((o) => !o)} />,
    ].filter(Boolean);
  acts.push(
    <Act key="k" icon="copy" label="Kopyala" onClick={copy} />,
    <Act key="s" icon="share" label="Paylaş" onClick={share} />,
    rec.date && <Act key="t" icon="cal" label="Takvime" onClick={toCalendar} />,
  );
  const list = acts.filter(Boolean);

  return (
    <section className="mt-6">
      <h3 className="px-1 text-[0.75rem] font-semibold tracking-wide text-mut">İŞLEMLER</h3>
      {cancelled && (
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-rec/10 px-4 py-3 text-rec">
          <Icon name="x" className="size-5 shrink-0" />
          <span className="min-w-0 flex-1 text-[0.875rem] font-semibold">Bu plan iptal edildi</span>
        </div>
      )}
      <div className={`mt-2 grid gap-1 p-1.5 ${card}`} style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
        {list}
      </div>
      {cancelOpen && !cancelled && <CancelPlan rec={rec} by={by} onClose={() => setCancelOpen(false)} />}
      <div className="mt-6 flex flex-col items-center gap-1">
        {onDelete && (
          <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.875rem] font-medium text-rec transition active:scale-95 active:bg-rec/10">
            <Icon name="trash" className="size-4" />
            Planı sil
          </button>
        )}
        {onDeleteSeries && (
          <button
            type="button"
            onClick={() => (seriesAsk ? onDeleteSeries() : setSeriesAsk(true))}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.8125rem] font-medium transition active:scale-95 ${seriesAsk ? "bg-rec text-white" : "text-rec/80 active:bg-rec/10"}`}
          >
            <Icon name="repeat" className="size-4" />
            {seriesAsk ? "Emin misin? Hepsini sil" : "Bu ve sonraki haftaları sil"}
          </button>
        )}
      </div>
    </section>
  );
}
