import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { KINDS, cleanPeople, cleanRace, cleanTags, racePeople, raceSub, raceWish } from "@/features/posts/postModel";

export const runtime = "nodejs";

// Instagram gönderisi: görseldeki yazılar (başlık, alt satır, etiket) + açıklama + hashtag.
// Kaydetmez; telefon kaydeder. Görsel telefonda çizilir, buraya fotoğraf gelmez. Yalnız ana hesap.
const SYSTEM = `Sen Dikili Yelken Spor Kulübü'nün (İzmir, Dikili) Instagram hesabını yöneten deneyimli bir sosyal medya editörüsün.
Kullanıcı ne paylaşmak istediğini Türkçe anlatır (ses tanıma metni olabilir, yazım hataları olabilir). Gönderi türü ve varsa yarış bilgisi verilir.
Türler: duyuru (yaklaşan yarış), sonuc (yarış sonucu, başarı), antrenman, kulup (kulüp haberi, kayıt, etkinlik), diger.

Yaz:
- headline: görselin üstündeki büyük yazı, 2-6 kelime, çarpıcı ve kısa ("Foça'da Yelken Ligi", "Kürsüdeyiz!", "Rüzgâr Bizden Yana"). Yarış verildiyse yarışın adı (kısaltılmış olabilir). Emoji yok.
- sub: görseldeki alt satır, en çok 50 karakter: yer · tarih ya da kısa bilgi ("Foça · 7-11 Ekim", "ILCA 4 · 2. ayak"). Bilgi yoksa boş.
- people: görselde başlığın altında çıkacak katılan sporcu satırları (yarışta sporcu verildiyse ya da kullanıcı sporcu andıysa; yoksa boş). Her sporcu bir satır: "Ad Soyad · sınıf · kısa açıklama", en çok 45 karakter; kısa açıklama yalnız anlatılandan (ör. "2. oldu", "ilk yarışı", "kaptan"), bilgi yoksa yalnız ad ve sınıf. En çok 4 satır; 4'ten çok sporcu varsa ilk satır "8 sporcumuz yarışta", ikinci satır adlar virgülle (yalnız ilk adlar).
- wish: görselin en altındaki kısa dilek/çağrı satırı, en çok 40 karakter, ünlemle biter ("Sporcularımıza başarılar!", "Tebrikler şampiyonlar!", "Kayıtlar başladı, bekleriz!"). Emoji yok.
- tag: görseldeki küçük etiket, 1-2 kelime büyük harf (YARIŞ, SONUÇ, ANTRENMAN, KAYITLAR AÇIK, DUYURU).
- caption: Instagram açıklaması, sıcak ve samimi kulüp dili, 2-4 kısa paragraf, toplam 350-700 karakter; 2-5 uygun emoji (⛵🌊🏆💪). Gerçek olmayan bilgi, sıralama, puan, isim UYDURMA; yalnız anlatılanı ve verileni kullan. Sporcu adı verilmişse kullan, verilmemişse "sporcularımız" de. Gerekirse sonda kısa bir çağrı (takipte kalın, tebrikler, destek için teşekkürler). Hashtag'leri caption'a yazma.
- hashtags: 8-12 Türkçe/İngilizce etiket, # olmadan: dikiliyelken, dikili, yelken, sailing ve konuya uygun olanlar (optimist, ilca, foça, izmir, yelkenligi gibi).
- Yarış duyurusunda açıklamada yarışın adı, yeri, tarihi, katılan sınıflar ve sporcular geçsin, sonunda sporculara başarı dileği olsun ("Sporcularımıza başarılar dileriz! ⛵"). Sonuçta tebrik ve teşekkür.
- "İstenen değişiklik" verilirse yalnız onu uygula, gerisini mevcut haliyle koru: "daha kısa", "emoji olmasın" açıklamayı; "başlığı … yap" başlığı; "Mete 2. oldu diye ekle" ilgili yazıları değiştirir. Değişiklikte verilen bilgi yeni gerçektir, kullan.`;

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    sub: { type: "string" },
    people: { type: "string", description: "Satırlar \\n ile ayrılır" },
    tag: { type: "string" },
    wish: { type: "string" },
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
  countAi(au, "post-caption");
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
  const ask = L(body?.ask, 600);
  const cur = body?.current && typeof body.current === "object" ? body.current : {};
  const now = [["Başlık", L(cur.headline, 90)], ["Alt satır", S(cur.sub, 200)], ["Sporcu satırları", cleanPeople(cur.people)], ["Dilek satırı", S(cur.wish, 60)], ["Etiket", S(cur.tag, 18)]].filter(([, v]) => v);
  if (!topic && !race && !ask) return bad("Ne paylaşmak istediğini söyle.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Yazıları elle yazabilirsin.", 503);
  const user = [
    `Bugün: ${S(body?.today, 10) || new Date().toISOString().slice(0, 10)}`,
    `Tür: ${kind}`,
    race &&
      `Yarış:\n${[`Ad: ${race.name}`, race.place && `Yer: ${race.place}`, race.dates && `Tarih: ${race.dates}`, race.classes && `Sınıflar: ${race.classes}`, race.count > 0 && `Katılan sporcu sayısı: ${race.count}`, race.athletes?.length > 0 && `Katılan sporcular: ${race.athletes.map((a) => [a.name, a.cls].filter(Boolean).join(" (") + (a.cls ? ")" : "")).join(", ")}`].filter(Boolean).join("\n")}`,
    topic && `Kullanıcının anlattığı:\n"""\n${topic}\n"""`,
    now.length > 0 && `Görseldeki mevcut yazılar:\n${now.map(([k, v]) => `${k}: ${v.replace(/\n/g, " / ")}`).join("\n")}`,
    old && `Mevcut açıklama:\n"""\n${old}\n"""`,
    ask && `İstenen değişiklik:\n"""\n${ask}\n"""`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 2500, timeoutMs: 22000 });
    const out = {
      headline: L(raw?.headline, 90),
      // Yarış bağlıysa alt satır kalıp cümle (sporcumuz/sporcularımız + yer); 1-2 sporcunun adı orada geçtiği için ayrı satır yok
      // Değişiklik isteğinde (yarış bağlıyken) alt satır ve dilek yalnız açıkça istenirse değişir
      sub: race && (!ask || !/alt ?(satır|yazı)|cümle/i.test(ask)) ? (ask && S(cur.sub, 200)) || raceSub(race, kind) : S(raw?.sub, 200),
      people: race?.athletes?.length ? (race.athletes.length > 2 ? cleanPeople(raw?.people) || racePeople(race) : "") : cleanPeople(raw?.people),
      // Yarış bağlıysa dilek kalıp (sporcumuza/sporcularımıza başarılar, sonuçta tebrik)
      wish: race && (!ask || !/dilek|başarı|tebrik|son satır/i.test(ask)) ? (ask && S(cur.wish, 60)) || raceWish(race, kind) : S(raw?.wish, 60),
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
