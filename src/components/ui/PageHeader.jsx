import Link from "next/link";
import { Icon } from "./Icon";

// Sayfa başlığı: solda ana sayfaya dönüş, sağda isteğe bağlı düğmeler (alt menü yok; her tür tek sayfa)
export function PageHeader({ title, sub, back = "/", children }) {
  return (
    <div className="sticky top-0 z-10 -mx-5 flex items-center gap-2 bg-bg/90 px-3 pb-2 pt-[calc(8px+env(safe-area-inset-top))] backdrop-blur">
      <Link href={back} aria-label={back === "/" ? "Ana sayfa" : "Geri"} className="grid size-10 shrink-0 place-items-center rounded-full text-fg transition active:scale-90 active:bg-line">
        <Icon name="back" className="size-6" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[24px] font-bold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="truncate text-[13px] text-mut">{sub}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2 pr-2">{children}</div>}
    </div>
  );
}
