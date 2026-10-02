/** Uygulama logosu: deniz yeşili zeminde ufuk yayı ve üstünde ses dalgası (public/logo.svg) */
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
