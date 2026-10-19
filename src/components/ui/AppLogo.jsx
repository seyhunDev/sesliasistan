/** Uygulama logosu (VOCA, public/brand). variant "full": dalga + VOCA yazısı (geniş yerler), "mark": yalnız dalga (küçük yerler).
 *  Zemin saydam; size genişliktir. */
const LOGOS = {
  full: { src: "/brand/voca-full.webp", w: 900, h: 622 },
  mark: { src: "/brand/voca-mark.webp", w: 800, h: 404 },
};

export function AppLogo({ size = 56, variant = "mark", className = "" }) {
  const l = LOGOS[variant] || LOGOS.mark;
  return (
    <img
      src={l.src}
      alt="VOCA"
      width={size}
      height={Math.round((size * l.h) / l.w)}
      className={className || undefined}
      draggable={false}
    />
  );
}
