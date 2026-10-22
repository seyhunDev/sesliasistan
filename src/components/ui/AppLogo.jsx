/** Uygulama logosu (Velora): ortadaki ışığın çevresinde ses çubukları (public/brand/velora-mark.svg).
 *  variant "mark": yalnız simge, "full": simge + Velora yazısı (geniş yerler). Zemin saydam; size simgenin genişliğidir. */

// Çubukların boyu (24 çubuk bu sırayla tekrarlar); açılış ekranı aynı çizimi canlandırır (BootSplash)
export const RAY_LENGTHS = [60, 100, 140, 90, 120, 70, 150, 85];
export const RAYS = Array.from({ length: 24 }, (_, i) => ({ angle: i * 15, len: RAY_LENGTHS[i % 8] }));

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

// Açılış ekranındaki logonun durgun hali (beyaz ışık + hafif hale): giriş ekranında açılış logosu buraya uçar ve yerine geçer
export function GlowMark({ size = 84, ...p }) {
  return (
    <svg viewBox="132 132 760 760" width={size} height={size} aria-hidden="true" {...p}>
      <defs>
        <linearGradient id="glow-g" gradientUnits="userSpaceOnUse" x1="160" y1="160" x2="864" y2="864">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <g stroke="url(#glow-g)" strokeWidth="30" strokeLinecap="round">
        {RAYS.map((r, i) => (
          <line key={i} x1="512" y1="312" x2="512" y2={312 - r.len} transform={`rotate(${r.angle} 512 512)`} />
        ))}
      </g>
      <circle cx="512" cy="512" r="96" fill="url(#glow-g)" opacity=".5" style={{ filter: "blur(8px)" }} />
      <circle cx="512" cy="512" r="64" fill="#fff" />
    </svg>
  );
}
