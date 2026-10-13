"use client";

import { doneOf } from "@/lib/doneWords";
import { Icon } from "@/components/ui/Icon";
import { rel, when } from "@/lib/utils/format";
import { stamp } from "./EditCard";

const KIND = { plan: "Plan", task: "Görev", note: "Not" };

// Ana asistanın bu kayıt hakkındaki bilgisi: kayıt ve kimliği. "Bunu tamamla", "ertele" bu kayda gider.
// Kayıtlarda mesajlaşma yok (Seyhun, 2026-10-13): mesajlar Mesajlar'dan gider.
const PREFIX = { plan: "p", task: "t", note: "n" };
export function recordFocus(kind, rec) {
  if (!rec || !PREFIX[kind]) return null;
  return {
    title: `${KIND[kind]}: ${rec.title}`,
    rec: { kind, id: rec.id },
    text: [
      `Açık kayıt: ${KIND[kind]} ${PREFIX[kind]}:${rec.id} | ${rec.title}${kind === "plan" && rec.date ? ` | ${when(rec)}` : ""}${kind === "task" && rec.due ? ` | son gün ${rec.due}` : ""}`,
      kind === "note" && rec.body ? `Not metni: ${String(rec.body).slice(0, 400)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
// Başkasının verdiği kayıt (çalışan görünümü): değiştiremez; yalnızca kendisi için "gerçekleşti / yaptım / okudum" der
// extra: kayda özel bölüm (sporcunun fitness antrenmanı); varsa "Tamamladım" düğmesi yerine o görünür
export function AssignedView({ kind, rec, planTitle, myUid, nameOf, onDone, extra = null }) {
  const mine = rec.doneBy?.[myUid];
  const by = nameOf(rec.createdByUid) || "Ana hesap";
  const rows = [
    kind === "plan" && rec.date && ["cal", "Zaman", when(rec)],
    kind === "task" && rec.due && ["cal", "Son gün", rel(rec.due)],
    kind === "plan" && rec.place && ["pin", "Yer", rec.place],
    rec.cat && rec.cat !== "Genel" && ["tag", "Kategori", rec.cat],
    planTitle && ["cal", "Bağlı plan", planTitle],
  ].filter(Boolean);

  return (
    <div>
      {/* Sporcunun fitness antrenmanında genel kart yok: antrenman kartı (extra) zaman, yer ve içeriği kendisi gösterir */}
      {!extra && (
      <div className="rounded-2xl bg-card px-4 py-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-acc">{KIND[kind]}</p>
        <h3 className="mt-1 text-[1.25rem] font-semibold leading-snug">{rec.title}</h3>
        {kind === "note" && rec.body && rec.body !== rec.title && <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{rec.body}</p>}
        {rows.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {rows.map(([ic, label, value]) => (
              <li key={label} className="flex items-center gap-3 py-2.5 text-[0.9375rem]">
                <Icon name={ic} className="size-5 shrink-0 text-mut" />
                <span>{label}</span>
                <span className="ml-auto min-w-0 truncate text-right font-medium">{value}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-mut">
          <Icon name="user" className="size-4" /> {by} verdi{rec.createdAt ? ` · ${stamp(rec.createdAt)}` : ""} · değiştiremezsin
        </p>
      </div>
      )}

      {extra}
      {/* Yalnızca kendisi için */}
      {!extra && (
      <button
        onClick={() => onDone(!mine)}
        className={`mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[1rem] font-semibold transition active:scale-[.98] ${mine ? "bg-ok/10 text-ok ring-1 ring-ok/30" : "bg-acc text-white"}`}
      >
        <Icon name="check" className="size-5 [stroke-width:2.5]" />
        {mine ? `${doneOf(kind).mine} · ${stamp(mine)}` : doneOf(kind).act}
      </button>
      )}
      {mine && !extra && <p className="mt-1 text-center text-[0.75rem] text-mut">Geri almak için tekrar dokun</p>}

    </div>
  );
}
