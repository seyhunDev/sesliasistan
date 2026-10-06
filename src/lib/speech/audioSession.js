// iPhone ses oturumu (Safari 16.4+, navigator.audioSession).
// Mikrofon açılınca iOS ses oturumunu "kayıt" kipine alır, arka plandaki YouTube/müzik durur (normal).
// Ama mikrofon kapanınca oturum o kipte kalırsa iOS diğer uygulamalara "devam edebilirsin" demez,
// arka plan sesi kaldığı yerden sürmez. Mikrofon kapanınca kip "transient"e (kısa ses: diğerleri susar,
// bitince devam eder) çekilir; çalan sesimiz yoksa oturum bırakılır ve diğer uygulamalar devam eder.
// Destek yoksa (Chrome, eski iOS) hiçbir şey yapmaz.

const session = () => (typeof navigator !== "undefined" ? navigator.audioSession : null);

const setType = (t) => {
  const s = session();
  if (!s) return;
  try {
    if (s.type !== t) s.type = t;
  } catch {}
};

let mics = 0; // aynı anda açık mikrofon sayısı (asistan, toplantı)
let timer = null;

// getUserMedia'dan hemen önce
export function micOpening() {
  mics += 1;
  clearTimeout(timer);
  setType("play-and-record");
}

// Mikrofon izleri durdurulup ses motoru kapatıldıktan sonra
export function micClosed() {
  mics = Math.max(0, mics - 1);
  if (mics) return;
  clearTimeout(timer);
  // İzlerin gerçekten kapanmasını bekle, sonra oturumu bırak
  timer = setTimeout(() => {
    if (mics) return;
    setType("auto");
    setType("transient");
  }, 150);
}
