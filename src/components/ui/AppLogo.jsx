/** Uygulama logosu — mikrofon + ses dalgaları */
export function AppLogo({ size = 56, className = "", rounded = true }) {
  return (
    <img
      src="/logo.svg"
      alt="Sesli Asistan"
      width={size}
      height={size}
      className={`${rounded ? "rounded-[22%]" : ""} ${className}`.trim()}
      draggable={false}
    />
  );
}
