import Link from "next/link";
import { Icon } from "./Icon";

// Ortak iş düğmeleri ızgarası (kokpit tasarımı): 4 sütun, her düğme adıyla ("Yoklama", "Not", "Fiş"), simgesiz, kabarık ve basınca içeri girer.
// main: o günün ana işi (açık mor), done: yapıldı (yeşil tik). items: [{ key, label, href | onClick, main, done }]
export function ActionGrid({ items, label = "İşler", pill }) {
  if (!items?.length) return null;
  return (
    <nav aria-label={label} className="grid grid-cols-4 gap-2">
      {items.map((a) => {
        const cls = `raised ${pill ? "ck-pill" : "h-[3.25rem] rounded-2xl"} flex min-w-0 items-center justify-center gap-1 px-1 text-[0.84375rem] font-semibold ${a.done ? "text-[var(--ok)]" : a.main ? "act-main" : "text-fg"}`;
        const body = (
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
