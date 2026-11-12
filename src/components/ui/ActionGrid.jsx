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
        const shape = `btn ${a.main && !a.done ? "btn-primary" : "btn-secondary"} ${icons ? "!h-[3.25rem] !justify-start !px-3.5" : pill ? "h-10 rounded-full" : "h-[3.25rem] rounded-2xl"}`;
        const cls = icons ? `${shape} w-full min-w-0 !gap-2.5 !text-[0.9375rem]` : `${shape} min-w-0 gap-1 px-1 text-[0.84375rem] ${a.done ? "text-[var(--ok)] ck-done" : ""}`;
        const body = icons ? (
          <>
            <Icon name={a.done ? "check" : a.icon} className={`size-5 shrink-0 ${a.main ? "text-[var(--on-acc)]" : "text-acc"}`} />
            <span className="truncate">{a.label}</span>
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
