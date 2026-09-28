"use client";

import { Icon } from "@/components/ui/Icon";

const TYPES = [["plan", "Plan"], ["task", "Görev"], ["note", "Not"]];
const field = "h-11 w-full min-w-0 rounded-xl border bg-card px-3 text-base text-fg outline-none transition focus:border-acc";

function F({ label, half, children }) {
  return (
    <label className={`block text-xs font-medium text-mut ${half ? "" : "col-span-2"}`}>
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

// editing: yalnızca alanlar (tür seçici ve kaldır yok). bare: kart çerçevesi yok. noRemove: kaldır düğmesi yok.
export function DraftCard({ d, index, plan, editing, bare, noRemove, onChange, onType, onRemove }) {
  const set = (k) => (e) => onChange(index, { [k]: e.target.value });
  const ok = "border-line";
  const noDate = d.type === "plan" && !d.date;
  const allDay = !d.time;

  return (
    <div className={bare ? "" : "animate-pop mt-3 rounded-2xl border border-line bg-card p-3"}>
      {!editing && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 rounded-lg bg-bg p-[3px]">
            {TYPES.map(([t, l]) => (
              <button
                key={t}
                type="button"
                onClick={() => onType(index, t)}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${d.type === t ? "bg-card text-fg shadow-sm" : "text-mut"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {!noRemove && (
            <button type="button" onClick={() => onRemove(index)} aria-label="Kaldır" className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-mut transition active:scale-90">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {d.type === "plan" && (
          <>
            <F label="Başlık"><input className={`${field} ${ok}`} value={d.title} onChange={set("title")} /></F>
            <F label="Tarih" half>
              <input type="date" className={`${field} ${noDate ? "border-amber-500" : ok}`} value={d.date} onChange={set("date")} />
            </F>
            <F label="Bitiş (isteğe bağlı)" half><input type="date" className={`${field} ${ok}`} value={d.endDate} onChange={set("endDate")} /></F>
            <div className="col-span-2">
              <span className="block text-xs font-medium text-mut">Zaman</span>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex flex-1 rounded-lg bg-bg p-[3px]">
                  <button
                    type="button"
                    onClick={() => onChange(index, { time: "", allDay: true })}
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${allDay ? "bg-card text-fg shadow-sm" : "text-mut"}`}
                  >
                    Tüm gün
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(index, { allDay: false, time: d.time || "09:00" })}
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${!allDay ? "bg-card text-fg shadow-sm" : "text-mut"}`}
                  >
                    Saat
                  </button>
                </div>
                {!allDay && <input type="time" className={`${field} ${ok} !w-32 shrink-0`} value={d.time} onChange={set("time")} />}
              </div>
            </div>
            <F label="Yer"><input className={`${field} ${ok}`} value={d.place} onChange={set("place")} /></F>
          </>
        )}
        {d.type === "task" && (
          <>
            <F label="Görev"><input className={`${field} ${ok}`} value={d.title} onChange={set("title")} /></F>
            <F label="Son tarih (isteğe bağlı)"><input type="date" className={`${field} ${ok}`} value={d.date} onChange={set("date")} /></F>
          </>
        )}
        {d.type === "note" && (
          <>
            <F label="Başlık"><input className={`${field} ${ok}`} value={d.title} onChange={set("title")} /></F>
            <F label="Not"><textarea className={`${field} ${ok} h-20 resize-none py-2.5`} value={d.body} onChange={set("body")} /></F>
          </>
        )}
      </div>

      {!editing && d.type !== "plan" && plan && (
        <button
          type="button"
          onClick={() => onChange(index, { link: !d.link })}
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95 ${d.link ? "border-acc bg-acc text-white" : "border-line bg-card"}`}
        >
          <Icon name="cal" className="size-4" />
          {d.link ? "Plana bağlı: " : "Plana bağla: "}
          {plan.title || "plan"}
        </button>
      )}
    </div>
  );
}
