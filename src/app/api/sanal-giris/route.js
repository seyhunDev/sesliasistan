import { NextResponse } from "next/server";
import { adminAuth, adminDb, adminReady } from "@/lib/server/admin";

export const runtime = "nodejs";

// Velora'dan Velora Sanal'a (velora-sanal.netlify.app, market) tek dokunuşla giriş (Seyhun 2026-10-24: "markete tıklayınca
// Velora Sanal'a gider, kullanıcı olarak girer"). Kimlik belirteci burada yönetici SDK'sıyla doğrulanır (DEV_SKIP_AUTH yok sayılır)
// ve aynı kişi için 1 saatlik özel giriş anahtarı (custom token) döner; Velora Sanal onunla oturum açar (src/lib/sanal.js).
// Yalnız market alışverişi yapabilenler: ana hesap, çalışan, aile bireyi (velora-sanal src/sanal/access.js canShop ile aynı).
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
  const role = d.role || "owner";
  const ok = role === "owner" ? (d.orgId || uid) === uid : role === "staff" && ["staff", "family"].includes(d.kind || "staff");
  if (!ok) return NextResponse.json({ error: "Bu hesapla market açılmaz." }, { status: 403 });
  return NextResponse.json({ token: await adminAuth().createCustomToken(uid) });
}
