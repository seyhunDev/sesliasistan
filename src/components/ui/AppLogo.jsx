/** Uygulama logosu (Velora, Seyhun 2026-11-03): beyaz dairenin içinden oyulmuş dolu V, üstü açık. Sol kolun iç kenarı
 *  rüzgârla dolan yelken gibi kavisli. Simge: koyu lacivert (#0b1a33) yuvarlak kare üstünde (public/brand/velora-mark.svg);
 *  koyu zeminlerde yalnız işaret (VeloraGlyph, zemin saydam, V boşluğundan arkası görünür).
 *  variant "mark": yalnız simge, "full": simge + Velora yazısı (geniş yerler). size simgenin genişliğidir. */

// İşaretin çizimi (100 birimlik kutu): daire ve içinden oyulan V. Açılış ekranı, iPhone widget'ı ve saat aynı ölçüleri kullanır.
export const MARK_DISC = { cx: 50, cy: 52, r: 30 };
export const MARK_V = "M26 19 L35.6 19 C 42 35, 46 47.8, 50 55.8 L59.6 19 L74 19 L56.4 67 L43.6 67 Z";

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

// Zeminsiz işaret (koyu zeminde beyaz): giriş ekranında açılış logosu buraya uçar ve yerine geçer
export function VeloraGlyph({ size = 84, color = "#fff", ...p }) {
  const id = "vg-cut";
  return (
    <svg viewBox="18 18 64 68" width={size} height={size * (68 / 64)} aria-hidden="true" {...p}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <path d={MARK_V} fill="#000" />
        </mask>
      </defs>
      <circle {...MARK_DISC} fill={color} mask={`url(#${id})`} />
    </svg>
  );
}
