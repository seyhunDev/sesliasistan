import { requireUser, unauthorized } from "@/lib/server/auth";
import { countAi } from "@/lib/server/aiUsage";
import { NextResponse } from "next/server";
import { callGemini, isCooling, markCool, withAiCool } from "@/lib/ai/gemini";
import { dropHallucination } from "@/lib/speech/hallucination";

export const runtime = "nodejs";

// Sık kelimeler: kulüp işleri, tekne sınıfları ve asistanın sayfa adları (komutlar doğru yazılsın: "Optimus" değil "Optimist")
const HINT =
  "Spor kulübü, yelken, antrenman, yarış, regat, ayak, Optimist, ILCA, Laser, 420, 470, Techno 293, iQFoil, Finn, Nacra, ıskota, fiş, fatura, KDV, " +
  "plan, görev, not, yoklama, takvim, planlar, görevler, notlar, fişler, yarışlar, sporcular, mesajlar, ayarlar, ana sayfa, aç, git, göster.";
const MIN = 60 * 1000;

// OpenAI uyumlu ses çeviri servisleri (aynı istek biçimi). Groq: Türkçede tam model (whisper-large-v3) "turbo"dan daha doğru yazar
const WHISPER = {
  groq: { url: "https://api.groq.com/openai/v1/audio/transcriptions", key: () => process.env.GROQ_API_KEY, model: () => process.env.GROQ_STT_MODEL || "whisper-large-v3" },
  openai: { url: "https://api.openai.com/v1/audio/transcriptions", key: () => process.env.OPENAI_API_KEY, model: () => process.env.STT_MODEL || "gpt-4o-mini-transcribe" },
};

// Kişi adları (çalışanlar): ses tanıma bunları doğru yazsın diye ipucuna eklenir
// Özel adlar (yarış adları): aynı yazımla yazılsın
const namesHint = (names, terms = []) =>
  (names.length ? ` Kişi adları (bu yazımla, bitişik yaz): ${names.join(", ")}.` : "") + (terms.length ? ` Yarış adları (bu yazımla): ${terms.join(", ")}.` : "");

// Sessiz parçaları at: konuşma yok olasılığı yüksek ve model kendinden emin değilse (Whisper burada uydurur)
function spoken(data) {
  const segs = Array.isArray(data?.segments) ? data.segments : null;
  if (!segs?.length) return String(data?.text || "").trim();
  return segs
    .filter((g) => !(g.no_speech_prob > 0.6 && g.avg_logprob < -0.7))
    .map((g) => String(g.text || "").trim())
    .filter(Boolean)
    .join(" ");
}

async function viaWhisper(name, file, names, terms) {
  const s = WHISPER[name];
  const send = (model) => {
    const fd = new FormData();
    fd.append("file", file, file.name || "kayit.webm");
    fd.append("model", model);
    fd.append("language", "tr");
    fd.append("prompt", HINT + namesHint(names, terms));
    // Groq: parça başına "konuşma yok" olasılığı gelir; sessiz parçalar (uydurma metin) atılır
    if (name === "groq") fd.append("response_format", "verbose_json");
    return fetch(s.url, { method: "POST", headers: { Authorization: `Bearer ${s.key()}` }, body: fd, signal: AbortSignal.timeout(20000) });
  };
  let res = await send(s.model());
  // OpenAI'da model adı hesapta yoksa eski, yaygın modele düş
  if (name === "openai" && !res.ok && [400, 404].includes(res.status) && s.model() !== "whisper-1") res = await send("whisper-1");
  if (res.ok) return spoken(await res.json());
  const body = (await res.text()).slice(0, 300);
  const err = new Error(`${name} ${res.status}: ${body}`);
  // Kota/bakiye yok ya da anahtar geçersiz: bir süre bu servisi hiç deneme
  if (res.status === 401 || res.status === 403 || /insufficient_quota|billing/i.test(body)) markCool(`stt:${name}`, 6 * 60 * MIN);
  else if (res.status === 429) markCool(`stt:${name}`, (Number(res.headers.get("retry-after")) || 60) * 1000);
  err.status = res.status;
  throw err;
}

