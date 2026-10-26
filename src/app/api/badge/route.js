import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady } from "@/lib/server/admin";
import { sendFcm } from "@/lib/server/sendDevice";
import { badgeMessage } from "@/lib/fcmMessage";
import { inboxBadge } from "@/lib/inbox";

export const runtime = "nodejs";

// iPhone uygulamasının simgesindeki sayıyı düzeltir: eski uygulama (VeloraPlugin.badge olmadan kurulmuş) sayıyı kendisi
// indiremez, APNs'in koyduğu sayı zil görülse de kalıyordu. Sayı sunucuda zilden hesaplanır (istemciye güvenilmez) ve
// kişinin iPhone uygulaması kayıtlarına yalnız sayı taşıyan sessiz bildirim gider. Uygulama, sayı değişince çağırır.
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu anahtarı tanımlı değil" }, { status: 503 });
  const u = (await adminDb().collection("users").doc(au.uid).get()).data() || {};
  const count = inboxBadge(u.inbox, u.inboxSeen);
  const ios = Object.values(u.push || {}).filter((s) => s?.fcm && s.app === "ios");
  let sent = 0;
  await Promise.all(
    ios.map((s) =>
      sendFcm(badgeMessage(s.fcm, count)).then(
        () => sent++,
        (e) => console.error("[badge]", e.statusCode, String(e.body || e.message).slice(0, 120)),
      ),
    ),
  );
  return NextResponse.json({ ok: true, count, sent });
}
