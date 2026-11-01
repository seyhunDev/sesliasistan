import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";
import { cleanEntries } from "@/lib/roundSay";

export const runtime = "nodejs";

// Yarışın kayıt listesi (organizasyonun katılımcı listesi; PDF, fotoğraf ya da Excel'den çıkan yazı) → yelken no, ad, kulüp, sınıf.
// Şamandıra dönüşlerini sesle girerken söylenen numaralar bu listeyle denetlenir (lib/roundSay.js). Belge saklanmaz.
const SYSTEM = `Sen bir yelken kulübünün antrenörüne yardım eden asistansın. Sana bir yelken yarışının KAYIT (katılımcı) listesi verilir: belge, fotoğraf ya da tablodan çıkmış yazı (Türkçe ya da İngilizce). Sonuç listesi de olabilir; o zaman da sporcuları aynı biçimde çıkar.
Her sporcuyu satır satır, eksiksiz çıkar. Uydurma; okuyamadığın alanı boş bırak.
- isList: belge bir katılımcı ya da sonuç listesi değilse false.
- rows: { sail yelken numarası belgede yazdığı gibi ("TUR 1234", "1234"), name ad soyad, club kulüp, cls sınıf ("Optimist", "ILCA 4", "ILCA 6", "420"; belgenin başlığında ya da sütununda) }.`;

const s = { type: "string" };
const SCHEMA = {
  type: "object",
  properties: {
    isList: { type: "boolean" },
    rows: { type: "array", items: { type: "object", properties: { sail: s, name: s, club: s, cls: s }, required: ["sail"] } },
  },
  required: ["isList", "rows"],
};

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "race-entries");
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Dosya çok büyük ya da bozuk. 4 MB'tan küçük PDF ya da fotoğraf yükle.", 413);
  }
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  const text = String(body?.text || "").slice(0, 60000);
  if (!text && !TYPES.includes(mimeType)) return bad("PDF, fotoğraf ya da Excel yükle.");
  if (!text && (!data || data.length > (MAX * 4) / 3 + 8)) return bad("Dosya 4 MB'tan büyük olmasın.", 413);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  try {
    const t0 = Date.now();
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: SYSTEM,
      user: text ? `Bu kayıt listesini oku:\n${text}` : "Bu kayıt listesini oku.",
      schema: SCHEMA,
      ...(text ? {} : { images: [{ mimeType, data }] }),
      maxTokens: 24000,
      timeoutMs: 55000,
    });
    if (raw?.isList === false) return bad("Bu bir kayıt listesine benzemiyor.", 422);
    const rows = cleanEntries(raw?.rows);
    if (!rows.length) return bad("Listede yelken numarası bulunamadı.", 422);
    console.log(`[race-entries] ${Date.now() - t0} ms, ${rows.length} tekne`);
    return NextResponse.json({ rows });
  } catch (e) {
    logAiError("race-entries", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Kayıt listesi okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
