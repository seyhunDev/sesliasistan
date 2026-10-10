// Kenardan kaydırarak geri (iPhone'daki gibi): saf kurallar (SwipeBack.jsx kullanır, testlenir).
// Ana ekrana eklenen uygulamada Safari'nin kenardan geri hareketi yok; geri yalnız sol üstteki küçük düğmeydi.

export const EDGE = 28; // parmak ekranın sol kenarından en çok bu kadar içeride başlamalı (px)
const TAB_ROOTS = ["/", "/calendar", "/messages", "/tasks"];

// Hareket başlayabilir mi: kenardan, tek parmak, alt sekme sayfası değil
export const edgeStart = (x, path) => x >= 0 && x <= EDGE && !TAB_ROOTS.includes(path);

// İlk birkaç pikselde yön belli olur: "swipe" (yana, geri), "scroll" (aşağı-yukarı kaydırma), "" (henüz belli değil)
export function swipeAxis(dx, dy) {
  if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) return "scroll";
  if (dx > 10 && dx > Math.abs(dy) * 1.2) return "swipe";
  if (dx < -10) return "scroll";
  return "";
}

// Parmak kalkınca: ekranın üçte biri ya da hızlı ve en az 40 px sağa çekildiyse geri
export const swipeDone = (dx, ms, width) => dx > Math.min(110, width / 3) || (dx > 40 && dx / Math.max(ms, 1) > 0.45);
