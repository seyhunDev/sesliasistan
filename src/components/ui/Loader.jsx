// Uygulamanın tek yükleme animasyonu: sırayla nefes alan üç nokta (renk: yazı rengi, className ile değişir).
// size: "sm" (düğme içi) | "md" | "lg". Loading: ortalanmış nokta + isteğe bağlı açıklama.
const D = { xs: 4, sm: 5, md: 7, lg: 9 };

export function Loader({ size = "md", className = "text-acc", label = "Yükleniyor" }) {
  return (
    <span role="status" aria-label={label} className={`loader ${className}`} style={{ "--d": `${D[size] || D.md}px` }}>
      <i />
      <i />
      <i />
    </span>
  );
}

export function Loading({ label, className = "py-12" }) {
  return (
    <div className={`fade-in flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      <Loader />
      {label && <p className="text-[0.875rem] text-mut">{label}</p>}
    </div>
  );
}
