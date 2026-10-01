"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Ayarlar sayfasının yapı taşları: gruplu liste (iOS ayarları gibi), satır, anahtar, seçenek çipleri.

// Grup: küçük büyük harfli başlık + beyaz kart (satırlar arası ince çizgi) + isteğe bağlı açıklama
export function Group({ title, footer, children }) {
  return (
    <section className="mt-6">
      {title && <h2 className="mb-2 px-4 text-[0.75rem] font-semibold tracking-[.06em] text-mut">{title.toLocaleUpperCase("tr-TR")}</h2>}
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">{children}</div>
      {footer && <p className="mt-2 px-4 text-[0.75rem] leading-snug text-mut">{footer}</p>}
    </section>
  );
}

// Renkli kare simge (satırın solunda)
const TONES = {
  acc: "bg-acc text-white",
  ok: "bg-ok text-white",
  rec: "bg-rec text-white",
  amber: "bg-amber-500 text-white",
  violet: "bg-violet-500 text-white",
  slate: "bg-slate-500 text-white",
  sky: "bg-sky-500 text-white",
};
export function Glyph({ icon, tone = "acc" }) {
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-[0.5625rem] ${TONES[tone] || TONES.acc}`}>
      <Icon name={icon} className="size-[1.125rem]" />
    </span>
  );
}

// Satır: simge + başlık/açıklama + sağ taraf (anahtar, değer ya da ok). href ya da onClick varsa dokunulabilir.
export function Row({ icon, tone, title, sub, right, href, onClick, danger, chevron, children }) {
  const head = (
    <div className="flex min-h-[3.5rem] items-center gap-3 px-4 py-2.5">
      {icon && <Glyph icon={icon} tone={danger ? "rec" : tone} />}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[1rem] font-medium ${danger ? "text-rec" : ""}`}>{title}</span>
        {sub && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{sub}</span>}
      </span>
      {right}
      {(chevron || href) && <Icon name="chev" className="size-4 shrink-0 text-mut/70" />}
    </div>
  );
  // Açılan içerik (çipler, test, saat seçimi) dokunulabilir başlığın dışında durur
  return (
    <div>
      {href ? (
        <Link href={href} className="block transition active:bg-bg">{head}</Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className="block w-full text-left transition active:bg-bg">{head}</button>
      ) : (
        head
      )}
      {children}
    </div>
  );
}

export function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-[1.875rem] w-[3.125rem] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${on ? "bg-ok" : "bg-line"}`}
    >
      <span className={`absolute top-[0.125rem] size-[1.625rem] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all duration-200 ${on ? "left-[1.375rem]" : "left-[0.125rem]"}`} />
    </button>
  );
}

// Tek seçim çipleri (satırın altında)
export function Chips({ value, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-3.5 pl-[3.75rem]">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition active:scale-95 ${value === v ? "bg-acc text-white" : "bg-bg text-fg"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Durum rozeti (ör. "İzin verildi")
export function Badge({ children, tone = "mut" }) {
  const t = { ok: "bg-ok/10 text-ok", warn: "bg-amber-500/10 text-amber-700", mut: "bg-bg text-mut" }[tone];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${t}`}>{children}</span>;
}
