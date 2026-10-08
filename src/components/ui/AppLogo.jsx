/** Uygulama logosu: yeşil zeminde beyaz küre, çevresinde dolan sarı halka, ortada onay işareti (public/logo.svg) */
export function AppLogo({ size = 56, className = "" }) {
  return (
    <img
      src="/logo.svg"
      alt="Sesli Asistan"
      width={size}
      height={size}
      className={`rounded-[22%] ${className}`.trim()}
      draggable={false}
    />
  );
}
