// Sayfa geçişi: her sayfa açılırken kısa, yumuşak bir belirme (yalnızca saydamlık).
// Kaydırma (transform) kullanılmaz: sayfadaki sabit (fixed) pencereler geçiş sırasında yerinden oynamasın.
export default function Template({ children }) {
  return <div className="page-in">{children}</div>;
}
