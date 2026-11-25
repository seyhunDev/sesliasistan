"use client";

import { Icon } from "@/components/ui/Icon";
import { Empty } from "@/components/ui/Page";
import { ListHead, Tag } from "@/components/ui/Row";
import { todayStr } from "@/lib/utils/format";
import { kindOf, tl, totals } from "./eventModel";

const day = (s) => new Date(`${s}T12:00:00`);
const diff = (s) => Math.round((day(s) - day(todayStr())) / 864e5);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Tarihsiz etkinlik "yaklaşan"da kalır (henüz zamanı belli değil)
export const isPast = (e) => !!e.startDate && diff(e.endDate || e.startDate) < 0;
export function leftText(e) {
  if (!e.startDate) return "Tarih belli değil";
  const a = diff(e.startDate);
  const b = diff(e.endDate || e.startDate);
  if (a > 1) return `${a} gün kaldı`;
  if (a === 1) return "Yarın";
  if (a === 0) return "Bugün";
  return b >= 0 ? "Sürüyor" : "Bitti";
}
// Kısa tarih aralığı: "17 Eki", "17–19 Eki", "30 Eki – 2 Kas" (başka yılsa yıl da)
function rangeShort(a, b) {
  if (!DATE.test(a || "")) return "";
  const x = day(a);
  const y = day(DATE.test(b || "") ? b : a);
  const mon = (d) => d.toLocaleDateString("tr-TR", { month: "short" });
  const yr = y.getFullYear() !== new Date().getFullYear() ? ` ${y.getFullYear()}` : "";
  if (+x === +y) return `${x.getDate()} ${mon(x)}${yr}`;
  if (x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear()) return `${x.getDate()}–${y.getDate()} ${mon(y)}${yr}`;
  return `${x.getDate()} ${mon(x)} – ${y.getDate()} ${mon(y)}${yr}`;
}

export function KindBadge({ kind, className = "size-12" }) {
  const [, , icon] = kindOf(kind);
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl bg-acc/10 text-acc ${className}`}>
      <Icon name={icon} className="size-6" />
    </span>
  );
}

// Etkinlik listesi (yeni tasarım, 2026-11-03): Yaklaşan / Geçmiş seçimi sayfanın lacivert üstünde (tab);
// satır: ad, altında tür · tarih · yer · ihtiyaç · bütçe · kişi, sağda kalan gün etiketi.
export function EventList({ events, tab = "up", onOpen }) {
  const up = events.filter((e) => !isPast(e)).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past = events.filter(isPast);
  const list = tab === "up" ? up : past;

  if (!events.length) return <Empty icon="tent" title="Henüz etkinlik yok" />;
  if (!list.length) return <p className="text-center text-[0.875rem] text-mut">{tab === "up" ? "Yaklaşan etkinlik yok" : "Geçmiş etkinlik yok"}</p>;

  return (
    <section>
      <ListHead title={tab === "up" ? "Yaklaşan" : "Geçmiş"} count={list.length} />
      <ul className="overflow-hidden rounded-[1.25rem] border border-line bg-card [&>*+*]:border-t [&>*+*]:border-line">
        {list.map((e) => {
          const done = e.needs.filter((n) => n.done).length;
          const t = totals(e);
          const left = leftText(e);
          const parts = [
            kindOf(e.kind)[1],
            rangeShort(e.startDate, e.endDate),
            e.place,
            e.needs.length > 0 && (
              <span key="n" className={done === e.needs.length ? "text-ok" : ""}>
                İhtiyaç {done}/{e.needs.length}
              </span>
            ),
            t.total > 0 && tl(t.total),
            e.people > 0 && `${e.people} kişi`,
          ].filter(Boolean);
          return (
            <li key={e.id}>
              <button type="button" onClick={() => onOpen(e)} data-press="row" className="flex min-h-[3.5rem] w-full items-center gap-3 px-3.5 py-2.5 text-left">
                <span className="min-w-0 flex-1">
                  <b className={`block truncate text-[0.9375rem] font-semibold ${tab === "past" ? "text-mut" : ""}`}>{e.title || "Adsız etkinlik"}</b>
                  <small className="block truncate text-[0.8125rem] tabular-nums text-mut">{parts.flatMap((x, i) => (i ? [" · ", x] : [x]))}</small>
                </span>
                {tab === "up" && <Tag tone={left === "Bugün" || left === "Sürüyor" ? "st" : "gen"}>{left}</Tag>}
                <Icon name="chev" className="size-4 shrink-0 text-mut" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
