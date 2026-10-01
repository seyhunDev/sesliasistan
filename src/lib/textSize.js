// Yazı ve simge boyutu: "" (normal), "l" (büyük), "xl" (çok büyük). Profilde (users.textSize) ve cihazda (sa-size) tutulur.
export const SIZES = [
  ["", "Normal"],
  ["l", "Büyük"],
  ["xl", "Çok büyük"],
];
export const cleanSize = (v) => (v === "l" || v === "xl" ? v : "");

// Sayfaya uygula ve cihazda hatırla (bir sonraki açılışta ilk çizimden önce uygulanır)
export function applySize(v) {
  const s = cleanSize(v);
  if (typeof document !== "undefined") {
    if (s) document.documentElement.dataset.size = s;
    else delete document.documentElement.dataset.size;
  }
  try {
    localStorage.setItem("sa-size", s);
  } catch {}
}
