import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { nearestStation, obsRows, parseSynop, utcRange } from "@/lib/windObs";

export const runtime = "nodejs";

// Gerçekleşen rüzgâr: ?lat&lon&date=YYYY-MM-DD → { station: { name, km, near }, rows: [{ hh, wind, gust, dir, at }] }
// İstasyon 10 km'den uzaksa rapor istenmez (rows boş, near false). Aynı istasyon ve gün 15 dk saklanır.
const CACHE = new Map();
const TTL = 15 * 60e3;

export async function GET(req) {
  const au = await requireUser(req);
  if (!au.ok) return unauthorized(au);
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lon = Number(q.get("lon"));
  const date = q.get("date") || "";
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  const st = nearestStation(lat, lon);
  const station = st && { name: st.name, km: st.km, near: st.near };
  if (!st?.near) return NextResponse.json({ station, rows: [] });

  const key = `${st.id}|${date}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.t < TTL) return NextResponse.json({ station, rows: hit.rows });
  try {
    const { begin, end } = utcRange(date);
    const res = await fetch(`https://www.ogimet.com/cgi-bin/getsynop?${new URLSearchParams({ block: st.id, begin, end })}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`OGIMET ${res.status}`);
    const rows = obsRows((await res.text()).split("\n").map((l) => parseSynop(l, st.id)), date);
    CACHE.set(key, { t: Date.now(), rows });
    return NextResponse.json({ station, rows });
  } catch (e) {
    console.error("wind-obs", e?.message);
    return NextResponse.json({ station, rows: [], error: "Ölçüm alınamadı" });
  }
}
