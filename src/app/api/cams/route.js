import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { CAMS_RADIUS, camList } from "@/lib/cams";

export const runtime = "nodejs";

// Halka açık canlı kameralar (Windy Webcams API v3, ücretsiz katman): GET ?lat=&lon= → { cams: [...] } ya da
// { error: "nokey" | "fail" }. Anahtar Netlify ortam değişkeni WINDY_WEBCAMS_KEY (gizli); telefona hiç gitmez.
// Aynı yer 5 dk sunucu belleğinde tutulur (ücretsiz katmanda görüntü bağlantıları ~10 dk geçerli). İstek sınırına sayılmaz.
const API = "https://api.windy.com/webcams/api/v3/webcams";
const KEEP = 5 * 60e3;
const mem = new Map();

export async function GET(req) {
  const au = await requireUser(req, { free: true });
  if (!au.ok) return unauthorized(au);
  const key = process.env.WINDY_WEBCAMS_KEY;
  if (!key) return NextResponse.json({ error: "nokey" });
  const q = new URL(req.url).searchParams;
  const lat = +q.get("lat");
  const lon = +q.get("lon");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return NextResponse.json({ error: "fail", why: "konum" }, { status: 400 });
  const at = { lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
  const k = `${at.lat},${at.lon}`;
  const hit = mem.get(k);
  if (hit && Date.now() - hit.t < KEEP) return NextResponse.json({ cams: hit.cams }, { headers: { "cache-control": "no-store" } });
  try {
    const u = `${API}?${new URLSearchParams({ nearby: `${at.lat},${at.lon},${CAMS_RADIUS}`, limit: "50", include: "images,location,player,urls", lang: "tr" })}`;
    const r = await fetch(u, { headers: { "x-windy-api-key": key }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      console.error("cams", r.status);
      return NextResponse.json({ error: r.status === 401 || r.status === 403 ? "badkey" : "fail", why: `windy ${r.status}` });
    }
    const j = await r.json();
    const cams = camList(j.webcams, at);
    mem.set(k, { t: Date.now(), cams });
    if (mem.size > 50) mem.delete(mem.keys().next().value);
    return NextResponse.json({ cams }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "fail", why: String(e?.message || "").slice(0, 120) });
  }
}
