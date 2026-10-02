import { NextResponse } from "next/server";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Yarış talimatı (ilan, NoR) PDF ya da fotoğrafı → yarış bilgisi, program, son tarihler, ücretler, oteller, iletişim.
// Kaydetmez; telefon yarışa yazar. Belge saklanmaz, yalnızca okunur.
const SYSTEM = `Sen bir yelken kulübünün antrenörüne yardım eden asistansın. Sana bir yelken yarışının talimatı (yarış ilanı, Notice of Race, organizasyon duyurusu) verilir; Türkçe ya da İngilizce olabilir.
Belgeden yarışı kurmak ve planlamak için gerekenleri çıkar. Yalnızca belgede yazanı yaz, uydurma; bulamadığın alan boş kalsın.

- isNotice: belge bir yarış/kamp/organizasyon talimatı ya da duyurusu değilse false.
- name: yarışın adı, belgedeki yazımla ama düzgün büyük-küçük harfle ("D'Azur Optimist Regatta", "Türkiye Optimist Kış Trofesi"). Lig ayağı ve kupa adı birlikte geçiyorsa ikisini birleştir ("TYF Yelken Ligi ILCA 1. Ayak - MW Phokaia Beach Resort Kupası"). Yıl ya da sıra sayısı adın parçasıysa kalsın.
- organizer: düzenleyen kulüp/kurum.
- federation: hangi spor dalı federasyonu ("Yelken"). Yoksa "Yelken".
- city / district: yarışın yapıldığı il ve ilçe, Türkçe ("Çeşme" → il İzmir, ilçe Çeşme; "Bodrum" → Muğla, Bodrum). venue: kulüp, marina ya da tesis adı.
- startDate / endDate: YYYY-MM-DD. Yarış (ilk start günü değil, organizasyonun ilk günü: kayıt/ölçüm dahil) başlangıcı ve son günü.
- classes: yarışan sınıflar/kategoriler ("Optimist", "ILCA 4", "Optimist Gelişim").
- schedule: program; her satır { date YYYY-MM-DD, time HH:MM ya da boş, title kısa Türkçe ("Kayıt ve ölçüm", "Kaptanlar toplantısı", "İlk start", "Ödül töreni") }. En fazla 30 satır, tarihe göre sıralı.
- deadlines: antrenörün kaçırmaması gereken son tarihler; { date, time, title kısa Türkçe ("Online kayıt son gün", "Kayıt ücreti son ödeme", "Geç kayıt son gün", "İl dışı çıkış oluru yükleme", "Kesin kayıt teslimi", "Otel rezervasyonu son gün"), detail kısa (nerede/nasıl, ceza ya da ücret farkı) }. Kaydın başlama tarihi son tarih değildir. Tarihe göre sıralı.
- fees: ücretler; { title ("Kayıt ücreti (sporcu başı)", "Geç kayıt", "Antrenör"), amount metin olarak para birimiyle ("1.250 TL", "€80", "%50 cezalı", "Ücretsiz"), note kısa (nereye/nasıl ödenir, IBAN varsa açıklamasıyla) }.
- hotels: önerilen oteller/konaklama; { name, phone, note (oda fiyatları kısaca "Tek kişilik 5.700 TL, iki kişilikte kişi başı 3.500 TL", indirim kodu, zorunlu olup olmadığı) }.
- contacts: iletişim kişileri; { name, role, phone, email }.
- notes: listeye girmeyen ama antrenörün bilmesi gereken önemli maddeler, en fazla 8 kısa madde, her biri yeni satırda "- " ile (gerekli belgeler, lisans/sağlık şartı, tekne taşıma, yaş sınırı, kayıt bağlantısı).
- summary: 1-2 kısa Türkçe cümle; yarışı ve en yakın son tarihi söyle.`;

