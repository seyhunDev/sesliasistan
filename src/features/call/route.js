// Ses nereden çıksın: ahize (telefonu kulağa tutunca) ya da hoparlör.
// iPhone web uygulamasında tek yol navigator.audioSession (Safari 16.4+): mikrofon açıkken "auto" hoparlörden çalar,
// "play-and-record" ses oturumunu telefon görüşmesi kipine alır ve ses ahizeden gelir. Tür yalnız mikrofon AÇILDIKTAN
// sonra değiştirilir (önce yazınca mikrofon açılamıyordu, bkz. lib/speech/audioSession.js). Kulaklık/AirPods bağlıysa
// iPhone sesi kendisi oraya verir. Destek yoksa (Android, bilgisayar) düğme görünmez, ses cihazın varsayılanından çıkar.
const session = () => (typeof navigator !== "undefined" ? navigator.audioSession : null);

export const routeSupported = () => !!session();

export function setRoute(speaker) {
  const s = session();
  if (!s) return false;
  const t = speaker ? "auto" : "play-and-record";
  try {
    if (s.type !== t) s.type = t;
    return true;
  } catch {
    return false;
  }
}
