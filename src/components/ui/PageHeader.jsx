import { BackLink } from "./BackLink";
import { Icon } from "./Icon";

// Geri düğmesi 44 px, dokunma alanı çevresiyle birlikte daha geniş (küçük düğme zor tutturuluyordu).
// Sayfa başlığı: solda geri (gelinen sayfaya; uygulama burada açıldıysa `back` sayfasına), başlık ve kısa alt satır, sağda isteğe bağlı düğmeler
export function PageHeader({ title, sub, back = "/", children }) {
  return (
    <div className="sticky top-0 z-10 -mx-5 flex items-center gap-2.5 bg-bg/90 px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
      <BackLink
        href={back}
        aria-label="Geri"
        className="relative -my-0.5 grid size-11 shrink-0 touch-manipulation place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] transition before:absolute before:-inset-x-3 before:-inset-y-2 before:content-[''] active:scale-90"
      >
        <Icon name="back" className="size-5" />
      </BackLink>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[1.375rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="truncate text-[0.8125rem] text-mut">{sub}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
