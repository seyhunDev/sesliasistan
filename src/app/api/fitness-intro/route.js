import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { GOALS, LEVELS, cleanProfile } from "@/lib/fitness/model";
import { GOAL_KEYS, bmiOf, bmiText, forecast, hasBody, introCards } from "@/lib/fitness/forecast";

export const runtime = "nodejs";

// Fitness tanıtımı: boy, kilo, yaş, cinsiyet, seviyeye göre her hedef için kişiye özel kart (8 haftada ne değişir).
// Yalnız bu bilgiler gider (ad yok). Sayıların gerçekçi kalması için yerel hesap yapay zekaya sınır olarak verilir;
// yapay zekanın yazmadığı ya da bozuk alanlar yerel hesapla doldurulur (introCards). Kaydetmez.
const SYSTEM = `Sen dürüst, gerçekçi bir fitness koçusun. Kullanıcının bilgilerine göre beş hedefin (${GOAL_KEYS.join(", ")}) her biri için kısa bir kart yaz: düzenli antrenmanla (haftada 3 gün, 8 hafta) bu kişide neler değişir.
Kurallar:
- Türkçe, sade, "sen" diliyle; abartma, söz verme, tıbbi iddia yok. Sayılar verilen "gerçekçi aralık" içinde kalsın, ondan iyimser olma.
- now: şu anki durum, en çok 4 kelime ("Şu an 82 kg", "VKİ 26,8"). then: 8 hafta sonraki gerçekçi sonuç, en çok 4 kelime ("≈ 78-80 kg", "+1-1,5 kg kas", "%25-40 daha güçlü"). sub: tek kısa cümle, en çok 12 kelime, koşulu söyle (beslenme, uyku…).
- weeks: tam 3 madde, w "2. hafta", "4. hafta", "8. hafta"; text bu kişiye özel tek kısa cümle (en çok 9 kelime), hissedeceği ya da göreceği somut değişiklik.
- tip: tek kısa öneri (en çok 9 kelime), bu kişiye uygun.
- Kilosu zaten sağlıklıysa (VKİ 21 altı) kilo verme kartında kilo kaybı önerme; sıkılaşma ve form de.
- headline: kullanıcıya tek kısa motive edici cümle (en çok 7 kelime, ad yazma).`;

const CARD = {
  type: "object",
  properties: {
    goal: { type: "string", enum: GOAL_KEYS },
    now: { type: "string" },
    then: { type: "string" },
    sub: { type: "string" },
    weeks: { type: "array", items: { type: "object", properties: { w: { type: "string" }, text: { type: "string" } }, required: ["w", "text"] } },
    tip: { type: "string" },
  },
  required: ["goal", "now", "then", "sub", "weeks", "tip"],
};
const SCHEMA = { type: "object", properties: { headline: { type: "string" }, cards: { type: "array", items: CARD } }, required: ["headline", "cards"] };

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const label = (list, k) => list.find(([x]) => x === k)?.[1] || "";

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const p = cleanProfile(body?.profile || {});
  if (!hasBody(p)) return bad("Boy ve kilo gerekli.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  countAi(au, "fitness-intro");
  const b = bmiOf(p);
  const limits = GOAL_KEYS.map((g) => {
    const f = forecast(g, p);
    return `- ${g}: ${f.now} → ${f.then} (${f.sub})`;
  }).join("\n");
  const user = [
    `Kişi: boy ${p.height} cm, kilo ${p.weight} kg, VKİ ${b} (${bmiText(b)})${p.age ? `, yaş ${p.age}` : ""}${p.sex ? `, ${p.sex === "k" ? "kadın" : "erkek"}` : ""}, seviye: ${label(LEVELS, p.level) || "yeni başlayan"}${p.goal ? `, seçtiği hedef: ${label(GOALS, p.goal)}` : ""}.`,
    `Gerçekçi aralıklar (8 hafta, haftada 3 gün; bunları aşma):\n${limits}`,
  ].join("\n\n");
  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 2500, timeoutMs: 20000 });
    console.log(`[fitness-intro] ${Date.now() - t0} ms`);
    return NextResponse.json(introCards(raw, p));
  } catch (err) {
    logAiError("fitness-intro", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu.", 429);
    return bad("Kartlar hazırlanamadı.", 502);
  }
}

export const POST = withAiCool(handle);
