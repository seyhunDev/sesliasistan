/** Uygulama logosu (Velora, Seyhun 2026-11-03): beyaz dairenin içinden oyulmuş dolu V, üstü açık. Sol kolun iç kenarı
 *  rüzgârla dolan yelken gibi kavisli. Açık tema (Seyhun 2026-11-23, seçenek A): simge beyaz yuvarlak kare, içinde koyu gri (#1d1d1f)
 *  daire ve beyaz V (public/brand/velora-mark.svg, uygulama ikonları); açılış ve giriş ekranında açık zeminde koyu işaret (VeloraGlyph,
 *  zemin saydam, V boşluğundan arkası görünür). Koyu zeminlerde (canlı ekran, widget) işaret beyaz kalır.
 *  Canlı logo (Seyhun 2026-11-25 "A", ana sayfanın Sahne renkleri): simge Sahne siyahı (#0f0f11) kare, limon (#d4ff3a) daire, V oyuk;
 *  koyu zeminde limon işaret, açık zeminde siyah daire içinde limon V (VeloraGlyph v="#d4ff3a").
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
// v: V'nin içi (verilmezse saydam, arkası görünür); açık zeminde siyah daire + limon V için
export function VeloraGlyph({ size = 84, color = "#d4ff3a", v, ...p }) {
  const id = "vg-cut";
  return (
    <svg viewBox="18 18 64 68" width={size} height={size * (68 / 64)} aria-hidden="true" {...p}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <path d={MARK_V} fill="#000" />
        </mask>
      </defs>
      {v && <circle {...MARK_DISC} style={{ fill: v }} />}
      <circle {...MARK_DISC} fill={color} mask={`url(#${id})`} />
    </svg>
  );
}
