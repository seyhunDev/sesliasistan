import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaude } from "@/lib/ai/anthropic";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { CATS, calcTotals } from "@/lib/receipts";

export const runtime = "nodejs";

const DEV = process.env.NODE_ENV !== "production";

const SYSTEM = `Sen Türkiye'deki fiş ve faturaları okuyan dikkatli bir muhasebe asistanısın. Görseldeki belgeyi "fis_oku" şemasına göre çıkar.

Kurallar:
- Yalnızca görselde gördüğünü yaz. Okuyamadığın alanı boş bırak (metin için "", sayı için 0) ve o alanın güvenini düşük ver. Tahmin etme, uydurma.
- merchant: işletmenin ticari unvanı (ör. "Migros Ticaret A.Ş."). taxId: VKN (10 hane) veya TCKN (11 hane), yalnızca rakam. address: kısa adres.
- docType: yazar kasa fişi ise "fis"; e-fatura, e-arşiv veya fatura ise "fatura". docNo: fiş no veya fatura no.
- date: YYYY-MM-DD (fişte genelde GG.AA.YYYY yazar). time: HH:MM.
- items: her satır bir kalem. name kısa ve okunur olsun. quantity: adet, kg veya litre ("2 X 39,90" ise 2). unitPrice: KDV DAHİL birim fiyat (TL, ondalık ayırıcı nokta). Birim fiyat yazmıyorsa satır tutarı bölü miktar. vatRate: satırdaki %1, %10, %20 işaretinden; yoksa belgedeki KDV dökümünden en olası oran.
- Tutarlarda Türkçe biçim vardır: "1.234,56" = 1234.56. İndirim satırlarını negatif unitPrice ile yaz.
- total: belgenin altındaki GENEL TOPLAM / TOPLAM (TL). vatTotal: TOPKDV veya toplam KDV.
- payment: KREDİ KARTI / KART ise "Kart", NAKİT ise "Nakit", havale / EFT ise "Havale", belli değilse "Bilinmiyor".
- category: ${CATS.join(", ")} içinden en uygunu (akaryakıt Yakıt, market Market, restoran ve kafe Yemek, elektrik, su, telefon Fatura, tekne ve yelken malzemesi Ekipman, servis ve tamir Bakım).
- confidence: her alan için 0 ile 1 arasında ne kadar emin olduğun. Bulanık, kesik, soluk veya el yazısıysa düşük ver.
- Görsel bir fiş veya fatura değilse isReceipt false yap.`;

const num = (d) => ({ type: "number", description: d });
const SCHEMA = {
  type: "object",
  properties: {
    isReceipt: { type: "boolean" },
    merchant: { type: "string" },
    taxId: { type: "string" },
    address: { type: "string" },
    docType: { type: "string", enum: ["fis", "fatura"] },
    docNo: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD ya da boş" },
    time: { type: "string", description: "HH:MM ya da boş" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: num("Miktar"),
          unitPrice: num("KDV dahil birim fiyat, TL"),
          vatRate: num("0, 1, 10 veya 20"),
        },
        required: ["name", "quantity", "unitPrice", "vatRate"],
      },
    },
    total: num("Genel toplam, TL"),
    vatTotal: num("Toplam KDV, TL"),
    payment: { type: "string", enum: ["Kart", "Nakit", "Havale", "Bilinmiyor"] },
    category: { type: "string", enum: CATS },
    confidence: {
      type: "object",
      properties: { merchant: num("0-1"), date: num("0-1"), total: num("0-1"), vat: num("0-1"), items: num("0-1") },
      required: ["merchant", "date", "total", "vat", "items"],
    },
  },
  required: ["isReceipt", "merchant", "date", "items", "total", "confidence"],
};
const TOOL = { name: "fis_oku", description: "Fiş veya faturadaki bilgileri çıkarır.", input_schema: SCHEMA };

// Model çıktısını doğrula: bozuk alanlar güvenli varsayılana döner
const S = z.string().catch("");
const N = z.coerce.number().catch(0);
const C = z.coerce.number().min(0).max(1).catch(0.5);
const Out = z.object({
  isReceipt: z.boolean().catch(true),
  merchant: S,
  taxId: S,
  address: S,
  docType: z.enum(["fis", "fatura"]).catch("fis"),
  docNo: S,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).catch(""),
  time: z.string().regex(/^\d{2}:\d{2}$/).catch(""),
  items: z.array(z.object({ name: S, quantity: N, unitPrice: N, vatRate: N })).catch([]),
  total: N,
  vatTotal: N,
  payment: S,
  category: S,
  confidence: z
    .object({ merchant: C, date: C, total: C, vat: C, items: C })
    .catch({ merchant: 0.5, date: 0.5, total: 0.5, vat: 0.5, items: 0.5 }),
});

