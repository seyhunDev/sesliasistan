import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { SLOTS, cleanFood, slotFromText, slotOf } from "@/lib/fitness/food";

export const runtime = "nodejs";

// Beslenme: söylenen ("öğlen tavuk pilav ve ayran içtim") ya da tabağın fotoğrafı → yemekler ve tahmini kalori, protein,
// karbonhidrat, yağ. Yalnız cümle ya da fotoğraf gider (ad, kişisel bilgi yok). Kaydetmez; telefon kullanıcıya gösterip yazar.
const SYSTEM = `Sen Türk mutfağını iyi bilen dikkatli bir diyetisyensin. Kullanıcının yediği ve içtiği her şeyi ayrı satır olarak çıkar, her biri için porsiyona göre gerçekçi besin değeri tahmini yaz.
Kurallar:
- name: kısa Türkçe ad, ilk harf büyük ("Tavuk pilav", "Ayran"). qty: porsiyon ("1 tabak", "2 adet", "1 bardak (200 ml)"); söylenmediyse normal bir porsiyon yaz.
- kcal tam sayı; p (protein), c (karbonhidrat), f (yağ) gram, bir ondalık. Türkiye'deki tipik tariflere göre (ör. 1 tabak tavuk pilav ≈ 450-550 kcal, 1 bardak ayran ≈ 70 kcal, 1 haşlanmış yumurta ≈ 75 kcal, 1 dilim ekmek ≈ 70 kcal).
- Su yemek değildir: water alanına bardak sayısı yaz (1 bardak 250 ml, 0,5 litre 2 bardak), items'a ekleme. Çay, kahve, ayran, meyve suyu, kola items'a girer.
- slot: kahvalti, ogle, aksam, ara. Cümlede söylendiyse onu, yoksa boş bırak.
- date: "dün" denirse dünün tarihi (YYYY-MM-DD), yoksa boş.
- Fotoğrafta: tabakta görünen her yemeği ayrı yaz, miktarı görüntüden tahmin et. Yemek yoksa isFood false.
- Emin olmadığın porsiyonda orta değeri seç; uydurma yemek ekleme.
- note: tek kısa cümle, yalnız gerekirse (ör. "Porsiyonu söylemediğin için 1 tabak saydım."). Boş olabilir.`;

const N = (d) => ({ type: "number", description: d });
const SCHEMA = {
  type: "object",
  properties: {
    isFood: { type: "boolean" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, qty: { type: "string" }, kcal: N("kalori"), p: N("protein g"), c: N("karbonhidrat g"), f: N("yağ g") },
        required: ["name", "qty", "kcal", "p", "c", "f"],
      },
    },
    water: N("bardak su"),
    slot: { type: "string", enum: ["", ...SLOTS.map(([k]) => k)] },
    date: { type: "string" },
    note: { type: "string" },
  },
  required: ["isFood", "items", "water", "slot", "date", "note"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX = 3 * 1024 * 1024;

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Beslenme yalnız ana hesapta.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Fotoğraf çok büyük ya da bozuk.", 413);
  }
  const text = String(body?.text || "").trim().slice(0, 600);
  const img = body?.image && TYPES.includes(body.image.mimeType) ? body.image : null;
  if (img && String(img.data || "").length > (MAX * 4) / 3 + 8) return bad("Fotoğraf çok büyük.", 413);
  if (!text && !img) return bad("Ne yediğini söyle ya da fotoğraf çek.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const today = DAY.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  countAi(au, "food");
  const user = [`Bugün: ${today}.`, text ? `Kullanıcı: "${text}"` : "Fotoğraftaki tabaktaki yemekleri çıkar."].join("\n");
  try {
    const t0 = Date.now();
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 1500, timeoutMs: img ? 25000 : 15000,
      images: img ? [{ mimeType: img.mimeType, data: String(img.data) }] : [],
    });
    console.log(`[food] ${Date.now() - t0} ms`);
    const slot = SLOTS.some(([k]) => k === raw?.slot) ? raw.slot : slotFromText(text) || slotOf(String(body?.time || ""));
    const items = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 20).map((x) => cleanFood({ ...x, slot })).filter(Boolean);
    const water = Math.max(0, Math.min(12, Math.round(Number(raw?.water) || 0)));
    const date = DAY.test(raw?.date) && raw.date <= today ? raw.date : today;
    return NextResponse.json({ isFood: raw?.isFood !== false && (items.length > 0 || water > 0), items, water, slot, date, note: String(raw?.note || "").slice(0, 200) });
  } catch (err) {
    logAiError("food", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu.", 429);
    return bad("Yemek okunamadı.", 502);
  }
}

export const POST = withAiCool(handle);
