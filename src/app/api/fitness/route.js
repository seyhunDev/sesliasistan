import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callGemini, withAiCool } from "@/lib/ai/gemini";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { logAiError } from "@/lib/ai/errors";
import { exerciseCatalog } from "@/lib/fitness/exercises";
import { GOALS, LEVELS, PLACES, DOW_LONG, cleanProgram, cleanProfile } from "@/lib/fitness/model";

export const runtime = "nodejs";

// Fitness (ana asistandan): kullanıcının cümlesi → tek iş:
//   program: yeni program ya da açık programda değişiklik (tam program döner) · log: yapılan antrenmanın sonucu
//   profile: yalnız profil bilgisi (kilo, hedef…) · answer: soru cevabı (verilen özetten)
// Kaydetmez; telefon önizlemede açar ya da plana yazar. Yapay zekaya yalnız fitness bilgisi gider (profil, program, son antrenmanlar).
const SYSTEM = `Sen kişisel bir fitness koçusun. Kullanıcı Türkçe konuşur (ses tanıma metni olabilir, yazım hataları olabilir: "sınav" çoğu zaman "şınav", "skuat" squat'tır).
Tek bir iş seç (op):
- "program": yeni antrenman programı istenirse ya da mevcut programda değişiklik istenirse ("çarşambayı bacak günü yap", "plank ekle", "45 dakikaya indir", "cumayı akşam 7'ye al"). Değişiklikte TAM programı döndür: değişmeyen günleri ve hareketleri aynen koru, yalnız isteneni değiştir.
- "log": yapılan antrenman anlatılırsa ("squat 3 set 10 tekrar 60 kilo yaptım", "bugün 30 dakika koştum", "bugünkü antrenmanı yaptım ama plankı yapamadım").
- "profile": yalnız kişisel bilgi söylenirse ("kilom 82", "hedefim kilo vermek", "evde çalışıyorum, dambılım var").
- "answer": soru ya da tavsiye ("bu hafta kaç antrenman yaptım", "squat rekorum ne", "dinlenme günü ne yapayım"). Verilen özetten kısa, doğru cevap ver; bilmediğini uydurma.
Program kuralları:
- Hareketler YALNIZ verilen listeden, "ex" alanına listedeki id yazılır (ör. "squat"). Listede olmayan hareket yazma.
- Kullanıcının söylediği günleri ve saatleri aynen kullan: dow 1 Pazartesi … 7 Pazar; "sabah" söylendiyse ve saat yoksa 07:00, "akşam" ise 19:00, "öğle" 12:30. Gün söylenmediyse hedefe göre haftada 3 gün (Pzt, Çar, Cum) ve profilde/programda saat yoksa boş bırak.
- weeks: söylenen hafta sayısı, yoksa 4. start: söylendiyse YYYY-MM-DD, yoksa boş (telefon önümüzdeki ilk günü koyar).
- Her güne kısa ad ver (ör. "Üst vücut", "Alt vücut", "Tüm vücut", "Kardiyo ve karın"). min: antrenman süresi (söylenmediyse 45).
- Her gün ısınma ile başlar ("warmup", min 5-10) ve esneme ile biter ("stretch", min 5). Aradaki hareket sayısı süreye uygun (45 dk ≈ 5-6 hareket).
- Set/tekrar hedefe ve seviyeye göre: kas 3-4 × 8-12; güç 4-5 × 4-6; kilo verme ve kondisyon 3 × 12-15 kısa dinlenme, kardiyo eklenir; genel sağlık 2-3 × 10-12. Yeni başlayanda daha az set ve kolay hareketler.
- Süreli hareketlerde (plank, duvarda oturma) "sec", kardiyoda "min", diğerlerinde "reps". kg yalnız ağırlıklı harekette ve tahmin edebiliyorsan (profilde kilo ve seviye varsa) yaz; emin değilsen 0 (kullanıcı ilk antrenmanda yazar). rest: set arası dinlenme saniye (60-120).
- Yer ve ekipmana uy: evde ve ekipman yoksa yalnız vücut ağırlığı; spor salonunda makine ve ağırlık serbest. Kaçınılacak hareket/sakatlık varsa o bölgeyi zorlayan hareket koyma.
- Günler aynı kasları arka arkaya yormasın. title: programın kısa adı ("3 günlük tüm vücut"). note: programın 1-2 cümlelik özeti ve ilerleme önerisi.
- Söylenen kişisel bilgi (kilo, boy, yaş, hedef, seviye, yer, ekipman) varsa "profile" alanına da yaz.
log kuralları: date antrenmanın günü (bugün/dün/gün adı → bugüne göre GEÇMİŞE doğru; söylenmediyse bugün). items: söylenen her hareket ve setleri ({reps, kg, sec, min}); "3 set 10 tekrar 60 kilo" → 3 aynı set. Hareket adı söylenmeden "bugünkü antrenmanı yaptım" denirse items boş, st "done". "Yapamadım/atladım" → st "skip". min: söylenen süre. feel: 1 zor, 2 iyi, 3 kolay (söylenmediyse 0). note: kısa not.
message: 1-2 kısa Türkçe cümle (program için ne hazırladığını ya da neyi değiştirdiğini söyle; varsayım yaptıysan söyle).`;

