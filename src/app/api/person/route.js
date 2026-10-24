import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminReady, profileOf } from "@/lib/server/admin";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Asistanla kişi ekleme: "Kişi ekle: Ayşe Yılmaz, eşim, 0532 …" -> ad, grup, yakınlık, unvan, telefon, e-posta, doğum günü.
// Kaydetmez; telefon kontrol edip özet kartında onay ister. Yalnızca ana hesap çağırabilir.
// Fotoğrafla da (Seyhun 2026-10-23): kişinin fotoğrafı (profil fotoğrafı olur), kimlik ya da kartvizit (üstündeki bilgiler
// okunur, fotoğraf saklanmaz). Kimlik numarası, seri numarası gibi bilgiler hiç alınmaz.
const SYSTEM = `Sen bir yelken kulübü yöneticisinin asistanısın. Yönetici, uygulamanın kişi listesine birini eklemek istiyor.
Söylediği Türkçe ses tanıma metnidir (yazım hataları olabilir) ya da yazdığı cümledir. Yalnızca cümlede geçen bilgileri çıkar, ASLA uydurma.

Alanlar:
- name: kişinin adı soyadı, düzgün yazımla ("ayşe yılmaz'ı" -> "Ayşe Yılmaz"). Ek ve yakınlık sözcükleri ada girmez ("Annem Fatma'yı" -> "Fatma"). Ad yoksa boş.
- kind: staff (çalışan, antrenör, personel, ekip), family (aile bireyi: eş, çocuk, anne, baba, kardeş, akraba), athlete (sporcu), student (öğrenci), parent (veli), other (diğer). Söylenmediyse ve yakınlıktan anlaşılmıyorsa boş.
- relation: yalnız aile bireyi için: Eş, Çocuk, Anne, Baba, Kardeş, Akraba, Diğer ("annem" -> Anne, "oğlum/kızım" -> Çocuk, "teyzem/kuzenim" -> Akraba, "ablam" -> Kardeş). Yoksa boş.
- title: yalnız çalışan için görevi/unvanı ("antrenör", "muhasebe"). Yoksa boş.
- phone: söylenen telefon numarasının rakamları, olduğu gibi (eksik de olsa). Yoksa boş.
- email: e-posta ("ali et gmail nokta com" -> "ali@gmail.com"). Yoksa boş.
- birthDay, birthMonth, birthYear: doğum günü söylendiyse sayı olarak; yıl söylenmediyse birthYear 0. Yoksa hepsi 0.

Fotoğraf geldiyse:
- photoKind: face (bir kişinin yüzü/fotoğrafı; kimlik ya da kart değil), card (kimlik, ehliyet, kartvizit, yaka kartı gibi üstünde yazı olan kart ya da belge), other (başka bir şey). Fotoğraf yoksa boş.
- Kartın ya da belgenin üstündeki ad soyadı, telefon, e-posta, unvan ve doğum tarihini oku (kartvizitteki görev title olur). Yöneticinin söyledikleri karttakinden önce gelir.
- Kimlik numarası (TC), seri numarası, belge numarası, adres, anne-baba adı ALINMAZ; hiçbir alana yazma.
- Yüz fotoğrafından ad, yaş ya da başka bir bilgi TAHMİN ETME; ad yalnız söylenenden ya da yazıdan gelir.`;

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
    photoKind: { type: "string", enum: ["", "face", "card", "other"] },
  },
  required: ["name", "kind", "relation", "phone", "email", "birthDay", "birthMonth", "birthYear"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 3 * 1024 * 1024;
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
  const img = body?.image && TYPES.includes(body.image.mimeType) ? body.image : null;
  if (img && String(img.data || "").length > (MAX * 4) / 3 + 8) return bad("Fotoğraf çok büyük.", 413);
  if (!text && !img) return bad("Kişiyi söyle ya da yaz.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  try {
    const said = text ? `Yöneticinin söylediği:\n"""\n${text}\n"""` : "Yönetici bir şey söylemedi.";
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL, system: SYSTEM, user: img ? `${said}\nEkteki fotoğrafa da bak.` : said, schema: SCHEMA, maxTokens: 600, timeoutMs: img ? 20000 : 10000,
      ...(img ? { images: [{ mimeType: img.mimeType, data: String(img.data) }] } : {}),
    });
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
      photoKind: img && ["face", "card", "other"].includes(raw?.photoKind) ? raw.photoKind : "",
    });
  } catch (e) {
    logAiError("person", "gemini", e);
    return bad("Kişi bilgisi anlaşılamadı.", e.status === 429 ? 429 : 502);
  }
}

export const POST = withAiCool(handle);
