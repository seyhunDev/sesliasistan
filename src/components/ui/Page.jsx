import Link from "next/link";
import { Icon } from "./Icon";

// Yeni tasarımın ortak parçaları (ana sayfadaki "akıllı akış" ile aynı dil)

export const card = "rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]";

// Koyu üst kart: sayfanın özeti (sayılar, küçük grafik)
export function Hero({ children, className = "" }) {
  return <section className={`rounded-[1.625rem] bg-[#2c5163] px-[1.125rem] py-4 text-white ${className}`}>{children}</section>;
}

// Koyu kart içindeki küçük başlık
export function HeroLabel({ children }) {
  return <span className="block text-[0.6875rem] font-semibold tracking-[.1em] text-white/70">{children}</span>;
}

// Koyu kart içindeki sayı kutusu
export function Stat({ n, label, tone }) {
  return (
    <span className="min-w-0 flex-1 rounded-2xl bg-white/10 px-3 py-2">
      <b className={`block text-[1.375rem] font-semibold leading-none tabular-nums ${tone === "rec" ? "text-[#ffb4a8]" : ""}`}>{n}</b>
      <small className="mt-1 block truncate text-[0.6875rem] text-white/75">{label}</small>
    </span>
  );
}

// Bölüm etiketi: BÜYÜK HARF, sağda isteğe bağlı kısa bilgi
export function Label({ children, right, tone, className = "" }) {
  return (
    <div className={`mb-2 mt-6 flex items-center justify-between gap-3 px-1 text-[0.75rem] ${className}`}>
      <span className={`truncate font-bold tracking-[.08em] ${tone === "rec" ? "text-rec" : "text-mut"}`}>{children}</span>
      {right != null && <span className="shrink-0 tabular-nums text-mut">{right}</span>}
    </div>
  );
}

// Segment seçici: [["up", "Yaklaşan", 3], ...]
export function Seg({ value, onChange, options, className = "" }) {
  return (
    <div className={`flex rounded-full bg-line/60 p-1 ${className}`}>
      {options.map(([k, l, n]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          className={`flex-1 rounded-full py-1.5 text-[0.8125rem] font-semibold transition ${value === k ? "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.1)]" : "text-mut"}`}
        >
          {l}
          {n > 0 && <span className="ml-1 font-normal text-mut tabular-nums">{n}</span>}
        </button>
      ))}
    </div>
  );
}

// Çalışanın silme isteği ana hesabın onayını bekliyor
export function DelBadge({ rec }) {
  if (!rec?.deleteReq) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rec/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-rec">
      <Icon name="trash" className="size-3" />
      Silme onayı bekliyor
    </span>
  );
}

// Boş durum
export function Empty({ icon, title, sub }) {
  return (
    <div className={`${card} mt-4 flex flex-col items-center px-6 py-9 text-center`}>
      <span className="grid size-12 place-items-center rounded-2xl bg-acc/10 text-acc">
        <Icon name={icon} className="size-6" />
      </span>
      <b className="mt-3 text-[0.9375rem] font-semibold">{title}</b>
      {sub && <p className="mt-1 text-[0.8125rem] leading-snug text-mut">{sub}</p>}
    </div>
  );
}

// Sayfa başlığındaki Arşiv düğmesi (tamamlanan/geçmiş kayıtlar arşiv tablosunda)
export function ArchiveLink({ type = "" }) {
  return (
    <Link
      href={`/archive${type ? `?t=${type}` : ""}`}
      aria-label="Arşiv"
      className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90"
    >
      <Icon name="archive" className="size-5" />
    </Link>
  );
}
