import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Hareket eşleştirme (Hareketlerim tek liste): aynı hareketin başka adla ikinci kez açılmaması için.
//   { names: [yeni adlar], lib: [{ key, name }] } → { pairs: [{ name, key }] }  yeni ad kütüphanedeki hangi hareket (yoksa key "")
//   { lib: [{ key, name }] } → { groups: [[key, key, …]] }                       kütüphanede aynı hareketin farklı adlı kayıtları
// Kaydetmez; telefon eşleşmeyi kütüphaneye yazar (alias) ya da birleştirmeyi gösterir.
const SYSTEM = `Bir yelken kulübünün fitness hareket listesindeki adları karşılaştırırsın. Adlar Türkçe ya da İngilizce olabilir.
İki ad AYNI hareketse eşleştir: yalnız dil, yazım, sıra ya da açıklayıcı ek kelime farkı ("Backpack split squat" = "Sırt çantalı split squat",
"Dead bug" = "Deadbug", "Glute bridge" = "Kalça köprüsü", "Cat cow" = "Kedi deve").
FARKLI hareketi asla eşleştirme: tek bacak/tek kol ile çift, farklı yön (lateral ↔ reverse lunge), farklı ekipman ya da duruş
(eğimli şınav ↔ şınav, side plank ↔ plank, band row ↔ masa altı row), farklı amaç (nefes ↔ esneme). Emin değilsen eşleştirme.`;
const S = (v, k) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const s = { type: "string" };
const SCHEMA_PAIRS = { type: "object", properties: { pairs: { type: "array", items: { type: "object", properties: { name: s, key: s }, required: ["name", "key"] } } }, required: ["pairs"] };
const SCHEMA_GROUPS = { type: "object", properties: { groups: { type: "array", items: { type: "array", items: s } } }, required: ["groups"] };

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("İstek okunamadı");
  }
  const lib = (Array.isArray(body?.lib) ? body.lib : [])
    .map((e) => ({ key: S(e?.key, 60), name: S(e?.name, 60) }))
    .filter((e) => e.key && e.name)
    .slice(0, 300);
  const names = [...new Set((Array.isArray(body?.names) ? body.names : []).map((n) => S(n, 60)).filter(Boolean))].slice(0, 120);
  if (!lib.length || (body?.names && !names.length)) return NextResponse.json(body?.names ? { pairs: [] } : { groups: [] });
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  countAi(au, "fitness-match");
  const keys = new Set(lib.map((e) => e.key));
  const list = lib.map((e) => `${e.key}: ${e.name}`).join("\n");
  try {
    if (body?.names) {
      const user = `Kulübün hareketleri (anahtar: ad):\n${list}\n\nYeni adlar (her biri için aynı hareketin anahtarı, yoksa key ""):\n${names.join("\n")}`;
      const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA_PAIRS, maxTokens: 4000, timeoutMs: 20000 });
      const pairs = (Array.isArray(raw?.pairs) ? raw.pairs : [])
        .map((p) => ({ name: S(p?.name, 60), key: S(p?.key, 60) }))
        .filter((p) => names.includes(p.name) && keys.has(p.key));
      return NextResponse.json({ pairs });
    }
    const user = `Kulübün hareketleri (anahtar: ad). Aynı hareketin farklı adlı kayıtlarını grupla (her grup en az 2 anahtar; tek kalanları yazma):\n${list}`;
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA_GROUPS, maxTokens: 4000, timeoutMs: 20000 });
    const seen = new Set();
    const groups = (Array.isArray(raw?.groups) ? raw.groups : [])
      .map((g) => [...new Set((Array.isArray(g) ? g : []).map((k) => S(k, 60)))].filter((k) => keys.has(k) && !seen.has(k)))
      .filter((g) => g.length > 1)
      .map((g) => (g.forEach((k) => seen.add(k)), g));
    return NextResponse.json({ groups });
  } catch (err) {
    logAiError("fitness-match", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Eşleştirilemedi, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
