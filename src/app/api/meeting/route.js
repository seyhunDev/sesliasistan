import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callClaude } from "@/lib/ai/anthropic";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { TOOL } from "@/lib/ai/schema";
import { cleanMeeting } from "@/lib/meeting/result";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Toplantı metninden başlıklı özet, kararlar, sorumlulu işler, planlar ve gönderilecek mesajlar
const SYSTEM = `Sen bir spor kulübünün (yelken) toplantı asistanısın. Sana bir toplantının ya da konuşmanın ses kaydından çıkarılmış Türkçe metnin TAMAMI verilir. Metin ses tanımadan geldiği için yazım hataları ve eksik cümleler olabilir; anlamı koru, uydurma.

İçeriğe göre ne çıktığına karar ver:
- Bir işten biri sorumlu tutulduysa ("Ali tekneleri boyasın", "motor işi Sanver'de") → items içinde "task"; sorumluyu verilen ÇALIŞANLAR listesindeki tam adıyla assignTo'ya yaz, adı başlıktan çıkar. Listede olmayan kişiyi assignTo'ya yazma (adı başlıkta kalsın). Sorumlu belli değilse assignTo boş.
- Birine haber verilmesi / mesaj atılması kararlaştırıldıysa ("velilere yazalım", "Gökhan'a söyle cumartesi gelsin") → messages: { to: kişinin MESAJ KİŞİLERİ listesindeki adı ya da "Ekip" / "Sporcular" / "Aile", text: gönderilecek kısa, kibar, hazır mesaj (1-3 cümle, kulüp adına) }. Mesajı uydurma, yalnız konuşulanı yaz.
- Bir etkinlik / buluşma / antrenman / yarış planlandıysa → items içinde "plan" (tarih/saat söylendiyse doldur).
- Önemli bilgi ama iş değilse → "note" (az kullan).
- Yalnız konuşma olduysa (iş, plan, mesaj yoksa) items ve messages boş kalır; özet yeter.

Çıktı:
- title: 2-5 kelimelik kısa başlık.
- sections: Özet, ana başlıklarla. Konuşulan her ana konu bir bölüm: heading (2-5 kelime), points (1-5 kısa madde: ne konuşuldu, ne sonuç çıktı). En çok 8 bölüm. Kim konuştu belli değilse isim uydurma.
- decisions: Alınan net kararlar (her biri tek cümle). Yoksa boş liste.
- items: Görevler (başlık emir kipinde, kısa; son tarih söylendiyse date), planlar ve notlar. En fazla 15. Tarihleri YYYY-MM-DD, saatleri HH:MM yaz; göreli tarihleri (yarın, cuma, haftaya) verilen bugüne göre çöz. Tarih ya da saat uydurma, bilinmiyorsa boş bırak. Toplantının kendisi için plan oluşturma.
- messages: Gönderilecek mesajlar (en çok 8). Yoksa boş liste.
- message: Kullanıcıya 1-2 cümlelik, samimi yanıt (kaç iş, plan, mesaj çıktığını söyle; hiçbiri yoksa "konuşmanın özetini çıkardım").`;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      items: { type: "object", properties: { heading: { type: "string" }, points: { type: "array", items: { type: "string" } } }, required: ["heading", "points"] },
    },
    decisions: { type: "array", items: { type: "string" } },
    items: TOOL.input_schema.properties.items,
    messages: {
      type: "array",
      items: { type: "object", properties: { to: { type: "string" }, text: { type: "string" } }, required: ["to", "text"] },
    },
    message: { type: "string" },
  },
  required: ["title", "sections", "decisions", "items", "messages", "message"],
};

// İstemciden gelen ad listesi: yalnız harf/rakam, en çok 40 kişi
const names = (v) => [...new Set((Array.isArray(v) ? v : []).slice(0, 40).map((n) => String(n ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 40)).filter(Boolean))];

function pickProvider() {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "meeting");
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const text = String(body?.text ?? "").trim().slice(0, 150000); // uzun toplantı: ~2-3 saatlik konuşma
  if (text.length < 20) return NextResponse.json({ error: "Özetlenecek kadar konuşma yok" }, { status: 400 });
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  const weekday = new Date(`${today}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });
  const people = names(body?.people);
  const contacts = names(body?.contacts);
  const user = `Bugün: ${today} (${weekday}). Saat dilimi: Europe/Istanbul.\nÇALIŞANLAR (sorumlu atanabilir): ${people.join(", ") || "yok"}\nMESAJ KİŞİLERİ: ${contacts.join(", ") || "yok"}\n\nTOPLANTI METNİ:\n"""\n${text}\n"""`;

  const provider = pickProvider();
  const hasKey = provider === "gemini" ? process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL : provider === "anthropic" && process.env.ANTHROPIC_API_KEY;
  if (!hasKey) return NextResponse.json({ error: "Yapay zeka anahtarı tanımlı değil" }, { status: 503 });

  try {
    const t0 = Date.now();
    const raw =
      provider === "gemini"
        ? await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 8192, timeoutMs: 25000 })
        : await callClaude({
          model: process.env.AI_MODEL_TEXT || "claude-haiku-4-5-20251001",
          system: SYSTEM,
          tool: { name: "toplanti", description: "Toplantı özeti ve eylem planı", input_schema: SCHEMA },
          messages: [{ role: "user", content: user }],
          maxTokens: 8192,
        });
    console.log(`[meeting:${provider}] ${Date.now() - t0} ms, ${text.length} karakter`);
    return NextResponse.json({ ...cleanMeeting(raw, { people, names: contacts }), source: "ai" });
  } catch (e) {
    logAiError("meeting", provider, e);
    return NextResponse.json({ error: e.status === 429 ? "Yapay zeka kotası dolu" : "Yapay zeka yanıt vermedi" }, { status: 502 });
  }
}

export const POST = withAiCool(handle);
