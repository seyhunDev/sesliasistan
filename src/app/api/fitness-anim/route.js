import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { imageUsage, spendImage } from "@/lib/server/imageUsage";
import { animPrompt } from "@/lib/fitness/animPrompt";

export const runtime = "nodejs";
export const maxDuration = 26;

// Hareket animasyonu (Seyhun 2026-11-26): hareketin fotoğrafından Gemini'nin video modeliyle kısa döngü video. Yalnız ana hesap.
// Veo'nun Gemini API önizlemeleri 2026-10-22'de kapandı; video Gemini Omni ile "interactions" üzerinden, arka planda üretilir:
// POST { orgId, name, how, ref (JPEG base64) } → { id }; telefon GET ?id=&orgId= ile birkaç saniyede bir sorar. Bitince video
// sunucuda Storage'a (orgs/{org}/fitMedia/{id}) yazılır, künyesi { …, a: true } döner; telefon onu harekete ekler.
// Model GEMINI_VIDEO_MODEL (varsayılan gemini-omni-1.1-flash); günlük sınır FIT_ANIM_DAY (varsayılan 5), fiyat FIT_ANIM_PRICE.
const API = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = () => process.env.GEMINI_VIDEO_MODEL || "gemini-omni-1.1-flash";
const bad = (error, status = 400, extra = {}) => NextResponse.json({ error, ...extra }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const key = () => process.env.GEMINI_API_KEY;
const hdr = () => ({ "content-type": "application/json", "x-goog-api-key": key() });

async function gate(request, orgId) {
  const au = await requireUser(request);
  if (!au.ok) return { res: unauthorized(au) };
  if (au.staff) return { res: bad("Yalnız ana hesap.", 403) };
  if (!key()) return { res: bad("Yapay zeka anahtarı tanımlı değil.", 503) };
  if (!/^[\w-]{1,80}$/.test(orgId || "")) return { res: bad("Kulüp yok.") };
  const { adminReady, adminDb } = await import("@/lib/server/admin");
  if (!adminReady()) return { res: bad("Sunucu yönetici hesabı yok.", 503) };
  const u = (await adminDb().collection("users").doc(au.uid).get()).data() || {};
  if (u.orgId !== orgId) return { res: bad("Bu kulübün hesabı değilsin.", 403) };
  return { au };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const g = await gate(request, body?.orgId);
  if (g.res) return g.res;
  const name = S(body?.name, 80);
  const ref = typeof body?.ref === "string" && body.ref.length < 2_500_000 ? body.ref : "";
  if (!name || !ref) return bad("Hareketin adı ve fotoğrafı gerekli.");
  const usage = await imageUsage(g.au.uid, "fitanim");
  if (usage.left <= 0) return bad(`Bugünkü animasyon hakkı bitti (${usage.limit}).`, 429, { usage });
  try {
    const res = await fetch(`${API}/interactions`, {
      method: "POST",
      headers: hdr(),
      body: JSON.stringify({
        model: MODEL(),
        input: [
          { type: "text", text: animPrompt({ name, how: body?.how }) },
          { type: "image", data: ref, mime_type: "image/jpeg" },
        ],
        response_modalities: ["video"],
        generation_config: { video_config: { task: "image_to_video" } },
        background: true,
        store: true,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    if (!res.ok) {
      const e = new Error(`gemini ${res.status}: ${text.slice(0, 300)}`);
      e.status = res.status;
      throw e;
    }
    const id = JSON.parse(text)?.id;
    if (!id) throw new Error(`id yok: ${text.slice(0, 200)}`);
    return NextResponse.json({ id, usage });
  } catch (err) {
    logAiError("fitness-anim", "gemini", err);
    if (err.status === 429) return bad("Google'ın video kotası dolu.", 429, { usage });
    if (err.status === 400 || err.status === 404) return bad(`Video modeli bu isteği almadı (${MODEL()}).`, 502, { usage });
    if (err.status === 403) return bad("Video üretimi bu Google hesabında açık değil (faturalandırma?).", 502, { usage });
    return bad("Animasyon başlatılamadı.", 502, { usage });
  }
}

// Cevaptaki video: adımlarda (steps[].content) ya da eski biçimde outputs[]
function videoOf(j) {
  const all = [...(j?.steps || []).flatMap((s) => s?.content || []), ...(j?.outputs || [])];
  return all.filter((c) => c?.type === "video" && (c.data || c.uri)).at(-1) || null;
}

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const orgId = q.get("orgId") || "";
  const id = q.get("id") || "";
  const g = await gate(request, orgId);
  if (g.res) return g.res;
  if (!/^[\w./-]{1,200}$/.test(id)) return bad("Geçersiz istek");
  try {
    const res = await fetch(`${API}/interactions/${encodeURIComponent(id)}`, { headers: hdr(), signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    if (!res.ok) {
      const e = new Error(`gemini ${res.status}: ${text.slice(0, 300)}`);
      e.status = res.status;
      throw e;
    }
    const j = JSON.parse(text);
    const st = j?.status || "";
    if (["in_progress", "queued", "requires_continuation", ""].includes(st)) return NextResponse.json({ done: false });
    if (st !== "completed") return bad(st === "budget_exceeded" ? "Google bütçesi doldu." : "Animasyon yapılamadı.", 502);
    const v = videoOf(j);
    if (!v) return bad("Cevapta video yok.", 502);
    let buf;
    if (v.data) buf = Buffer.from(v.data, "base64");
    else {
      const r = await fetch(v.uri, { headers: /generativelanguage\.googleapis\.com/.test(v.uri) ? { "x-goog-api-key": key() } : {}, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`indirme ${r.status}`);
      buf = Buffer.from(await r.arrayBuffer());
    }
    const type = S(v.mime_type, 40) || "video/mp4";
    const mid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const { getStorage } = await import("firebase-admin/storage");
    const token = randomUUID();
    const path = `orgs/${orgId}/fitMedia/${mid}`;
    await getStorage()
      .bucket(bucket)
      .file(path)
      .save(buf, { contentType: type, metadata: { cacheControl: "private, max-age=31536000", metadata: { firebaseStorageDownloadTokens: token } } });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    const usage = await spendImage(g.au.uid, "fitanim");
    return NextResponse.json({ done: true, meta: { id: mid, kind: "video", type, size: buf.length, parts: 1, url, a: true }, usage });
  } catch (err) {
    logAiError("fitness-anim", "gemini", err);
    return bad("Animasyon alınamadı.", 502);
  }
}