const s = { type: "string" };
const row = (props, required) => ({ type: "array", items: { type: "object", properties: Object.fromEntries(props.map((p) => [p, s])), required } });
const SCHEMA = {
  type: "object",
  properties: {
    isNotice: { type: "boolean" },
    name: s, organizer: s, federation: s, city: s, district: s, venue: s, startDate: s, endDate: s,
    classes: { type: "array", items: s },
    schedule: row(["date", "time", "title"], ["date", "title"]),
    deadlines: row(["date", "time", "title", "detail"], ["date", "title"]),
    fees: row(["title", "amount", "note"], ["title"]),
    hotels: row(["name", "phone", "note"], ["name"]),
    contacts: row(["name", "role", "phone", "email"], ["name"]),
    notes: s,
    summary: s,
  },
  required: ["isNotice", "name", "schedule", "deadlines", "summary"],
};

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024; // Netlify istek sınırı (base64 ile ~5,4 MB)
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const day = (v) => (DATE.test(v || "") ? v : "");
const list = (a, n, f) => (Array.isArray(a) ? a : []).map(f).filter(Boolean).slice(0, n);
const byDate = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Dosya çok büyük ya da bozuk. 4 MB'tan küçük PDF ya da fotoğraf yükle.", 413);
  }
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  if (!TYPES.includes(mimeType)) return bad("PDF ya da fotoğraf yükle.");
  if (!data || data.length > (MAX * 4) / 3 + 8) return bad("Dosya 4 MB'tan büyük olmasın.", 413);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const today = DATE.test(body?.today || "") ? body.today : new Date().toISOString().slice(0, 10);

  try {
    const t0 = Date.now();
    const raw = await callGemini({
      model: process.env.GEMINI_MODEL,
      system: SYSTEM,
      user: `Bugün: ${today}. Yıl yazmayan tarihlerde yarışın yılını kullan. Bu yarış talimatını oku.`,
      schema: SCHEMA,
      images: [{ mimeType, data }],
      maxTokens: 8000,
      timeoutMs: 50000,
    });
    if (raw?.isNotice === false) return bad("Bu bir yarış talimatına benzemiyor.", 422);
    const startDate = day(raw?.startDate);
    const endDate = day(raw?.endDate) && raw.endDate >= startDate ? raw.endDate : startDate;
    const out = {
      name: S(raw?.name, 80),
      organizer: S(raw?.organizer, 120),
      federation: S(raw?.federation, 30) || "Yelken",
      city: S(raw?.city, 40),
      district: S(raw?.district, 40),
      venue: S(raw?.venue, 120),
      startDate,
      endDate,
      classes: list(raw?.classes, 12, (c) => S(c, 40)),
      schedule: list(raw?.schedule, 30, (x) => day(x?.date) && S(x?.title, 120) && { date: x.date, time: TIME.test(x?.time || "") ? x.time : "", title: S(x.title, 120) }).sort(byDate),
      deadlines: list(raw?.deadlines, 12, (x) => day(x?.date) && S(x?.title, 120) && { date: x.date, time: TIME.test(x?.time || "") ? x.time : "", title: S(x.title, 120), detail: S(x?.detail, 240) }).sort(byDate),
      fees: list(raw?.fees, 12, (x) => S(x?.title, 80) && { title: S(x.title, 80), amount: S(x?.amount, 40), note: S(x?.note, 240) }),
      hotels: list(raw?.hotels, 10, (x) => S(x?.name, 100) && { name: S(x.name, 100), phone: S(x?.phone, 40), note: S(x?.note, 240) }),
      contacts: list(raw?.contacts, 10, (x) => S(x?.name, 100) && { name: S(x.name, 100), role: S(x?.role, 80), phone: S(x?.phone, 40), email: S(x?.email, 100) }),
      notes: String(raw?.notes || "").trim().slice(0, 1500),
      summary: S(raw?.summary, 400),
    };
    if (!out.name && !out.startDate) return bad("Talimattan yarış adı ve tarihi okunamadı.", 422);
    console.log(`[race-notice] ${Date.now() - t0} ms, program=${out.schedule.length}, son tarih=${out.deadlines.length}`);
    return NextResponse.json(out);
  } catch (e) {
    logAiError("race-notice", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Talimat okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
