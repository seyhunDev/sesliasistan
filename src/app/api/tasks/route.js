import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { PLAN_KINDS, cleanPlan, planCut } from "@/lib/taskPlan";
import { draftBlock, historyBlock, memoBlock } from "@/lib/convoContext";

export const runtime = "nodejs";

// Tek cümlede birden çok iş → sıralı görev listesi (lib/taskPlan.js). Kaydetmez; telefon işleri sırayla kendi akışlarında yapar.
const SYSTEM = `Sen bir yelken kulübü uygulamasının sesli asistanında görev planlayıcısısın. Kullanıcı tek seferde birden çok iş söyler (ses tanıma metni olabilir, noktalama ve yazım bozuk olabilir).
Ses tanıma kelimeleri bozabilir: anlamı bağlamdan çıkar ("yarışı oluru" = yarışı oluştur, "hazirla" = hazırla, "afiş" = Instagram gönderisi/görseli, yanlış yazılmış kişi adı olduğu gibi kalır). Yanlış duyulmuş bir fiil yüzünden bir işi atlama.
Söyleneni uygulamanın sırayla, kullanıcıya dokunmadan yapabileceği işlere böl ve bir iş düzeni (sıra) hazırla. Sırayı söylenme sırasına göre değil, uygulama için en kolay ve doğru olana göre kur:
1) Başka işlerin dayandığı kayıtlar önce: yarış (race), sporcu (athlete). Örn. bir yarışın görseli ya da yarışa sporcu eklemek, yarış oluşturulduktan sonra.
2) Sonra bulunduğu sayfada hızlıca biten işler: yoklama, antrenman günlüğü, nakit ödeme, aidat, fatura, envanter, alışveriş, etkinlik.
3) Sonra diğer işler (other: plan, görev, not, mesaj; mesaj onay ister), sonra arama (call) ve sayfa açma (nav).
4) Instagram gönderisi (post) EN SON: gönderi ekranı açılır ve orada kalınır.
Aynı türden işler söylendiği sırada kalır. Bir iş başka bir işin sonucuna dayanıyorsa (ör. "bu yarışa", "o kişiye") dayandığı işten sonra gelir. Aynı işe ait cümleleri birleştir ("Enes ödemesini yaptı. Aidat ödemesini yaptı. Nakit verdi." tek iş: Enes'in aidatı nakit alındı).
Her iş için:
- kind: işin türü (aşağıdaki listeden).
- say: uygulamaya verilecek, TEK BAŞINA anlaşılır kısa Türkçe komut, verilen kalıba uygun. Öncekine gönderme yapma; "bunun için", "o yarış" yerine adını yaz ("Atatürk Kupası için Instagram gönderisi hazırla"). Kullanıcının söylemediği bilgiyi (tarih, tutar, ad) uydurma; söylenen her bilgiyi (renk, boyut, gün, tutar, adlar) koru. Gün söylenmediyse yoklamada "bugün" yaz. Ay söylenmediyse aidatta ay yazma.
- from: kullanıcının bu işe ait sözleri, söylediği gibi (düzeltmeden; birleştirdiğin cümleleri ". " ile; en çok 20 kelime). Uygulama bunlardan öğrenir.
Yanıt kısa olsun: yalnız istenen JSON, aynı işi tekrarlama.
- label: kontrol listesinde görünecek çok kısa ad (2-5 kelime): "Atatürk Kupası yarışı", "Yoklama: Mustafa", "Enes aidatı (nakit)", "Instagram yarış görseli".
Tek iş varsa tek eleman döndür.
Önceki konuşma verildiyse yeni söz onun devamı olabilir: ekleme ("onu da ekle", "Ali de gelsin"), değişiklik ("saati 11 yap", "yok cuma olsun"), vazgeçme. Gönderme yapılan şeyi (kişi, yarış, kayıt, mesaj) konuşmadan bul ve say içinde açıkça yaz ("Yarınki antrenmanın saatini 11 yap"). Konuşmada zaten yapılmış bir işi yeniden listeye koyma; yalnız yeni sözün istediği işler.
Açık mesaj taslağı verildiyse ve yeni söz o mesajı değiştiriyorsa ("şunu da ekle", "daha kısa yaz") tek iş: other, say "Mesajı değiştir: <istenen>".
Sohbetteki yarış verildiyse: "yarış görseli", "bunun için", "o yarışa", "yarışa" gibi ad söylenmeyen gönderme o yarıştır; say içinde adını yaz. Kullanıcı başka bir yarışın adını söylerse o yarışı yaz.

Türler:
${Object.entries(PLAN_KINDS).map(([k, v]) => `- ${k}: ${v.how}. Kalıp: ${v.say}`).join("\n")}`;

const SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: { type: "object", properties: { kind: { type: "string", enum: Object.keys(PLAN_KINDS) }, say: { type: "string" }, label: { type: "string" }, from: { type: "string" } }, required: ["kind", "say", "label", "from"] },
    },
  },
  required: ["tasks"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "tasks");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = String(body?.text ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!text) return bad("Boş istek");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const memo = memoBlock(body?.memo);
  const history = historyBlock(body?.history);
  const draft = draftBlock(body?.draft);
  const race = String(body?.race ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today || "") ? body.today : "";
  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user: `Bugün: ${today}${race ? `\nSohbetteki yarış: ${race}` : ""}${memo ? `\n\n${memo}` : ""}${history ? `\n\n## ÖNCEKİ KONUŞMA\n${history}` : ""}${draft ? `\n\n${draft}` : ""}\n\nKullanıcının yeni söylediği:\n"""\n${text}\n"""`, schema: SCHEMA, maxTokens: 1000, timeoutMs: 16000, attemptMs: 8000 });
    const tasks = cleanPlan(raw);
    console.log(`[tasks] ${Date.now() - t0} ms, iş=${tasks.length}`);
    return NextResponse.json({ tasks, cut: planCut(raw) });
  } catch (e) {
    logAiError("tasks", "gemini", e);
    return bad("Görev listesi çıkarılamadı.", e.status === 429 ? 429 : 502);
  }
}

export const POST = withAiCool(handle);
