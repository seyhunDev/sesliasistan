import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";
import { cleanOps, cleanRoute, sailOf } from "@/lib/roundSay";

export const runtime = "nodejs";

// Şamandıra dönüşünde söylenen (ses tanımanın yazısı) → komutlar. Komutları telefon uygular (lib/roundSay.js applySay),
// numaraları kayıt listesiyle o denetler; burada yalnız ne söylendiği anlaşılır.
const SYSTEM = `Bir yelken yarışında antrenör bottan şamandırayı dönen teknelerin yelken numaralarını sırayla söylüyor. Söylediği sesten yazıya çevrilmiş olarak verilir (Türkçe; sayılar rakamla ya da yazıyla olabilir, ses tanıma hata yapabilir).
Sana şu anki şamandıranın listesi (sıra. numara), parkur ve yarışa kayıtlı yelken numaraları verilir. Söyleneni sırayla şu komutlara çevir:
- add {sails}: numaraları listenin sonuna ekle. Yalnız numara söylenirse hep budur ("24, 3542, 2" → add ["24","3542","2"]).
- set {pos, sails}: pos. sıradaki numarayı değiştir ("7. sırayı 512 yap", "yedinci sıra 512 olacak"). Sıra açıkça söylenmeden set yapma.
- del {pos} ya da del {sails:[numara]}: sil ("7'yi sil" = 7. sıra; "512'yi sil" listede 512 varsa ve 512. sıra yoksa numara).
- ins {after, sails}: after. sıradan sonra ekle ("5'ten sonra 88 ekle" → after 5; "başa 88 ekle" → after 0).
- move {pos, to}: sırayı taşı ("9'u 3. sıraya al").
- next / prev: sonraki / önceki şamandıraya geç ("sonraki şamandıra", "diğer şamandıra", "bitişe geç" → next).
- grp {grp}: söylenen grup ("sarı grup", "mavi grubun startı", "altın filo" → "Sarı", "Mavi", "Altın"). "Sarı grup 3. yarış" → grp Sarı (yarış numarası yazılmaz). Cümle grup adıyla başlıyorsa ("Sarı birinci şamandıra 12 34", "Mavi finiş 512") önce grp, sonra diğer işler: aynı anda birkaç grup yarışıyor, yazılacak grup budur.
- pen {code, sails}: ceza ya da sonuç kodu. code: OCS (erken çıktı), BFD (kara bayrak), UFD (U bayrağı), DSQ (diskalifiye), DNF (bitiremedi), RET (yarışı bıraktı), DNS (start almadı), DNC (gelmedi), DNE (atılamaz diskalifiye); cezayı kaldırmak için "-" ("OCS 512" → pen OCS ["512"]; "kara bayrak 88 ve 1302" → pen BFD ["88","1302"]; "512'nin cezası kalksın" → pen "-" ["512"]). Ceza söylenen numarayı add yapma.
- route {route}: parkuru değiştir ("parkur 1 4 1 2 3 finiş" → ["1","4","1","2","3","F"]).
Kurallar:
- Numaraları yalnız rakam olarak yaz ("yirmi dört" → "24", "üç bin beş yüz yirmi dört" → "3524", "TUR 1234" → "1234").
- Ses tanıma ardışık numaraları birleştirebilir ("243524"); kayıtlı numaralara bakarak doğru böl ("24","3524"). Kayıtlı listede olmayan bir numara söylenmişse de olduğu gibi yaz, düzeltmeyi uygulama önerir.
- "Sıra" ile "numara"yı karıştırma: "7. sıra", "yedinci" sıradır; tek başına "7" numaradır.
- Söylenmeyeni ekleme, numara uydurma. Anlaşılmayan kısım için komut yazma.`;

const s = { type: "string" };
const n = { type: "number" };
const SCHEMA = {
  type: "object",
  properties: {
    ops: {
      type: "array",
      items: { type: "object", properties: { op: { type: "string", enum: ["add", "set", "del", "ins", "move", "next", "prev", "route", "grp", "pen"] }, grp: s, code: s, sails: { type: "array", items: s }, pos: n, after: n, to: n, route: { type: "array", items: s } }, required: ["op"] },
    },
  },
  required: ["ops"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "round-say");
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  const body = await request.json().catch(() => ({}));
  const text = String(body?.text || "").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (!text) return bad("Söylenen boş.");
  const leg = (Array.isArray(body?.leg) ? body.leg : []).map(sailOf).filter(Boolean).slice(0, 400);
  const known = (Array.isArray(body?.known) ? body.known : []).map(sailOf).filter(Boolean).slice(0, 600);
  const route = cleanRoute(body?.route);
  const k = Math.max(0, Math.min(route.length - 1, Math.round(Number(body?.k) || 0)));
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const user = [
    `Parkur: ${route.join(" · ") || "-"}; şu an ${route[k] === "F" ? "bitiş" : `${route[k] || "1"}. şamandıra`} (parkurda ${k + 1}. nokta).`,
    `Şamandıranın listesi: ${leg.length ? leg.map((x, i) => `${i + 1}. ${x}`).join(", ") : "boş"}.`,
    `Kayıtlı numaralar: ${known.join(", ") || "-"}.`,
    `Söylenen: "${text}"`,
  ].join("\n");
  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 2000, timeoutMs: 15000 });
    const ops = cleanOps(raw?.ops);
    console.log(`[round-say] ${Date.now() - t0} ms, ${ops.map((o) => o.op).join(",")}`);
    return NextResponse.json({ ops });
  } catch (e) {
    logAiError("round-say", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu.", 429);
    return bad("Söylenen anlaşılamadı.", 502);
  }
}

export const POST = withAiCool(handle);