// Gemini: ses dosyası doğrudan modele verilir
const GSCHEMA = { type: "object", properties: { text: { type: "string", description: "Konuşmanın aynen yazıya dökülmüş hali" } }, required: ["text"] };
async function viaGemini(file, names, terms) {
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const mimeType = (file.type || "audio/webm").split(";")[0];
  const out = await callGemini({
    model: process.env.GEMINI_STT_MODEL || process.env.GEMINI_MODEL,
    system: `Konuşma dili TÜRKÇE. Ses kaydını Türkçe olarak AYNEN yazıya dök; başka bir dile benzese de Türkçe kelimelerle yaz, İngilizceye ya da başka dile ÇEVİRME. Türkçe karakterleri (ç, ğ, ı, İ, ö, ş, ü) doğru kullan. Yorum yapma, özetleme, cevap verme; yalnızca söyleneni yaz. Konuşma yoksa text boş olsun. Sık geçen kelimeler: ${HINT}${namesHint(names, terms)}`,
    user: "Bu Türkçe kaydı yazıya dök.",
    schema: GSCHEMA,
    images: [{ mimeType, data }],
    maxTokens: 1024,
    timeoutMs: 20000,
  });
  return String(out?.text || "").trim();
}

// Denenecek servisler sırayla: STT_PROVIDER ile seçilen önce, sonra Groq, OpenAI, Gemini (anahtarı olanlar)
function providers() {
  const has = {
    groq: !!process.env.GROQ_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!(process.env.GEMINI_API_KEY && (process.env.GEMINI_STT_MODEL || process.env.GEMINI_MODEL)),
  };
  const first = (process.env.STT_PROVIDER || "").toLowerCase();
  return [...new Set([first, "groq", "openai", "gemini"])].filter((p) => has[p]);
}

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "transcribe");
  const list = providers();
  if (!list.length) {
    return NextResponse.json({ error: "Ses çevirisi için sunucuda GROQ_API_KEY, OPENAI_API_KEY ya da GEMINI_API_KEY gerekli." }, { status: 501 });
  }
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const file = form.get("audio");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Ses dosyası yok" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Kayıt çok uzun" }, { status: 413 });
  const names = [...new Set(String(form.get("names") || "").split(",").map((n) => n.replace(/[^\p{L} .'-]/gu, "").trim().slice(0, 40)).filter(Boolean))].slice(0, 60); // sporcu yoklamasında liste uzun olabilir
  const terms = [...new Set(String(form.get("terms") || "").split("|").map((n) => n.replace(/[^\p{L}\p{N} .'’&-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 50)).filter(Boolean))].slice(0, 12);

  const tried = [];
  let quota = false;
  for (const p of list) {
    if (p !== "gemini" && isCooling(`stt:${p}`)) {
      tried.push(`${p}:beklemede`);
      quota = true;
      continue;
    }
    try {
      const t0 = Date.now();
      const raw = p === "gemini" ? await viaGemini(file, names, terms) : await viaWhisper(p, file, names, terms);
      const text = dropHallucination(raw, HINT);
      if (raw && !text) console.log(`[transcribe] ${p} uydurma metin atıldı: ${raw.slice(0, 60)}`);
      console.log(`[transcribe] ${p} ${Date.now() - t0} ms${tried.length ? ` · önce: ${tried.join(", ")}` : ""}`);
      return NextResponse.json({ text, provider: p });
    } catch (e) {
      if (e.status === 429 || e.status === 401 || e.status === 403) quota = true;
      tried.push(`${p}:${e.status || "hata"}`);
      console.error(`[transcribe:${p}]`, e.message.slice(0, 300));
    }
  }
  console.warn(`[transcribe] başarısız · ${tried.join(", ")}`);
  return NextResponse.json(
    {
      error: quota
        ? "Ses yazıya çevrilemedi: çeviri servislerinin kotası dolu. Şimdilik klavyedeki mikrofonla yazabilirsin."
        : "Ses yazıya çevrilemedi, tekrar dene.",
      tried,
    },
    { status: 502 },
  );
}

export const POST = withAiCool(handle);
