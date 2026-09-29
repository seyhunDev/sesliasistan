import { requireUser, unauthorized } from "@/lib/server/auth";
import { NextResponse } from "next/server";
import { callClaude } from "@/lib/ai/anthropic";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { interpretRules, refineRules } from "@/lib/ai/rules";
import { TOOL, cleanMessage, toDrafts } from "@/lib/ai/schema";

export const runtime = "nodejs";

const SYSTEM = `Sen bir spor kulübü yönetim uygulamasının asistanısın. Kullanıcı Türkçe konuşur veya yazar. Söylediklerini plan, görev ve notlara ayır ve kısa bir yanıt yaz.

Kurallar:
- plan: belirli bir zamanda olacak etkinlik (antrenman, toplantı, kamp, yarış...). Tarih ve saat belirtildiyse doldur.
- task: yapılması gereken iş (hazırla, sipariş et, ara...). Başlığı kısa ve emir kipinde yaz ("Tekneleri hazırla"). Tarih belirtilmişse son tarih olarak date alanına yaz.
- note: bilgi veya gözlem; yapılacak iş ya da zaman içermeyen şey. body alanına notun tam metnini yaz.
- Tek cümleden birden fazla kayıt çıkabilir (ör. bir plan ve o plan için bir görev). Aynı ifadeden çıkan görev ve notlar için linkToPlan true olsun.
- Tarihleri YYYY-MM-DD, saatleri 24 saatlik HH:MM yaz. Bilinmiyorsa boş string bırak. Tarih uydurma, SAAT UYDURMA, varsayılan saat ekleme.
- Göreli tarihleri (yarın, cuma, haftaya salı) verilen bugünün tarihine göre çöz. "Akşam altıda" gibi ifadeleri 24 saatlik biçime çevir.
- Bağlı görevin tarihi belirtilmediyse planın tarihini kullan.
- category: Antrenman, Toplantı, Kamp, Yarış, Ekipman veya Genel.
- Plan başlığına yeri, saati veya "oluştur" gibi komut kelimelerini ekleme ("Kulüpte antrenman oluştur" değil "Antrenman"); yer place alanına gider.
- Konuşma metni ses tanımadan geldiği için küçük yazım/sesteş hataları olabilir; anlamı koru, ama söylenmeyen bilgiyi ekleme.
- Kişiler listesi verildiyse: ses tanıma adları bölebilir ya da yanlış yazabilir ("san ver" = Sanver). Listedeki bir kişiyi kastediyorsa başlıkta, notta ve message'da listedeki yazımı kullan.
- Sorumlu (assignTo): kullanıcı işi birine VERİYORSA (ör. "Sanver tekneleri yıkasın", "Ali'ye söyle motoru kontrol etsin", "bunu Ali ile Sanver halletsin", "sorumlusu Ali") o kişiyi listedeki adıyla assignTo'ya yaz ve adı başlıktan çıkar ("Tekneleri yıka"). Kişiyle yapılan etkinlikte ya da kişiden söz edilen notta (ör. "Sanver ile toplantı", "Ali bugün gelmedi") atama yapma, adı başlıkta bırak. Listede olmayan kişiyi assignTo'ya yazma. assignTo'ya listedeki TAM adı yaz; soyad söylenmesi gerekmez, ekli ad ("Sanver'e") ya da ses tanımanın yanlış yazdığı ad ("san ver", "Sanvar") listedeki en yakın kişidir; tek başına ad önce ADI o olan kişiye aittir. message'da birine verdiğini söylüyorsan o kişi assignTo'da MUTLAKA olsun. Mevcut taslakta assignTo varsa kullanıcı değiştirmedikçe aynen koru. message'da atadığın kişiyi söyle ("görevi Sanver'e verdim").
- Saat: tek günlük bir planın günü belli ama saati söylenmemişse saati BİR KEZ kısa bir soruyla sor ("Saat kaçta olsun?") ve time'ı boş bırak. Kullanıcı "tüm gün", "fark etmez", "saat yok" derse allDay true yap, time'ı boş bırak ve tekrar sorma. Çok günlü planlarda saati sorma. Aynı anda birden fazla soru sorma.
- message: SESLİ OKUNACAK yanıt. Günlük konuşma diliyle, samimi, 1-2 kısa cümle yaz ve kullanıcıya verilen adıyla hitap et (ör. "Tamamdır Seyhun, yarın sabah dokuzda antrenmanı ve tekneleri hazırlama görevini hazırladım, kaydedebilirsin."). Resmi dil kullanma, sen diye hitap et. Emoji, madde işareti, parantez ve "09:00" gibi rakamlı saat yazma; saati "sabah dokuz", "akşam altı buçuk" gibi, günü "yarın", "cuma", "üç Ekim" gibi söyle. Bir planın tarihi belli değilse tarihi sor. Ad verilmediyse adsız, yine samimi yaz.`;

