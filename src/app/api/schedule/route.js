import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Ders programını metinden, sesten (yazıya çevrilmiş) ya da fotoğraftan çıkarır. Kaydetmez; önizleme için döner.
const SYSTEM = `Sen bir öğrencinin haftalık ders programını düzenleyen asistansın. Kullanıcı Türkçe yazar ya da ders programının fotoğrafını gönderir.

Kurallar:
- Her ders ve her gün için ayrı kayıt yaz: aynı ders pazartesi ve çarşamba varsa iki kayıt.
- day: 1 = Pazartesi, 2 = Salı, 3 = Çarşamba, 4 = Perşembe, 5 = Cuma, 6 = Cumartesi, 7 = Pazar.
- start ve end 24 saatlik HH:MM. "9-10.30" = 09:00–10:30. Bitiş yazmıyorsa ve ders süresi belli değilse end boş kalsın; tabloda ders saatleri bir sütunda yazıyorsa oradan al.
- title: dersin adı, kısa ve düzgün yazımla ("Matematik", "Fizik Lab."). Kısaltmaları anlaşılırsa aç.
- place: derslik / sınıf / bina (varsa). teacher: öğretmen ya da öğretim üyesi (varsa).
- Teneffüs, öğle arası, boş saat, "—" gibi dersi olmayan hücreleri EKLEME.
- Fotoğraftaki tabloda satır ve sütunları dikkatle eşle (günler üstte ya da solda olabilir). Okuyamadığını uydurma, atla.
- Kullanıcı mevcut programa göre değişiklik isterse ("salı fiziği 14'e al") verilen mevcut programı güncelleyip TAM listeyi döndür.
- message: kullanıcıya 1-2 cümle, samimi Türkçe özet ("Haftada 12 ders çıkardım, cuma boş."). Emin olamadığın bir şey varsa kısaca söyle.
- Metin ya da görsel bir ders programı değilse lessons boş olsun ve message'da nedenini söyle.`;

const SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    lessons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          day: { type: "integer", description: "1=Pzt … 7=Paz" },
          start: { type: "string", description: "HH:MM" },
          end: { type: "string", description: "HH:MM ya da boş" },
          place: { type: "string" },
          teacher: { type: "string" },
        },
        required: ["title", "day", "start"],
      },
    },
  },
  required: ["lessons", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const T = (v) => {
  const m = String(v || "").match(/^(\d{1,2})[:.](\d{2})$/);
  return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

function clean(list) {
  return (Array.isArray(list) ? list : [])
    .map((l) => ({ title: S(l?.title, 60), day: Math.round(Number(l?.day)), start: T(l?.start), end: T(l?.end), place: S(l?.place, 40), teacher: S(l?.teacher, 40) }))
    .filter((l) => l.title && l.day >= 1 && l.day <= 7 && l.start)
    .map((l) => (l.end && l.end <= l.start ? { ...l, end: "" } : l))
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .slice(0, 80);
}

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "schedule");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = S(body?.text, 2000);
  const data = typeof body?.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const mimeType = /^image\/(jpeg|png|webp)$/.test(body?.mimeType) ? body.mimeType : "image/jpeg";
  if (!text && !data) return bad("Yaz, söyle ya da ders programının fotoğrafını çek.");
  if (data.length > 6_000_000) return bad("Fotoğraf çok büyük", 413);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Dersleri tek tek ekleyebilirsin.", 503);

  const current = clean(body?.current);
  const user = [
    current.length ? `Mevcut program (JSON):\n${JSON.stringify(current)}` : "",
    text ? `Kullanıcının mesajı:\n"""\n${text}\n"""` : "",
    data ? "Fotoğraftaki ders programını çıkar." : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: SYSTEM,
      user,
      schema: SCHEMA,
      images: data ? [{ mimeType, data }] : [],
      maxTokens: 6000,
      timeoutMs: data ? 45000 : 20000,
    });
    const lessons = clean(raw?.lessons);
    console.log(`[schedule] ${Date.now() - t0} ms, ders=${lessons.length}${data ? " (foto)" : ""}`);
    const message = S(raw?.message, 300) || (lessons.length ? `${lessons.length} ders çıkardım.` : "Ders programı bulamadım.");
    return NextResponse.json({ lessons, message });
  } catch (e) {
    logAiError("schedule", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da dersleri tek tek ekle.", 429);
    return bad("Ders programı çıkarılamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
