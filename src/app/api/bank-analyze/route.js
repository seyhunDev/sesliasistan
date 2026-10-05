import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminReady, profileOf } from "@/lib/server/admin";
import { logAiError } from "@/lib/ai/errors";
import { CATS } from "@/lib/bankAnalyze";

export const runtime = "nodejs";

// Banka Excel'i incelemesi (Mailler sayfası, yalnız ana hesap): hesap hareketlerinin açıklamaları → her hareketin türü,
// karşı tarafın hesap adı ve kısa açıklaması. Kaydetmez; telefon sonucu denetleyip banka defterine yazar (bankAnalyze.js).
// Gelen satırlarda IBAN ve uzun numaralar maskelidir.
const SYSTEM = `Sen bir banka hesap özetini inceleyen muhasebe yardımcısısın. Hesap Türkiye İş Bankası vadesiz TL hesabıdır; bir yelken kulübüne ya da kulübün yöneticisine aittir (sporcu aidatları bu hesaba gelir). Hesap sahibinin adı verilir.
Her satır: i (sıra), d (bankanın açıklaması), a (tutar; artı gelen, eksi giden), t (işlem tipi: FAST, Havale, EFT, Ücret, Fatura…).
İş Bankası açıklama yazımı ("*" parçaları):
- Gelen FAST/EFT: GÖNDEREN ADI*banka kodu*açıklama*sorgu no*FAST
- Giden FAST/EFT/havale: ALICI ADI*IBAN*açıklama*…
- Gelen havale: açıklama*GÖNDEREN ADI*referans
Her satır için:
- who: karşı tarafın hesap adı (gelende gönderen, gidende alıcı), açıklamada yazıldığı gibi. Banka ücreti, fatura, kart harcaması gibi kişisiz işlemde boş. Ad uydurma; açıklamada yoksa boş bırak.
- note: ödemenin ne olduğu, kısa (en çok 8 kelime), Türkçe; açıklamadaki ödeme notu varsa onu sadeleştir (ör. "Ekim aidatı", "Kamp ücreti", "Fatura ödemesi", "FAST ücreti"). Numara, IBAN, referans yazma.
- cat: şunlardan biri: ${CATS.join(", ")}.
  Aidat: sporcu aidatı/ders ücreti olduğu açıklamadan anlaşılan ya da kişiden gelen düzenli küçük ödemeler (açıklamada aidat, ay adı, sporcu adı, "yelken" geçebilir).
  Hesaplar arası: hesap sahibinin kendi hesapları arasında (gönderen/alıcı adı hesap sahibiyle aynı).
  Banka ücreti: FAST/EFT/havale ücreti, masraf, komisyon, BSMV.
  Emin değilsen gelen için "Diğer gelen", giden için "Diğer giden".
Her satırı yanıtla, i değerini aynen yaz.`;

const SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: { i: { type: "integer" }, who: { type: "string" }, note: { type: "string" }, cat: { type: "string", enum: CATS } },
        required: ["i", "cat"],
      },
    },
  },
  required: ["rows"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const MAX = 120;

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "bank-analyze");
  if (adminReady()) {
    const me = await profileOf(au.uid);
    if (me.role !== "owner") return bad("Banka incelemesini yalnız ana hesap yapabilir.", 403);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const rows = (Array.isArray(body?.rows) ? body.rows : [])
    .slice(0, MAX)
    .filter((r) => Number.isInteger(r?.i) && typeof r?.a === "number")
    .map((r) => ({ i: r.i, d: S(r.d, 220), a: r.a, t: S(r.t, 20) }));
  if (!rows.length) return bad("İncelenecek hareket yok.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const self = S(body?.self, 80);
  const user = [self ? `Hesap sahibi: ${self}` : "", `Hareketler (JSON):\n${JSON.stringify(rows)}`].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 9000, timeoutMs: 24000 });
    const ids = new Set(rows.map((r) => r.i));
    const out = (Array.isArray(raw?.rows) ? raw.rows : [])
      .filter((r) => ids.has(r?.i))
      .map((r) => ({ i: r.i, who: S(r.who, 80), note: S(r.note, 120), cat: CATS.includes(r.cat) ? r.cat : "" }));
    console.log(`[bank-analyze] ${Date.now() - t0} ms, ${rows.length} satır, ${out.length} yanıt`);
    return NextResponse.json({ rows: out });
  } catch (err) {
    logAiError("bank-analyze", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Hareketler incelenemedi, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
