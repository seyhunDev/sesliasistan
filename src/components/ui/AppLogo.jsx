/** Uygulama logosu (Velora): ortadaki ışığın çevresinde ses çubukları (public/brand/velora-mark.svg).
 *  variant "mark": yalnız simge, "full": simge + Velora yazısı (geniş yerler). Zemin saydam; size simgenin genişliğidir. */

// Çubukların boyu (24 çubuk bu sırayla tekrarlar); açılış ekranı aynı çizimi canlandırır (BootSplash)
export const RAY_LENGTHS = [60, 100, 140, 90, 120, 70, 150, 85];
export const RAYS = Array.from({ length: 24 }, (_, i) => ({ angle: i * 15, len: RAY_LENGTHS[i % 8] }));

export function AppLogo({ size = 56, variant = "mark", className = "" }) {
  const mark = <img src="/brand/velora-mark.svg" alt={variant === "full" ? "" : "Velora"} width={size} height={size} draggable={false} />;
  if (variant !== "full") return className ? <span className={className}>{mark}</span> : mark;
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {mark}
      <span className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.02em] text-fg">Velora</span>
    </div>
  );
}
