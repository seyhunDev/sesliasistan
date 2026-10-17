import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { exerciseCatalog, fold } from "@/lib/fitness/exercises";
import { DOW_LONG, cleanProgram, dropRoutines } from "@/lib/fitness/model";

export const runtime = "nodejs";

// Hazır fitness programı (PDF, fotoğraf ya da yapıştırılan metin) → eksiksiz program; ya da açık programa yazılı değişiklik.
// Fitness › Program hazırla › "PDF ya da metinden" ve program düzenleme ekranındaki "Yapay zekaya değişiklik gönder".
// Kaydetmez; telefon düzenleme ekranında açar, antrenör bakıp kaydeder. Belge saklanmaz.
const SYSTEM = `Sen bir yelken kulübünün antrenörüne yardım eden fitness asistanısın. İki iş yaparsın:
1) "read": antrenörün verdiği hazır programı (PDF, fotoğraf ya da metin; Türkçe ya da başka dilde) uygulamanın program biçimine EKSİKSİZ ve AYNEN aktarırsın.
2) "edit": verilen programda antrenörün yazdığı değişikliği yaparsın; TAM programı döndürürsün, istenmeyen hiçbir şeyi değiştirmezsin (gün, saat, hareket, sıra, set, tekrar, not aynen kalır).

Kesin kurallar:
- Belgedeki HER antrenman gününü ve antrenmandaki HER hareketi al: hazırlık/ısınma (içindeki nefes ve mobilite hareketleri dahil), ana bölüm, mikrodoz, soğuma. Sırayı koru. Hiçbir hareketi atlama, birleştirme, kısaltma. Belgede olmayan hareket, ısınma ya da esneme EKLEME.
- Rakamları belgedeki gibi yaz, yuvarlama ya da "iyileştirme" yapma.
- Antrenörün ek isteği (ask) varsa belgeden önce gelir, harfiyen uygula (gün, saat, hafta sayısı, başlangıç, değişiklik).
- Bütün yazılar Türkçe; hareket adı belgedeki gibi (İngilizce terimler belgede öyleyse kalsın: "Dead bug", "Pallof press").

Gün (days):
- dow 1 Pazartesi … 7 Pazar. Haftalık planda hangi gün hangi antrenman yazıyorsa o güne koy. Her gün tek kayıt; aynı güne iki rutin düşerse sırayla tek günde birleştir ve adı ikisini anlatsın.
- Hareket listesi verilmemiş günler (yalnız "atletizm", "yelken antrenmanı" gibi başka spor) gün olarak eklenmez.
- Nefes, mobilite, reset, toparlanma, yelken sonrası esneme gibi kısa rutinler ANTRENMAN DEĞİLDİR: tek başına gün olarak eklenmez, süreleri hiçbir güne eklenmez. Bunları rules'a başlığıyla tek satır yaz ("Her gün 8 dk reset: burun nefesi 4 sn al 6 sn ver · open book 5/yan …").
- Antrenmanın içindeki bölüm başlıkları ("Nefes ve mobilite · 6 dk", "Hazırlık 8 dk", "Isınma", "Soğuma") hareket DEĞİLDİR: başlığı hareket olarak yazma, başlığın süresini hareket ya da gün süresi olarak yazma; başlığın altındaki hareketleri o bölümün part'ıyla al.
- time: başlangıç saati HH:MM ("17.45–18.25" → 17:45). min: antrenmanın süresi dakika, belgedeki saat aralığından ("17.45–18.25" → 40; bölüm sürelerini toplama; "8 dk" → 10'a değil 8'e en yakın 5'in katı: 10; "12 dk" → 10 ya da 15'ten belgeye yakın olan; en az 5).
- name: kısa ad ("Kuvvet A", "Kuvvet B", "Yelken mikrodozu").
- note: günün düzeni ve şartları kısa ("2 tur, hareketler arası 20 sn geçiş", "İsteğe bağlı · yalnız yeşil günde", "RPE 6–7").

Hareket (items), her biri:
- part: "isinma" (hazırlık, ısınma, mobilite), "ana" (ana bölüm), "soguma" (soğuma, esneme, reset sonu). Belgede bölüm yoksa "ana".
- ex: hareket verilen listedekiyle BİREBİR aynı hareketse listedeki id; değilse "" (boş). Emin değilsen "". name her zaman belgedeki ad.
- Doz: tekrarlı hareket reps (aralıksa reps alt, repsTo üst: "8–12" → reps 8, repsTo 12); süreli hareket sec (aralıksa sec ve secTo: "20–30 sn" → 20, 30; "1 dk" → 60); dakikalı yürüyüş/koşu/kardiyo min. "5 nefes", "5 yavaş nefes" → reps 5 ve breath'te nefes biçimi.
- side: her yan/her bacak/her kol için ("/yan", "/bacak", "6/6", "30 sn/30 sn", "8/8") → true.
- sets: set ya da tur sayısı (belgede yoksa 1; ısınma istasyonlarında 1).
- kg: elde tutulan ağırlık (dambıl, kettlebell). bag: sırt çantasına konan ağırlık kg. Belgede "sırt çantalı" deyip kilo yazmıyorsa bag 0 ve note'a çanta bilgisini yaz.
- rest: set arası dinlenme saniye ("75 sn" → 75, "1 dk" → 60).
- rpe: zorluk ("6–7", "7 · RIR 3"). tempo: tempo ("3 sn iniş", "3-1-1").
- breath: nefes yönergesi ("4 sn al · 6 sn ver", "burundan al, uzun ver").
- note: ipucu/odak cümlesi aynen ("Diz ikinci parmağa", "Bel boşluğunu koru").
- alt: belgede verilen alternatif ("Band yoksa masa altı row", "Side plank 2 × 20–30 sn").

Program:
- title: kısa ("Yelken ev kuvveti"). weeks: belgedeki toplam hafta (ask başka diyorsa onu). start: ask'te tarih varsa YYYY-MM-DD, yoksa boş.
- phases: haftalara göre evreler varsa { from, to, name, sets (o haftalarda setlerin yüzdesi; "setleri ~%30 azalt" → 70, "hacim %40 düşük" → 60; değişmiyorsa 100), note (RPE/RIR, ne yapılır) }.
- rules: ilerleme kuralı, güvenlik/dur kuralları, trafik ışığı gibi genel kurallar; kısa satırlar, her satır "- " ile, en çok 12 satır.
- note: programın amacı 1-2 cümle.
- message: antrenöre 1 kısa cümle (ne okundu: kaç gün, kaç hareket; edit'te ne değişti). Belge bir antrenman programı değilse isProgram false.`;

