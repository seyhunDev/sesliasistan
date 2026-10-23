import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { mergeShip, prune, shipList } from "@/lib/sea";
import { collect } from "@/lib/server/aisStream";

export const runtime = "nodejs";

// Deniz trafiği (AIS, aisstream.io ücretsiz): GET → { at, ships: [...] } ya da { error: "nokey" | "fail" }.
// Telefon 10–60 sn'de bir sorar. Son toplama FRESH'ten yeniyse saklanan liste döner; değilse aisstream'e kısa süre
// (WINDOW) bağlanıp yalnız Dikili kutusundaki konum ve gemi bilgisi mesajları toplanır, listeye işlenir, bağlantı kapanır.
// Liste Netlify Blobs'ta (yoksa sunucu belleğinde) durur; demirli gemiler seyrek sinyal verdiği için 30 dk tutulur.
// Anahtar Netlify ortam değişkeni AISSTREAM_KEY (gizli); telefona hiç gitmez. İstek sınırına sayılmaz (yapay zekasız).
const FRESH = 8e3;
const WINDOW = 4500;
const FIRST_WINDOW = 7000; // liste boşken biraz daha uzun dinlenir

let mem = { at: 0, all: {} };
let running = null;

async function store() {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore({ name: "sea", consistency: "strong" });
  } catch {
    return null;
  }
}
async function load() {
  const s = await store();
  if (!s) return mem;
  try {
    const v = await s.get("state", { type: "json" });
    return v?.all ? v : mem;
  } catch {
    return mem;
  }
}
async function save(v) {
  mem = v;
  const s = await store();
  if (s) await s.setJSON("state", v).catch(() => {});
}

async function refresh(key) {
  const cur = await load();
  if (Date.now() - cur.at < FRESH) return cur;
  const empty = !Object.keys(cur.all).length;
  const { parts, err } = await collect(key, empty ? FIRST_WINDOW : WINDOW);
  if (err && !parts.length) {
    console.error("sea", err.message);
    if (!empty) return cur;
    throw err;
  }
  const all = { ...cur.all };
  for (const p of parts) mergeShip(all, p);
  const next = { at: Date.now(), all: prune(all) };
  await save(next);
  return next;
}

export async function GET(req) {
  const au = await requireUser(req, { free: true });
  if (!au.ok) return unauthorized(au);
  const key = process.env.AISSTREAM_KEY;
  if (!key) return NextResponse.json({ error: "nokey" });
  try {
    running ||= refresh(key).finally(() => (running = null));
    const v = await running;
    return NextResponse.json({ at: v.at, ships: shipList(v.all) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "fail", why: String(e?.message || "").slice(0, 120) });
  }
}
