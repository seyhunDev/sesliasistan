import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { ytChannel, ytId } from "@/lib/raceRounds";

export const runtime = "nodejs";

// Yayında mı? (Seyhun 2026-11-02 "drone'un yayında olup olmadığını görebilmeliyim"): Yayın › Video'daki kaynakların YouTube bağlantıları.
// GET ?u=<bağlantı>&u=… (en çok 8) → { key, list: [{ url, live, vid }] }. Video/yayın bağlantısında kimlik doğrudan; kanal bağlantısında
// kanalın /live sayfasının asıl (canonical) adresinden o anki yayın bulunur (kota harcamaz). Sonra videos.list (1 birim) canlı mı der.
// Her bağlantı 45 sn bellekte kalır. Anahtar Netlify'da YOUTUBE_API_KEY (Kameralar sayfasıyla aynı).
const TTL = 45000;
const memo = new Map();

async function channelVideo(ch) {
  try {
    const r = await fetch(`https://www.youtube.com/channel/${ch}/live`, { headers: { "accept-language": "tr,en;q=0.8", "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
    const html = await r.text();
    const m = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
}

async function liveIds(ids, key) {
  if (!ids.length) return new Set();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.join(",")}&key=${key}`, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error("yt");
  const d = await r.json();
  return new Set((d.items || []).filter((x) => x.snippet?.liveBroadcastContent === "live").map((x) => x.id));
}

export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!canSeeAthletes(au.email)) return NextResponse.json({ error: "Yetkin yok." }, { status: 403 });
  const key = process.env.YOUTUBE_API_KEY;
  const urls = [...new Set(new URL(request.url).searchParams.getAll("u").map((u) => u.trim().slice(0, 200)).filter(Boolean))].slice(0, 8);
  if (!key) return NextResponse.json({ key: false, list: urls.map((url) => ({ url, live: null, vid: ytId(url) })) });
  const now = Date.now();
  const out = [];
  const todo = [];
  for (const url of urls) {
    const hit = memo.get(url);
    if (hit && now - hit.at < TTL) out.push(hit.v);
    else todo.push(url);
  }
  try {
    const vids = await Promise.all(todo.map(async (url) => ytId(url) || (ytChannel(url) ? await channelVideo(ytChannel(url)) : "")));
    const live = await liveIds([...new Set(vids.filter(Boolean))], key);
    todo.forEach((url, i) => {
      const v = { url, live: !!vids[i] && live.has(vids[i]), vid: vids[i] };
      memo.set(url, { at: now, v });
      out.push(v);
    });
  } catch {
    for (const url of todo) out.push({ url, live: null, vid: ytId(url) });
  }
  if (memo.size > 200) memo.clear();
  return NextResponse.json({ key: true, list: out }, { headers: { "cache-control": "no-store" } });
}