const ITEM = {
  type: "object",
  properties: {
    ex: { type: "string" },
    sets: { type: "number" },
    reps: { type: "number" },
    sec: { type: "number" },
    min: { type: "number" },
    kg: { type: "number" },
    rest: { type: "number" },
    note: { type: "string" },
  },
  required: ["ex", "sets"],
};
const SET = { type: "object", properties: { reps: { type: "number" }, kg: { type: "number" }, sec: { type: "number" }, min: { type: "number" } } };
const SCHEMA = {
  type: "object",
  properties: {
    op: { type: "string", enum: ["program", "log", "profile", "answer"] },
    program: {
      type: "object",
      properties: {
        title: { type: "string" },
        weeks: { type: "number" },
        start: { type: "string" },
        note: { type: "string" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: { dow: { type: "number" }, time: { type: "string" }, min: { type: "number" }, name: { type: "string" }, items: { type: "array", items: ITEM } },
            required: ["dow", "name", "items"],
          },
        },
      },
    },
    log: {
      type: "object",
      properties: {
        date: { type: "string" },
        st: { type: "string" },
        min: { type: "number" },
        feel: { type: "number" },
        note: { type: "string" },
        items: { type: "array", items: { type: "object", properties: { ex: { type: "string" }, name: { type: "string" }, sets: { type: "array", items: SET } } } },
      },
    },
    profile: {
      type: "object",
      properties: {
        goal: { type: "string" },
        level: { type: "string" },
        place: { type: "string" },
        equip: { type: "array", items: { type: "string" } },
        height: { type: "number" },
        weight: { type: "number" },
        age: { type: "number" },
        avoid: { type: "string" },
      },
    },
    message: { type: "string" },
  },
  required: ["op", "message"],
};

const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const opt = (list) => list.map(([k, l]) => `${k} (${l})`).join(", ");

// Mevcut programın kısa yazısı (yapay zekaya; değişiklik isteğinde tam programı geri döndürsün diye JSON)
const progText = (p) => (p?.days?.length ? JSON.stringify({ title: p.title, weeks: p.weeks, start: p.start, days: p.days.map(({ dow, time, min, name, items }) => ({ dow, time, min, name, items: items.map(({ ex, sets, reps, sec, min: m, kg, rest }) => ({ ex, sets, reps, sec, min: m, kg, rest })) })) }) : "");

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "fitness");
  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = String(body?.text ?? "").trim().slice(0, 3000);
  if (!text) return bad("Ne yapmak istediğini söyle.");
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) return bad("Yapay zeka anahtarı tanımlı değil. Programı elle hazırlayabilirsin.", 503);
  const today = DAY.test(body?.today) ? body.today : new Date().toISOString().slice(0, 10);
  const prof = cleanProfile(body?.profile || {});
  const cur = body?.program ? cleanProgram(body.program) : null;
  const user = [
    `Bugün: ${today} (${DOW_LONG[((new Date(`${today}T12:00:00`).getDay() + 6) % 7) + 1]})`,
    `Profil: ${JSON.stringify(prof)}\n(goal: ${opt(GOALS)}; level: ${opt(LEVELS)}; place: ${opt(PLACES)})`,
    cur?.days?.length ? `Mevcut program:\n${progText(cur)}` : "Mevcut program yok.",
    body?.recent ? `Son antrenmanlar:\n${S(body.recent, 3000)}` : "",
    body?.stats ? `Özet: ${S(body.stats, 600)}` : "",
    `Hareket listesi (id: ad):\n${exerciseCatalog()}`,
    `Kullanıcının söylediği:\n"""\n${text}\n"""`,
  ].filter(Boolean).join("\n\n");

  try {
    const t0 = Date.now();
    const raw = await callGemini({ model: process.env.GEMINI_MODEL, system: SYSTEM, user, schema: SCHEMA, maxTokens: 6000, timeoutMs: 25000 });
    const op = ["program", "log", "profile", "answer"].includes(raw?.op) ? raw.op : "answer";
    const out = { op, message: S(raw?.message, 400) };
    if (raw?.profile) out.profile = cleanProfile(raw.profile);
    if (op === "program") {
      const p = cleanProgram({ ...(cur || {}), ...raw.program, goal: prof.goal || out.profile?.goal, level: prof.level || out.profile?.level, place: prof.place || out.profile?.place });
      if (!p.days.length || p.days.every((d) => !d.items.length)) return bad("Program hazırlanamadı, gün ve hedefi söyleyip tekrar dene.", 502);
      out.program = p;
    }
    if (op === "log") {
      const l = raw.log || {};
      let date = DAY.test(l.date || "") ? l.date : today;
      if (date > today) date = today;
      out.log = {
        date,
        st: l.st === "skip" ? "skip" : "done",
        min: Number(l.min) > 0 ? Math.round(l.min) : 0,
        feel: [1, 2, 3].includes(l.feel) ? l.feel : 0,
        note: S(l.note, 300),
        items: (Array.isArray(l.items) ? l.items : []).slice(0, 20).map((e) => ({ ex: S(e.ex, 40), name: S(e.name, 60), sets: (Array.isArray(e.sets) ? e.sets : []).slice(0, 12) })),
      };
    }
    console.log(`[fitness] ${Date.now() - t0} ms, op=${op}`);
    return NextResponse.json(out);
  } catch (err) {
    logAiError("fitness", "gemini", err);
    if (err.status === 429) return bad("Yapay zeka kotası şu an dolu. Biraz sonra tekrar dene.", 429);
    return bad("Fitness isteği işlenemedi, tekrar dene.", 502);
  }
}

export const POST = withAiCool(handle);
