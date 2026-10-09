// iPhone ses oturumu (Safari 16.4+, navigator.audioSession).
// Mikrofon açılınca iOS ses oturumunu kayıt kipine alır, arka plandaki YouTube/müzik durur (normal).
// Yerel uygulamalar mikrofonla iş bitince oturumu bırakıp diğerlerine "devam edebilirsin" der; web'de bunun
// tek yolu navigator.audioSession. Mikrofon TAMAMEN kapandıktan sonra kip kısa bir an "transient"e
// (kısa ses: diğerleri susar, bitince devam eder) alınır, çalan sesimiz olmadığı için iOS oturumu bırakır
// ve arka plandaki ses devam eder; ardından kip hemen "auto"ya döner.
// İlk denemede (PR #140) mikrofon açılmadan önce "play-and-record" yazılıyor ve kip "transient"te bırakılıyordu;
// kayıt boş geldi ("Ses alınamadı") ve mikrofon açılamadı ("Mikrofon bulunamadı"). Artık:
// - mikrofon açılırken kip her zaman "auto"ya döner (iPhone mikrofonu kendisi kayıt kipine alır, önceki gibi),
// - "transient" yalnız hiçbir mikrofon açık değilken ve en çok RELEASE_MS sürer,
// - bir hata olursa sessizce eski davranışa düşer (kip "auto"da kalır).
// Destek yoksa (Chrome, eski iOS) hiçbir şey yapmaz. Sorun çıkarsa SESSION_SWITCH = false: yalnız sıfırlama kalır.
// Kapatıldı (2026-10-09, denetim A1): "Ses alınamadı" hatasının en güçlü şüphelisi. Bedeli: YouTube mikrofondan sonra kendiliğinden devam etmez.
export const SESSION_SWITCH = false;
export const CLOSE_WAIT_MS = 300; // izlerin gerçekten kapanması için bekleme
export const RELEASE_MS = 600; // "transient"te kalma süresi

const session = () => (typeof navigator !== "undefined" ? navigator.audioSession : null);

const setType = (t) => {
  const s = session();
  if (!s) return false;
  try {
    if (s.type !== t) s.type = t;
    return true;
  } catch {
    return false;
  }
};

// Oturumu varsayılana döndür (mikrofon açılırken ve açılamadığında yeniden denemeden önce)
export function micReset() {
  const s = session();
  if (s && s.type !== "auto" && s.type !== "play-and-record") setType("auto");
}

let mics = 0; // aynı anda açık mikrofon sayısı (asistan, toplantı)
let timers = [];
const clear = () => {
  timers.forEach(clearTimeout);
  timers = [];
};

// getUserMedia'dan hemen önce
export function micOpening(on = SESSION_SWITCH) {
  if (on) {
    mics += 1;
    clear(); // bırakma sürüyorsa iptal
  }
  micReset();
}

// Mikrofon izleri durdurulup ses motoru kapatıldıktan sonra
export function micClosed(on = SESSION_SWITCH) {
  if (!on) return;
  mics = Math.max(0, mics - 1);
  if (mics) return;
  clear();
  timers.push(
    setTimeout(() => {
      if (mics) return;
      if (!setType("transient")) return setType("auto");
      timers.push(setTimeout(() => !mics && setType("auto"), RELEASE_MS));
    }, CLOSE_WAIT_MS),
  );
}
