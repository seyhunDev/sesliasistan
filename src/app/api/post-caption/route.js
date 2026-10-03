import { NextResponse } from "next/server";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { KINDS, cleanRace, cleanTags } from "@/features/posts/postModel";

export const runtime = "nodejs";

// Instagram gönderisi: görseldeki yazılar (başlık, alt satır, etiket) + açıklama + hashtag.
// Kaydetmez; telefon kaydeder. Görsel telefonda çizilir, buraya fotoğraf gelmez. Yalnız ana hesap.
const SYSTEM = `Sen Dikili Yelken Spor Kulübü'nün (İzmir, Dikili) Instagram hesabını yöneten deneyimli bir sosyal medya editörüsün.
Kullanıcı ne paylaşmak istediğini Türkçe anlatır (ses tanıma metni olabilir, yazım hataları olabilir). Gönderi türü ve varsa yarış bilgisi verilir.
Türler: duyuru (yaklaşan yarış), sonuc (yarış sonucu, başarı), antrenman, kulup (kulüp haberi, kayıt, etkinlik), diger.

Yaz:
- headline: görselin üstündeki büyük yazı, 2-6 kelime, çarpıcı ve kısa ("Foça'da Yelken Ligi", "Kürsüdeyiz!", "Rüzgâr Bizden Yana"). Emoji yok.
- sub: görseldeki alt satır, en çok 50 karakter: yer · tarih ya da kısa bilgi ("Foça · 7-11 Ekim", "ILCA 4 · 2. ayak"). Bilgi yoksa boş.
- tag: görseldeki küçük etiket, 1-2 kelime büyük harf (YARIŞ, SONUÇ, ANTRENMAN, KAYITLAR AÇIK, DUYURU).
- caption: Instagram açıklaması, sıcak ve samimi kulüp dili, 2-4 kısa paragraf, toplam 350-700 karakter; 2-5 uygun emoji (⛵🌊🏆💪). Gerçek olmayan bilgi, sıralama, puan, isim UYDURMA; yalnız anlatılanı ve verileni kullan. Sporcu adı verilmişse kullan, verilmemişse "sporcularımız" de. Gerekirse sonda kısa bir çağrı (takipte kalın, tebrikler, destek için teşekkürler). Hashtag'leri caption'a yazma.
- hashtags: 8-12 Türkçe/İngilizce etiket, # olmadan: dikiliyelken, dikili, yelken, sailing ve konuya uygun olanlar (optimist, ilca, foça, izmir, yelkenligi gibi).
- Kullanıcı mevcut açıklamayı verip değişiklik isterse (daha kısa, daha resmi, emoji olmasın) ona göre yeniden yaz.`;

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    sub: { type: "string" },
    tag: { type: "string" },
    caption: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "caption", "hashtags"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const L = (v, n) => String(v ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Gönderi hazırlamayı yalnız ana hesap yapabilir.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const kind = KINDS.find(([k]) => k === body?.kind)?.[0] || "diger";
  const topic = L(body?.topic, 1500);
  const race = cleanRace(body?.race);
  const old = L(body?.caption, 2200);
  if (!topic && !race) return bad("Ne paylaşmak istediğini yaz.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Yazıları elle yazabilirsin.", 503);
  const user = [
    `Bugün: ${S(body?.today, 10) || new Date().toISOString().slice(0, 10)}`,
    `Tür: ${kind}`,
    race &&
      `Yarış:\n${[`Ad: ${race.name}`, race.place && `Yer: ${race.place}`, race.dates && `Tarih: ${race.dates}`, race.classes && `Sınıflar: ${race.classes}`, race.count > 0 && `Katılan sporcu sayısı: ${race.count}`].filter(Boolean).join("\n")}`,
    topic && `Kullanıcının anlattığı:\n"""\n${topic}\n"""`,
    old && `Mevcut açıklama (istenirse buna göre yeniden yaz):\n"""\n${old}\n"""`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 2500, timeoutMs: 22000 });
    const out = {
      headline: L(raw?.headline, 90),
      sub: S(raw?.sub, 90),
      tag: S(raw?.tag, 18),
      caption: L(raw?.caption, 2200),
      hashtags: cleanTags(raw?.hashtags),
    };
    if (!out.caption) throw new Error("boş cevap");
    console.log(`[post-caption] ${Date.now() - t0} ms, tür=${kind}, ${out.caption.length} karakter, ${out.hashtags.length} etiket`);
    return NextResponse.json(out);
  } catch (err) {
    logAiError("post-caption", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da yazıları elle yaz.", 429);
    return bad("Açıklama yazılamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
