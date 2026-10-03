import { NextResponse } from "next/server";
import webpush from "web-push";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { testText } from "@/lib/notifyText";
import { pushError } from "@/lib/server/pushSend";

export const runtime = "nodejs";

// Bu cihaza deneme bildirimi gönderir (ayarların doğru olduğunu görmek için)
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "Bildirim anahtarları sunucuda tanımlı değil" }, { status: 503 });
  let sub;
  try {
    sub = (await request.json())?.subscription;
  } catch {}
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bildirim@sesliasistan.app", pub, priv);
    await webpush.sendNotification(sub, JSON.stringify({ ...testText(), tag: "test", url: "/" }), { TTL: 600 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push-test]", e.statusCode, e.body || e.message);
    return NextResponse.json({ error: `Deneme bildirimi gönderilemedi. ${pushError(e)}`, code: e.statusCode || 0 }, { status: 502 });
  }
}
