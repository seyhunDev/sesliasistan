import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { KINDS, cleanPeople, dayOf, cleanRace, cleanTags, imagePeople, kindOf, raceSub, raceWish, withClass } from "@/features/posts/postModel";

export const runtime = "nodejs";

// Instagram gönderisi: görseldeki yazılar (başlık, alt satır, etiket) + açıklama + hashtag.
// Kaydetmez; telefon kaydeder. Görsel telefonda çizilir, buraya fotoğraf gelmez. Yalnız ana hesap.
const SYSTEM = `Sen Dikili Yelken Spor Kulübü'nün (İzmir, Dikili) Instagram hesabını yöneten deneyimli bir sosyal medya editörüsün.
Kullanıcı ne paylaşmak istediğini Türkçe anlatır (ses tanıma metni olabilir, yazım hataları olabilir). Gönderi türü ve varsa yarış bilgisi verilir.
Gönderi türü verilir; açıklama, başlık, etiket ve dilek HER ZAMAN bu türe göre yazılır (tür değişince yazılar da değişir):
- duyuru (Yarış): yaklaşan yarış; yarışın adı, yeri, tarihi, sınıflar, katılan sporcular; sonunda başarı dileği.
- sonuc (Yarış sonucu): biten yarış; derece verildiyse onu öne çıkar (uydurma), tebrik ve teşekkür.
- antrenman: antrenmanın konusu, hava/rüzgâr, çalışılanlar, emek; motive edici.
- genel (Duyuru): kulübün genel duyurusu (toplantı, değişiklik, bilgilendirme); net ve resmi-samimi, ne/ne zaman/nerede.
- kayit (Kayıt / yelken okulu): yeni sporcu kaydı, yelken okulu; kimler katılabilir, nasıl başvurulur, iletişim çağrısı.
- kulup (Kulüp haberi): kulüpten haber, etkinlik, ziyaret, bağış, başarı dışı gelişmeler.
- ozel (Özel gün): milli bayram, anma günü, dini bayram ya da belirli gün (gün verilir). Bayramda gururlu ve içten kutlama; anma gününde (10 Kasım, 18 Mart, 15 Temmuz) "kutlu olsun" ve kutlama dili, kutlama emojisi YOK, saygı ve minnet dili, en çok bir sade emoji (🇹🇷 ya da 🖤). Yıl dönümü sayısı verilirse onu kullan, başka tarih/sayı uydurma. Kulübün denizle ve gençlerle bağını kısa bir cümleyle kur. Açıklama 250-500 karakter.
- kutlama (Kutlama): kulüpte doğum günü, yıl dönümü, sevindirici gelişme; kısa ve içten kutlama.
- diger: anlatılana göre.

Yaz:
- headline: görselin üstündeki büyük yazı, 2-6 kelime, kısa ve şık (dergi başlığı gibi; ünlem yalnız sonuçta, büyük harfle bağırma yok) ("Foça'da Yelken Ligi", "Kürsüdeyiz!", "Rüzgâr Bizden Yana"). Yarış verildiyse yarışın adından ve sınıfından kısa bir başlık; başlıkta HER ZAMAN yarışın sınıfı geçer (birden çok ILCA varsa yalnız "ILCA"): "ILCA TYF Ligi Başlıyor", "Optimist TYF Ligi'nde 1. Ayak Yarışları", "ILCA ve Optimist Foça'da". Emoji yok.
- sub: görseldeki alt satır, en çok 50 karakter: yer · tarih ya da kısa bilgi ("Foça · 7-11 Ekim", "ILCA 4 · 2. ayak"). Bilgi yoksa boş.
- people: görselde sporcu satırları, YALNIZ 1 ya da 2 sporcu varsa (yarış verilmediyse ve kullanıcı sporcu andıysa): her sporcu bir satır "Ad Soyad · sınıf · kısa açıklama", en çok 45 karakter; kısa açıklama yalnız anlatılandan. 3 ve daha çok sporcu varsa people BOŞ, adlar görselde değil açıklamada geçer.
- wish: görselin en altındaki kısa dilek/çağrı satırı, en çok 40 karakter, tek ünlemle biter ("Sporcularımıza başarılar!", "Tebrikler şampiyonlar!", "Kayıtlar başladı, bekleriz!"). Emoji yok.
- tag: görseldeki küçük etiket, 1-2 kelime büyük harf, türe uygun (YARIŞ, YARIŞ SONUCU, ANTRENMAN, DUYURU, KAYITLAR AÇIK, KULÜP HABERİ, KUTLAMA).
- caption: Instagram açıklaması; profesyonel bir kulüp iletişimcisinin kaleminden: akıcı, doğru Türkçe, sıcak ama ölçülü (abartı, klişe ve ünlem yığını yok). Yapı: ilk satır dikkat çeken tek cümle; ardından 1-2 kısa paragrafta bilgi (ne, nerede, ne zaman, kimler); son satırda kısa kapanış/çağrı. Toplam 300-650 karakter, paragraflar arasında boş satır. En çok 2-3 emoji, yalnız yerinde (⛵🌊🏆). Gerçek olmayan bilgi, sıralama, puan, isim UYDURMA; yalnız anlatılanı ve verileni kullan. Sporcu adı verilmişse kullan, verilmemişse "sporcularımız" de. 3 ve daha çok sporcu varsa açıklamada TÜM sporcuların adı (sınıfıyla) geçsin: ayrı bir paragrafta, her sporcu bir satırda "⛵ Ad Soyad (Sınıf)" ya da sonucu verildiyse "🏆 Ad Soyad (Sınıf) · 2." (bu satırlardaki işaretler emoji sınırına sayılmaz). Hashtag'leri caption'a yazma.
- hashtags: 8-12 Türkçe/İngilizce etiket, # olmadan: dikiliyelken, dikili, yelken, sailing ve konuya uygun olanlar (optimist, ilca, foça, izmir, yelkenligi gibi).
- Yarış türünde açıklamada yarışın adı, yeri, tarihi, katılan sınıflar ve sporcular geçsin, sonunda sporculara başarı dileği olsun ("Sporcularımıza başarılar dileriz! ⛵"). Sonuçta tebrik ve teşekkür.
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
  // Özel gün: hazır şablonun günü (yıl dönümü sayısı bu yıla göre)
  const day = kind === "ozel" ? dayOf(body?.day) : null;
  const year = Math.round(Number(body?.year)) || new Date().getFullYear();
  if (!topic && !race && !ask && !day) return bad("Ne paylaşmak istediğini söyle.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Yazıları elle yazabilirsin.", 503);
  const user = [
    `Bugün: ${S(body?.today, 10) || new Date().toISOString().slice(0, 10)}`,
    `Tür: ${kind} (${kindOf(kind)[1]})`,
    day && `Özel gün: ${day.name} (${year}), ${{ milli: "milli bayram", anma: "anma günü", dini: "dini bayram", deniz: "denizcilik bayramı", genel: "belirli gün" }[day.mood]}. Hazır görsel yazıları: başlık "${day.head(year)}"${day.sub(year) ? `, alt satır "${day.sub(year)}"` : ""}${day.wish(year) ? `, dilek "${day.wish(year)}"` : ""}.`,
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
      // Yarış bağlıysa başlıkta sınıf yoksa başa eklenir (kullanıcı sınıfı çıkarmayı istemediyse)
      headline: race && !/sınıf/i.test(ask) ? withClass(L(raw?.headline, 90), race) : L(raw?.headline, 90),
      // Yarış bağlıysa alt satır kalıp cümle (sporcumuz/sporcularımız + yer); 1-2 sporcunun adı orada geçtiği için ayrı satır yok
      // Değişiklik isteğinde (yarış bağlıyken) alt satır ve dilek yalnız açıkça istenirse değişir
      sub: race && (!ask || !/alt ?(satır|yazı)|cümle/i.test(ask)) ? (ask && S(cur.sub, 200)) || raceSub(race, kind) : S(raw?.sub, 200),
      // Yarış bağlıyken görselde sporcu satırı yok (adlar alt satırda ya da açıklamada); yarışsızda en çok 2 sporcu
      people: race ? "" : imagePeople(raw?.people),
      // Yarış bağlıysa dilek kalıp (sporcumuza/sporcularımıza başarılar, sonuçta tebrik)
      wish: race && (!ask || !/dilek|başarı|tebrik|son satır/i.test(ask)) ? (ask && S(cur.wish, 60)) || raceWish(race, kind) : S(raw?.wish, 60),
      // Etiket türün etiketi (YARIŞ DUYURUSU…); asistana "etiketi … yap" denirse yapay zekanınki
      tag: (/etiket/i.test(ask) && S(raw?.tag, 18)) || kindOf(kind)[3] || S(raw?.tag, 18),
      caption: L(raw?.caption, 2200),
      hashtags: cleanTags(raw?.hashtags),
    };
    // Özel günde görsel yazıları hazır şablon (ya da mevcut hali); yalnız açıkça istenen değişir
    if (day) {
      const keep = (k, re, auto) => (ask && re.test(ask) ? out[k] : (ask && S(cur[k], 200)) || auto);
      out.headline = keep("headline", /başlık/i, day.head(year));
      out.sub = keep("sub", /alt ?(satır|yazı)|cümle/i, day.sub(year));
      out.wish = keep("wish", /dilek|son satır/i, day.wish(year));
      out.tag = (/etiket/i.test(ask) && S(raw?.tag, 18)) || (ask && S(cur.tag, 18)) || day.tag;
      out.people = "";
    }
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
