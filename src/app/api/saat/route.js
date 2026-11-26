// Sunucu saati (lib/serverClock.js): giriş gerekmez, yalnız şu anki zaman (ms)
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ t: Date.now() }, { headers: { "cache-control": "no-store" } });
}
