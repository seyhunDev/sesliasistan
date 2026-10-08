// Arama sesleri (dosyasız, WebAudio ile): "in" gelen arama zili, "back" arayan tarafta çalma sesi.
// iPhone ses çalmak için bir dokunuş ister: uygulamada ilk dokunuşta ses açılır (unlock). Dokunuş olmadıysa zil sessiz kalabilir.
let ctx = null;
function audioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = audioCtx();
    c?.resume?.().catch(() => {});
    window.removeEventListener("pointerdown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
}

function beep(c, freqs, from, len, vol) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, from);
  g.gain.linearRampToValueAtTime(vol, from + 0.02);
  g.gain.setValueAtTime(vol, from + len - 0.03);
  g.gain.linearRampToValueAtTime(0, from + len);
  g.connect(c.destination);
  for (const f of freqs) {
    const o = c.createOscillator();
    o.frequency.value = f;
    o.connect(g);
    o.start(from);
    o.stop(from + len);
  }
}

// Döngüyü başlatır, durdurma işlevini döndürür
export function startRing(kind = "in") {
  const c = audioCtx();
  let stopped = false;
  const play = () => {
    if (stopped || !c) return;
    c.resume?.().catch(() => {});
    const t = c.currentTime + 0.05;
    if (kind === "in") {
      beep(c, [880, 1320], t, 0.35, 0.12);
      beep(c, [880, 1320], t + 0.5, 0.35, 0.12);
    } else beep(c, [425], t, 1.0, 0.08);
    try {
      navigator.vibrate?.(kind === "in" ? [400, 200, 400] : 0);
    } catch {}
  };
  play();
  const id = setInterval(play, kind === "in" ? 2500 : 4000);
  return () => {
    stopped = true;
    clearInterval(id);
    try {
      navigator.vibrate?.(0);
    } catch {}
  };
}
