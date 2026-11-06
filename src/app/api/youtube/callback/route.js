import { adminDb, adminReady } from "@/lib/server/admin";
import { readState, ytRedirect } from "@/lib/server/ytAuth";

export const runtime = "nodejs";

// Google izin sayfasından dönüş (api/youtube "start"): kod yenileme anahtarına çevrilir, ytAuth/{uid}'e yazılır, kanal adı alınır.
// iPhone uygulamasında bu sayfa Safari'de açılır (Google uygulama içinde girişe izin vermiyor); Velora'ya dönülünce bağlantı görünür.
const page = (title, text, ok) =>
  new Response(
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1a33;color:#fff;font:600 17px/1.4 -apple-system,system-ui,sans-serif;text-align:center;padding:24px}
b{display:block;font-size:22px;margin-bottom:8px;color:${ok ? "#8fb3ff" : "#ffb4a8"}}a{display:inline-block;margin-top:18px;padding:12px 22px;border-radius:12px;background:#3d7bff;color:#fff;text-decoration:none}</style></head>
<body><div><b>${title}</b>${text}<br><a href="/">Velora'ya dön</a></div><script>try{window.opener&&window.opener.postMessage("yt-bagli","*")}catch(e){}${ok ? "setTimeout(function(){try{window.close()}catch(e){}},1200)" : ""}</script></body></html>`,
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const id = process.env.YT_CLIENT_ID;
  const secret = process.env.YT_CLIENT_SECRET;
  if (!id || !secret || !adminReady()) return page("Kurulum eksik", "Netlify'da YT_CLIENT_ID ve YT_CLIENT_SECRET olmalı.", false);
  if (q.get("error")) return page("Bağlanmadı", "İzin verilmedi.", false);
  const uid = readState(q.get("state"), secret);
  if (!uid) return page("Süre doldu", "Velora'dan yeniden YouTube'a bağlan'a dokun.", false);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: q.get("code") || "", client_id: id, client_secret: secret, redirect_uri: ytRedirect(request), grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (!r?.ok || !j.access_token) return page("Bağlanmadı", `Google: ${String(j.error_description || j.error || "cevap yok").slice(0, 120)}`, false);
  const ref = adminDb().collection("ytAuth").doc(uid);
  const old = (await ref.get()).data() || {};
  const refresh = j.refresh_token || old.refresh;
  if (!refresh) return page("Bağlanmadı", "Google yenileme anahtarı vermedi. Google hesabında Velora iznini kaldırıp yeniden dene.", false);
  let channel = "";
  try {
    const c = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${j.access_token}` }, signal: AbortSignal.timeout(6000) });
    const it = (await c.json()).items?.[0];
    channel = it?.snippet?.title || "";
  } catch {}
  await ref.set({ refresh, channel, at: new Date().toISOString() });
  return page("YouTube bağlandı", channel ? `Kanal: ${channel.replace(/[<>&"]/g, "")}` : "Velora'ya dönebilirsin.", true);
}