// AI_PROVIDER: "gemini" | "anthropic". Belirtilmezse anahtarı olan sağlayıcı seçilir.
function pickProvider() {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}
const hasKey = (p) => (p === "gemini" ? !!process.env.GEMINI_API_KEY : p === "anthropic" ? !!process.env.ANTHROPIC_API_KEY : false);

function ask(provider, user) {
  if (provider === "gemini") {
    return callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: TOOL.input_schema, timeoutMs: 12000 }); // geç kalırsa yedek kurallar
  }
  return callClaude({
    model: process.env.AI_MODEL_TEXT || "claude-haiku-4-5-20251001",
    system: SYSTEM,
    tool: TOOL,
    messages: [{ role: "user", content: user }],
  });
}

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Ad yalnızca harf/rakam ve birkaç işaretten oluşabilir (istem enjeksiyonunu önler)
const cleanName = (v, n = 40) => String(v ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, n);

// ---- Konuşma bağlamı (mevcut kartlar + önceki yanıt) ----
const str = (v, n = 300) => String(v ?? "").slice(0, n);
const D = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const T = (v) => (/^\d{2}:\d{2}$/.test(v) ? v : "");

function cleanCtx(ctx) {
  if (!ctx || !Array.isArray(ctx.drafts)) return null;
  const drafts = ctx.drafts
    .slice(0, 10)
    .map((d) => ({
      type: ["plan", "task", "note"].includes(d?.type) ? d.type : "note",
      title: str(d?.title, 120),
      body: str(d?.body),
      date: D(d?.date),
      endDate: D(d?.endDate),
      time: T(d?.time),
      allDay: !!d?.allDay,
      askedTime: !!d?.askedTime,
      place: str(d?.place, 80),
      category: str(d?.category, 20) || "Genel",
      linkToPlan: !!d?.linkToPlan,
      ...(Array.isArray(d?.assignTo) ? { assignTo: d.assignTo.slice(0, 10).map((n) => cleanName(n)).filter(Boolean) } : {}),
    }))
    .filter((d) => d.title.trim() || d.body.trim());
  // Konuşma geçmişi: kullanıcının ilk ve sonraki mesajları + asistanın yanıtları (devamlılık için)
  const history = (Array.isArray(ctx.history) ? ctx.history : [])
    .slice(-10)
    .map((h) => ({ role: h?.role === "assistant" ? "assistant" : "user", text: str(h?.text) }))
    .filter((h) => h.text.trim());
  return { drafts, history, mode: ctx.mode === "edit" ? "edit" : "create", last: str(ctx.last) };
}

const toClient = (d) => ({
  type: d.type, title: d.title, body: d.body, date: d.date, endDate: d.endDate, time: d.time, place: d.place,
  cat: d.category || "Genel", link: d.linkToPlan, allDay: d.allDay, askedTime: d.askedTime,
});

const PREFER = { plan: "Planlar", task: "Görevler", note: "Notlar" };

function buildUser({ today, weekday, name, text, ctx, people, prefer }) {
  const staff = people.length ? `Kişiler (sorumlu atanabilecek kişiler): ${people.join(", ")}\n` : "";
  const page = Object.hasOwn(PREFER, prefer)
    ? `Kullanıcı ${PREFER[prefer]} sayfasından yazıyor: türü açıkça belli değilse ${prefer} olarak kaydet; açıkça başka tür söylüyorsa ona uy.\n`
    : "";
  const head = `Bugün: ${today} (${weekday}). Saat dilimi: Europe/Istanbul.\nKullanıcının adı: ${name || "(verilmedi)"}\n${staff}${page}`;
  if (!ctx || (!ctx.drafts.length && !ctx.last && !ctx.history.length)) return `${head}\nKullanıcı metni:\n"""\n${text}\n"""`;
  const convo = ctx.history.length
    ? `Konuşmanın şimdiye kadarki hali (eskiden yeniye):\n${ctx.history.map((h) => `${h.role === "assistant" ? "Asistan" : "Kullanıcı"}: ${h.text}`).join("\n")}\n`
    : "";
  const rules =
    ctx.mode === "edit"
      ? `DÜZENLEME: Kullanıcı yalnızca bu tek kaydı değiştirmek istiyor. items içinde AYNI TÜRDE tek kayıt döndür; söylenmeyen alanları aynen koru. Saati kaldırmak veya tüm gün yapmak istiyorsa allDay true ve time boş. message'da ne değiştirdiğini kısaca söyle.`
      : `DEVAM: Kullanıcının yeni mesajı çoğunlukla asistanın sorusuna cevap veya mevcut taslağı tamamlayan/değiştiren bir düzeltme. items içinde GÜNCEL TAM listeyi döndür: değişmeyen kayıtları aynen koru, cevabı ilgili kayda işle (saat söylediyse plana time yaz; tarih söylediyse date yaz; günü değiştirdiyse plana bağlı görevlerin tarihini de güncelle). Yeni kayıt ekleme; yalnızca kullanıcı açıkça yeni bir plan, görev veya not söylüyorsa ekle. Kaldırmak istediği kaydı listeden çıkar. askedTime true olan planın saatini TEKRAR SORMA. Kullanıcı saati vermek istemiyorsa ("fark etmez", "tüm gün", "saat yok") allDay true yap, time'ı boş bırak ve "tüm gün olarak hazırlıyorum" de. Eksik bilgi kalmadıysa message'da kısaca onayla ve kaydedebileceğini söyle.`;
  return `${head}\n${convo}\nMevcut taslak kayıtlar (JSON):\n${JSON.stringify(ctx.drafts)}\n${ctx.last && !ctx.history.length ? `Asistanın önceki yanıtı: "${ctx.last}"\n` : ""}\nKullanıcının yeni mesajı:\n"""\n${text}\n"""\n\nYeni mesajı konuşmanın tamamıyla BİRLİKTE değerlendir: ilk mesajda söylenen bilgiler (ne, hangi gün, saat, yer) yeni mesaj aksini söylemedikçe geçerli kalır; yeni mesaj yalnızca değiştirir, tamamlar ya da ekler.\n${rules}`;
}

