import { requireUser, unauthorized } from "@/lib/server/auth";
import { countAi } from "@/lib/server/aiUsage";
import { overQuota, spend, withQuota } from "@/lib/server/quota";
import { aiErrorText, logAiError } from "@/lib/ai/errors";
import { NextResponse } from "next/server";
import { callClaude } from "@/lib/ai/anthropic";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { interpretRules, refineRules } from "@/lib/ai/rules";
import { TOOL, cleanMessage, cleanSend, toDrafts } from "@/lib/ai/schema";
import { changeText, messageIntent } from "@/lib/ai/messageRules";

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
- Sorumlu (assignTo): kullanıcı işi birine VERİYORSA (ör. "Sanver tekneleri yıkasın", "Ali'ye söyle motoru kontrol etsin", "Ali'nin benzin alma görevi var", "bunu Ali ile Sanver halletsin", "sorumlusu Ali") o kişiyi listedeki adıyla assignTo'ya yaz ve adı başlıktan çıkar ("Tekneleri yıka"). Kişiyle yapılan etkinlikte ya da kişiden söz edilen notta (ör. "Sanver ile toplantı", "Ali bugün gelmedi") atama yapma, adı başlıkta bırak. Listede olmayan kişiyi assignTo'ya yazma. assignTo'ya listedeki TAM adı yaz; soyad söylenmesi gerekmez, ekli ad ("Sanver'e") ya da ses tanımanın yanlış yazdığı ad ("san ver", "Sanvar") listedeki en yakın kişidir; tek başına ad önce ADI o olan kişiye aittir; aynı ada sahip birden fazla kişi varsa ve soyad söylenmediyse tahmin etme, assignTo'yu boş bırak (uygulama soracak). message'da birine verdiğini söylüyorsan o kişi assignTo'da MUTLAKA olsun. Mevcut taslakta assignTo varsa kullanıcı değiştirmedikçe aynen koru. message'da atadığın kişiyi söyle ("görevi Sanver'e verdim").
- Haftalık tekrar ("her salı 16:00 antrenman", "cumartesileri", "her hafta"): tek plan yaz, weekly true, date ilk günün tarihi (bugün ya da sonrası); bitiş söylendiyse repeatUntil, yoksa boş. Birden çok gün söylenirse her gün için ayrı plan. message'da "her hafta" de.
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
  // Kayıt içinden (düzenleme ya da çalışanın salt okunur kaydı): konuşmadaki diğer kişiler ve bekleyen mesaj taslağı
  const thread = (Array.isArray(ctx.thread) ? ctx.thread : []).slice(0, 20).map((n) => cleanName(n)).filter(Boolean);
  const mode = ["edit", "reply"].includes(ctx.mode) ? ctx.mode : "create";
  return { drafts, history, mode, last: str(ctx.last), thread, pendingSend: str(ctx.pendingSend, 1000), kind: ["plan", "task", "note"].includes(ctx.kind) ? ctx.kind : "" };
}

const toClient = (d) => ({
  type: d.type, title: d.title, body: d.body, date: d.date, endDate: d.endDate, time: d.time, place: d.place,
  cat: d.category || "Genel", link: d.linkToPlan, allDay: d.allDay, askedTime: d.askedTime,
});

const PREFER = { plan: "Planlar", task: "Görevler", note: "Notlar" };

