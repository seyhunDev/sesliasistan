import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Sesli/yazılı yoklama: "Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi" -> sporcu bazında durum.
// Kaydetmez; telefona önizleme döner, kullanıcı onaylayınca kulüp projesine telefondan yazılır.
// Yapay zekaya yalnızca ad, sınıf ve kimlik gider (T.C., sağlık, veli bilgisi gitmez).
const SYSTEM = `Sen bir yelken kulübünde antrenörün yoklama asistanısın. Antrenör Türkçe konuşur (ses tanıma metni, yazım hataları olabilir) ya da yazar.
Sana sporcu listesi (id | ad soyad | sınıf) ve bugünün tarihi verilir. Söylenenden hangi sporcunun ne durumda olduğunu çıkar.

Durumlar: present = geldi / burada / var / katıldı, absent = gelmedi / yok / katılmadı, excused = izinli / raporlu / hasta / mazeretli, clear = işareti kaldır / sil / yanlış girdim.

Kurallar:
- Yalnızca listedeki sporcular. Adı listedeki bir sporcuyla eşleştir: yalnızca ad, yalnızca soyad, lakap ya da ses tanıma hatası ("Ali yılmas" -> "Ali Yılmaz"; ses tanıma ğ ve h ekleyip düşürebilir: "Uğraz" -> "Uraz", "Gökan" -> "Gökhan") olabilir. Aynı ada birden çok sporcu uyuyorsa ve soyad/sınıf söylenmediyse işaretleme; unknown'a "Ali (2 kişi)" diye yaz.
- Her sporcunun "söylenişler" listesi (varsa) önceden hazırlanmış eşleştirme dizinidir: söylenen ad ya da ses tanıma hatası bunlardan birine uyuyorsa o sporcudur. Önce bu listeye bak.
- Tek başına söylenen ad önce ADI o olan sporcuya aittir; soyadı o olan sporcu yalnızca o ada sahip kimse yoksa. ("Deniz" = Deniz Yılmaz; Aren Deniz için "Aren" denir.) "Karışabilecek adlar" notlarına uy.
- Listede karşılığı olmayan adları unknown'a yaz.
- "Optimist grubu geldi", "ILCA'lar hep burada" gibi sınıf adı geçerse o sınıftaki herkes.
- "Herkes geldi" = listedeki herkes. "Kalanlar / diğerleri / geri kalanı gelmedi" -> others alanına o durumu yaz (adı geçmeyenlere uygulanır); yoksa others boş.
- "Herkes geldi ama Ali gelmedi" gibi istisnaları doğru uygula: others = present, Ali = absent.
- Tarih: söylenmediyse bugün. "Dün", "cumartesi", "geçen salı", "12 Eylül" gibi ifadeleri bugüne göre YYYY-MM-DD'ye çevir (gün adı geçmişteki en yakın o gün).
- message: 1 kısa cümle, Türkçe özet ("5 kişi geldi, 1 izinli, kalanlar gelmedi.").
- Yoklamayla ilgisi yoksa marks boş kalsın ve message'da nedenini söyle.`;

const SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string", description: "YYYY-MM-DD" },
    marks: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, state: { type: "string", enum: ["present", "absent", "excused", "clear"] } },
        required: ["id", "state"],
      },
    },
    others: { type: "string", enum: ["", "present", "absent", "excused"] },
    unknown: { type: "array", items: { type: "string" } },
    message: { type: "string" },
  },
  required: ["date", "marks", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "attendance");
  if (!canSeeAthletes(au.email)) return bad("Yoklama yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = S(body?.text, 1500);
  const today = DATE.test(body?.today || "") ? body.today : new Date().toISOString().slice(0, 10);
  // Yoklama sayfasında ekranda açık gün: cümlede gün yoksa bu gün
  const day = DATE.test(body?.day || "") && body.day <= today ? body.day : "";
  const list = (Array.isArray(body?.athletes) ? body.athletes : [])
    .map((a) => ({
      id: S(a?.id, 64), name: S(a?.name, 60), cls: S(a?.cls, 30),
      aliases: (Array.isArray(a?.aliases) ? a.aliases : []).map((x) => S(x, 40)).filter(Boolean).slice(0, 12),
    }))
    .filter((a) => /^[\w-]+$/.test(a.id) && a.name)
    .slice(0, 300);
  if (!text) return bad("Kimin geldiğini söyle ya da yaz.");
  if (!list.length) return bad("Sporcu listesi boş.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Yoklamayı dokunarak yapabilirsin.", 503);

  const wd = DAYS[new Date(`${today}T12:00:00`).getDay()];
  const notes = (Array.isArray(body?.notes) ? body.notes : []).map((n) => S(n, 200)).filter(Boolean).slice(0, 20);
  const line = (a) => `${a.id} | ${a.name} | ${a.cls || "-"}${a.aliases.length ? ` | söylenişler: ${a.aliases.join(", ")}` : ""}`;
  const user = [
    `Bugün: ${today} (${wd})`,
    day && day !== today ? `Ekranda açık gün: ${day}. Cümlede gün söylenmediyse date bu gün olsun.` : "",
    `Sporcular:\n${list.map(line).join("\n")}`,
    notes.length ? `Karışabilecek adlar:\n${notes.map((n) => `- ${n}`).join("\n")}` : "",
    `Antrenörün söylediği:\n"""\n${text}\n"""`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 4000, timeoutMs: 20000 });
    const ids = new Set(list.map((a) => a.id));
    const seen = new Set();
    const marks = (Array.isArray(raw?.marks) ? raw.marks : [])
      .map((m) => ({ id: String(m?.id || ""), state: String(m?.state || "") }))
      .filter((m) => ids.has(m.id) && ["present", "absent", "excused", "clear"].includes(m.state) && !seen.has(m.id) && seen.add(m.id));
    const others = ["present", "absent", "excused"].includes(raw?.others) ? raw.others : "";
    const date = DATE.test(raw?.date || "") && raw.date <= today ? raw.date : day || today;
    const unknown = (Array.isArray(raw?.unknown) ? raw.unknown : []).map((u) => S(u, 40)).filter(Boolean).slice(0, 10);
    console.log(`[attendance] ${Date.now() - t0} ms, işaret=${marks.length}, diğerleri=${others || "-"}`);
    return NextResponse.json({ date, marks, others, unknown, message: S(raw?.message, 200) });
  } catch (e) {
    logAiError("attendance", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da dokunarak işaretle.", 429);
    return bad("Yoklama anlaşılamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
