// Yapay zekayla üretilen gönderi görselleri sayacı (Instagram). Google kalan kotayı API ile söylemiyor;
// bu yüzden uygulama kendi sayar: bugün / bu ay kaç görsel, günlük sınır ve yaklaşık maliyet.
// Firestore usage/postimg_{uid} (yalnız sunucu yazar). Yönetici anahtarı yoksa sunucu belleği (yeniden başlayınca sıfırlanır).
export const IMAGE_MODEL = () => process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
export const IMAGE_DAY = () => Number(process.env.GEMINI_IMAGE_DAY) || 10; // günlük sınır (kendi koyduğumuz)
export const IMAGE_PRICE = () => Number(process.env.GEMINI_IMAGE_PRICE) || 0.039; // görsel başı yaklaşık $ (gemini-2.5-flash-image)

const TZ = "Europe/Istanbul";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const resetAt = () => {
  const [y, m, d] = today().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, -3)).toISOString();
};
const adminOn = () => !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const mem = globalThis.__postimg || (globalThis.__postimg = new Map());

function shape(d = {}) {
  const day = today();
  const dayN = d.day === day ? d.dayN || 0 : 0;
  const monthN = d.month === day.slice(0, 7) ? d.monthN || 0 : 0;
  const limit = IMAGE_DAY();
  return { model: IMAGE_MODEL(), today: dayN, limit, left: Math.max(0, limit - dayN), month: monthN, cost: Math.round(monthN * IMAGE_PRICE() * 100) / 100, price: IMAGE_PRICE(), resetAt: resetAt() };
}

async function ref(uid) {
  const { adminDb } = await import("@/lib/server/admin");
  return adminDb().collection("usage").doc(`postimg_${uid}`);
}

export async function imageUsage(uid) {
  if (!adminOn()) return shape(mem.get(uid));
  try {
    return shape((await (await ref(uid)).get()).data());
  } catch {
    return shape(mem.get(uid));
  }
}

// Başarılı bir görselden sonra sayaç artar; güncel durumu döndürür
export async function spendImage(uid) {
  const day = today();
  const bump = (d = {}) => ({
    uid,
    day,
    dayN: (d.day === day ? d.dayN || 0 : 0) + 1,
    month: day.slice(0, 7),
    monthN: (d.month === day.slice(0, 7) ? d.monthN || 0 : 0) + 1,
  });
  const memBump = () => {
    const n = bump(mem.get(uid));
    mem.set(uid, n);
    return shape(n);
  };
  if (!adminOn()) return memBump();
  try {
    const r = await ref(uid);
    const { adminDb } = await import("@/lib/server/admin");
    const n = await adminDb().runTransaction(async (t) => {
      const next = bump((await t.get(r)).data());
      t.set(r, next);
      return next;
    });
    return shape(n);
  } catch {
    return memBump();
  }
}
