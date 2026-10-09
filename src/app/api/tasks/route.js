import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { PLAN_KINDS, cleanPlan } from "@/lib/taskPlan";

export const runtime = "nodejs";

// Tek cümlede birden çok iş → sıralı görev listesi (lib/taskPlan.js). Kaydetmez; telefon işleri sırayla kendi akışlarında yapar.
const SYSTEM = `Sen bir yelken kulübü uygulamasının sesli asistanında görev planlayıcısısın. Kullanıcı tek seferde birden çok iş söyler (ses tanıma metni olabilir, noktalama ve yazım bozuk olabilir).
Söyleneni sırayla yapılacak işlere böl. Söylenme sırasını koru. Aynı işe ait cümleleri birleştir ("Enes ödemesini yaptı. Aidat ödemesini yaptı. Nakit verdi." tek iş: Enes'in aidatı nakit alındı).
Her iş için:
- kind: işin türü (aşağıdaki listeden).
- say: uygulamaya verilecek, TEK BAŞINA anlaşılır kısa Türkçe komut, verilen kalıba uygun. Öncekine gönderme yapma; "bunun için", "o yarış" yerine adını yaz ("Atatürk Kupası için Instagram gönderisi hazırla"). Kullanıcının söylemediği bilgiyi (tarih, tutar, ad) uydurma; söylenen her bilgiyi (renk, boyut, gün, tutar, adlar) koru. Gün söylenmediyse yoklamada "bugün" yaz. Ay söylenmediyse aidatta ay yazma.
- label: kontrol listesinde görünecek çok kısa ad (2-5 kelime): "Atatürk Kupası yarışı", "Yoklama: Mustafa", "Enes aidatı (nakit)", "Instagram yarış görseli".
Tek iş varsa tek eleman döndür.

Türler:
${Object.entries(PLAN_KINDS).map(([k, v]) => `- ${k}: ${v.how}. Kalıp: ${v.say}`).join("\n")}`;

const SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: { type: "object", properties: { kind: { type: "string", enum: Object.keys(PLAN_KINDS) }, say: { type: "string" }, label: { type: "string" } }, required: ["kind", "say", "label"] },
    },
  },
  required: ["tasks"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "tasks");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = String(body?.text ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!text) return bad("Boş istek");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today || "") ? body.today : "";
  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user: `Bugün: ${today}\n\nKullanıcının söylediği:\n"""\n${text}\n"""`, schema: SCHEMA, maxTokens: 1200, timeoutMs: 12000 });
    const tasks = cleanPlan(raw);
    console.log(`[tasks] ${Date.now() - t0} ms, iş=${tasks.length}`);
    return NextResponse.json({ tasks });
  } catch (e) {
    logAiError("tasks", "gemini", e);
    return bad("Görev listesi çıkarılamadı.", e.status === 429 ? 429 : 502);
  }
}

export const POST = withAiCool(handle);
