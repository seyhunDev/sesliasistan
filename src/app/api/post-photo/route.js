import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";

export const runtime = "nodejs";

// Instagram gönderisinin fotoğrafını sunucudan verir (telefon Storage'dan okuyamazsa: kural yayınlanmamış, CORS, zayıf bağlantı).
// Yalnız ana hesap. Sıra: gönderideki photoPath, yoksa aynı gönderinin Storage'daki en yeni fotoğrafı
// (kaydetme yarıda kaldıysa adres yazılmamış olabilir; bulunursa gönderiye yazılır), en son eski Firestore belgesi.
// ?id=<gönderi> → { data: dataURL | "" }
export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu ayarı eksik" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "Gönderi yok" }, { status: 400 });
  const me = await profileOf(au.uid);
  if (me.role !== "owner" || me.orgId !== au.uid) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  const org = adminDb().collection("orgs").doc(me.orgId);
  const ref = org.collection("posts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Gönderi yok" }, { status: 404 });
  const post = snap.data();

  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (name) {
    try {
      const bucket = getStorage().bucket(name);
      let file = null;
      if (post.photoPath) {
        const f = bucket.file(post.photoPath);
        if ((await f.exists())[0]) file = f;
      }
      if (!file) {
        const [files] = await bucket.getFiles({ prefix: `orgs/${me.orgId}/postPhotos/${id}_` });
        file = files.sort((a, b) => String(b.metadata?.timeCreated || "").localeCompare(String(a.metadata?.timeCreated || "")))[0] || null;
        if (file && file.name !== post.photoPath) await ref.update({ photoPath: file.name, photoUrl: "", hasPhoto: true });
      }
      if (file) {
        const [buf] = await file.download();
        const type = file.metadata?.contentType || "image/jpeg";
        return NextResponse.json({ data: `data:${type};base64,${buf.toString("base64")}` });
      }
    } catch (e) {
      console.warn("[post-photo] Storage okunamadı", e?.code || e?.message || e);
    }
  }
  const old = await org.collection("postPhotos").doc(id).get();
  return NextResponse.json({ data: old.exists ? String(old.get("data") || "") : "" });
}
