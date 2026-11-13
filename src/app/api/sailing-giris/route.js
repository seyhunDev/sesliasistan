import { NextResponse } from "next/server";
import { adminAuth, adminDb, adminReady } from "@/lib/server/admin";

export const runtime = "nodejs";

// Velora'dan Velora Sailing'e (seyhundev.github.io/velora-sailing, statik site) tek dokunuşla giriş (Seyhun 2026-11-13: "Velora
// hesabıyla giriş yaptıysam ve Velora'dan geliyorsam kendi hesabımla açılmalı"). /api/sanal-giris ile aynı yöntem: kimlik belirteci
// yönetici SDK'sıyla doğrulanır, aynı kişi için 1 saatlik özel giriş anahtarı (custom token) döner; Sailing onunla oturum açar.
// Her Velora hesabı girebilir. Anahtardaki `vs` bilgisi Sailing'deki rolü verir: işletmenin ana hesabı "sahip", diğerleri "kayitli".
export async function POST(request) {
  if (!adminReady()) return NextResponse.json({ error: "Sunucuda Firebase yönetici anahtarı tanımlı değil." }, { status: 503 });
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  let uid;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: "Oturum gerekli. Giriş yapıp tekrar dene." }, { status: 401 });
  }
  const d = (await adminDb().collection("users").doc(uid).get()).data() || {};
  const owner = (d.role || "owner") === "owner" && (d.orgId || uid) === uid;
  return NextResponse.json({ token: await adminAuth().createCustomToken(uid, { vs: owner ? "sahip" : "kayitli", ad: String(d.name || "").slice(0, 60) }) });
}
