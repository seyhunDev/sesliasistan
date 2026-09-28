import { Icon } from "./Icon";

export function PageHeader({ title, onAdd, addLabel = "Ekle" }) {
  return (
    <div className="flex items-center justify-between py-2">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      {onAdd && (
        <button onClick={onAdd} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-acc px-3 text-sm font-semibold text-white transition active:scale-95">
          <Icon name="plus" className="size-[18px]" /> {addLabel}
        </button>
      )}
    </div>
  );
}
