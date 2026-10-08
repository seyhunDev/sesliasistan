// Ses nereden çıksın: ahize (telefonu kulağa tutunca) ya da hoparlör.
// iPhone web uygulamasında yol navigator.audioSession (Safari 16.4+): mikrofon açıkken "auto" hoparlörden çalar,
// "play-and-record" ses oturumunu telefon görüşmesi kipine alır ve ses ahizeden gelir. Tür yalnız mikrofon AÇILDIKTAN
// sonra değiştirilir (önce yazınca mikrofon açılamıyordu, bkz. lib/speech/audioSession.js). Kulaklık/AirPods bağlıysa
// iPhone sesi kendisi oraya verir.
// Android (Chrome): ses çıkışı <audio>.setSinkId ile seçilir; telefon ahize ve hoparlörü ayrı çıkış olarak veriyorsa
// (cihaz adında earpiece/receiver/handset ya da speaker) düğme görünür. Vermiyorsa Chrome'un kendi seçimi kalır
// (çoğu telefonda hoparlör); web'den başka yolu yok.
import { pickSink } from "@/lib/call";

const session = () => (typeof navigator !== "undefined" ? navigator.audioSession : null);

export const routeSupported = () => !!session();

// Android: ahize ve hoparlör çıkışları { ear, spk } (mikrofon izni verildikten sonra adlar okunur)
export async function sinks(el) {
  if (session() || !el?.setSinkId || !navigator.mediaDevices?.enumerateDevices) return null;
  try {
    const list = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audiooutput");
    const ear = pickSink(list, false);
    const spk = pickSink(list, true);
    return ear && spk && ear !== spk ? { ear, spk } : null;
  } catch {
    return null;
  }
}

export function setRoute(speaker, el) {
  const s = session();
  if (!s) {
    if (el?.setSinkId)
      sinks(el)
        .then((o) => o && el.setSinkId(speaker ? o.spk : o.ear))
        .catch(() => {});
    return false;
  }
  const t = speaker ? "auto" : "play-and-record";
  try {
    if (s.type !== t) s.type = t;
    return true;
  } catch {
    return false;
  }
}