const VAT = [0, 1, 10, 20];
const nearVat = (r) => VAT.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 20);

// Okunan belgeyi uygulamanın fiş taslağına çevir (tutarlar kuruş)
function toDraft(o) {
  let items = o.items
    .filter((i) => i.name.trim() || i.unitPrice)
    .slice(0, 80)
    .map((i) => ({
      n: i.name.trim().slice(0, 80) || "Kalem",
      q: i.quantity > 0 ? Math.round(i.quantity * 1000) / 1000 : 1,
      u: Math.round(i.unitPrice * 100),
      r: nearVat(i.vatRate),
    }));
  const declared = o.total > 0 ? Math.round(o.total * 100) : null;
  const conf = { ...o.confidence };
  if (!items.length && declared) {
    items = [{ n: o.merchant.trim() || "Toplam", q: 1, u: declared, r: 20 }]; // kalem okunamadı: tek satır
    conf.items = Math.min(conf.items, 0.4);
    conf.vat = Math.min(conf.vat, 0.4);
  }
  const taxId = o.taxId.replace(/\D/g, "");
  return {
    merchant: o.merchant.trim().slice(0, 120),
    taxId: /^\d{10,11}$/.test(taxId) ? taxId : "",
    address: o.address.trim().slice(0, 200),
    docType: o.docType,
    docNo: o.docNo.trim().slice(0, 40),
    date: o.date,
    time: o.time,
    items,
    totals: calcTotals(items),
    declared,
    declaredVat: o.vatTotal > 0 ? Math.round(o.vatTotal * 100) : null,
    pay: ["Kart", "Nakit", "Havale"].includes(o.payment) ? o.payment : "",
    cat: CATS.includes(o.category) ? o.category : "Diğer",
    conf,
  };
}

function pickProvider() {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}
const hasKey = (p) => (p === "gemini" ? !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL : p === "anthropic" ? !!process.env.ANTHROPIC_API_KEY : false);
const bad = (error, status = 400, detail = "") => NextResponse.json({ error, ...(DEV && detail ? { detail } : {}) }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const data = String(body?.image || "");
  const mimeType = /^image\/(jpeg|png|webp)$/.test(body?.mimeType) ? body.mimeType : "image/jpeg";
  if (!data) return bad("Fotoğraf yok");
  if (data.length > 6_000_000) return bad("Fotoğraf çok büyük", 413);

  const provider = pickProvider();
  if (!hasKey(provider)) return bad("Yapay zeka anahtarı tanımlı değil. Fişi elle girebilirsin.", 503);

  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  const user = `Bugün: ${today}. Görseldeki belgeyi oku.`;

  try {
    const t0 = Date.now();
    const raw =
      provider === "gemini"
        ? await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, images: [{ mimeType, data }], maxTokens: 6000, timeoutMs: 45000 })
        : await callClaude({
            model: process.env.AI_MODEL_VISION || process.env.AI_MODEL_TEXT || "claude-haiku-4-5-20251001",
            system: SYSTEM,
            tool: TOOL,
            maxTokens: 3000,
            messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mimeType, data } }, { type: "text", text: user }] }],
          });
    const o = Out.parse(raw ?? {});
    const ms = Date.now() - t0;
    console.log(`[receipt:${provider}] ${ms} ms, kalem=${o.items.length}, fiş=${o.isReceipt}`);
    if (!o.isReceipt) return bad("Bu fotoğrafta fiş veya fatura göremedim. Tekrar çek veya elle gir.", 422);
    return NextResponse.json({ draft: toDraft(o), provider, ms });
  } catch (e) {
    console.error(`[receipt:${provider}]`, e.message);
    if (e.status === 429) return bad("Yapay zekanın kotası şu an dolu. Biraz sonra tekrar dene ya da elle gir.", 429, e.message);
    if (e.status === 503) return bad("Yapay zeka şu an çok yoğun. Birkaç dakika sonra tekrar dene ya da elle gir.", 503, e.message);
    return bad("Fiş okunamadı. Tekrar dene ya da elle gir.", 502, e.message);
  }
}

export const POST = withAiCool(handle);
