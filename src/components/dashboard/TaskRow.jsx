import { Icon } from "@/components/ui/Icon";
import { dueLabel } from "@/lib/agenda";
import { todayStr } from "@/lib/utils/format";

// who: kaydın kimden geldiği / kime atandığı ("Ali ekledi", "→ Ali"). pill: görevli etiketi (ana hesapta)
export function TaskRow({ task, planTitle, who, pill, badge, onToggle, onOpen }) {
  const due = task.due ? dueLabel(task.due, todayStr()) : null;
  const late = due?.late && !task.done;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.done ? "Yeniden aç" : "Yapıldı olarak işaretle"}
        className={`grid size-6 shrink-0 place-items-center rounded-full border-[0.1094rem] transition active:scale-90 ${task.done ? "border-ok bg-ok text-white" : "border-mut/60 text-transparent"}`}
      >
        <Icon name="check" className="size-3.5 [stroke-width:3]" />
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:opacity-60">
        <span className="min-w-0 flex-1">
          <b className={`block truncate text-[0.9375rem] font-semibold ${task.done ? "text-mut line-through" : ""}`}>{task.title}</b>
          {((due && !task.done) || planTitle || who) && (
            <small className="block truncate text-[0.8125rem] text-mut">
              {[
                due && !task.done && <span key="d" className={late ? "font-medium text-rec" : ""}>{due.text}</span>,
                planTitle,
                who && <span key="w" className="text-acc">{who}</span>,
              ]
                .filter(Boolean)
                .flatMap((x, i) => (i ? [" · ", x] : [x]))}
            </small>
          )}
          {badge && <span className="mt-1 block">{badge}</span>}
        </span>
        {pill}
      </button>
    </div>
  );
}
