import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminReady, profileOf } from "@/lib/server/admin";
import { orgHasData, seedOrg, wipeOrg } from "@/lib/server/demo";

export const runtime = "nodejs";
export const maxDuration = 60;

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Ayarlar › Örnek veri (yalnızca ana hesap, kendi işletmesi için):
//   { action: "wipe", confirm: "SİL", keepMails } -> tüm verileri ve kişi hesaplarını siler (ana hesap ve ayarları kalır)
//   { action: "seed", accounts }                   -> örnek kişiler (+hesaplar), planlar, görevler, notlar, fişler, doğum günleri, sohbetler
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return bad("Sunucuda Firebase yönetici anahtarı tanımlı değil.", 503);
  const me = await profileOf(au.uid);
  if (me.role !== "owner") return bad("Bu işlemi yalnızca ana hesap yapabilir.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  try {
    if (body?.action === "wipe") {
      if (body.confirm !== "SİL") return bad("Onay için SİL yaz.");
      const r = await wipeOrg(au.uid, { keepMails: body.keepMails !== false });
      return NextResponse.json({ ok: true, ...r });
    }
    if (body?.action === "seed") {
      if (await orgHasData(au.uid)) return bad("Önce mevcut verileri sil; örnek veri boş hesaba eklenir.");
      const r = await seedOrg(au.uid, me.name || "Ana hesap", { accounts: body.accounts !== false });
      return NextResponse.json({ ok: true, ...r });
    }
    return bad("Bilinmeyen işlem");
  } catch (e) {
    console.error("[demo]", e.code || "", e.message);
    return bad("İşlem tamamlanamadı. Tekrar dene.", 500);
  }
}
