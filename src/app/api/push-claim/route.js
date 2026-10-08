import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady } from "@/lib/server/admin";

export const runtime = "nodejs";

// Bu cihazın aboneliğini yalnız giriş yapan hesaba bırakır: aynı telefonda önce başka bir hesapla girildiyse abonelik
// o hesapta da kayıtlı kalıyor, o hesaba giden bildirimler (kendi gönderdiğin mesaj dahil) bu telefona da geliyordu.
// Yalnız aynı adresli (endpoint) kayıt silinir; çağıranın kendi kaydında da bu adres olmalı.
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ ok: false, skipped: "ayar eksik" });
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const key = String(body.key || "");
  // Tarayıcı aboneliğinin adresi (endpoint) ya da Android uygulamasının kayıt anahtarı (fcm)
  const field = body.fcm ? "fcm" : "endpoint";
  const value = String(body.fcm || body.endpoint || "");
  const okValue = field === "fcm" ? /^[\w:-]{20,4096}$/.test(value) : /^https:\/\//.test(value);
  if (!/^d[0-9a-z]{1,12}$/.test(key) || !okValue) return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
  const db = adminDb();
  const mine = (await db.collection("users").doc(au.uid).get()).data()?.push?.[key];
  if (mine?.[field] !== value) return NextResponse.json({ ok: true, removed: 0 });
  const snap = await db.collection("users").where(`push.${key}.${field}`, "==", value).get();
  const others = snap.docs.filter((d) => d.id !== au.uid);
  await Promise.all(others.map((d) => d.ref.update({ [`push.${key}`]: FieldValue.delete() }).catch(() => {})));
  return NextResponse.json({ ok: true, removed: others.length });
}
