import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { cleanMenu } from "@/market/menus";

export const runtime = "nodejs";

// Market › Yeni menü (Seyhun 2026-10-24: "fotoğrafla yapay zekaya gönderip… malzeme listesini bana liste olarak geri gönderecek"):
// yemeğin adı, yazılı tarif ya da yemeğin / tarifin fotoğrafı → menü adı, kaç kişilik, malzemeler. Kaydetmez; telefon forma doldurur.
// Marketteki ürün adları da gider ki malzemeler o adlarla yazılsın (eşleşmeyen telefonda "Bulunamadı" olur).
const SYSTEM = `Sen Türk mutfağını iyi bilen bir aşçısın. Kullanıcının verdiği yemeğin evde yapılması için gereken malzemeleri çıkar.
Kurallar:
- Girdi bir yemek adı, yazılı tarif ya da fotoğraf (yemeğin kendisi veya bir tarif sayfası) olabilir. Tarif verildiyse yalnız oradaki malzemeleri yaz; yalnız ad ya da yemek fotoğrafı verildiyse o yemeğin bilinen tarifinin malzemelerini yaz.
- name: yemeğin kısa Türkçe adı, ilk harf büyük ("Karnıyarık"). serves: kaç kişilik (tarifte yazmıyorsa 4).
- items: her malzeme ayrı. name: malzemenin kısa adı; "Market ürünleri" listesinde aynı şey varsa TAM O ADI yaz (ör. "soğan" yerine "Kuru soğan"). amount: tarifteki miktar ("500 g", "2 adet", "1 yemek kaşığı"). packs: marketten kaç paket/adet alınmalı (çoğunlukla 1).
- Su, tuz gibi evde hep olanları da yaz (kullanıcı çıkarır). Uydurma malzeme ekleme, en çok 20 malzeme.
- Yemekle ilgisi yoksa isFood false.`;

const SCHEMA = {
  type: "object",
  properties: {
    isFood: { type: "boolean" },
    name: { type: "string" },
    serves: { type: "number" },
    items: {
      type: "array",
      items: { type: "object", properties: { name: { type: "string" }, amount: { type: "string" }, packs: { type: "number" } }, required: ["name", "amount", "packs"] },
    },
  },
  required: ["isFood", "name", "serves", "items"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX = 3 * 1024 * 1024;

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Market yalnız ana hesapta.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Fotoğraf çok büyük ya da bozuk.", 413);
  }
  const text = String(body?.text || "").trim().slice(0, 4000);
  const img = body?.image && TYPES.includes(body.image.mimeType) ? body.image : null;
  if (img && String(img.data || "").length > (MAX * 4) / 3 + 8) return bad("Fotoğraf çok büyük.", 413);
  if (!text && !img) return bad("Yemeğin adını ya da tarifini yaz, ya da fotoğraf çek.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const names = (Array.isArray(body?.products) ? body.products : []).map((s) => String(s).slice(0, 40)).slice(0, 400);
  countAi(au, "market-menu");
  const user = [
    names.length ? `Market ürünleri: ${names.join(", ")}` : "",
    text ? `Kullanıcı: "${text}"` : "Fotoğraftaki yemeğin (ya da tarifin) malzemelerini çıkar.",
  ].filter(Boolean).join("\n");
  try {
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 1500, timeoutMs: img ? 25000 : 15000,
      images: img ? [{ mimeType: img.mimeType, data: String(img.data) }] : [],
    });
    const menu = cleanMenu(raw);
    return NextResponse.json({ isFood: raw?.isFood !== false && menu.items.length > 0, ...menu });
  } catch (err) {
    logAiError("market-menu", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu.", 429);
    return bad("Malzemeler çıkarılamadı.", 502);
  }
}

export const POST = withAiCool(handle);
