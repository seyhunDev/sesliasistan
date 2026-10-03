import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { DIRS, TOPICS, cleanLog } from "@/lib/trainingLog";

export const runtime = "nodejs";

// Antrenman günlüğü: kullanıcının serbest anlatımı → günlük alanları (rüzgâr, yön, konular, süre, nasıl geçti, not)
// ve fazlası (sağanak, deniz, yer, katılanlar, sınıflar, sonraki antrenman, diğer ayrıntılar). Kaydetmez; telefon kaydeder.
// Tarih anlatılmadıysa date boş döner (telefon sorar). Var olan günlük verilirse yalnız yeni söylenenler yazılır.
const SYSTEM = `Sen bir yelken kulübünün antrenman günlüğünü tutan asistansın. Antrenör antrenmanı Türkçe anlatır (ses tanıma metni olabilir, yazım hataları olabilir: "knot" çoğu zaman "not", "nat", "knot'tu" diye yazılır; "12 not" 12 knot demektir, not alma değildir; "antreman" antrenmandır). Anlatılanı günlük alanlarına ayır.
Bugünün tarihi verilir. date: antrenmanın günü (YYYY-MM-DD); "bugün", "dün", "salı", "geçen cumartesi" gibi ifadeleri bugüne göre GEÇMİŞE doğru çöz (gün adı söylendiyse en yakın geçmiş o gün; bugünse bugün). Anlatılanda gün yoksa ve "Bilinen tarih" verilmediyse date BOŞ bırak, uydurma. time: söylendiyse başlangıç saati HH:MM.
Alanlar (yalnız anlatılanı yaz, tahmin etme, söylenmeyeni boş bırak):
- wind: rüzgâr knot (sayı; "12-15 knot" ise ortalama 13; "hafif" gibi sözlerden sayı uydurma). gust: sağanak knot.
- dir: rüzgâr yönü şunlardan biri: ${DIRS.join(", ")} (kuzey ya da kuzeydoğu→Poyraz, doğu→Gündoğusu, güneydoğu→Keşişleme, güney→Kıble, güneybatı→Lodos, batı ya da imbat→Batı, kuzeybatı→Karayel). Söylenmediyse boş.
- topics: çalışılan konular. Mümkünse şu adları kullan: ${TOPICS.join(", ")}. Listede olmayan konu kısa ad olarak eklenir (ör. "Rüzgâraltı seyri", "Kürek").
- min: süre dakika ("2 saat" → 120, "bir buçuk saat" → 90; başlangıç-bitiş saati verildiyse farkı).
- rating: nasıl geçti: 1 zor/kötü geçti, 2 iyi/normal, 3 çok iyi/harika. Söylenmediyse 0.
- note: genel not: kim ne yaptı, gözlemler, sorunlar; kısa ve düzenli, anlatanın sözleriyle. Diğer alanlara yazılanı tekrar etme.
- sea: deniz durumu (Düz, Hafif dalgalı, Dalgalı, Çok dalgalı ya da anlatılan). place: antrenman yeri.
- athletes: katılan sporcuların adları (söylendiği gibi). Gelmeyenler varsa details'e "Gelmeyenler" olarak yaz.
- boats: tekne sınıfları (Optimist, ILCA 4, ILCA 6, 420…).
- next: sonraki antrenmanda çalışılacaklar.
- details: diğer her önemli ayrıntı {k: kısa başlık, v: değer}: Antrenör, Gelmeyenler, Hava sıcaklığı, Ekipman/arıza, Sporcu notları (ör. k "Ali", v "start'ta geç kaldı"), Yarış provası sonuçları vb.
message: 1 kısa Türkçe cümle.`;

const SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string" },
    time: { type: "string" },
    wind: { type: "number" },
    gust: { type: "number" },
    dir: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
    min: { type: "number" },
    rating: { type: "number" },
    note: { type: "string" },
    sea: { type: "string" },
    place: { type: "string" },
    athletes: { type: "array", items: { type: "string" } },
    boats: { type: "array", items: { type: "string" } },
    next: { type: "string" },
    details: { type: "array", items: { type: "object", properties: { k: { type: "string" }, v: { type: "string" } }, required: ["k", "v"] } },
    message: { type: "string" },
  },
  required: ["date", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "training-log");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = String(body?.text ?? "").trim().slice(0, 4000);
  if (!text) return bad("Antrenmanı anlat ya da yaz.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Günlüğü elle yazabilirsin.", 503);
  const today = DAY.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  const known = DAY.test(body?.date) ? body.date : "";
  const user = [
    `Bugün: ${today} (${new Date(`${today}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" })})`,
    known ? `Bilinen tarih: ${known} (anlatılan başka gün söylemiyorsa bu)` : "",
    `Antrenörün anlattığı:\n"""\n${text}\n"""`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 3000, timeoutMs: 22000 });
    let date = DAY.test(raw?.date || "") ? raw.date : known;
    if (date > today) date = known || ""; // gelecek gün günlük olamaz: sorulur
    const time = /^\d{1,2}:\d{2}$/.test(raw?.time || "") ? raw.time.padStart(5, "0") : "";
    const log = cleanLog({ ...raw, src: "ai" });
    console.log(`[training-log] ${Date.now() - t0} ms, tarih=${date || "-"}, alan=${Object.keys(log || {}).length}`);
    return NextResponse.json({ date, time, log, message: S(raw?.message, 300) });
  } catch (err) {
    logAiError("training-log", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da günlüğü elle yaz.", 429);
    return bad("Günlük çıkarılamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
