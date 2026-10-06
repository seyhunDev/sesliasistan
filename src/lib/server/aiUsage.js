// Yapay zeka istek sayacı (Ayarlar › Kullanım): kulüp başına ay ay, işe göre (asistan, fiş, ses, talimat…).
// Firestore usage/ai_{orgId}_{YYYY-MM} = { month, org, <iş>: sayı, by: { <uid>: sayı } } (yalnız sunucu yazar).
// Sayım istek başınadır (başarısız istek de sayılır); yazma beklenmez, hata kullanıcıyı etkilemez.
// Kişinin kulübü sunucu belleğinde saklanır (her istekte ek okuma olmasın).
const adminOn = () => !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const orgs = globalThis.__aiOrg || (globalThis.__aiOrg = new Map());
export const monthIn = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d).slice(0, 7);

async function orgOf(uid) {
  if (orgs.has(uid)) return orgs.get(uid);
  const { profileOf } = await import("@/lib/server/admin");
  const o = (await profileOf(uid)).orgId;
  orgs.set(uid, o);
  if (orgs.size > 500) orgs.delete(orgs.keys().next().value);
  return o;
}

// n: artış (çoğunlukla 1; "stt-sec" ses saniyesi sayar ve kişi sayacına girmez)
export function countAi(au, kind, n = 1) {
  if (!adminOn() || !au?.uid || !/^[a-z-]{2,20}$/.test(kind) || !(n > 0)) return;
  (async () => {
    const org = await orgOf(au.uid);
    const { adminDb } = await import("@/lib/server/admin");
    const { FieldValue } = await import("firebase-admin/firestore");
    const month = monthIn();
    await adminDb()
      .collection("usage")
      .doc(`ai_${org}_${month}`)
      .set({ month, org, [kind]: FieldValue.increment(n), ...(kind === "stt-sec" ? {} : { by: { [au.uid]: FieldValue.increment(1) } }) }, { merge: true });
  })().catch((e) => console.warn("[aiUsage]", e?.message));
}

// Bu ay ve geçen ay (ana hesap okur, /api/usage?ai=1)
export async function aiUsageOf(org) {
  if (!adminOn()) return null;
  const { adminDb } = await import("@/lib/server/admin");
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const [a, b] = await Promise.all([monthIn(now), monthIn(prev)].map((m) => adminDb().collection("usage").doc(`ai_${org}_${m}`).get()));
  return { month: a.data() || { month: monthIn(now) }, prev: b.data() || { month: monthIn(prev) } };
}
