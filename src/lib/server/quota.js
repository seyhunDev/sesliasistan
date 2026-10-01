import { NextResponse } from "next/server";

// Kişilerin (çalışan/aile) günlük hakları. Ana hesap sınırsız. Her gün İstanbul saatiyle gece yarısı sıfırlanır.
// Sayaç Firestore'da usage/{uid}_{YYYY-MM-DD} (yalnızca sunucu yazar; istemci kurallarla erişemez).
// Yönetici anahtarı yoksa sunucu belleğinde tutulur (yeniden başlayınca sıfırlanır).
export const LIMITS = {
  receipt: Number(process.env.STAFF_RECEIPT_DAY) || 5, // fiş okuma
  assistant: Number(process.env.STAFF_AI_DAY) || 10, // asistan isteği
};
const TZ = "Europe/Istanbul";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

// Bir sonraki gece yarısı (İstanbul, UTC+3; yaz saati yok)
export function resetAt() {
  const [y, m, d] = today().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, -3)).toISOString();
}

const mem = new Map(); // yedek: "uid_gün" -> { receipt, assistant }
const adminOn = () => !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const memUsed = (key, kind) => mem.get(key)?.[kind] || 0;
function memSpend(key, kind) {
  const cur = mem.get(key) || {};
  cur[kind] = (cur[kind] || 0) + 1;
  mem.set(key, cur);
  if (mem.size > 1000) mem.delete(mem.keys().next().value);
}

// Yönetici anahtarı çalışmazsa (Netlify'da bozuk anahtar) bellekteki sayaç kullanılır: kişi engellenmez, sınır yine uygulanır
async function used(uid, kind) {
  const key = `${uid}_${today()}`;
  if (!adminOn()) return memUsed(key, kind);
  try {
    const { adminDb } = await import("@/lib/server/admin");
    return Math.max((await adminDb().collection("usage").doc(key).get()).data()?.[kind] || 0, memUsed(key, kind));
  } catch {
    return memUsed(key, kind);
  }
}

// au: requireUser sonucu. Dönüş: { unlimited } ya da { limit, left, resetAt }
export async function quotaOf(au, kind) {
  if (!au?.staff) return { kind, unlimited: true };
  const n = await used(au.uid, kind).catch(() => 0);
  const limit = LIMITS[kind];
  return { kind, limit, left: Math.max(0, limit - n), resetAt: resetAt() };
}

// Başarılı bir işlemden sonra bir hak düşer
export async function spend(au, kind) {
  if (!au?.staff) return { kind, unlimited: true };
  const key = `${au.uid}_${today()}`;
  if (!adminOn()) memSpend(key, kind);
  else {
    try {
      const { adminDb } = await import("@/lib/server/admin");
      const { FieldValue } = await import("firebase-admin/firestore");
      await adminDb().collection("usage").doc(key).set({ uid: au.uid, day: today(), [kind]: FieldValue.increment(1) }, { merge: true });
    } catch {
      memSpend(key, kind); // sayılamadı diye işlem boşa gitmesin
    }
  }
  return quotaOf(au, kind);
}

const LABEL = { receipt: "fiş ekleme", assistant: "asistan" };
// Hak bittiyse hazır 429 yanıtı; yoksa null
export async function overQuota(au, kind) {
  const q = await quotaOf(au, kind);
  if (q.unlimited || q.left > 0) return null;
  return NextResponse.json(
    { error: `Bugünkü ${LABEL[kind]} hakkın bitti (${q.limit}/${q.limit}). Gece yarısı yenilenir.`, quota: q },
    { status: 429, headers: { "x-quota": JSON.stringify(q) } },
  );
}

// Yanıta kalan hakkı ekler (telefon geri sayımı gösterir)
export function withQuota(res, q) {
  if (q && !q.unlimited) res.headers.set("x-quota", JSON.stringify(q));
  return res;
}
