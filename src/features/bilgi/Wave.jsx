// Ses dalgası (konuşma göstergesi; Yönet'teki tekne balonu da aynı biçim)
export function Wave() {
  return (
    <span className="bz-wave" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

// Kayıt sürerken üstte çıkan iptal yeri: parmağı buraya (ya da düğmeden uzağa) kaydırıp bırakınca ses gitmez
export function PttCancel({ on, className = "bzy-pcx" }) {
  return (
    <div className={className} data-on={on ? "1" : undefined} aria-live="polite">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
      {on ? "Bırak: iptal" : "İptal için kaydır"}
    </div>
  );
}
