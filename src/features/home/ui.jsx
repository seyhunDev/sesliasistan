// Ana sayfanın ortak görünümü: her kart aynı köşe, zemin, çizgi ve gölgeyle; her bölüm başlığı aynı biçimde.
// Yeni ana sayfa bölümü bunları kullanır (kart sınıfı elle yazılmaz), böylece sayfa tek dilde kalır.
export const CARD = "rounded-[1.25rem] bg-card ring-1 ring-line/70 shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]";
// Dokunulabilir kart (dikkat isteyen özet kartında çerçeve "ring-2 ring-amber-500/45" olur, HomeSummary) (kısayol, özet kartı): aynı görünüm + basınca hafif küçülme
export const TAP = `${CARD} transition active:scale-[.97]`;

// Göz yormayan kart (.calm sayfaları): gölgesiz, ince çizgi; içi yazı satırları
export const CALM = "rounded-[1.125rem] border border-line bg-card";

// Gruplu ana sayfa kartı (.calm.grouped, iPhone ayarlar düzeni): çerçevesiz, küçük köşe; içindeki satırlar ince çizgiyle ayrılır
export const GROUP = "overflow-hidden rounded-xl bg-card";

// Bölüm başlığı (iPhone gruplu liste gibi): solda küçük büyük harfli gri ad ("KULÜP", isteğe bağlı sayı), sağda tek eylem (Tümü, Kapat…)
export function SectionHead({ id, title, count, children }) {
  return (
    <div className="mb-1.5 flex min-h-6 items-center justify-between gap-3 px-3.5">
      <h2 id={id} className="text-[0.8125rem] font-normal uppercase tracking-[.02em] text-mut">
        {title}
        {count > 0 && <span className="ml-1.5 font-normal tabular-nums text-mut">{count}</span>}
      </h2>
      {children && <span className="flex shrink-0 items-center gap-3 text-[0.8125rem] font-semibold">{children}</span>}
    </div>
  );
}
