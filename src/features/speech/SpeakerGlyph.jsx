// Sesli yanıt simgesi (Seyhun 2026-11-04 "B · Dolu daire"): dolu hoparlör; açıkken iki ses dalgası, kapalıyken dalgalar
// söner ve hoparlörün üstüne çizgi çizilir. Tek çizim, durum değişince yumuşak geçer (globals.css › SES SİMGESİ).
export function SpeakerGlyph({ on, className = "size-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`spk ${on ? "" : "spk-off"} ${className}`}>
      <path d="M3.5 9.6c0-.6.4-1 1-1h2.6l4.1-3.4c.6-.5 1.5-.1 1.5.7v12.2c0 .8-.9 1.2-1.5.7l-4.1-3.4H4.5c-.6 0-1-.4-1-1z" fill="currentColor" stroke="none" />
      <path className="spk-w" d="M16 9.2a4 4 0 0 1 0 5.6" />
      <path className="spk-w" d="M18.8 6.6a7.6 7.6 0 0 1 0 10.8" />
      <path className="spk-sl" d="M4 4l16 16" />
    </svg>
  );
}
