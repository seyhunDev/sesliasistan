import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// tone parametresi geriye dönük uyumluluk için duruyor; sade tasarımda tüm ikonlar nötr
export function Tile({ icon }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-bg text-fg">
      <Icon name={icon} className="size-[18px]" />
    </span>
  );
}

export function Row({ icon, title, sub, right, badge, onClick, href }) {
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-bg";
  const inner = (
    <>
      <Tile icon={icon} />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px] font-medium">{title}</b>
        {sub && <small className="mt-0.5 block truncate text-[13px] text-mut">{sub}</small>}
      </span>
      {badge && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-800">{badge}</span>}
      {right ? (
        <span className="shrink-0 text-[15px] font-semibold tabular-nums">{right}</span>
      ) : (
        <Icon name="chev" className="size-[18px] shrink-0 text-mut" />
      )}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}
