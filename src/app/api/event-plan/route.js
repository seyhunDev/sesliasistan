import { NextResponse } from "next/server";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { KINDS, cleanEvent } from "@/features/events/eventModel";

export const runtime = "nodejs";

// Etkinlik planı (kamp, balık, gezi, konser…): kullanıcının anlattığı → ihtiyaç listesi, bütçe, yapılacaklar, değerlendirme.
// Kaydetmez; telefon kaydeder. Yalnız ana hesap (etkinlikler ana hesabın kaydı).
// general false iken yer ya da zaman belli değilse önce soru döner (ask + question), listeler boş gelir.
const SYSTEM = `Sen pratik ve deneyimli bir Türk organizasyon ve gezi asistanısın. Kullanıcı kamp, balık tutma, gezi (ör. İç Anadolu turu), konser, piknik gibi bir etkinlik planlamak istiyor; Türkçe anlatır (ses tanıma metni olabilir, yazım hataları olabilir).
Bugünün tarihi verilir. Göreli tarihleri (bu hafta sonu, haftaya, Ekim sonu) bugüne göre YYYY-MM-DD çöz. Tarih uydurma.

İki mod var:
1) general=false: Yer (place) ya da zaman (startDate) anlatılanda YOKSA plan yapma: ask'a eksikleri yaz ("where", "when", gerekirse "people"), question'a sıcak, kısa TEK bir soru yaz (ör. "Güzel fikir! Nerede kamp yapmayı düşünüyorsun, ne zaman ve kaç kişi olacaksınız?"). needs, budget, todos, tips boş; summary boş. Yer ve zaman belliyse ask boş, planı yap.
2) general=true: Asla soru sorma, ask boş. Eksik bilgiler için makul varsayım yap ve planı hazırla. Yer belli değilse summary'de bu tür etkinlik için Türkiye'de uygun 2-3 yer öner; zaman belli değilse en uygun mevsimi/ayı söyle. Varsayımlarını summary'de kısaca belirt.

Plan:
- title: kısa ad ("Kaz Dağları kampı", "İç Anadolu gezisi", "Tarkan konseri"). kind: ${KINDS.map(([k]) => k).join(", ")}.
- place, startDate, endDate (tek günse boş), people (söylenmediyse 0).
- summary: 3-5 cümle genel değerlendirme: hava/mevsim, ulaşım, dikkat edilecekler, varsayımlar. Sade Türkçe.
- tips: 3-6 kısa, somut öneri (güvenlik, rezervasyon, izin, hava).
- needs: ihtiyaç listesi, 12-35 kalem; cat kısa kategori (Barınma, Uyku, Mutfak, Yiyecek, Giyim, Ekipman, Sağlık, Belge, Ulaşım, Diğer gibi). Etkinliğe özgü olsun (balıkta olta, yem, balık tutma ruhsatı; konserde bilet, kimlik, powerbank).
- budget: 3-10 kalem, Türkiye'deki güncel fiyatlarla makul TL tahmin; unit person (kişi başı: bilet, yemek, konaklama gecesi) ya da shared (ortak: yakıt, araç kiralama, kamp alanı ücreti çadır başına); qty gün/gece/adet; kullanıcı tutarı söylemediyse est true.
- todos: 3-8 hazırlık işi; tarih belliyse etkinlikten önceki makul bir tarih (date), değilse boş.
message: 1 kısa Türkçe cümle (sesli okunur): ne hazırladığını söyle.`;

const SCHEMA = {
  type: "object",
  properties: {
    ask: { type: "array", items: { type: "string", enum: ["where", "when", "people"] } },
    question: { type: "string" },
    title: { type: "string" },
    kind: { type: "string", enum: KINDS.map(([k]) => k) },
    place: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    people: { type: "number" },
    summary: { type: "string" },
    tips: { type: "array", items: { type: "string" } },
    needs: { type: "array", items: { type: "object", properties: { cat: { type: "string" }, title: { type: "string" } }, required: ["cat", "title"] } },
    budget: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, amount: { type: "number" }, unit: { type: "string", enum: ["person", "shared"] }, qty: { type: "number" }, est: { type: "boolean" } },
        required: ["title", "amount", "unit"],
      },
    },
    todos: { type: "array", items: { type: "object", properties: { title: { type: "string" }, date: { type: "string" } }, required: ["title"] } },
    message: { type: "string" },
  },
  required: ["ask", "title", "kind", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const N = (v, max) => Math.min(Math.max(0, Math.round(Number(v) || 0)), max);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Etkinlik planlamayı yalnız ana hesap yapabilir.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = S(body?.text, 2000);
  const e = body?.event || {};
  const known = [
    S(e.title, 80) && `Ad: ${S(e.title, 80)}`,
    S(e.kind, 12) && `Tür: ${S(e.kind, 12)}`,
    S(e.place, 80) && `Yer: ${S(e.place, 80)}`,
    S(e.startDate, 10) && `Tarih: ${S(e.startDate, 10)}${S(e.endDate, 10) ? ` - ${S(e.endDate, 10)}` : ""}`,
    N(e.people, 500) > 0 && `Kişi: ${N(e.people, 500)}`,
  ].filter(Boolean);
  if (!text && !known.length) return bad("Ne planladığını yaz ya da söyle.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Listeleri elle ekleyebilirsin.", 503);
  const general = body?.general !== false;
  const user = [
    `Bugün: ${S(body?.today, 10) || new Date().toISOString().slice(0, 10)}`,
    `general=${general}`,
    known.length ? `Formda girilenler:\n${known.join("\n")}` : "",
    text ? `Kullanıcının söylediği:\n"""\n${text}\n"""` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 6000, timeoutMs: 26000 });
    const ask = general ? [] : (Array.isArray(raw?.ask) ? raw.ask : []).filter((x) => ["where", "when", "people"].includes(x));
    const asking = ask.length > 0 && !(raw?.needs?.length > 0);
    const ev = cleanEvent({ ...raw, budget: (raw?.budget || []).map((b) => ({ ...b, est: b?.est !== false })), source: "ai" });
    const out = {
      ask: asking ? ask : [],
      question: asking ? S(raw?.question, 300) || "Nerede ve ne zaman olacak, kaç kişi katılacak?" : "",
      event: ev,
      message: S(raw?.message, 300),
    };
    console.log(`[event-plan] ${Date.now() - t0} ms, soru=${out.ask.join(",") || "-"}, ihtiyaç=${ev.needs.length}, bütçe=${ev.budget.length}`);
    return NextResponse.json(out);
  } catch (err) {
    logAiError("event-plan", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da listeleri elle ekle.", 429);
    return bad("Plan hazırlanamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
