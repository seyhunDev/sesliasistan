import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { CAMS_RADIUS, camList, ytList } from "@/lib/cams";

export const runtime = "nodejs";

// Halka açık canlı kameralar: GET ?lat=&lon=&q=<yer adı> → { cams: [...], yt: [...], error? }.
// İki kaynak: Windy Webcams API v3 (ücretsiz katman, WINDY_WEBCAMS_KEY; konuma göre) ve YouTube canlı yayınları
// (YouTube Data API v3, YOUTUBE_API_KEY; yer adıyla "… canlı" araması; Türk kıyısındaki kameraların çoğu burada).
// Anahtarlar Netlify'da gizli, telefona gitmez. Windy 5 dk, YouTube 30 dk sunucu belleğinde (arama 100 birim, günde 10.000).
// Biri çalışmazsa öteki yine gelir; error yalnız ikisi de boşken. İstek sınırına sayılmaz.
const WINDY = "https://api.windy.com/webcams/api/v3/webcams";
const YT = "https://www.googleapis.com/youtube/v3/search";
const mem = new Map();
const cached = async (k, keep, fn) => {
  const hit = mem.get(k);
  if (hit && Date.now() - hit.t < keep) return hit.v;
  const v = await fn();
  mem.set(k, { t: Date.now(), v });
  if (mem.size > 100) mem.delete(mem.keys().next().value);
  return v;
};

async function windy(key, at) {
  const u = `${WINDY}?${new URLSearchParams({ nearby: `${at.lat},${at.lon},${CAMS_RADIUS}`, limit: "50", include: "images,location,player,urls", lang: "tr" })}`;
  const r = await fetch(u, { headers: { "x-windy-api-key": key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw Object.assign(new Error(`windy ${r.status}`), { bad: r.status === 401 || r.status === 403 });
  return camList((await r.json()).webcams, at);
}

async function youtube(key, place) {
  const u = `${YT}?${new URLSearchParams({ part: "snippet", type: "video", eventType: "live", videoEmbeddable: "true", maxResults: "25", q: `${place} canlı`, regionCode: "TR", relevanceLanguage: "tr", key })}`;
  const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`youtube ${r.status}`);
  return ytList((await r.json()).items, place);
}

export async function GET(req) {
  const au = await requireUser(req, { free: true });
  if (!au.ok) return unauthorized(au);
  const wk = process.env.WINDY_WEBCAMS_KEY;
  const yk = process.env.YOUTUBE_API_KEY;
  if (!wk && !yk) return NextResponse.json({ error: "nokey" });
  const q = new URL(req.url).searchParams;
  const lat = +q.get("lat");
  const lon = +q.get("lon");
  const place = String(q.get("q") || "").trim().slice(0, 40);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return NextResponse.json({ error: "fail", why: "konum" }, { status: 400 });
  const at = { lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
  const [w, y] = await Promise.allSettled([
    wk ? cached(`w:${at.lat},${at.lon}`, 5 * 60e3, () => windy(wk, at)) : Promise.resolve([]),
    yk && place ? cached(`y:${place.toLocaleLowerCase("tr-TR")}`, 30 * 60e3, () => youtube(yk, place)) : Promise.resolve([]),
  ]);
  for (const x of [w, y]) if (x.status === "rejected") console.error("cams", x.reason?.message);
  const cams = w.status === "fulfilled" ? w.value : [];
  const yt = y.status === "fulfilled" ? y.value : [];
  const out = { cams, yt };
  if (!cams.length && !yt.length && (w.status === "rejected" || y.status === "rejected")) {
    out.error = w.reason?.bad ? "badkey" : "fail";
    out.why = String((w.reason || y.reason)?.message || "").slice(0, 120);
  }
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
