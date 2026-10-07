// Ana sayfanın ortak görünümü: her kart aynı köşe, zemin, çizgi ve gölgeyle; her bölüm başlığı aynı biçimde.
// Yeni ana sayfa bölümü bunları kullanır (kart sınıfı elle yazılmaz), böylece sayfa tek dilde kalır.
export const CARD = "rounded-[1.25rem] bg-card ring-1 ring-line/70 shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]";
// Dokunulabilir kart (dikkat isteyen özet kartında çerçeve "ring-2 ring-amber-500/45" olur, HomeSummary) (kısayol, özet kartı): aynı görünüm + basınca hafif küçülme
export const TAP = `${CARD} transition active:scale-[.97]`;

// Bölüm başlığı: solda büyük harf ad (isteğe bağlı sayı), sağda tek eylem (Tümü, Kapat…)
export function SectionHead({ id, title, count, children }) {
  return (
    <div className="mb-2.5 flex min-h-7 items-center justify-between gap-3 px-1">
      <h2 id={id} className="text-[0.75rem] font-bold tracking-[.08em] text-mut">
        {title}
        {count > 0 && <span className="ml-1.5 font-semibold tabular-nums tracking-normal">{count}</span>}
      </h2>
      {children && <span className="flex shrink-0 items-center gap-3 text-[0.8125rem]">{children}</span>}
    </div>
  );
}
