import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { decodePng, levelAt, tileOf } from "@/lib/rainRadar";

export const runtime = "nodejs";

// Radardan yağış: ?lat&lon → { src: "RainViewer", frames: [{ at (ISO), level 0-3 }] } son 2 saat, 10 dakikada bir.
// Radar listesi 5 dk, her döşeme 2 saat saklanır (aynı döşeme bütün kullanıcılar için bir kez indirilir).
const MAPS = "https://api.rainviewer.com/public/weather-maps.json";
let maps = null;
const TILES = new Map();
const keep = (m, k, v, max = 400) => {
  m.set(k, v);
  if (m.size > max) m.delete(m.keys().next().value);
};

async function frameList() {
  if (maps && Date.now() - maps.t < 5 * 60e3) return maps.v;
  const r = await fetch(MAPS, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`radar listesi ${r.status}`);
  const j = await r.json();
  const v = { host: j.host, past: (j.radar?.past || []).slice(-12) };
  maps = { t: Date.now(), v };
  return v;
}

async function tile(url) {
  const hit = TILES.get(url);
  if (hit && Date.now() - hit.t < 2 * 3600e3) return hit.img;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`radar döşemesi ${r.status}`);
  const img = decodePng(Buffer.from(await r.arrayBuffer()));
  keep(TILES, url, { t: Date.now(), img });
  return img;
}

export async function GET(req) {
  const au = await requireUser(req);
  if (!au.ok) return unauthorized(au);
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lon = Number(q.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85) return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  try {
    const { host, past } = await frameList();
    const t = tileOf(lat, lon);
    const frames = await Promise.all(
      past.map(async (f) => {
        try {
          const img = await tile(`${host}${f.path}/256/${t.z}/${t.x}/${t.y}/2/1_0.png`);
          return { at: new Date(f.time * 1000).toISOString(), level: levelAt(img, t.px, t.py) };
        } catch {
          return null;
        }
      }),
    );
    return NextResponse.json({ src: "RainViewer", frames: frames.filter(Boolean) });
  } catch (e) {
    console.error("rain-radar", e?.message);
    return NextResponse.json({ src: "RainViewer", frames: [], error: "Radar alınamadı" });
  }
}
