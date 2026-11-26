// Yapay zekayla üretilen gönderi görselleri sayacı (Instagram). Google kalan kotayı API ile söylemiyor;
// bu yüzden uygulama kendi sayar: bugün / bu ay kaç görsel, günlük sınır ve yaklaşık maliyet.
// Firestore usage/postimg_{uid} (yalnız sunucu yazar). Yönetici anahtarı yoksa sunucu belleği (yeniden başlayınca sıfırlanır).
export const IMAGE_MODEL = () => process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
export const IMAGE_DAY = () => Number(process.env.GEMINI_IMAGE_DAY) || 10; // günlük sınır (kendi koyduğumuz)
// İngilizce kalıp resimleri ayrı sayılır (kind "engpic"; 37 kalıp bir günde çizilebilsin diye sınır 60)
// Fitness hareket fotoğrafları ayrı (kind "fitpic"; hazır programdaki fotoğrafsız hareketler ve erkek fotoğrafları, günde 60)
// Fitness hareket animasyonu (kind "fitanim", video; günde 5, fiyatı FIT_ANIM_PRICE ile)
const LIMIT = { postimg: () => IMAGE_DAY(), engpic: () => Number(process.env.ENGLISH_PIC_DAY) || 60, fitpic: () => Number(process.env.FIT_PIC_DAY) || 60, fitanim: () => Number(process.env.FIT_ANIM_DAY) || 5 };
export const IMAGE_PRICE = () => Number(process.env.GEMINI_IMAGE_PRICE) || 0.039; // görsel başı yaklaşık $ (gemini-2.5-flash-image)

const TZ = "Europe/Istanbul";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const resetAt = () => {
  const [y, m, d] = today().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, -3)).toISOString();
};
const adminOn = () => !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const mem = globalThis.__postimg || (globalThis.__postimg = new Map());

function shape(d = {}, kind = "postimg") {
  const day = today();
  const dayN = d.day === day ? d.dayN || 0 : 0;
  const monthN = d.month === day.slice(0, 7) ? d.monthN || 0 : 0;
  const limit = (LIMIT[kind] || LIMIT.postimg)();
  const price = kind === "fitanim" ? Number(process.env.FIT_ANIM_PRICE) || 0 : IMAGE_PRICE();
  return { model: IMAGE_MODEL(), today: dayN, limit, left: Math.max(0, limit - dayN), month: monthN, cost: Math.round(monthN * price * 100) / 100, price, resetAt: resetAt() };
}

async function ref(uid, kind) {
  const { adminDb } = await import("@/lib/server/admin");
  return adminDb().collection("usage").doc(`${kind}_${uid}`);
}

export async function imageUsage(uid, kind = "postimg") {
  const key = `${kind}_${uid}`;
  if (!adminOn()) return shape(mem.get(key), kind);
  try {
    return shape((await (await ref(uid, kind)).get()).data(), kind);
  } catch {
    return shape(mem.get(key), kind);
  }
}

// Başarılı bir görselden sonra sayaç artar; güncel durumu döndürür
export async function spendImage(uid, kind = "postimg") {
  const key = `${kind}_${uid}`;
  const day = today();
  const bump = (d = {}) => ({
    uid,
    day,
    dayN: (d.day === day ? d.dayN || 0 : 0) + 1,
    month: day.slice(0, 7),
    monthN: (d.month === day.slice(0, 7) ? d.monthN || 0 : 0) + 1,
  });
  const memBump = () => {
    const n = bump(mem.get(key));
    mem.set(key, n);
    return shape(n, kind);
  };
  if (!adminOn()) return memBump();
  try {
    const r = await ref(uid, kind);
    const { adminDb } = await import("@/lib/server/admin");
    const n = await adminDb().runTransaction(async (t) => {
      const next = bump((await t.get(r)).data());
      t.set(r, next);
      return next;
    });
    return shape(n, kind);
  } catch {
    return memBump();
  }
}
