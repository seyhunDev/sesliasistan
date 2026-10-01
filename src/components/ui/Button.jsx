import { Loader } from "./Loader";

export function Button({ variant = "primary", loading, children, className = "", disabled, ...p }) {
  const base = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition active:scale-[.98] disabled:opacity-60";
  const look = variant === "primary" ? "bg-acc text-white" : "border border-line bg-card text-fg";
  return (
    <button {...p} disabled={disabled || loading} className={`${base} ${look} ${className}`}>
      {loading && <Loader size="sm" className="text-current" />}
      {loading ? "Bekleyin…" : children}
    </button>
  );
}
