import { NextResponse } from "next/server";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { canSeeAthletes } from "@/features/athletes/access";
import { logAiError } from "@/lib/ai/errors";

export const runtime = "nodejs";

// Sesli/yazılı yarış: "Yarış ekle: D'Azur Regatta, Çeşme, 7-11 Ekim, Ali ve Ayşe katılacak" ya da
// "D'Azur yarışına Mehmet'i de ekle, not: konaklama otelde" -> yarış bilgisi + sporcu kimlikleri.
// Kaydetmez; telefon yazar. Yapay zekaya yalnızca sporcu adı, sınıfı ve kimliği gider.
const SYSTEM = `Sen bir yelken kulübünde antrenörün yarış asistanısın. Antrenör Türkçe konuşur (ses tanıma metni, yazım hataları olabilir) ya da yazar.
Sana bugünün tarihi, kayıtlı yarışlar (id | ad | başlangıç) ve sporcu listesi (id | ad soyad | sınıf) verilir.

op:
- create: yeni bir yarış ekleniyor ("yarış ekle", "yeni yarış", "… yarışına gideceğiz").
- update: kayıtlı bir yarışa sporcu, not ya da tarih ekleniyor ("D'Azur yarışına Mehmet'i de ekle", "regatta için not al: …"). raceId kayıtlı listeden. Ad tam söylenmeyebilir, en yakın yarışı seç; emin değilsen ve tek bir gelecek yarış varsa onu seç.
- none: yarışla ilgili bir kayıt isteği değil.

Alanlar:
- name: yarışın adı, söylendiği gibi ama düzgün yazımla ("D'Azur Optimist Regatta"). update'te boş bırakabilirsin.
- city / district: il ve ilçe. "Çeşme" -> il İzmir, ilçe Çeşme; "Bodrum" -> Muğla, Bodrum. Yalnızca il söylendiyse district boş.
- startDate / endDate: YYYY-MM-DD. "7-11 Ekim" -> başlangıç 7 Ekim, bitiş 11 Ekim. Yıl söylenmediyse bugünden sonraki ilk o tarih. Tek gün ise endDate = startDate. Söylenmediyse boş.
- athleteIds: katılacak sporcular. Adı listedeki bir sporcuyla eşleştir (yalnızca ad, soyad, lakap ya da ses tanıma hatası olabilir). Her sporcunun "söylenişler" listesi önceden hazırlanmış eşleştirme dizinidir, önce ona bak. Tek başına söylenen ad önce ADI o olan sporcuya aittir. Aynı ada birden çok sporcu uyuyorsa işaretleme, unknown'a "Ali (2 kişi)" yaz. "Optimist grubu" gibi sınıf adı geçerse o sınıftaki herkes.
- unknown: listede bulunamayan adlar.
- note: yalnızca kullanıcının not olarak kaydedilmesini istediği bilgi (konaklama, ulaşım, ücret…). Yoksa boş.
- message: 1 kısa Türkçe cümle; ne anladığını söyle. Eksik bilgi varsa (create'te ad ya da tarih yoksa) onu sor.`;

const SCHEMA = {
  type: "object",
  properties: {
    op: { type: "string", enum: ["create", "update", "none"] },
    raceId: { type: "string" },
    name: { type: "string" },
    city: { type: "string" },
    district: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    athleteIds: { type: "array", items: { type: "string" } },
    unknown: { type: "array", items: { type: "string" } },
    note: { type: "string" },
    message: { type: "string" },
  },
  required: ["op", "athleteIds", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[\w-]+$/;
const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

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
  const text = S(body?.text, 1500);
  const today = DATE.test(body?.today || "") ? body.today : new Date().toISOString().slice(0, 10);
  const list = (Array.isArray(body?.athletes) ? body.athletes : [])
    .map((a) => ({
      id: S(a?.id, 64), name: S(a?.name, 60), cls: S(a?.cls, 30),
      aliases: (Array.isArray(a?.aliases) ? a.aliases : []).map((x) => S(x, 40)).filter(Boolean).slice(0, 12),
    }))
    .filter((a) => ID.test(a.id) && a.name)
    .slice(0, 300);
  const races = (Array.isArray(body?.races) ? body.races : [])
    .map((r) => ({ id: S(r?.id, 64), name: S(r?.name, 80), startDate: DATE.test(r?.startDate || "") ? r.startDate : "" }))
    .filter((r) => ID.test(r.id) && r.name)
    .slice(0, 40);
  if (!text) return bad("Yarışı söyle ya da yaz.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Yarışı Sporcular › Yarış evrakı sayfasından ekleyebilirsin.", 503);

  const wd = DAYS[new Date(`${today}T12:00:00`).getDay()];
  const notes = (Array.isArray(body?.notes) ? body.notes : []).map((n) => S(n, 200)).filter(Boolean).slice(0, 20);
  const line = (a) => `${a.id} | ${a.name} | ${a.cls || "-"}${a.aliases.length ? ` | söylenişler: ${a.aliases.join(", ")}` : ""}`;
  const user = [
    `Bugün: ${today} (${wd})`,
    races.length ? `Kayıtlı yarışlar:\n${races.map((r) => `${r.id} | ${r.name} | ${r.startDate || "-"}`).join("\n")}` : "Kayıtlı yarış yok.",
    `Sporcular:\n${list.map(line).join("\n") || "-"}`,
    notes.length ? `Karışabilecek adlar:\n${notes.map((n) => `- ${n}`).join("\n")}` : "",
    `Antrenörün söylediği:\n"""\n${text}\n"""`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 3000, timeoutMs: 20000 });
    const ids = new Set(list.map((a) => a.id));
    const athleteIds = [...new Set((Array.isArray(raw?.athleteIds) ? raw.athleteIds : []).map(String).filter((x) => ids.has(x)))];
    let op = ["create", "update", "none"].includes(raw?.op) ? raw.op : "none";
    const raceId = races.some((r) => r.id === raw?.raceId) ? raw.raceId : "";
    if (op === "update" && !raceId) op = "none";
    const startDate = DATE.test(raw?.startDate || "") ? raw.startDate : "";
    const endDate = DATE.test(raw?.endDate || "") && raw.endDate >= startDate ? raw.endDate : startDate;
    const out = {
      op, raceId, startDate, endDate, athleteIds,
      name: S(raw?.name, 80), city: S(raw?.city, 40), district: S(raw?.district, 40),
      note: String(raw?.note || "").trim().slice(0, 1000),
      unknown: (Array.isArray(raw?.unknown) ? raw.unknown : []).map((u) => S(u, 40)).filter(Boolean).slice(0, 10),
      message: S(raw?.message, 300),
    };
    console.log(`[race] ${Date.now() - t0} ms, op=${op}, sporcu=${athleteIds.length}`);
    return NextResponse.json(out);
  } catch (e) {
    logAiError("race", "gemini", e);
    if (e.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene ya da yarışı sayfadan ekle.", 429);
    return bad("Yarış anlaşılamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
