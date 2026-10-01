import Link from "next/link";
import { Icon } from "./Icon";

// Sayfa başlığı: solda ana sayfaya dönüş (yuvarlak kart), başlık ve kısa alt satır, sağda isteğe bağlı düğmeler
export function PageHeader({ title, sub, back = "/", children }) {
  return (
    <div className="sticky top-0 z-10 -mx-5 flex items-center gap-2.5 bg-bg/90 px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
      <Link
        href={back}
        aria-label={back === "/" ? "Ana sayfa" : "Geri"}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] transition active:scale-90"
      >
        <Icon name="back" className="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[1.375rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="truncate text-[0.8125rem] text-mut">{sub}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
