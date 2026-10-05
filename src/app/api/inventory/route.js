import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { STATES, cleanOp } from "@/features/inventory/invModel";

export const runtime = "nodejs";

// Envanter: kullanıcının cümlesinden işlem listesi (ekle, çıkar, değiştir, sil) ya da soruya cevap. Kaydetmez; telefon uygular.
const SYSTEM = `Sen bir kulübün ve evin envanterini tutan asistansın. Kullanıcı Türkçe konuşur (çoğu zaman sesle, yazıya çevrilmiş).
Sana seçili envanter (ad, kategoriler, ürünler: id, no, ad, kategori, adet, durum…) ve kullanıcının cümlesi verilir.
Cümledeki TÜM envanter işlerini sırayla "ops" listesine yaz:

- add: yeni ürün ya da var olanın adedini artırma.
  * Envanterde aynı ürün varsa (ör. "Şamandıra" varken "5 şamandıra daha geldi") id'sini yaz, qty eklenen adettir.
  * Yoksa id boş; name (kısa, düzgün yazım, tekil: "Optimist teknesi", "El telsizi", "Lazer yazıcı"), cat (verilen kategorilerden en uygunu; hiçbiri uymuyorsa kısa yeni kategori), qty (söylenmezse 1).
  * Ayrı takip edilen şeyler (tekne, bot, motor, bilgisayar) için kullanıcı ayrı ad/numara/yelken no söylediyse her biri ayrı add olsun ("Optimist 1 ve Optimist 2" → iki add, qty 1). Yalnız sayı söylendiyse ("3 Optimist teknesi") tek add, qty 3.
  * Söylendiyse doldur: brand (marka/model), serial (seri no, yelken no, plaka), place (yer: depo, hangar, iskele, ofis), assignee (kimde, zimmet), price (₺, yalnız sayı), state, note, addedAt (eklenme/alış tarihi YYYY-MM-DD; "dün aldık" → dünün tarihi), unit (adet, takım, çift, metre, kutu…).
- remove: adet azaltma (kayboldu, kırıldı, satıldı, verildi, kullanıldı, "2 can yeleği çıkar"). id + qty (söylenmezse 1). Kaybolduysa state "lost" yazma; yalnız adet azalır.
- update: var olan ürünün bilgisini değiştirme ("Optimist 4 bakımda", "telsizi Ali'ye verdim" → assignee Ali, "yazıcının yeri ofis", "numarasını 120 yap" → no). id + yalnız değişen alanlar. Adedi açıkça bir sayıya ayarlıyorsa ("şamandıra sayısı 12") qty = yeni toplam.
- delete: ürünün kaydını tamamen silme ("Optimist 3'ü envanterden sil", "eski yazıcıyı listeden kaldır"). id. Uygulama onay sorar.
- state değerleri: ${STATES.map(([k, l]) => `${k} (${l})`).join(", ")}.
- id YALNIZ verilen listeden. Var olan bir ürünü bulamıyorsan (remove/update/delete için) uydurma: o işi yazma, message'da "… bulamadım" de.
- Birden çok aday uyuyorsa (iki "Telsiz") ve hangisi olduğu anlaşılmıyorsa işi yazma, message'da hangisi olduğunu sor (numaralarıyla).
- Kullanıcı yeni bir envanter isterse ("ev için yeni envanter aç", "tekne malzemeleri diye envanter oluştur") newInv {name, kind: "club" yelken/kulüp için, değilse "normal"} yaz; o cümledeki ürünler o yeni envantere eklenir (add, id boş).
- Soru sorulduysa ("kaç teknemiz var", "telsizler kimde", "bakımda olanlar") ops boş; message'da listeden kısa, doğru cevap ver (sayılarla, en çok 3 cümle).
- İş varsa message boş kalabilir ya da tek kısa soru olur; yapılanları uygulama söyler.
- Envanterle ilgisiz bir istekse ops boş, message: "Bu envanterle ilgili değil gibi; ne eklememi ya da değiştirmemi istersin?"`;

const OP = {
  type: "object",
  properties: {
    op: { type: "string", enum: ["add", "remove", "update", "delete"] },
    id: { type: "string" },
    name: { type: "string" },
    cat: { type: "string" },
    qty: { type: "integer" },
    unit: { type: "string" },
    brand: { type: "string" },
    serial: { type: "string" },
    place: { type: "string" },
    state: { type: "string" },
    assignee: { type: "string" },
    price: { type: "number" },
    addedAt: { type: "string" },
    checkAt: { type: "string" },
    note: { type: "string" },
    no: { type: "string" },
  },
  required: ["op"],
};
const SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    ops: { type: "array", items: OP },
    newInv: { type: "object", properties: { name: { type: "string" }, kind: { type: "string" } } },
  },
  required: ["ops", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "inventory");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = S(body?.text, 2000);
  if (!text) return bad("Ne ekleyeyim ya da değiştireyim?");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Ürünleri Envanter sayfasından elle ekleyebilirsin.", 503);
  const inv = body?.inv || {};
  const items = (Array.isArray(inv.items) ? inv.items : []).slice(0, 1500);
  const ids = new Set(items.map((x) => x?.id));
  const user = [
    `Bugün: ${S(body?.today, 10) || new Date().toISOString().slice(0, 10)}`,
    `Seçili envanter: ${S(inv.name, 40)} (${inv.kind === "club" ? "yelken kulübü" : "normal"})`,
    `Diğer envanterler: ${(Array.isArray(body?.others) ? body.others : []).map((x) => S(x, 40)).join(", ") || "yok"}`,
    `Kategoriler: ${(Array.isArray(inv.cats) ? inv.cats : []).map((x) => S(x, 30)).join(", ")}`,
    `Ürünler (JSON):\n${JSON.stringify(items)}`,
    `Kullanıcının cümlesi:\n"""\n${text}\n"""`,
  ].join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 4000, timeoutMs: 20000 });
    const newInv = raw?.newInv?.name ? { name: S(raw.newInv.name, 40), kind: raw.newInv.kind === "club" ? "club" : "normal" } : null;
    // Var olmayan id'li işler atılır (yeni envanterde id olmaz)
    const ops = (Array.isArray(raw?.ops) ? raw.ops : [])
      .map(cleanOp)
      .filter((o) => o && (!o.id || (!newInv && ids.has(o.id))))
      .slice(0, 60);
    console.log(`[inventory] ${Date.now() - t0} ms, işlem=${ops.length}${newInv ? " (yeni envanter)" : ""}`);
    return NextResponse.json({ ops, newInv, message: S(raw?.message, 500) });
  } catch (e) {
    logAiError("inventory", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da Envanter sayfasından elle ekle.", 429);
    return bad("Envanter işlenemedi, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
