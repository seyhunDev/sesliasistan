// Yarış detayı › Özet › Yarış kartı: yarışın planı, son tarih planları ve Instagram gönderisi (Seyhun 2026-10-20:
// "gönderisi hazırlandıysa o gönderiyi gösterelim, tıklanınca gönderi sayfasına gidelim; plandaysa planda gösterelim").
// Firebase yok (testler doğrudan çağırır); planlar useData'dan, gönderiler loadPosts'tan gelir.

const loose = (s) =>
  String(s || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// Plan yarışa kimlikle bağlı (2026-11-05'ten sonra eklenenlerde raceId), eskilerde adla: yarışın kendi planı adı yarışın adı ("Foça Kupası"),
// son tarihler "Foça Kupası: Online kayıt" (addNoticePlans). Başka yarışın kimliğini taşıyan plan adı tutsa da bu yarışa sayılmaz.
// Dönüş { main (yarışın planı ya da null), deadlines [son tarih planları] }
export function racePlansOf(r, plans = []) {
  const n = loose(r?.name);
  if (!n && !r?.id) return { main: null, deadlines: [] };
  const race = plans.filter((p) => (p.cat || p.category) === "Yarış" && !p.deleted && (p.raceId ? p.raceId === r.id : n));
  const name = (p) => {
    const t = String(p.title || "");
    const i = t.indexOf(":");
    return { head: loose(i > 0 ? t.slice(0, i) : t), part: i > 0, id: !!p.raceId };
  };
  // Aynı adlı birden çok plan (geçen yılın yarışı): adla eşleşen plan yarışa 200 günden uzaksa başka yılın yarışıdır; ana plan tarihi en yakın olan
  const at = r.departDate || r.startDate || "";
  const gap = (p) => (at && p.date ? Math.abs(new Date(p.date) - new Date(at)) : 0);
  const mine = (p) => name(p).id || (name(p).head === n && gap(p) < 200 * 864e5);
  const mains = race.filter((p) => !name(p).part && mine(p));
  const main = mains.sort((a, b) => gap(a) - gap(b))[0] || null;
  const deadlines = race.filter((p) => name(p).part && mine(p));
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

// Ana sayfa gün penceresindeki hızlı işlemler (Seyhun 2026-11-02 "A · Satırda düğmeler"): planın türü ve bağlı yarış.
// kind: "race" (yarışın kendi planı: Yarış sayfası + Plan), "deadline" ("Yarış adı: iş": Yapıldı + Yarış sayfası), "plan" (diğer: Yapıldı).
// race: adı tutan yarış (races: [{ id, name }], ör. useRaceHome().open) ya da null
export function planKindOf(p, races = []) {
  if ((p?.cat || p?.category) !== "Yarış") return { kind: "plan", race: null };
  const t = String(p.title || "");
  const i = t.indexOf(":");
  const head = loose(i > 0 ? t.slice(0, i) : t);
  const race = p.raceId ? (races || []).find((r) => r?.id === p.raceId) || { id: p.raceId, name: "" } : (races || []).find((r) => r?.id && head && loose(r.name) === head) || null;
  return { kind: i > 0 ? "deadline" : "race", race };
}

// TEK KURAL (Seyhun 2026-11-05 "plana tıklıyorum, yarışa götürmesi gerekiyor, plana götürüyor"): yarışa bağlı plan (yarışın kendi planı ve
// "Yarış adı: son tarih" planları) Planlar, Takvim ve ana sayfanın her yerinde dokununca YARIŞ SAYFASINI açar; planın kendisi yarış sayfasındaki
// Plan satırından düzenlenir. Diğer planlar dokununca planı açar. Dönüş: yarış sayfası adresi ya da "" (yarışa bağlı değil / yarış bulunamadı).
export function planRaceHref(p, races = []) {
  const { kind, race } = planKindOf(p, races);
  return kind !== "plan" && race?.id ? `/athletes/races/${race.id}` : "";
}

// Yarışın planlara yazılan hali (addRacePlan ve yarış değişince plan eşitleme aynı alanları kullanır): yolculuk yazıldıysa çıkış gününden dönüş
// gününe, yoksa yarış günleri.
export function racePlanDates(r) {
  const date = r?.departDate || r?.startDate || "";
  const end = r?.returnDate || r?.endDate || "";
  return { date, endDate: end && end > date ? end : "" };
}

// Yarışın adı ya da tarihi değişince planlarına yazılacak değişiklikler: [[plan kimliği, değişiklik]]. Yarışın planı adı ve günleri,
// son tarih planlarının adının baş kısmı ("Eski ad: Online kayıt" → "Yeni ad: Online kayıt"). raceId yoksa eklenir (sonraki ad değişikliğinde bağ kopmasın).
export function racePlanSync(r, links) {
  const out = [];
  if (!r?.id || !String(r.name || "").trim()) return out;
  const name = r.name.trim();
  const m = links?.main;
  if (m?.id) {
    const d = racePlanDates(r);
    const patch = {};
    if (!m.raceId) patch.raceId = r.id;
    if (m.title !== name) patch.title = name;
    if (d.date && (m.date !== d.date || (m.endDate || "") !== d.endDate)) Object.assign(patch, d);
    if (Object.keys(patch).length) out.push([m.id, patch]);
  }
  for (const p of links?.deadlines || []) {
    const t = String(p.title || "");
    const i = t.indexOf(":");
    const title = `${name}${t.slice(i)}`;
    const patch = {};
    if (!p.raceId) patch.raceId = r.id;
    if (i > 0 && t !== title) patch.title = title;
    if (Object.keys(patch).length) out.push([p.id, patch]);
  }
  return out;
}
