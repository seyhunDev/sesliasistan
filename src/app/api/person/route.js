import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminReady, profileOf } from "@/lib/server/admin";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Asistanla kişi ekleme: "Kişi ekle: Ayşe Yılmaz, eşim, 0532 …" -> ad, grup, yakınlık, unvan, telefon, e-posta, doğum günü.
// Kaydetmez; telefon kontrol edip özet kartında onay ister. Yalnızca ana hesap çağırabilir.
const SYSTEM = `Sen bir yelken kulübü yöneticisinin asistanısın. Yönetici, uygulamanın kişi listesine birini eklemek istiyor.
Söylediği Türkçe ses tanıma metnidir (yazım hataları olabilir) ya da yazdığı cümledir. Yalnızca cümlede geçen bilgileri çıkar, ASLA uydurma.

Alanlar:
- name: kişinin adı soyadı, düzgün yazımla ("ayşe yılmaz'ı" -> "Ayşe Yılmaz"). Ek ve yakınlık sözcükleri ada girmez ("Annem Fatma'yı" -> "Fatma"). Ad yoksa boş.
- kind: staff (çalışan, antrenör, personel, ekip), family (aile bireyi: eş, çocuk, anne, baba, kardeş, akraba), athlete (sporcu), student (öğrenci), parent (veli), other (diğer). Söylenmediyse ve yakınlıktan anlaşılmıyorsa boş.
- relation: yalnız aile bireyi için: Eş, Çocuk, Anne, Baba, Kardeş, Akraba, Diğer ("annem" -> Anne, "oğlum/kızım" -> Çocuk, "teyzem/kuzenim" -> Akraba, "ablam" -> Kardeş). Yoksa boş.
- title: yalnız çalışan için görevi/unvanı ("antrenör", "muhasebe"). Yoksa boş.
- phone: söylenen telefon numarasının rakamları, olduğu gibi (eksik de olsa). Yoksa boş.
- email: e-posta ("ali et gmail nokta com" -> "ali@gmail.com"). Yoksa boş.
- birthDay, birthMonth, birthYear: doğum günü söylendiyse sayı olarak; yıl söylenmediyse birthYear 0. Yoksa hepsi 0.`;

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    kind: { type: "string" },
    relation: { type: "string" },
    title: { type: "string" },
    phone: { type: "string" },
    email: { type: "string" },
    birthDay: { type: "integer" },
    birthMonth: { type: "integer" },
    birthYear: { type: "integer" },
  },
  required: ["name", "kind", "relation", "phone", "email", "birthDay", "birthMonth", "birthYear"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const N = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : 0);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "person");
  if (adminReady()) {
    const me = await profileOf(au.uid);
    if (me.role !== "owner") return bad("Kişi eklemeyi yalnız ana hesap yapabilir.", 403);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = S(body?.text, 600);
  if (!text) return bad("Kişiyi söyle ya da yaz.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  try {
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user: `Yöneticinin söylediği:\n"""\n${text}\n"""`, schema: SCHEMA, maxTokens: 600, timeoutMs: 10000 });
    return NextResponse.json({
      name: S(raw?.name, 40),
      kind: S(raw?.kind, 10),
      relation: S(raw?.relation, 10),
      title: S(raw?.title, 40),
      phone: S(raw?.phone, 20),
      email: S(raw?.email, 80),
      birthDay: N(raw?.birthDay, 1, 31),
      birthMonth: N(raw?.birthMonth, 1, 12),
      birthYear: N(raw?.birthYear, 1900, 2100),
    });
  } catch (e) {
    logAiError("person", "gemini", e);
    return bad("Kişi bilgisi anlaşılamadı.", e.status === 429 ? 429 : 502);
  }
}

export const POST = withAiCool(handle);
