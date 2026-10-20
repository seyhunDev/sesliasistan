"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Ayarlar sayfasının yapı taşları: gruplu liste, tek satırlık satır (solda ad, sağda değer), anahtar, çipler, düğme.
// Her satır aynı düzende: simge yok, açıklama yok; ayrıntı dokununca satırın altında açılır (Seyhun, 2026-10-20).

// Grup: küçük gri başlık + ince çizgili düz kart + isteğe bağlı alt not
export function Group({ title, footer, children }) {
  return (
    <section className="mt-5">
      {title && <h2 className="mb-1.5 px-4 text-[0.875rem] font-semibold text-mut">{title}</h2>}
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>
      {footer && <p className="mt-2 px-4 text-[0.75rem] leading-snug text-mut">{footer}</p>}
    </section>
  );
}

// Satır: ad + sağda değer (sub) + anahtar ya da ok. note: satırın altında kısa durum/uyarı (ör. bildirim açılamıyor).
// desc: başlığın altında açıklama (yalnız Mail ayarları gibi bilgi sayfalarında; Ayarlar'da kullanılmaz).
// href ya da onClick varsa dokunulabilir; open verilirse ok aşağı döner (altı açık).
export function Row({ title, sub, desc, note, right, href, onClick, danger, chevron, open, children }) {
  const head = (
    <div className="px-4">
      <div className="flex min-h-[3rem] items-center gap-3">
        <span className="min-w-0 flex-1 py-2.5">
          <span className={`block truncate text-[1rem] font-medium ${danger ? "text-rec" : ""}`}>{title}</span>
          {desc && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{desc}</span>}
        </span>
        {sub && <span className="min-w-0 max-w-[55%] truncate text-[0.9375rem] text-mut">{sub}</span>}
        {right}
        {(chevron || href || open != null) && <Icon name="chev" className={`size-4 shrink-0 text-mut/70 transition ${open ? "rotate-90" : ""}`} />}
      </div>
      {note && <p className="-mt-1.5 pb-2.5 text-[0.8125rem] leading-snug text-rec">{note}</p>}
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
      className={`relative h-[1.75rem] w-[2.875rem] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${on ? "bg-acc" : "bg-line"}`}
    >
      <span className={`absolute top-[0.125rem] size-[1.5rem] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-all duration-200 ${on ? "left-[1.25rem]" : "left-[0.125rem]"}`} />
    </button>
  );
}

// Tek seçim çipleri (satırın altında)
export function Chips({ value, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 text-[0.875rem] font-medium transition active:scale-95 ${value === v ? "bg-acc text-white" : "border border-line bg-card text-fg"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Ayarlardaki tüm düğmeler üç çeşit: main (mor dolu), line (ince çerçeve), danger (kırmızı yazı, ince çerçeve).
// small: satır içinde dar düğme; yoksa bulunduğu yeri doldurur.
const BTN = {
  main: "bg-acc text-white",
  line: "border border-line bg-card text-fg",
  danger: "border border-rec/30 bg-card text-rec",
};
export function Btn({ kind = "main", small, href, className = "", children, ...p }) {
  const cls = `inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[.97] disabled:opacity-40 ${
    small ? "h-8 shrink-0 px-3 text-[0.8125rem]" : "h-10 w-full flex-1 px-3 text-[0.9375rem]"
  } ${BTN[kind] || BTN.main} ${className}`;
  if (href) return <a href={href} className={cls} {...p}>{children}</a>;
  return <button type="button" className={cls} {...p}>{children}</button>;
}

// Durum rozeti (ör. "İzin verildi")
export function Badge({ children, tone = "mut" }) {
  const t = { ok: "bg-ok/10 text-ok", warn: "bg-amber-500/10 text-amber-700", mut: "bg-bg text-mut" }[tone];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${t}`}>{children}</span>;
}
