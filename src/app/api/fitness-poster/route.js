import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Afişten hareket fotoğrafları (Seyhun 2026-11-25: "hareketlerin hepsinin gösterildiği foto var, tek tek her hareket için yapmak
// istiyorum"). Ana hesap Hareketler › "Afişten" ile bir afiş yükler; burada yapay zeka her hareketin fotoğraf alanını (kutu) ve
// kütüphanedeki karşılığını bulur. Kesme ve yükleme telefonda yapılır (PosterImport.jsx). Afiş saklanmaz.
const SYSTEM = `Bir fitness afişindeki hareketleri tek tek bulursun. Afişte numaralı kartlar vardır; her kartta hareketin adı, fotoğrafı (ya da birkaç fotoğrafı) ve kısa açıklama yazısı olur.
Her hareket için:
- name: afişteki hareket adı (Türkçe, afişteki gibi; numara olmadan).
- box: o hareketin FOTOĞRAF alanı [ymin, xmin, ymax, xmax], 0–1000 ölçeğinde (afişin tamamına göre). Yalnız fotoğraf; kart başlığı, numara dairesi, süre satırı ve fotoğrafın altındaki açıklama yazısı kutuya girmez. Bir hareketin birden çok fotoğrafı varsa (A/B, önce/sonra) hepsini içine alan tek kutu.
- match: verilen "Kulübün hareketleri" listesinde AYNI hareket varsa o adın AYNISI; yoksa "" (boş). Benzer ama farklı hareketi eşleştirme.
Afişin altındaki kısa versiyon, özet ya da tekrar eden küçük kartları alma: her hareket bir kez, en büyük fotoğrafıyla. Sırayı afişteki numara sırası yap.
Afiş fitness hareketleri göstermiyorsa isPoster false.`;

const s = { type: "string" };
const SCHEMA = {
  type: "object",
  properties: {
    isPoster: { type: "boolean" },
    items: { type: "array", items: { type: "object", properties: { name: s, match: s, box: { type: "array", items: { type: "number" } } }, required: ["name", "box"] } },
  },
  required: ["isPoster", "items"],
};
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, k) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const clamp = (v) => Math.min(1000, Math.max(0, Math.round(+v || 0)));

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (au.staff) return bad("Yalnız ana hesap.", 403);
  countAi(au, "fitness-poster");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Fotoğraf çok büyük ya da bozuk.", 413);
  }
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  if (!TYPES.includes(mimeType)) return bad("Afişin fotoğrafını yükle.");
  if (!data || data.length > (MAX * 4) / 3 + 8) return bad("Fotoğraf 4 MB'tan büyük olmasın.", 413);
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const names = (Array.isArray(body?.names) ? body.names : []).map((x) => S(x, 60)).filter(Boolean).slice(0, 300);
  const user = ["Ekteki afişteki hareketleri bul.", names.length ? `Kulübün hareketleri:\n${names.join("\n")}` : "Kulübün hareket listesi boş: match hep boş."].join("\n\n");
  try {
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, images: [{ mimeType, data }], maxTokens: 4000, timeoutMs: 55000 });
    if (raw?.isPoster === false) return bad("Bu afişte hareket bulunamadı.", 422);
    const known = new Set(names);
    const items = (Array.isArray(raw?.items) ? raw.items : [])
      .map((x) => {
        const [y0, x0, y1, x1] = (Array.isArray(x?.box) ? x.box : []).map(clamp);
        return { name: S(x?.name, 60), match: known.has(S(x?.match, 60)) ? S(x.match, 60) : "", box: [y0, x0, y1, x1] };
      })
      .filter((x) => x.name && x.box[2] - x.box[0] > 20 && x.box[3] - x.box[1] > 20)
      .slice(0, 30);
    if (!items.length) return bad("Afişte hareket fotoğrafı bulunamadı.", 422);
    return NextResponse.json({ items });
  } catch (err) {
    logAiError("fitness-poster", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Afiş okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