// Eksik bilgi için tek soru (yedek kural motoru). Cevap gelmezse plan tüm gün olarak eklenir.
function askMissing(items) {
  if (items.some((i) => i.type === "plan" && !i.date)) return "Planın gününü söylemedin, kartta seçebilirsin.";
  if (items.some((i) => i.type === "plan" && !i.time && !i.endDate && !i.allDay && !i.askedTime)) return "Saat kaçta olsun? Söylemezsen tüm gün olarak eklerim.";
  return "";
}

// Yedek kural motoru için günlük dilde yanıt
function rulesMessage(items, name) {
  const c = { plan: 0, task: 0, note: 0 };
  items.forEach((i) => c[i.type]++);
  const parts = [];
  if (c.plan) parts.push(`${c.plan} plan`);
  if (c.task) parts.push(`${c.task} görev`);
  if (c.note) parts.push(`${c.note} not`);
  if (!parts.length) return `${name ? name + ", " : ""}bunu tam anlayamadım, bir daha söyler misin?`;
  const list = parts.join(", ").replace(/, ([^,]*)$/, " ve $1");
  const q = askMissing(items);
  return `Tamamdır${name ? " " + name : ""}, ${list} hazırladım.${q ? " " + q : ""}`;
}

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }

  const text = String(body?.text ?? "").trim();
  if (!text) return bad("Metin boş");
  if (text.length > 2000) return bad("Metin çok uzun (en fazla 2000 karakter)");
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  const name = cleanName(body?.name, 30);
  // Ana hesabın çalışanları: sorumlu atama ve adların doğru yazımı için (yalnızca adlar gelir)
  const people = [...new Set((Array.isArray(body?.people) ? body.people : []).slice(0, 20).map((n) => cleanName(n)).filter(Boolean))];
  const ctx = cleanCtx(body?.context);
  const hasDrafts = !!ctx?.drafts.length;

  const fallback = (warning) => {
    let items;
    let message;
    if (hasDrafts) {
      const r = refineRules(text, ctx.drafts.map(toClient), today, name, ctx.mode !== "edit");
      items = ctx.mode === "edit" ? r.items.slice(0, 1) : r.items;
      if (!r.message) message = rulesMessage(items, name);
      else if (ctx.mode === "edit") message = `${r.message} Kontrol edip kaydedebilirsin.`;
      else message = `${r.message} ${askMissing(items) || "Hazırsa kaydedebilirsin."}`;
    } else {
      items = interpretRules(text, today);
      message = rulesMessage(items, name);
    }
    return NextResponse.json({ items, message, source: "rules", provider: "rules", ...(warning ? { warning } : {}) });
  };

  const provider = pickProvider();
  if (!hasKey(provider)) return fallback();
  if (provider === "gemini" && !process.env.GEMINI_MODEL) return fallback("GEMINI_MODEL boş, yedek kurallar kullanıldı");

  try {
    const weekday = new Date(`${today}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });
    const t0 = Date.now();
    const input = await ask(provider, buildUser({ today, weekday, name, text, ctx, people, prefer: body?.prefer }));
    const ms = Date.now() - t0;
    console.log(`[interpret:${provider}] toplam ${ms} ms${hasDrafts ? " (devam)" : ""}`);
    const items = toDrafts(input?.items, people, input?.message);
    if (!items.length && !hasDrafts) throw new Error("AI kayıt üretmedi");
    const message = cleanMessage(input?.message) || (items.length ? rulesMessage(items, name) : "Bunu tam anlayamadım, bir daha söyler misin?");
    return NextResponse.json({ items, message, source: "ai", provider, ms });
  } catch (e) {
    console.error(`[interpret:${provider}]`, e.message);
    return fallback("AI yanıt vermedi, yedek kurallar kullanıldı");
  }
}

export const POST = withAiCool(handle);