// Kayıt içinden mesaj gönderme kuralları (send / done)
function messageRules(ctx) {
  const who = ctx.thread.length ? ctx.thread.join(", ") : "";
  if (!who)
    return `MESAJ: Bu kayıtta kullanıcıdan başka kimse yok; mesaj gönderilemez, send HER ZAMAN boş. Kullanıcı birine yazmak isterse message'da önce o kişiyi sorumlu olarak eklemesi gerektiğini söyle.${ctx.kind === "task" ? " İşi bitirdiğini söylerse done true." : ""}`;
  return `MESAJ: Bu kaydın bir mesajlaşması var. Kayıttaki diğer kişiler: ${who}. Mesaj kaydın konuşmasına gider ve bu kişilerin hepsi görür.
- Kullanıcı birine yazmak, söylemek, sormak, haber vermek, iletmek ya da mesaj atmak isterse gönderilecek metni send'e yaz. Metni kullanıcının ağzından, karşı tarafa hitaben, kısa ve doğal yaz ("Ali'ye kargonun geciktiğini, cumaya kalacağını söyle" → "Kargo gecikti, cuma gelecek."). Kullanıcı metni aynen verdiyse ("Ali'ye yaz: yarın gelemiyorum") aynen kullan, yalnızca yazım ve noktalamayı düzelt. Söylenmeyen bilgi, selamlama, imza ve emoji ekleme. Soru soruyorsa soru cümlesi yaz.
- Söylediği bir değişiklik komutu değil de bir durum, bilgi ya da cevapsa (ör. "kargo yola çıktı", "yarın gelemiyorum"), bunu mesaj olarak send'e yaz ve kaydı değiştirme.
- Hem değişiklik hem mesaj isteyebilir ("saati 11 yap ve Ali'ye haber ver"): kaydı değiştir ve değişikliği anlatan kısa mesajı send'e yaz ("Saat 11'e alındı.").
- Adı geçen kişi yukarıdaki listede yoksa send'i BOŞ bırak ve message'da o kişinin bu kayıtta olmadığını, önce sorumlu olarak eklemesi gerektiğini söyle. "Ana hesap" her zaman listededir.
${ctx.pendingSend ? `- Bekleyen mesaj taslağı: "${ctx.pendingSend}". Kullanıcı bunu değiştirmek istiyorsa ("şunu da ekle", "daha kısa yaz", "saati de yaz") taslağın YENİ halini send'e yaz. Yeni bir şey istiyorsa ona göre davran.
` : ""}- send doluysa message'da mesajı TEKRAR ETME; yalnızca "Mesajı hazırladım, göndereyim mi?" gibi kısa bir soru sor. Mesaj onaysız gönderilmez.
- Kullanıcı işi bitirdiğini söylüyorsa ("tamamladım", "hallettim", "bitti") done true yap; söylemediyse false.
- Mesaj istenmediyse send boş string.`;
}

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
    ctx.mode === "edit" || ctx.mode === "reply"
      ? `${
          ctx.mode === "reply"
            ? `SALT OKUNUR KAYIT: Kullanıcı bu kaydı DEĞİŞTİREMEZ (kaydı başkası verdi). items içinde kaydı AYNEN döndür. Yalnızca mesaj gönderebilir (send) ve işi bitirdiğini bildirebilir (done). Bir değişiklik isterse ("saati değiştir") bunu kaydı verene soran kısa bir mesajı send'e yaz ve message'da değiştiremediğini, sorabileceğini söyle.`
            : `DÜZENLEME: Kullanıcı yalnızca bu tek kaydı değiştirmek istiyor. items içinde AYNI TÜRDE tek kayıt döndür; söylenmeyen alanları aynen koru. Saati kaldırmak veya tüm gün yapmak istiyorsa allDay true ve time boş. message'da ne değiştirdiğini kısaca söyle.`
        }\n${messageRules(ctx)}`
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
  countAi(au, "interpret");
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

  const inRecord = ctx && (ctx.mode === "edit" || ctx.mode === "reply");
  const fallback = (warning) => {
    let items;
    let message;
    if (inRecord && hasDrafts) {
      const cur = ctx.drafts.map(toClient).slice(0, 1);
      const intent = messageIntent(text, ctx.thread);
      const canSend = ctx.thread.length > 0;
      const done = !!intent?.done && (ctx.mode === "reply" || ctx.kind === "task");
      let send = "";
      let say = "";
      items = cur;
      const EDITISH = /(saat|tarih|gün|yer|başlık|ertele|değiştir|taşı|öne al|sonraya al|iptal et)/i;
      if (intent?.unknown)
        say = canSend
          ? `${intent.unknown} bu kayıtta yok. Mesaj göndermek için önce onu sorumlu olarak ekle.`
          : `Bu kayıtta senden başka kimse yok. ${intent.unknown} için önce onu sorumlu olarak ekle.`;
      else if (!intent && ctx.mode === "reply" && EDITISH.test(text))
        say = "Bu kaydı sen değiştiremezsin. İstersen ana hesaba sorayım; örneğin: ana hesaba yaz, saati 11 yapabilir miyiz?";
      else if (intent?.indirect) say = "Bunu mesaja çeviremedim. Mesajı aynen söyler misin? Örneğin: Ali'ye yaz, kargo gecikti.";
      else if (intent) {
        send = intent.send;
        if (intent.bare && ctx.mode === "edit") {
          // "…yap ve Ali'ye haber ver": değişikliği kural motoruyla yap, özetini mesaj olarak hazırla
          const r = intent.before ? refineRules(intent.before, cur, today, name, false) : null;
          if (r) {
            items = r.items.slice(0, 1);
            send = changeText(cur[0], items[0]);
          }
          if (!send) say = "Ne yazayım? Mesajı söyler misin?";
        }
      } else if (ctx.mode === "edit") {
        const r = refineRules(text, cur, today, name, false);
        const changed = JSON.stringify(r.items[0]) !== JSON.stringify(cur[0]);
        if (changed) {
          items = r.items.slice(0, 1);
          say = `${r.message} Kontrol edip kaydedebilirsin.`;
        } else if (canSend) send = text.replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toLocaleUpperCase("tr-TR"));
        else say = r.message;
      } else if (canSend && !say) send = text.replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toLocaleUpperCase("tr-TR"));
      if (send && !canSend) {
        send = "";
        say = "Bu kayıtta senden başka kimse yok. Mesaj göndermek için önce sorumlu ekle.";
      }
      if (!say) say = send ? "Mesajı hazırladım, göndereyim mi?" : done ? "Tamamlandı olarak işaretleyeyim mi?" : "Bunu anlayamadım, bir daha söyler misin?";
      return NextResponse.json({ items, message: say, send, done, source: "rules", provider: "rules", ...(warning ? { warning } : {}) });
    }
    if (hasDrafts) {
      const r = refineRules(text, ctx.drafts.map(toClient), today, name, ctx.mode !== "edit");
      items = ctx.mode === "edit" ? r.items.slice(0, 1) : r.items;
      if (!r.message) message = rulesMessage(items, name);
      else if (ctx.mode === "edit") message = `${r.message} Kontrol edip kaydedebilirsin.`;
      else message = `${r.message} ${askMissing(items) || "Hazırsa kaydedebilirsin."}`;
    } else {
      items = interpretRules(text, today);
      // Tür sayfasından (Notlar, Planlar, Görevler) gelen tek kayıt: tür açıkça söylenmediyse o sayfanın türü
      const pref = body?.prefer;
      if (Object.hasOwn(PREFER, pref) && items.length === 1 && items[0].type !== pref && !/(^|\s)(plan|görev|not)(\s|$|[ıiuü])/iu.test(text)) {
        const x = items[0];
        items = [{ ...x, type: pref, ...(pref === "note" ? { body: x.body || text } : {}), ...(pref === "plan" ? { date: x.date || x.due || today } : {}), ...(pref === "task" && !x.due && x.date ? { due: x.date } : {}) }];
      }
      message = rulesMessage(items, name);
    }
    return NextResponse.json({ items, message, source: "rules", provider: "rules", ...(warning ? { warning } : {}) });
  };

  const provider = pickProvider();
  if (!hasKey(provider)) return fallback();
  // Kişilerde günlük asistan hakkı bittiyse yapay zeka yerine yedek kurallar (kayıt yine hazırlanır)
  if (await overQuota(au, "assistant")) return fallback("Bugünkü asistan hakkın bitti; basit kurallarla hazırlandı.");
  if (provider === "gemini" && !process.env.GEMINI_MODEL) return fallback("GEMINI_MODEL boş, yedek kurallar kullanıldı");

  try {
    const weekday = new Date(`${today}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });
    const t0 = Date.now();
    const input = await ask(provider, buildUser({ today, weekday, name, text, ctx, people, prefer: body?.prefer }));
    const ms = Date.now() - t0;
    console.log(`[interpret:${provider}] toplam ${ms} ms${hasDrafts ? " (devam)" : ""}`);
    let items = toDrafts(input?.items, people, input?.message);
    if (!items.length && !hasDrafts) throw new Error("AI kayıt üretmedi");
    // Kayıt içinden: mesaj taslağı ve tamamlama (kayıtta başka kimse yoksa mesaj gönderilmez; salt okunur kayıt değişmez)
    const extra = {};
    if (inRecord) {
      const send = ctx.thread.length ? cleanSend(input?.send) : "";
      const done = !!input?.done && (ctx.mode === "reply" || ctx.kind === "task");
      if (ctx.mode === "reply") items = ctx.drafts.map(toClient).slice(0, 1);
      Object.assign(extra, { send, done });
    }
    let message = cleanMessage(input?.message) || (items.length ? rulesMessage(items, name) : "Bunu tam anlayamadım, bir daha söyler misin?");
    if (extra.send && !/\?/.test(message)) message = `${message} Göndereyim mi?`.trim();
    return withQuota(NextResponse.json({ items, message, ...extra, source: "ai", provider, ms }), await spend(au, "assistant"));
  } catch (e) {
    const kind = logAiError("interpret", provider, e);
    return fallback(`${aiErrorText(kind, e)} Basit kurallarla hazırlandı.`);
  }
}

export const POST = withAiCool(handle);
