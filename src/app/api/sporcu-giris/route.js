import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminAuth, adminReady, profileOf } from "@/lib/server/admin";
import { ownsAthletes } from "@/lib/server/athleteAccess";

export const runtime = "nodejs";

// Sporcular Velora'da (orgs/{uid}/athletes, Seyhun 2026-11-27): telefon sporcu verisini cihaza yazmayan ikinci bir Firestore
// bağlantısıyla (yalnız bellek önbelleği, src/features/athletes/veloraMem.js) okur. O bağlantı aynı kişiyle bu özel giriş
// anahtarıyla oturum açar; kurallar değişmez (yine ana hesabın kendi verisi). Yalnız ana hesap + sporcu yetkisi.
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucuda Firebase yönetici anahtarı tanımlı değil." }, { status: 503 });
  const me = await profileOf(au.uid);
  if (me.role !== "owner" || !(await ownsAthletes(au))) return NextResponse.json({ error: "Bu hesabın sporcuları görme izni yok." }, { status: 403 });
  return NextResponse.json({ token: await adminAuth().createCustomToken(au.uid) });
}