const s = { type: "string" };
const n = { type: "number" };
const ITEM = {
  type: "object",
  properties: {
    part: { type: "string", enum: ["isinma", "ana", "soguma"] },
    ex: s, name: s, sets: n, reps: n, repsTo: n, sec: n, secTo: n, min: n, side: { type: "boolean" },
    kg: n, bag: n, rest: n, rpe: s, tempo: s, breath: s, note: s, alt: s,
  },
  required: ["name", "sets"],
};
const SCHEMA = {
  type: "object",
  properties: {
    isProgram: { type: "boolean" },
    message: s,
    program: {
      type: "object",
      properties: {
        title: s, weeks: n, start: s, note: s, rules: s,
        phases: { type: "array", items: { type: "object", properties: { from: n, to: n, name: s, sets: n, note: s }, required: ["from", "to", "name"] } },
        days: { type: "array", items: { type: "object", properties: { dow: n, time: s, min: n, name: s, note: s, items: { type: "array", items: ITEM } }, required: ["dow", "name", "items"] } },
      },
      required: ["title", "days"],
    },
  },
  required: ["isProgram", "message", "program"],
};

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX = 4 * 1024 * 1024;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, k) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Yapay zekaya giden program (fotoğraf/video künyesi gitmez; dönüşte addan geri takılır)
const KEEP = ["part", "ex", "name", "sets", "reps", "repsTo", "sec", "secTo", "min", "side", "kg", "bag", "rest", "rpe", "tempo", "breath", "note", "alt"];
const progJson = (p) =>
  JSON.stringify({
    title: p.title, weeks: p.weeks, start: p.start, note: p.note, rules: p.rules, phases: p.phases,
    days: p.days.map(({ dow, time, min, name, note, items }) => ({ dow, time, min, name, note, items: items.map((it) => Object.fromEntries(KEEP.filter((k) => it[k] !== undefined && it[k] !== "").map((k) => [k, it[k]]))) })),
  });

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "fitness-import");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Dosya çok büyük ya da bozuk. 4 MB'tan küçük PDF ya da fotoğraf yükle.", 413);
  }
  const cur = body?.program ? cleanProgram(body.program) : null;
  const edit = !!cur?.days?.length && !body?.data && !body?.text;
  const ask = String(body?.ask || "").trim().slice(0, 2000);
  const text = String(body?.text || "").trim().slice(0, 60000);
  const mimeType = String(body?.mimeType || "");
  const data = String(body?.data || "");
  if (edit) {
    if (!ask) return bad("Ne değişsin, yaz.");
  } else if (!text) {
    if (!TYPES.includes(mimeType)) return bad("PDF ya da fotoğraf yükle.");
    if (!data || data.length > (MAX * 4) / 3 + 8) return bad("Dosya 4 MB'tan büyük olmasın.", 413);
  } else if (text.length < 30) return bad("Program metni çok kısa.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Programı elle hazırlayabilirsin.", 503);
  const today = DAY.test(body?.today || "") ? body.today : new Date().toISOString().slice(0, 10);
  const who = [body?.age ? `Sporcu ${Math.round(+body.age)} yaşında.` : "", body?.sport ? `Spor: ${S(body.sport, 20)}.` : ""].filter(Boolean).join(" ");

  const user = [
    `İş: ${edit ? "edit" : "read"}`,
    `Bugün: ${today} (${DOW_LONG[((new Date(`${today}T12:00:00`).getDay() + 6) % 7) + 1]})`,
    who,
    edit ? `Mevcut program:\n${progJson(cur)}` : text ? `Program metni (kopyalanmış, düzen bozuk olabilir):\n"""\n${text}\n"""` : "Ekteki programı oku.",
    ask ? `Antrenörün ${edit ? "istediği değişiklik" : "ek isteği"}:\n"""\n${ask}\n"""` : "",
    `Hareket listesi (id: ad), yalnız birebir aynı hareket için:\n${exerciseCatalog()}`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, images: edit || text ? [] : [{ mimeType, data }], maxTokens: 16000, timeoutMs: 55000 });
    if (raw?.isProgram === false && !edit) return bad("Bu bir antrenman programına benzemiyor.", 422);
    const rp = raw?.program || {};
    // Değişiklikte: süre/hafta/başlangıç söylenmediyse eskisi; fotoğraf/video ve YouTube aynı adlı harekete geri takılır
    const media = new Map((cur?.days || []).flatMap((d) => d.items).filter((it) => it.media || it.yt).map((it) => [fold(it.name), { media: it.media, yt: it.yt }]));
    const days = (Array.isArray(rp.days) ? rp.days : []).map((d) => ({ ...d, items: (Array.isArray(d.items) ? d.items : []).map((it) => ({ ...it, ex: it.ex || "", ...(media.get(fold(it.name)) || {}) })) }));
    const p = cleanProgram({ ...(cur || {}), ...rp, days: edit ? days : dropRoutines(days), start: DAY.test(rp.start || "") ? rp.start : cur?.start || "" });
    const count = p.days.reduce((t, d) => t + d.items.length, 0);
    if (!p.days.length || !count) return bad(edit ? "Değişiklik yapılamadı, daha açık yazıp tekrar dene." : "Programdan antrenman okunamadı. Metni yapıştırmayı dene.", 422);
    console.log(`[fitness-import] ${Date.now() - t0} ms, ${edit ? "edit" : "read"}, gün=${p.days.length}, hareket=${count}`);
    return NextResponse.json({ program: p, message: S(raw?.message, 300) || `${p.days.length} gün, ${count} hareket okundu.` });
  } catch (err) {
    logAiError("fitness-import", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad(edit ? "Değişiklik yapılamadı, tekrar dene." : "Program okunamadı, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
