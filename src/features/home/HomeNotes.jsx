"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { homeNotes } from "@/lib/homeTiles";
import { rel } from "@/lib/utils/format";
import { unseenNotes } from "@/lib/people";

// Ana sayfa › NOTLAR: notlar açık liste (sabitlenenler önce, sonra en yeni; en çok 5). Satırda başlık, içeriğin ilk satırı, tarih;
// dokununca not açılır. Başlıkta "Tümü" Notlar sayfasına, altta "Not ekle". Notlar bellekte (DataProvider), ek okuma yok;
// not eklenince/değişince liste kendiliğinden güncellenir.
export function HomeNotes() {
  const { notes, myUid } = useData();
  const { openAdd } = useAdd();
  const { list, total } = homeNotes(notes, 5);

  return (
    <section aria-labelledby="home-notes">
      <div className="mb-2.5 flex items-baseline px-1">
        <h2 id="home-notes" className="flex-1 text-[0.75rem] font-bold tracking-[.08em] text-mut">
          NOTLAR{total > 0 && <span className="ml-1.5 font-semibold tabular-nums tracking-normal">{total}</span>}
        </h2>
        {total > 0 && (
          <Link href="/notes" className="flex items-center gap-0.5 text-[0.8125rem] font-semibold text-acc active:opacity-70">
            Tümü
            <Icon name="chev" className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)] ring-1 ring-line">
        {list.length === 0 ? (
          <p className="px-4 py-3.5 text-[0.875rem] text-mut">Henüz not yok</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((n) => {
              const body = n.body && n.body !== n.title ? n.body.split("\n").find((l) => l.trim()) : "";
              const day = (n.updatedAt || n.createdAt || "").slice(0, 10);
              return (
                <li key={n.id}>
                  <button onClick={() => openAdd({ edit: { kind: "note", id: n.id } })} className="flex w-full items-start gap-3 px-4 py-3 text-left transition active:bg-bg">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                      <Icon name={n.pinned ? "star" : "note"} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="flex items-center gap-1.5 text-[0.9375rem] font-semibold leading-snug">
                        <span className="truncate">{n.title || "Not"}</span>
                        {unseenNotes(n, myUid).length > 0 && <span className="size-2 shrink-0 rounded-full bg-acc" aria-label="Yeni mesaj" />}
                      </b>
                      {body && <small className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-mut">{body}</small>}
                    </span>
                    {day && <small className="mt-0.5 shrink-0 text-[0.6875rem] text-mut">{rel(day)}</small>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button onClick={() => openAdd({ type: "note" })} className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-[0.875rem] font-semibold text-acc transition active:bg-bg">
          <Icon name="plus" className="size-4" />
          Not ekle
        </button>
      </div>
    </section>
  );
}
