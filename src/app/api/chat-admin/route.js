import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";

export const runtime = "nodejs";

// Mesajlar için ana hesap işleri (yalnız ana hesap; kurallar istemcinin sohbet silmesine izin vermez, kimse başkasının
// sohbetini okuyamaz, bu yüzden sunucuda yapılır):
//   { action: "count" }              → { chats, messages }: sıfırlamadan önce onayda gösterilir
//   { action: "delete", chat: cid }  → bir sohbet herkes için kalıcı silinir (mesajlar ve ekleri dahil)
//   { action: "reset" }              → tüm sohbetler herkes için kalıcı silinir (mesajlar ve ekleri dahil)
// Ekler Storage'da orgs/{org}/chatFiles/{cid}/... altında (chatUpload.js).
async function dropFiles(prefix) {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!name) return;
  try {
    await getStorage().bucket(name).deleteFiles({ prefix, force: true });
  } catch (e) {
    console.warn("[chat-admin] ekler silinemedi", prefix, e?.code || e?.message);
  }
}

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucuda Firebase yönetici anahtarı tanımlı değil." }, { status: 503 });
  const me = await profileOf(au.uid);
  if (me.role !== "owner" || me.orgId !== au.uid) return NextResponse.json({ error: "Yalnız ana hesap." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const db = adminDb();
  const col = db.collection("orgs").doc(me.orgId).collection("chats");
  const files = `orgs/${me.orgId}/chatFiles/`;

  if (body.action === "count") {
    const docs = await col.listDocuments();
    const counts = await Promise.all(docs.map((d) => d.collection("messages").count().get().then((s) => s.data().count, () => 0)));
    return NextResponse.json({ chats: docs.length, messages: counts.reduce((a, b) => a + b, 0) });
  }
  if (body.action === "delete") {
    const cid = String(body.chat || "");
    if (!/^[\w-]{1,200}$/.test(cid)) return NextResponse.json({ error: "Sohbet yok." }, { status: 400 });
    await db.recursiveDelete(col.doc(cid));
    await dropFiles(`${files}${cid}/`);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "reset") {
    const docs = await col.listDocuments();
    for (const d of docs) await db.recursiveDelete(d);
    await dropFiles(files);
    return NextResponse.json({ ok: true, chats: docs.length });
  }
  return NextResponse.json({ error: "Bilinmeyen işlem." }, { status: 400 });
}
