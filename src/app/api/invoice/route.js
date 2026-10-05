import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { cleanIban } from "@/lib/invoices";

export const runtime = "nodejs";

// Fatura PDF'i ya da fotoğrafı → firma, fatura no, tarih, son ödeme tarihi, ödenecek tutar, IBAN, kısa açıklama.
// Kaydetmez; telefon faturayı yazar (invoiceData.js). Yalnız ana hesap.
const SYSTEM = `Sen Türkiye'deki faturaları okuyan dikkatli bir muhasebe asistanısın. Sana bir fatura (e-fatura, e-arşiv fatura, elektrik/su/telefon/internet faturası, hizmet ya da mal faturası, proforma) verilir.
Faturayı ödemek için gerekenleri çıkar. Yalnızca belgede yazanı yaz, uydurma; bulamadığın alan boş kalsın (sayı için 0).
- isInvoice: belge bir fatura ya da ödeme isteyen bir belge değilse false.
- seller: faturayı kesen firmanın ticari unvanı, okunur büyük-küçük harfle ("Turkcell İletişim Hizmetleri A.Ş.", "Gediz Elektrik Perakende Satış A.Ş."). Alıcı (bizim kulüp) değil, satıcı.
- taxId: satıcının VKN (10 hane) ya da TCKN (11 hane), yalnız rakam.
- no: fatura numarası (ör. "GIB2026000001234", "ABC2026000000123"); ETTN değil.
- date: fatura tarihi YYYY-MM-DD.
- due: son ödeme tarihi YYYY-MM-DD; yazmıyorsa boş.
- amount: ödenecek tutar (KDV dahil genel toplam ya da "Ödenecek Tutar"), ondalık ayırıcı nokta. "1.234,56" = 1234.56.
- currency: TL, EUR, USD; belli değilse TL.
- iban: ödeme yapılacak IBAN (TR ile başlayan), varsa.
- desc: faturanın ne için olduğu, en çok 8 kelime Türkçe ("Ekim ayı internet hizmeti", "Tekne bakım işçiliği").
- category: Fatura (elektrik, su, telefon, internet, doğalgaz), Ekipman, Bakım, Yakıt, Ulaşım, Konaklama, Yemek, Market, Diğer içinden en uygunu.`;

const S = { type: "string" };
const SCHEMA = {
  type: "object",
  properties: { isInvoice: { type: "boolean" }, seller: S, taxId: S, no: S, date: S, due: S, amount: { type: "number" }, currency: S, iban: S, desc: S, category: S },
  required: ["isInvoice", "seller", "amount"],
};

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024;
const CATS = ["Fatura", "Ekipman", "Bakım", "Yakıt", "Ulaşım", "Konaklama", "Yemek", "Market", "Diğer"];
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const str = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Faturaları yalnız ana hesap ekler.", 403);
  countAi(au, "invoice");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Dosya çok büyük ya da bozuk. 4 MB'tan küçük PDF ya da fotoğraf yükle.", 413);
  }
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  if (!TYPES.includes(mimeType)) return bad("PDF ya da fotoğraf yükle.");
  if (!data || data.length > (MAX * 4) / 3 + 8) return bad("Dosya 4 MB'tan büyük olmasın.", 413);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const today = day(body?.today) || new Date().toISOString().slice(0, 10);
  try {
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: SYSTEM,
      user: `Bugün: ${today}. Bu faturayı oku.`,
      schema: SCHEMA,
      images: [{ mimeType, data }],
      maxTokens: 1500,
      timeoutMs: 40000,
    });
    if (raw?.isInvoice === false) return bad("Bu bir faturaya benzemiyor.", 422);
    const amount = Math.round((Number(raw?.amount) || 0) * 100) / 100;
    const cur = str(raw?.currency, 4).toUpperCase().replace("TRY", "TL");
    const out = {
      seller: str(raw?.seller, 120),
      taxId: String(raw?.taxId || "").replace(/\D/g, "").slice(0, 11),
      no: str(raw?.no, 40),
      date: day(raw?.date),
      due: day(raw?.due),
      amount: amount > 0 ? amount : 0,
      currency: ["TL", "EUR", "USD", "GBP"].includes(cur) ? cur : "TL",
      iban: cleanIban(raw?.iban),
      desc: str(raw?.desc, 80),
      cat: CATS.includes(raw?.category) ? raw.category : "Fatura",
    };
    if (!out.seller && !out.amount) return bad("Faturadan firma ve tutar okunamadı.", 422);
    return NextResponse.json(out);
  } catch (e) {
    logAiError("invoice", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Fatura okunamadı, tekrar dene ya da elle yaz.", 502);
  }
}

export const POST = withAiCool(handle);
