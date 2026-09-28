export function Button({ variant = "primary", loading, children, className = "", disabled, ...p }) {
  const base = "h-12 w-full rounded-xl text-base font-semibold transition active:scale-[.98] disabled:opacity-60";
  const look = variant === "primary" ? "bg-acc text-white" : "border border-line bg-card text-fg";
  return (
    <button {...p} disabled={disabled || loading} className={`${base} ${look} ${className}`}>
      {loading ? "Bekleyin…" : children}
    </button>
  );
}
