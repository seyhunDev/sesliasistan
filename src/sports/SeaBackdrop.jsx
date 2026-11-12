// Spor seçiminin arka planı: lacivert gece denizi. Ufukta ışık, üç dalga katmanı yavaşça akar, uzakta küçük bir yelken süzülür.
// Yalnız CSS ve SVG (resim dosyası yok); hareket azaltıldıysa durur (globals.css "Spor seçimi").
const wave = (y, a) => {
  let d = `M0 ${y}`;
  for (let x = 0; x < 1600; x += 200) d += ` q50 ${-a} 100 0 t100 0`;
  return `${d} V200 H0 Z`;
};

export function SeaBackdrop() {
  return (
    <div className="sea-bg" aria-hidden="true">
      <div className="sea-glow" />
      <div className="sea-stars" />
      <svg className="sea-far" viewBox="0 0 40 48" width="22" height="26">
        <path d="M20 2v38" stroke="#bcd0ff" strokeWidth="1.5" />
        <path d="M21 4l15 34H21z" fill="#bcd0ff" />
        <path d="M19 12L7 38h12z" fill="#8fb3ff" />
        <path d="M5 41h30l-4 5H9z" fill="#bcd0ff" />
      </svg>
      <div className="sea-waves">
        {[
          ["sea-w1", 40, 6, "#122b55"],
          ["sea-w2", 90, 9, "#163870"],
          ["sea-w3", 140, 12, "#1b4689"],
        ].map(([c, y, a, f]) => (
          <svg key={c} className={`sea-w ${c}`} viewBox="0 0 1600 200" preserveAspectRatio="none">
            <path d={wave(y, a)} fill={f} />
            <path d={wave(y, a).replace(/ V200 H0 Z$/, "")} fill="none" stroke="#8fb3ff" strokeOpacity=".22" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        ))}
      </div>
    </div>
  );
}
