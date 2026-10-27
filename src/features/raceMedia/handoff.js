// Ana sayfadaki yarış şeridinde "Kayıt" ile çekilen dosya yarışın Medya sayfasına geçer (Seyhun 2026-10-27): yükleme, saklama ve yeniden deneme
// MediaTab'da (tek yerde). Dosya bellekte bekler, sayfa açılınca bir kez alınır.
let box = null; // { raceId, file }
export const handShot = (raceId, file) => void (box = { raceId, file });
export function takeShot(raceId) {
  if (!box || box.raceId !== raceId) return null;
  const f = box.file;
  box = null;
  return f;
}
