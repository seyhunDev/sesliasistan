// Hareketin açıklaması yalnız kişiye okunacak Türkçe anlatım olur (Seyhun 2026-11-27: sesli anlatım animasyon talimatını da
// okudu). Hareketler'deki "Kopyala" ad + açıklama + İngilizce video talimatını birlikte panoya koyar; bu metin Açıklama'ya
// yapıştırılınca talimat da açıklamaya girip sesli okunuyordu. Kaydederken ve okurken talimat kısmı ve baştaki ad atılır.
const MARK = /(Animate the attached photo|If the photo shows two frames|Keep the same person, face|How it is done:|seamless loop|looping video of the exercise|Show correct technique at)/i;

export const hasPrompt = (s) => MARK.test(String(s ?? ""));

export function cleanHow(how, name = "") {
  let s = String(how ?? "");
  const i = s.search(MARK);
  if (i >= 0) s = s.slice(0, i);
  s = s.replace(/\s+/g, " ").trim();
  const n = String(name || "").replace(/\s+/g, " ").trim();
  if (n && s.toLocaleLowerCase("tr").startsWith(n.toLocaleLowerCase("tr"))) s = s.slice(n.length).replace(/^[\s:.\-–]+/, "").trim();
  return s;
}
