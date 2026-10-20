// Yarış detayı › Özet › Yarış kartı: yarışın planı, son tarih planları ve Instagram gönderisi (Seyhun 2026-10-20:
// "gönderisi hazırlandıysa o gönderiyi gösterelim, tıklanınca gönderi sayfasına gidelim; plandaysa planda gösterelim").
// Firebase yok (testler doğrudan çağırır); planlar useData'dan, gönderiler loadPosts'tan gelir.

const loose = (s) =>
  String(s || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// Plan yarışa adla bağlı: yarışın kendi planı adı yarışın adı ("Foça Kupası"), son tarihler "Foça Kupası: Online kayıt" (addNoticePlans).
// Dönüş { main (yarışın planı ya da null), deadlines [son tarih planları] }
export function racePlansOf(r, plans = []) {
  const n = loose(r?.name);
  if (!n) return { main: null, deadlines: [] };
  const race = plans.filter((p) => (p.cat || p.category) === "Yarış" && !p.deleted);
  const name = (p) => {
    const t = String(p.title || "");
    const i = t.indexOf(":");
    return { head: loose(i > 0 ? t.slice(0, i) : t), part: i > 0 };
  };
  const mains = race.filter((p) => !name(p).part && name(p).head === n);
  // Aynı adlı birden çok plan (geçen yılın yarışı): tarihi yarışa en yakın olan
  const at = r.departDate || r.startDate || "";
  const gap = (p) => (at && p.date ? Math.abs(new Date(p.date) - new Date(at)) : 0);
  const main = mains.sort((a, b) => gap(a) - gap(b))[0] || null;
  const deadlines = race.filter((p) => name(p).part && name(p).head === n);
  return { main, deadlines };
}

// Yarışın gönderisi: gönderide yarışın kimliği (yeni gönderiler) ya da eski gönderide aynı ad ve yıl. posts: loadPosts (yeniden eskiye).
// Arşivde olmayan önce. Bulunamazsa null.
export function racePostOf(r, posts = []) {
  if (!r) return null;
  const n = loose(r.name);
  const sameYear = (p) => !r.startDate || !p.year || String(p.year) === r.startDate.slice(0, 4);
  const mine = posts.filter((p) => p.race && ((r.id && p.race.id === r.id) || (!p.race.id && n && loose(p.race.name) === n && sameYear(p))));
  return mine.find((p) => !p.archived) || mine[0] || null;
}
