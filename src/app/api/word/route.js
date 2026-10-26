import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Söylenen kelimenin kartı (asistan "X kelimesini ekle, bana çalıştır"; kelime destede yoksa): İngilizce kelime,
// türü, Türkçe anlamı, yaygın kullanımla örnek cümle ve Türkçesi. Türkçe söylenirse İngilizcesi bulunur. Kaydetmez.
// kind "phrase": hazır cümle kartı (İngilizce sayfası › Cümleler › Ekle).
const SYSTEM = `Türkçe konuşan, İngilizce öğrenen bir yetişkine kelime kartı hazırlıyorsun.
Kurallar:
- Kullanıcı bir İngilizce kelime ya da deyim söyler (sesle yazıldığı için yazımı bozuk olabilir, en olası İngilizce kelimeyi seç). Türkçe bir kelime söylerse en yaygın İngilizce karşılığını al.
- en: kelimenin sözlükteki yazımı, küçük harf (özel isim değilse). Deyimse deyimin kendisi ("take off").
- type: Türkçe tür: "isim", "fiil", "sıfat", "zarf", "bağlaç" ya da "deyim".
- tr: en yaygın 1-3 Türkçe anlamı, virgülle ("dirençli, çabuk toparlanan").
- ex: kelimenin en yaygın kullanımıyla günlük hayattan kısa, doğal bir İngilizce cümle (en çok 12 kelime).
- exTr: örnek cümlenin doğal Türkçesi.
- Söylenen şey bir kelime değilse ya da anlaşılmıyorsa en boş kalsın.`;

const PHRASE = `Türkçe konuşan, İngilizce öğrenen bir yetişkine hazır cümle kartı hazırlıyorsun.
Kurallar:
- Kullanıcı İngilizce bir cümle ya da kalıp söyler (sesle yazıldığı için bozuk olabilir, en doğal ve doğru İngilizce hâlini yaz). Türkçe söylerse günlük konuşmada en doğal İngilizce karşılığını yaz.
- en: cümlenin doğru yazımı, büyük harfle başlar, noktalama ile biter.
- type: "cümle".
- tr: cümlenin doğal Türkçesi.
- ex: bu cümlenin geçtiği kısa bir örnek durum cümlesi (İngilizce, en çok 12 kelime) ya da boş.
- exTr: örneğin Türkçesi ya da boş.
- Anlaşılmıyorsa en boş kalsın.`;

// more: İngilizce sayfasında kartın ek örnekleri (bir kez hazırlanır, desteye yazılır)
const MORE = `Türkçe konuşan, İngilizce öğrenen bir yetişkin için verilen kelimeye ya da cümleye örnek hazırlıyorsun.
Kurallar:
- ex2: kelimenin (cümlede: kalıbın) en yaygın kullanımıyla günlük hayattan 2 kısa, doğal İngilizce cümle (her biri en çok 12 kelime). Kelime ya da kalıp cümlede aynen geçsin. Verilen örnek cümleyi tekrar etme.
- dlg: iki kişi arasında 3 satırlık kısa, doğal bir günlük konuşma (A, B, A sırasıyla; her satır en çok 12 kelime). Kelime ya da kalıp en az bir satırda geçsin.
- Her satırda e: İngilizcesi, t: doğal Türkçesi.
- Sade, B1-B2 düzeyinde, gerçek hayattan konular (iş, yolculuk, aile, spor, alışveriş).`;
const LINES = { type: "array", items: { type: "object", properties: { e: { type: "string" }, t: { type: "string" } }, required: ["e", "t"] } };
const MORE_SCHEMA = { type: "object", properties: { ex2: LINES, dlg: LINES }, required: ["ex2", "dlg"] };
const lines = (a, n) =>
  (Array.isArray(a) ? a : [])
    .map((x) => ({ e: S(x?.e, 200), t: S(x?.t, 200) }))
    .filter((x) => x.e && x.t)
    .slice(0, n);

async function more(au, body) {
  const en = S(body?.en, 160);
  if (!en) return bad("Hangi kelime?");
  countAi(au, "word");
  try {
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: MORE, user: `${body?.kind === "phrase" ? "Cümle" : "Kelime"}: """${en}""" (${S(body?.tr, 120)})\nVerilen örnek: """${S(body?.ex, 200)}"""`, schema: MORE_SCHEMA, maxTokens: 900, timeoutMs: 15000 });
    return NextResponse.json({ more: { ex2: lines(raw?.ex2, 3), dlg: lines(raw?.dlg, 4) } });
  } catch (e) {
    logAiError("word", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Örnekleri hazırlayamadım.", 502);
  }
}

const SCHEMA = {
  type: "object",
  properties: { en: { type: "string" }, type: { type: "string" }, tr: { type: "string" }, ex: { type: "string" }, exTr: { type: "string" } },
  required: ["en", "type", "tr", "ex", "exTr"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  if (body?.more) return more(au, body);
  const phrase = body?.kind === "phrase";
  const word = S(body?.word, phrase ? 160 : 60);
  if (!word) return bad("Hangi kelime?");
  countAi(au, "word");
  try {
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: phrase ? PHRASE : SYSTEM, user: `${phrase ? "Cümle" : "Kelime"}: """${word}"""`, schema: SCHEMA, maxTokens: 600, timeoutMs: 15000 });
    const w = { en: S(raw?.en, phrase ? 160 : 60), type: S(raw?.type, 20), tr: S(raw?.tr, 120), ex: S(raw?.ex, 200), exTr: S(raw?.exTr, 200) };
    if (!w.en || !w.tr) return bad(`"${word}" kelimesini anlayamadım. Harf harf söyler misin?`, 422);
    return NextResponse.json({ word: w });
  } catch (e) {
    logAiError("word", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Kelimeyi hazırlayamadım, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
