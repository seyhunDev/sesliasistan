// Ortak düğme görünümü (Seyhun, 2026-10-20: "butonları tek bir yerden yönetmeliyiz"). Renkler, yükseklik ve basılı hal
// globals.css'teki .btn sınıflarında; düğme yerine bağlantı (Link) gerekirse bu sınıf ve data-press verilir.
// back: geri düğmesi (yuvarlak, kabarık; BackButton.jsx)
export const BUTTON_VARIANTS = ["primary", "secondary", "text", "icon", "danger", "back"];

// Eski adlar: ghost = ikincil
const ALIAS = { ghost: "secondary" };

export function buttonClass({ variant = "primary", size = "md", full } = {}) {
  const v = BUTTON_VARIANTS.includes(ALIAS[variant] || variant) ? ALIAS[variant] || variant : "primary";
  // Ana, ikincil ve tehlike düğmeleri öntanımlı olarak satırı doldurur; yazı, simge ve geri düğmeleri doldurmaz
  const wide = full ?? !["text", "icon", "back"].includes(v);
  return ["btn", `btn-${v}`, size === "sm" ? "btn-sm" : "", wide ? "w-full" : ""].filter(Boolean).join(" ");
}
