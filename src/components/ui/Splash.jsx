import { AppLogo } from "./AppLogo";

// Açılış: ortada logo, ad ve yükleniyor noktaları. Asistan çubuğu (kubbe) burada yok; uygulama yüklenince
// alttan yükselerek gelir (globals.css › .dome-rise).
export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg" role="status" aria-label="Yükleniyor">
      <div className="splash-in flex flex-col items-center">
        <AppLogo size={72} className="shadow-[0_14px_34px_-14px_rgba(31,90,75,.7)]" />
        <p className="mt-4 text-[1.0625rem] font-semibold tracking-tight">Sesli Asistan</p>
        <span className="loader mt-5 text-acc" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
