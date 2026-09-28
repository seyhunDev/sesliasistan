import { Icon } from "@/components/ui/Icon";
import { rel } from "@/lib/utils/format";

export function TaskRow({ task, planTitle, onToggle, onOpen }) {
  const meta = [task.due ? rel(task.due) : "", planTitle || ""].filter(Boolean).join(" · ") || task.cat || "";
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.done ? "Yeniden aç" : "Tamamlandı olarak işaretle"}
        className={`grid size-6 shrink-0 place-items-center rounded-full border-[1.75px] transition active:scale-90 ${task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-mut text-transparent"}`}
      >
        <Icon name="check" className="size-3.5 [stroke-width:3]" />
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left transition active:opacity-60">
        <span className="min-w-0 flex-1">
          <b className={`block truncate text-[15.5px] font-semibold ${task.done ? "text-mut line-through" : ""}`}>{task.title}</b>
          <small className="block truncate text-[13px] text-mut">{meta}</small>
        </span>
        <Icon name="chev" className="size-[18px] text-mut opacity-60" />
      </button>
    </div>
  );
}
