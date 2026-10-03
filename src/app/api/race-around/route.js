import { NextResponse } from "next/server";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Yarışın çevresi: otel ↔ yarış alanı ulaşım özeti ve gezilecek yer seçimi.
// Yerler telefonda OpenStreetMap'ten getirilir; buraya yalnız adlar, mesafeler ve aday listesi gelir.
// Yapay zeka yeni yer yazmaz, adaylar arasından seçer. Kaydetmez; telefon yarışa yazar.
const SYSTEM = `Sen bir yelken kulübünün antrenörüne yarış seyahatinde yardım eden asistansın. Kafilede çocuk sporcular, antrenör ve tekneler (römorkla) var.
Sana yarış bilgisi, yarış alanı (kulüp/marina), varsa otel, aradaki araç yolunun mesafesi ve süresi, yakındaki market/eczane/restoran sayıları ve en yakınları, bir de gezilecek yer adayları verilir.

- transport: otel ile yarış alanı arası ulaşım için 2-3 kısa Türkçe cümle. Yalnız verilen mesafe ve süreyi kullan, sayı uydurma. 3 km'den kısaysa yürüme süresini de söyle (saatte ~4,5 km). Sabah toplanma, tekne/römork ve otopark için pratik bir öneri ekleyebilirsin; otobüs hattı, taksi ücreti gibi bilmediğin ayrıntıyı yazma. Otel yoksa boş bırak.
- sights: adaylar arasından yarış arasında ya da sonrasında kafileyle (çocuklarla) gidilebilecek en iyi en çok 6 yer; { id: adayın id'si aynen, why: neden gidilmeli, 1 kısa cümle }. Listede olmayan yer yazma. Uygun aday yoksa boş liste.
- tip: yakın yerlerle ilgili tek kısa pratik not (ör. en yakın eczane, gece açık eczane için nöbetçi eczaneye bakılması) ya da boş.`;

const SCHEMA = {
  type: "object",
  properties: {
    transport: { type: "string" },
    sights: { type: "array", items: { type: "object", properties: { id: { type: "string" }, why: { type: "string" } }, required: ["id", "why"] } },
    tip: { type: "string" },
  },
  required: ["transport", "sights", "tip"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const N = (v) => Math.max(0, Math.round((Number(v) || 0) * 10) / 10);
const LABEL = { market: "Market", pharmacy: "Eczane", food: "Restoran/kafe" };
const dist = (m) => (m < 1000 ? `${Math.round(N(m))} m` : `${(N(m) / 1000).toFixed(1)} km`);

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!canSeeAthletes(au.email)) return bad("Sporcu yetkin yok.", 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil.", 503);
  const r = body?.race || {};
  const places = (Array.isArray(body?.places) ? body.places : []).slice(0, 60);
  const sights = (Array.isArray(body?.sights) ? body.sights : []).slice(0, 30).map((x) => ({ id: S(x?.id, 40), name: S(x?.name, 80), sub: S(x?.sub, 40), m: N(x?.m) })).filter((x) => x.id && x.name);
  const nearText = ["venue", "hotel"].flatMap((near) =>
    Object.keys(LABEL).map((k) => {
      const l = places.filter((p) => p?.near === near && p?.kind === k);
      return l.length ? `- ${near === "venue" ? "Yarış alanı" : "Otel"} yakını ${LABEL[k]}: ${l.length} yer, en yakını ${S(l[0].name, 60)} (${dist(l[0].m)})` : "";
    }),
  ).filter(Boolean);
  const route = body?.route && N(body.route.km) > 0 ? `${N(body.route.km)} km, araçla ${Math.round(N(body.route.min))} dk` : "";
  const user = [
    `Yarış: ${S(r.name, 80) || "-"} | ${S(r.startDate, 10)} - ${S(r.endDate, 10)} | ${S(r.district, 40)} ${S(r.city, 40)}`,
    `Yarış alanı: ${S(body?.venue?.q, 120)} (${S(body?.venue?.name, 160)})`,
    body?.hotel ? `Otel: ${S(body.hotel.q, 120)} (${S(body.hotel.name, 160)})` : "Otel: yok",
    body?.hotel ? `Otel → yarış alanı araç yolu: ${route || "çok yakın (150 m'den az)"}` : "",
    nearText.length ? `Yakındakiler:\n${nearText.join("\n")}` : "Yakında market/eczane/restoran bulunamadı.",
    sights.length ? `Gezilecek yer adayları (id | ad | tür | yarış alanına kuş uçuşu):\n${sights.map((x) => `${x.id} | ${x.name} | ${x.sub} | ${dist(x.m)}`).join("\n")}` : "Gezilecek yer adayı yok.",
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 1500, timeoutMs: 20000 });
    const ids = new Set(sights.map((x) => x.id));
    const out = {
      transport: body?.hotel ? S(raw?.transport, 600) : "",
      tip: S(raw?.tip, 300),
      sights: (Array.isArray(raw?.sights) ? raw.sights : []).map((x) => ({ id: S(x?.id, 40), why: S(x?.why, 200) })).filter((x) => ids.has(x.id)).slice(0, 6),
    };
    console.log(`[race-around] ${Date.now() - t0} ms, gezilecek=${out.sights.length}/${sights.length}`);
    return NextResponse.json(out);
  } catch (e) {
    logAiError("race-around", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu.", 429);
    return bad("Yapay zeka cevap vermedi.", 502);
  }
}

export const POST = withAiCool(handle);
