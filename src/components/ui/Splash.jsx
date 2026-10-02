import { AppLogo } from "./AppLogo";

// Açılış: ortada logo ve ad; altta ana sayfadaki yeşil kubbenin aynısı (yayında akan ışık = yükleniyor).
// Uygulama açılınca kubbe yerinde kalır, yalnız sayfa belirir: açılıştan ana sayfaya kesintisiz geçiş.
export function Splash() {
  return (
    <div className="min-h-dvh bg-bg" role="status" aria-label="Yükleniyor">
      <div className="fixed inset-x-0 top-0 bottom-[calc(8.25rem+max(0.375rem,env(safe-area-inset-bottom)))] grid place-items-center">
        <div className="splash-in flex flex-col items-center">
          <AppLogo size={72} className="shadow-[0_14px_34px_-14px_rgba(31,90,75,.7)]" />
          <p className="mt-4 text-[1.0625rem] font-semibold tracking-tight">Sesli Asistan</p>
        </div>
      </div>
      <div data-state="busy" className="dome fixed inset-x-0 bottom-0 h-[calc(8.25rem+max(0.375rem,env(safe-area-inset-bottom)))]" aria-hidden="true">
        <span className="dome-glow" />
        <svg className="dome-rim" viewBox="0 0 100 10" preserveAspectRatio="none">
          <path className="rim" d="M0 10 A50 10 0 0 1 100 10" />
          <path className="flow" d="M0 10 A50 10 0 0 1 100 10" />
        </svg>
        <span data-state="busy" className="vlight absolute left-1/2 top-[2.875rem] size-[3.75rem] -translate-x-1/2 -translate-y-1/2">
          <span className="vl-halo" />
          <span className="vl-ring" />
          <span className="vl-disc" />
          <span className="vl-wave">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </span>
      </div>
    </div>
  );
}
