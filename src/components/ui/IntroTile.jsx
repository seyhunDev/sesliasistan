"use client";

// Ortak tanıtım kutusu (Seyhun 2026-11-23, örnek project-files/tanitim-kutulari/ornek.html): üstte canlı önizleme, altta ad + ne
// olduğunu söyleyen tek satır. Düğmeler (children) varsa altta durur ve kutu dokunulmaz; yoksa bütün kutu tek düğmedir (sağda ›).
// Kullananlar: ana sayfada Tekne Ekranı (BilgiTile) ve Velora Sailing (SailingTile). Görünüm globals.css ".it".
export function IntroTile({ preview, title, sub, onOpen, label, short = false, children }) {
  const body = (
    <>
      <div className={`it-pv${short ? " it-pv-short" : ""}`} aria-hidden>
        {preview}
      </div>
      <div className="it-bd">
        <span className="it-tx">
          <b className="it-t">{title}</b>
          {sub && <span className="it-s">{sub}</span>}
        </span>
        {!children && (
          <span className="it-go" aria-hidden>
            ›
          </span>
        )}
      </div>
    </>
  );
  if (children)
    return (
      <section className="it" aria-label={label || title}>
        {body}
        <div className="it-acts">{children}</div>
      </section>
    );
  return (
    <button type="button" data-press className="it it-btn" onClick={onOpen} aria-label={label || title}>
      {body}
    </button>
  );
}
