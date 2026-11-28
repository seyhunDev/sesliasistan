// Kaydırırken yanlışlıkla tıklanma (Seyhun 2026-11-28 "aşağı kaydırırken bir şeye tıklanıyor ve ona gidiliyor"):
// iOS gibi yalnız kısa ve kımıldamayan dokunuş tıklama sayılır. Parmak 10 px'ten fazla kaydıysa, dokunurken sayfa
// (ya da içteki bir liste) kaydıysa ya da dokunuş kaydırmanın süzülmesini durdurmak içinse gelen click iptal edilir.
// Gerçek dokunuşta hafif titreşim (iPhone uygulamasında Taptic) burada tek yerden verilir; kaydırırken hiç titremez.
import { haptic } from "@/lib/haptic";

export const TAP_SLOP = 10; // px: bundan fazla kayan parmak tıklama değil
const CLICK_WINDOW = 800; // ms: dokunuş bitişinden sonra gelen click bu dokunuşa ait sayılır
const FLING_GAP = 150; // ms: kaydırma bundan yakın zamanda olduysa dokunuş süzülmeyi durdurmak içindir
const USER_SCROLL = 3000; // ms: dokunuştan sonra bu süre içindeki kaydırma parmağın kaydırmasıdır (süzülme)

// Saf karar: test edilebilsin diye olaylardan ayrı
export function shouldBlock({ moved = 0, scrolledDuring = false, startedInFling = false } = {}) {
  return moved > TAP_SLOP || scrolledDuring || startedInFling;
}

const FEEL = "button, a[href], [data-press], [role=button], [role=tab], [role=switch], summary, label";
const FREE = "input, textarea, select, [contenteditable=true], [data-tap-free]";

export function installTapGuard(win = window) {
  const doc = win.document;
  let touching = false;
  let x = 0;
  let y = 0;
  let moved = 0;
  let scrolledDuring = false;
  let startedInFling = false;
  let lastScroll = -1e9;
  let lastTouch = -1e9;
  let endAt = -1e9;
  let block = false;
  const now = () => win.performance?.now?.() ?? Date.now();

  const start = (e) => {
    if (e.touches.length > 1) return void (moved = Infinity); // iki parmak (yakınlaştırma) tıklama değil
    const t = e.touches[0];
    touching = true;
    x = t.clientX;
    y = t.clientY;
    moved = 0;
    scrolledDuring = false;
    startedInFling = now() - lastScroll < FLING_GAP;
    lastTouch = now();
  };
  const move = (e) => {
    const t = e.touches[0];
    if (t) moved = Math.max(moved, Math.hypot(t.clientX - x, t.clientY - y));
  };
  const end = (e) => {
    if (e.touches.length) return;
    touching = false;
    lastTouch = endAt = now();
    block = shouldBlock({ moved, scrolledDuring, startedInFling });
  };
  const cancel = () => {
    touching = false;
    endAt = now();
    block = true;
  };
  // Yalnız parmağın yol açtığı kaydırma sayılır (sohbetin kendi kendine aşağı inmesi dokunuşu bozmasın)
  const scroll = () => {
    if (!touching && now() - lastTouch > USER_SCROLL) return;
    lastScroll = now();
    if (touching) scrolledDuring = true;
  };
  const click = (e) => {
    if (e.detail === 0 || now() - endAt > CLICK_WINDOW) return; // klavye, fare ya da kodla gelen click
    const free = e.target?.closest?.(FREE);
    if (block && !free) {
      block = false;
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    endAt = -1e9; // aynı dokunuşun ikinci click'i (label → input) yeniden titremesin
    if (!free && e.target?.closest?.(FEEL)) haptic("light");
  };

  const o = { passive: true, capture: true };
  win.addEventListener("touchstart", start, o);
  win.addEventListener("touchmove", move, o);
  win.addEventListener("touchend", end, o);
  win.addEventListener("touchcancel", cancel, o);
  doc.addEventListener("scroll", scroll, o);
  win.addEventListener("click", click, true);
  return () => {
    win.removeEventListener("touchstart", start, o);
    win.removeEventListener("touchmove", move, o);
    win.removeEventListener("touchend", end, o);
    win.removeEventListener("touchcancel", cancel, o);
    doc.removeEventListener("scroll", scroll, o);
    win.removeEventListener("click", click, true);
  };
}
