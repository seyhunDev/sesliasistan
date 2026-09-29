import { NextResponse } from "next/server";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";

export const runtime = "nodejs";

// Sporcu adlarından bir kez "ses adları" dizini çıkarır: antrenörün bir sporcuyu nasıl çağırabileceği ve ses tanımanın
// adı nasıl yanlış yazabileceği. Karışabilecek adları (ör. "Deniz Yılmaz" ile "Aren Deniz") ayırır.
// Kaydetmez; telefon sonucu kullanıcının profiline yazar, yoklamada her seferinde bu dizin gönderilir.
const SYSTEM = `Sen bir yelken kulübünde sesli yoklama için isim dizini hazırlayan asistansın. Antrenör yoklamayı konuşarak yapar; ses tanıma Türkçe adları bazen yanlış yazar.
Sana tüm sporcu listesi (id | ad soyad | sınıf) ve dizini hazırlanacak id'ler verilir. İstenen her sporcu için "aliases" üret:

- Antrenörün o sporcuyu sesli çağırabileceği biçimler: ad, ad + soyadın ilk harfi ("Deniz Y."), ad + soyad, yaygın kısaltma/lakap (Mehmet -> Memo, Mustafa -> Musti gibi, yalnızca yaygınsa), iki adlıysa ikinci ad.
- Ses tanımanın o adı yazabileceği yanlış biçimler (küçük harfle): Türkçe karakter kaybı (Çağan -> cagan), benzer sesler (Aren -> aran, eren, ahren), bölünme/birleşme (Sanver -> san ver), yabancı adların Türkçe okunuşu. En fazla 6 tane, gerçekçi olanlar.
- ÇAKIŞMA KURALI: Bir biçim listedeki başka bir sporcuya da uyuyorsa o biçimi ikisine birden YAZMA.
  * Tek başına söylenen ad, ADI o olan sporcuya aittir. Soyadı o olan sporcuya yalnızca listede o ADA sahip kimse yoksa verilir. Örnek: "Deniz Yılmaz" ve "Aren Deniz" varsa "deniz" yalnızca Deniz Yılmaz'ın; Aren Deniz için "aren", "aren deniz" kullanılır.
  * Aynı ada sahip iki sporcu varsa tek başına ad hiçbirine yazılmaz; ayırt edici biçimler yazılır ("deniz y.", "deniz yılmaz", "deniz k.", sınıfları farklıysa "optimistteki deniz").
  * Bir yanlış yazım başka bir sporcunun gerçek adına benziyorsa o yanlış yazımı ekleme.
- notes: karışabilecek adlar için kısa Türkçe açıklamalar ("'Deniz' tek başına Deniz Yılmaz; Aren Deniz için 'Aren' denir."). Karışıklık yoksa boş.
- Tüm aliases küçük harf, Türkçe karakterlerle (i/ı doğru).`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, aliases: { type: "array", items: { type: "string" } } },
        required: ["id", "aliases"],
      },
    },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["items"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!canSeeAthletes(au.email)) return bad("Bu işlem için yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const list = (Array.isArray(body?.athletes) ? body.athletes : [])
    .map((a) => ({ id: S(a?.id, 64), name: S(a?.name, 60), cls: S(a?.cls, 30) }))
    .filter((a) => /^[\w-]+$/.test(a.id) && a.name)
    .slice(0, 400);
  const ids = new Set(list.map((a) => a.id));
  const need = (Array.isArray(body?.need) ? body.need : list.map((a) => a.id)).map((x) => S(x, 64)).filter((x) => ids.has(x)).slice(0, 150);
  if (!need.length) return bad("Hazırlanacak sporcu yok.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);

  const user = `Tüm sporcular:\n${list.map((a) => `${a.id} | ${a.name} | ${a.cls || "-"}`).join("\n")}\n\nDizini hazırlanacak id'ler:\n${need.join(", ")}`;
  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 8000, timeoutMs: 45000 });
    const want = new Set(need);
    const items = (Array.isArray(raw?.items) ? raw.items : [])
      .filter((x) => want.has(String(x?.id)))
      .map((x) => ({
        id: String(x.id),
        aliases: [...new Set((Array.isArray(x.aliases) ? x.aliases : []).map((a) => S(a, 40).toLocaleLowerCase("tr-TR")).filter(Boolean))].slice(0, 12),
      }));
    const notes = (Array.isArray(raw?.notes) ? raw.notes : []).map((n) => S(n, 200)).filter(Boolean).slice(0, 20);
    console.log(`[athlete-names] ${Date.now() - t0} ms, sporcu=${items.length}/${need.length}`);
    return NextResponse.json({ items, notes });
  } catch (e) {
    console.error("[athlete-names]", e.message);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Ses adları hazırlanamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
