import { NextResponse } from "next/server";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";
import { CATS, cleanItem } from "@/features/athletes/budget";

export const runtime = "nodejs";

// Yarış bütçesi: antrenörün yazdığı/söylediği bilgiler (ve talimattaki ücretler) → bütçe kalemleri.
// Kaydetmez; telefon kalemleri bütçeye ekler. Sporcu adı gitmez, yalnız sayılar.
const SYSTEM = `Sen bir yelken kulübünde antrenörün bütçe asistanısın. Antrenör bir yarış için masrafları Türkçe anlatır (ses tanıma metni olabilir, yazım hataları olabilir).
Sana yarış bilgisi, sporcu sayısı, antrenör/refakatçi sayısı, gece sayısı, varsa yarış talimatındaki ücretler/oteller ve bütçedeki mevcut kalemler verilir.
Anlatılanlardan bütçe kalemleri çıkar. Yalnızca antrenörün söylediği ya da açıkça istediği kalemleri yaz; tutarı söylenmemiş kalemi talimattan al, orada da yoksa yazma.
Antrenör "talimattaki ücretleri ekle" derse talimattaki ücret ve otelleri kalem yap.

Her kalem:
- cat: ${CATS.join(", ")} (otel/pansiyon/konaklama → Konaklama; kayıt/katılım/geç kayıt ücreti → Kayıt; yakıt, minibüs, otobüs, uçak → Ulaşım; tekne taşıma, römork, kiralık tekne → Tekne/Ekipman).
- title: kısa ad ("Kayıt ücreti", "Otel (Phokaia)", "Minibüs", "Yemek").
- amount: TL olarak birim tutar, sayı ("bin iki yüz elli" → 1250, "3,5 bin" → 3500). Döviz söylenirse olduğu gibi sayıyı yaz ve title'a para birimini ekle ("Kayıt ücreti (€80)" değil; amount 80, title "Kayıt ücreti (EUR)").
- unit: athlete (her sporcu için: kayıt ücreti, lisans), person (antrenör dahil herkes için: otel, yemek), shared (toplam tutar, ortak: minibüs, yakıt, tekne taşıma). "Kişi başı" denirse person; "sporcu başı" denirse athlete; toplam bir tutar söylenirse shared.
- qty: adet ya da gece; otel gecelik söylendiyse gece sayısı (söylenmediyse verilen gece sayısı). Diğerlerinde 1.
- club: kulüp karşılayacaksa true ("kulüp ödüyor", "kulüpten").
Antrenör antrenör/refakatçi sayısını ya da gece sayısını söylerse staff / nights alanına yaz, yoksa -1.
message: 1 kısa Türkçe cümle; ne eklediğini söyle.`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { cat: { type: "string" }, title: { type: "string" }, amount: { type: "number" }, unit: { type: "string", enum: ["athlete", "person", "shared"] }, qty: { type: "number" }, club: { type: "boolean" } },
        required: ["cat", "title", "amount", "unit"],
      },
    },
    staff: { type: "number" },
    nights: { type: "number" },
    message: { type: "string" },
  },
  required: ["items", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const N = (v, max) => Math.min(Math.max(0, Math.round(Number(v) || 0)), max);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = S(body?.text, 3000);
  if (!text) return bad("Bütçeyi yaz ya da söyle.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Kalemleri elle ekleyebilirsin.", 503);
  const r = body?.race || {};
  const fees = (Array.isArray(body?.fees) ? body.fees : []).slice(0, 12).map((f) => `- ${S(f?.title, 80)}: ${S(f?.amount, 40)} ${S(f?.note, 160)}`);
  const hotels = (Array.isArray(body?.hotels) ? body.hotels : []).slice(0, 8).map((h) => `- ${S(h?.name, 80)}: ${S(h?.note, 200)}`);
  const items = (Array.isArray(body?.items) ? body.items : []).slice(0, 40).map((x) => `- ${S(x?.cat, 20)} | ${S(x?.title, 80)} | ${N(x?.amount, 1e7)} TL | ${S(x?.unit, 10)} | ${N(x?.qty, 365)}`);
  const user = [
    `Yarış: ${S(r.name, 80) || "-"} | ${S(r.startDate, 10)} - ${S(r.endDate, 10)} | ${S(r.district, 40)} ${S(r.city, 40)}`,
    `Sporcu: ${N(body?.athletes, 300)}, antrenör/refakatçi: ${N(body?.staff, 50)}, gece: ${N(body?.nights, 60)}`,
    fees.length ? `Talimattaki ücretler:\n${fees.join("\n")}` : "",
    hotels.length ? `Talimattaki oteller:\n${hotels.join("\n")}` : "",
    items.length ? `Bütçedeki kalemler (tekrar ekleme):\n${items.join("\n")}` : "",
    `Antrenörün söylediği:\n"""\n${text}\n"""`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 3000, timeoutMs: 25000 });
    const out = {
      items: (Array.isArray(raw?.items) ? raw.items : []).map(cleanItem).filter((x) => x.amount > 0).slice(0, 30),
      staff: Number(raw?.staff) >= 0 ? N(raw.staff, 50) : null,
      nights: Number(raw?.nights) >= 0 ? N(raw.nights, 60) : null,
      message: S(raw?.message, 300),
    };
    console.log(`[race-budget] ${Date.now() - t0} ms, kalem=${out.items.length}`);
    return NextResponse.json(out);
  } catch (e) {
    logAiError("race-budget", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da kalemleri elle ekle.", 429);
    return bad("Bütçe anlaşılamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
