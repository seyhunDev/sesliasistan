import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { CATEGORIES } from "@/lib/ai/schema";
import { PLAN_MAX_BYTES, cleanPlanItems } from "@/lib/chatPlan";

export const runtime = "nodejs";

// Mesajdaki dosyadan plan (lib/chatPlan.js): sohbete gelen PDF ya da fotoğraf bir kez okunur, içinde tarihli bir şey
// (program, antrenman planı, toplantı, yarış talimatı, davet, randevu) varsa planlar döner. Kaydetmez; telefon sorar ve kaydeder.
// Dosya mesajdaki Storage indirme adresinden alınır (yalnız bu projenin sohbet ekleri).
const SYSTEM = `Sen bir yelken kulübü ve kişisel asistan uygulamasının planlayıcısısın. Sana bir mesajlaşmada gönderilmiş bir belge ya da fotoğraf veriliyor.
Görevin: Belgede takvime yazılmaya değer, TARİHİ BELLİ etkinlikler varsa onları plan olarak çıkarmak.
- Plan olur: antrenman programı, kamp, toplantı, yarış (yarış talimatında yarış günleri tek plan: date başlangıç, endDate bitiş), kayıt/başvuru/ödeme son günü ("Foça Kupası: Kayıt son gün"), ölçüm, tören, davet, randevu, sınav, gezi.
- Plan olmaz: fiş, fatura, menü, sonuç listesi, manzara/kişi fotoğrafı, tarihsiz bilgi. Böyleyse items boş.
- Tarihleri YYYY-MM-DD yaz; yıl yazmıyorsa bugünden sonraki ilk uygun yıl. Saat varsa 24 saatlik HH:MM, yoksa boş; saat uydurma.
- title kısa ve Türkçe ("Optimist antrenman", "Veli toplantısı"); tarih, saat, yer başlığa girmez. place kısa yer adı ya da boş.
- Aynı gün aynı etkinliği bir kez yaz. Günlük ayrıntılı programı (her saatteki iş) tek tek yazma; o günü tek plan yap, ilk saatini yaz.
- category: ${CATEGORIES.join(", ")}.
- kind: belgenin kısa türü ("Antrenman programı", "Yarış talimatı", "Davet", "Fiş"…).`;

const SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string" },
          endDate: { type: "string" },
          time: { type: "string" },
          place: { type: "string" },
          category: { type: "string", enum: CATEGORIES },
        },
        required: ["title", "date"],
      },
    },
  },
  required: ["kind", "items"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// Yalnız bu Firebase projesinin sohbet eki (başka adrese istek atılmaz)
function fileUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || ""));
  } catch {
    return null;
  }
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "";
  if (u.protocol !== "https:" || u.hostname !== "firebasestorage.googleapis.com") return null;
  const path = decodeURIComponent(u.pathname);
  if (bucket && !path.startsWith(`/v0/b/${bucket}/o/`)) return null;
  if (!/\/o\/orgs\/[^/]+\/chatFiles\//.test(path)) return null;
  return u.toString();
}

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const url = fileUrl(body?.url);
  if (!url) return bad("Dosya adresi geçersiz.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const today = DATE.test(body?.today || "") ? body.today : new Date().toISOString().slice(0, 10);

  let buf;
  let mimeType = "";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return bad("Dosya alınamadı.", 404);
    if (Number(res.headers.get("content-length") || 0) > PLAN_MAX_BYTES) return bad("Dosya çok büyük.", 413);
    mimeType = String(res.headers.get("content-type") || body?.type || "").split(";")[0].trim().toLowerCase();
    buf = Buffer.from(await res.arrayBuffer());
  } catch {
    return bad("Dosya alınamadı.", 502);
  }
  if (buf.length > PLAN_MAX_BYTES) return bad("Dosya çok büyük.", 413);
  if (!TYPES.includes(mimeType)) {
    // Storage bazen application/octet-stream verir: içerikten anla
    const head = buf.subarray(0, 4).toString("latin1");
    mimeType = head === "%PDF" ? "application/pdf" : buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" : head === "\x89PNG" ? "image/png" : "";
    if (!mimeType) return NextResponse.json({ kind: "", items: [] });
  }

  countAi(au, "chat-plan");
  try {
    const t0 = Date.now();
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: SYSTEM,
      user: `Bugün: ${today}. Belgenin adı: ${String(body?.name || "").slice(0, 120) || "(yok)"}. Bu belgeyi oku.`,
      schema: SCHEMA,
      images: [{ mimeType, data: buf.toString("base64") }],
      maxTokens: 4000,
      timeoutMs: 45000,
    });
    const out = cleanPlanItems(raw, today);
    console.log(`[chat-plan] ${Date.now() - t0} ms, ${out.kind || "?"}, plan=${out.items.length}`);
    return NextResponse.json(out);
  } catch (e) {
    logAiError("chat-plan", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Dosya okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
