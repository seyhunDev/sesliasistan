import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { hasTurn, turnServers } from "@/lib/call";
import { orgOfUser, turnAllowed } from "@/lib/server/callUsage";

export const runtime = "nodejs";

// Sesli arama için kısa süreli TURN bilgisi (Cloudflare Realtime TURN). Anahtar yalnız sunucuda:
// CF_TURN_KEY_ID, CF_TURN_API_TOKEN (Netlify ortam değişkenleri). Tanımlı değilse yalnız STUN döner, arama yine çalışır
// (iki telefon da Wi-Fi'deyken çoğu zaman yeter). Bilgi 12 saat geçerli; telefon bellekte tutar.
// Not: telefon bilgiyi 11 saat tuttuğu için kota dolduktan sonra en çok 11 saat daha TURN kullanılabilir.
const TTL = 12 * 3600;

export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  const id = process.env.CF_TURN_KEY_ID;
  const token = process.env.CF_TURN_API_TOKEN;
  if (!id || !token) return NextResponse.json({ iceServers: turnServers(null), turn: false });
  try {
    // Bu ayın ücretsiz kotası dolduysa TURN verilmez (ücret çıkmasın; Ayarlar › Aramalar, lib/server/callUsage.js)
    const ok = await orgOfUser(au.uid)
      .then(turnAllowed)
      .catch(() => true);
    if (!ok) return NextResponse.json({ iceServers: turnServers(null), turn: false, full: true });
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ttl: TTL }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`Cloudflare ${r.status}`);
    const servers = turnServers(await r.json());
    return NextResponse.json({ iceServers: servers, turn: hasTurn(servers), ttl: TTL });
  } catch (e) {
    console.error("[turn]", e.message);
    return NextResponse.json({ iceServers: turnServers(null), turn: false });
  }
}
