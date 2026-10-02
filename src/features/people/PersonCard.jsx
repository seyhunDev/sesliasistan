"use client";

import { Icon } from "@/components/ui/Icon";
import { summaryRows } from "./assistPerson";

// Asistanda yeni kişi kartı: bilgiler, mükerrer uyarısı ve onay düğmeleri.
// p: { draft, step: "ask" | "confirm" | "saved" | "undo", dups?, uid? }
export function PersonCard({ p, onSave, onEdit, onCancel, onAccount, onUndo }) {
  const { draft, step, dups = [] } = p;
  const saved = step === "saved" || step === "undo";
  const head = step === "ask" ? "bilgi bekleniyor" : step === "confirm" ? "onay bekliyor" : step === "undo" ? "silme onayı" : "kaydedildi";
  return (
    <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
      <p className="flex items-center justify-between bg-acc/[.06] px-3 py-2 text-[0.75rem] font-semibold uppercase tracking-wide text-acc">
        <span className="flex items-center gap-1.5">
          <Icon name="user" className="size-3.5" /> Yeni kişi
        </span>
        <span>{head}</span>
      </p>
      <dl className="divide-y divide-line">
        {summaryRows(draft).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.875rem]">
            <dt className="shrink-0 text-mut">{k}</dt>
            <dd className={`truncate text-right ${v === "—" ? "text-mut" : "font-semibold"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {dups.length > 0 && !saved && (
        <div className="border-t border-line bg-amber-50 px-3 py-2.5 text-[0.8125rem] leading-snug text-amber-900">
          <b className="flex items-center gap-1.5 font-semibold">
            <Icon name="alert" className="size-4" /> Listede benzer kişi var
          </b>
          <ul className="mt-1 space-y-0.5">
            {dups.map((d) => (
              <li key={d.person.uid}>
                {d.person.name} · {d.why}
                {d.left ? " · silinmiş" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {step !== "ask" && (
        <div className="flex flex-wrap gap-1.5 border-t border-line p-2">
          {step === "confirm" && (
            <>
              <button type="button" onClick={onSave} className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[0.8125rem] font-semibold text-white active:scale-[.98] ${dups.length ? "bg-amber-700" : "bg-acc"}`}>
                <Icon name="check" className="size-4" /> {dups.length ? "Yine de kaydet" : "Kaydet"}
              </button>
              <button type="button" onClick={onEdit} className="h-9 rounded-xl bg-bg px-3 text-[0.8125rem] font-semibold text-acc active:scale-[.98]">
                Düzenle
              </button>
              <button type="button" onClick={onCancel} className="h-9 rounded-xl px-3 text-[0.8125rem] font-semibold text-mut active:bg-bg">
                Vazgeç
              </button>
            </>
          )}
          {step === "saved" && (
            <>
              <button type="button" onClick={onAccount} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-acc text-[0.8125rem] font-semibold text-white active:scale-[.98]">
                Hesap aç
              </button>
              <button type="button" onClick={onEdit} className="h-9 rounded-xl bg-bg px-3 text-[0.8125rem] font-semibold text-acc active:scale-[.98]">
                Kişiyi aç
              </button>
              <button type="button" onClick={onUndo} className="h-9 rounded-xl px-3 text-[0.8125rem] font-semibold text-rec active:bg-bg">
                Geri al
              </button>
            </>
          )}
          {step === "undo" && (
            <>
              <button type="button" onClick={onUndo} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rec text-[0.8125rem] font-semibold text-white active:scale-[.98]">
                <Icon name="trash" className="size-4" /> Sil
              </button>
              <button type="button" onClick={onCancel} className="h-9 rounded-xl bg-bg px-3 text-[0.8125rem] font-semibold text-acc active:scale-[.98]">
                Vazgeç
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
