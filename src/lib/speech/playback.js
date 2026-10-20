// Okuma (sesli yanıt) ile mikrofon arasındaki bekleme.
// iPhone'da okuma biter bitmez ya da okuma susturulup hemen açılan mikrofon (telefonun tanıması da kayıt da) ses
// alamıyor: ses oturumu bir süre "çalma" kipinde kalıyor. Asistanı kapatıp açınca araya saniyeler girdiği için düzeliyordu
// (Seyhun 2026-10-20: "cevap verdi, tekrar mikrofona bastım, ses algılanamadı diyor; kapatıp açınca çalışıyor").
// Okuma bittikten ya da susturulduktan sonra MIC_SETTLE_MS dolmadan mikrofon açılmaz, kalan süre beklenir.
export const MIC_SETTLE_MS = 600;

let last = 0;

// Gerçekten çalan bir ses bitti ya da susturuldu
export function playbackMark(at = Date.now()) {
  last = at;
}

// Mikrofonun açılmadan önce beklemesi gereken süre (ms)
export function settleWait(now = Date.now()) {
  return last ? Math.max(0, MIC_SETTLE_MS - (now - last)) : 0;
}
