import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { adminDb, adminReady } from "@/lib/server/admin";
import { YT_SCOPES, signState, ytRedirect } from "@/lib/server/ytAuth";

export const runtime = "nodejs";

// YouTube kanal bağlantısı (Seyhun 2026-11-06 "çektiğim videoyu YouTube'a yükleyebilmeliyim, linkle birlikte kameralara ekleyeyim mi diye sor"):
// ana hesap Google ile bir kez izin verir (videoları görme + yükleme). Yenileme anahtarı yalnız sunucuda, Firestore `ytAuth/{uid}`
// belgesinde durur (kurallarda bu yol yok: telefondan okunamaz). Telefon her işte buradan 1 saatlik erişim anahtarı alır, yüklemeyi
// ve listeyi YouTube'a doğrudan yapar (büyük video Netlify'dan geçmez). Netlify'da YT_CLIENT_ID + YT_CLIENT_SECRET (Google Cloud ›
// Clients › Web application; yönlendirme adresi https://sesliasistan.netlify.app/api/youtube/callback).
// POST { op: "start" } → { url } (Google izin sayfası), { op: "token" } → { token, exp, channel } ya da { need: "connect" },
// { op: "off" } → bağlantıyı siler.
const memo = globalThis.__ytTok || (globalThis.__ytTok = new Map()); // uid → { token, exp, channel }

export async function POST(request) {
  const au = await requireUser(request, { free: true });
  if (!au.ok) return unauthorized(au);
  if (au.staff || !canSeeAthletes(au.email)) return NextResponse.json({ error: "Yalnız ana hesap." }, { status: 403 });
  const id = process.env.YT_CLIENT_ID;
  const secret = process.env.YT_CLIENT_SECRET;
  if (!id || !secret) return NextResponse.json({ error: "YouTube bağlantısı kurulmamış: Netlify'a YT_CLIENT_ID ve YT_CLIENT_SECRET girilmeli.", need: "setup" }, { status: 501 });
  if (!adminReady()) return NextResponse.json({ error: "Sunucuda yönetici anahtarı yok." }, { status: 501 });
  const { op } = (await request.json().catch(() => null)) || {};
  const ref = adminDb().collection("ytAuth").doc(au.uid);

  if (op === "start") {
    const p = new URLSearchParams({
      client_id: id,
      redirect_uri: ytRedirect(request),
      response_type: "code",
      scope: YT_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state: signState(au.uid, secret),
    });
    return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` });
  }
  if (op === "off") {
    memo.delete(au.uid);
    const snap = await ref.get();
    const refresh = snap.exists ? snap.data().refresh : "";
    if (refresh) fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, { method: "POST" }).catch(() => {});
    await ref.delete();
    return NextResponse.json({ ok: true });
  }
  if (op !== "token") return NextResponse.json({ error: "Bilinmeyen iş." }, { status: 400 });

  const hit = memo.get(au.uid);
  if (hit && hit.exp - Date.now() > 5 * 60e3) return NextResponse.json(hit);
  const snap = await ref.get();
  const d = snap.exists ? snap.data() : null;
  if (!d?.refresh) return NextResponse.json({ need: "connect" });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: d.refresh, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (!r?.ok || !j.access_token) {
    // izin geri alındı ya da süresi doldu: yeniden bağlanılır
    if (j.error === "invalid_grant") await ref.delete().catch(() => {});
    return NextResponse.json({ need: "connect", error: j.error_description || j.error || "Google cevap vermedi" });
  }
  const out = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000, channel: d.channel || "" };
  memo.set(au.uid, out);
  if (memo.size > 50) memo.delete(memo.keys().next().value);
  return NextResponse.json(out);
}
