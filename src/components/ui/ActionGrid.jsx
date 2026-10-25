import Link from "next/link";
import { Icon } from "./Icon";

// Ortak iş düğmeleri ızgarası (kokpit tasarımı): 4 sütun, her düğme adıyla ("Yoklama", "Not", "Fiş"), simgesiz, kabarık ve basınca içeri girer.
// main: o günün ana işi (açık mor), done: yapıldı (yeşil tik). items: [{ key, label, href | onClick, main, done, icon }]
// icons (ana sayfa kokpiti, Seyhun 2026-10-25 "B · İki sütun, camgöbeği ikon"): 2 sütun, solda büyük soluk camgöbeği ikon kartın kenarından içeri girer, yazı sağında (.ck-ibtn)
export function ActionGrid({ items, label = "İşler", pill, icons }) {
  if (!items?.length) return null;
  return (
    <nav aria-label={label} className={`grid gap-2 ${icons ? "grid-cols-2" : "grid-cols-4"}`}>
      {items.map((a) => {
        const shape = icons ? "ck-ibtn" : pill ? "ck-pill justify-center" : "h-[3.25rem] rounded-2xl justify-center";
        const cls = `raised ${shape} flex min-w-0 items-center gap-1 px-1 text-[0.84375rem] font-semibold ${a.done ? "text-[var(--ok)] ck-done" : a.main ? "act-main" : "text-fg"}`;
        const body = icons ? (
          <>
            <Icon name={a.done ? "check" : a.icon} className="ck-icon" />
            <span className="relative truncate">{a.label}</span>
          </>
        ) : (
          <>
            {a.done && <Icon name="check" className="size-4 shrink-0" />}
            <span className="truncate">{a.label}</span>
          </>
        );
        return a.href ? (
          <Link key={a.key || a.label} href={a.href} data-press className={cls}>
            {body}
          </Link>
        ) : (
          <button key={a.key || a.label} type="button" data-press onClick={a.onClick} className={cls}>
            {body}
          </button>
        );
      })}
    </nav>
  );
}
