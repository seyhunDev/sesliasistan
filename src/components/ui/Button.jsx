import { Loader } from "./Loader";
import { buttonClass } from "./buttonClass";

// variant: primary (ana) · secondary (ikincil; eski adı ghost) · text (yazı) · icon (simge) · danger (tehlike) · back (geri, BackButton); size: md · sm
export function Button({ variant = "primary", size = "md", full, loading, children, className = "", disabled, ...p }) {
  return (
    <button {...p} data-press disabled={disabled || loading} className={`${buttonClass({ variant, size, full })} ${className}`}>
      {loading && <Loader size="sm" className="text-current" />}
      {loading ? "Bekleyin…" : children}
    </button>
  );
}
