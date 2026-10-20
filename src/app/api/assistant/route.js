import { NextResponse } from "next/server";
import { countAi } from "@/lib/server/aiUsage";
import { callClaude } from "@/lib/ai/anthropic";
import { callGemini, modelOf, partialMessage, streamGemini, withAiCool } from "@/lib/ai/gemini";
import { ASSISTANT_SYSTEM, ASSISTANT_TOOL, isJobJson, parseAssistant } from "@/lib/ai/assistant";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { overQuota, spend, withQuota } from "@/lib/server/quota";
import { aiErrorText, logAiError } from "@/lib/ai/errors";
import { budgetMs, fallbackMs, streamPlan } from "@/lib/ai/budget";
import { draftBlock, historyBlock, memoBlock, sessionsBlock } from "@/lib/convoContext";

export const runtime = "nodejs";

const DEV = process.env.NODE_ENV !== "production";

function pickProvider() {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}
const hasKey = (p) => (p === "gemini" ? !!process.env.GEMINI_API_KEY : p === "anthropic" ? !!process.env.ANTHROPIC_API_KEY : false);
// Geliştirmede hata ayrıntısı da döner (yayında gizli kalır)
const bad = (error, status = 400, detail = "", extra = {}) =>
  NextResponse.json({ error, ...extra, ...(DEV && detail ? { detail } : {}) }, { status });

function ask(provider, user, timeoutMs) {
  if (provider === "gemini") {
    return callGemini({
      model: process.env.GEMINI_MODEL,
      system: ASSISTANT_SYSTEM,
      user,
      schema: ASSISTANT_TOOL.input_schema,
      maxTokens: 8192,
      timeoutMs,
      attemptMs: timeoutMs,
    });
  }
  return callClaude({
    model: process.env.AI_MODEL_TEXT || "claude-haiku-4-5-20251001",
    system: ASSISTANT_SYSTEM,
    tool: ASSISTANT_TOOL,
    messages: [{ role: "user", content: user }],
    maxTokens: 2048,
  });
}

async function handle(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  countAi(au, "assistant");
  const noLeft = await overQuota(au, "assistant"); // kişilerde günlük hak
  if (noLeft) return noLeft;

  let body;
  try {
    body = await request.json();
  } catch {
    return bad("Geçersiz istek");
  }
  const text = String(body?.text ?? "").trim().slice(0, 1000);
  if (!text) return bad("Metin boş");
  const digest = String(body?.digest ?? "").slice(0, 26000);
  // Ad yalnızca harf/rakam ve birkaç işaretten oluşabilir (istem enjeksiyonunu önler)
  const name = String(body?.name ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 30);
  // Ana hesabın çalışan adları: yeni kayıtlarda sorumlu atama için
  const people = [...new Set((Array.isArray(body?.people) ? body.people : []).slice(0, 20).map((n) => String(n ?? "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 40)).filter(Boolean))];
  // Mesaj alıcıları (sohbet rehberindeki kişiler, gruplar, WhatsApp'lı kişiler; ana hesap "(ana hesap)" ekiyle). Kalabalık kulüpte 40 sınırı kişileri kesiyordu
  const contacts = [...new Set((Array.isArray(body?.contacts) ? body.contacts : []).slice(0, 150).map((n) => String(n ?? "").replace(/[^\p{L}\p{N} .'()-]/gu, "").trim().slice(0, 60)).filter(Boolean))];
  // Açık sohbetin kısa bağlamı: son turlar (toplam ~1500 karakter) ve bu sohbette hazırlanan mesaj taslağı (lib/convoContext.js)
  const history = historyBlock(body?.history);
  const memo = memoBlock(body?.memo);
  const draft = draftBlock(body?.draft);
  const sessions = sessionsBlock(body?.sessions);

  // Ön cevap: telefon kullanıcıya hemen kısa bir giriş söyledi; yanıt onun devamı olmalı (tekrar etmemeli)
  const precue = String(body?.precue ?? "").slice(0, 500);

  const provider = pickProvider();
  if (!hasKey(provider) || (provider === "gemini" && !process.env.GEMINI_MODEL)) {
    console.error(`[assistant] HATA · ANAHTAR YOK · provider=${provider || "yok"}`);
    return bad("Yapay zeka anahtarı veya modeli tanımlı değil", 503, `provider=${provider || "yok"}, GEMINI_MODEL=${process.env.GEMINI_MODEL || "boş"}`);
  }

  const recipients = `## MESAJ ALICILARI\n${contacts.length ? contacts.join("\n") : "(kimse yok)"}`;
  const user = `${digest || "(veri özeti gelmedi)"}\n\n${recipients}\n\n${sessions ? `${sessions}\n\n` : ""}## KONUŞMA GEÇMİŞİ\n${history || "(yok)"}\n\n${draft ? `${draft}\n\n` : ""}${memo ? `${memo}\n\n` : ""}## KULLANICININ YENİ İSTEĞİ${name ? ` (${name})` : ""}\n"""\n${text}\n"""${precue ? `\n\n## ÖN CEVAP (kullanıcıya zaten söylendi)\n${precue}` : ""}`;

  const started = Date.now();
  const total = budgetMs(); // Netlify sınırı: toplam ~9,5 sn (lib/ai/budget.js)
  const forPeople = contacts.map((c) => c.replace(/\s*\(.*\)\s*$/, ""));

  // Akış (stream: true, Gemini): okunacak metin geldikçe satır satır gönderilir ({t:"m"}), sonunda tüm yanıt ({t:"done"}).
  // Akış başlamadan hata olursa normal çağrıya (yedek modeller, tekrar denemeler) düşer. Biçim: NDJSON.
  if (body?.stream && provider === "gemini") {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctl) {
        const send = (o) => ctl.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
        let lastM = "";
        try {
          let raw;
          const t0 = Date.now();
          try {
            raw = await streamGemini({
              model: process.env.GEMINI_MODEL,
              system: ASSISTANT_SYSTEM,
              user,
              schema: ASSISTANT_TOOL.input_schema,
              maxTokens: 8192,
              ...streamPlan(total), // ilk parça ~4 sn'de gelmezse kalan süreyle yedek modele (önceden 8 + 22 sn; Netlify keserdi)
              onText: (acc) => {
                // İş yapılan yanıtlarda (kayıt, işlem, mesaj) sonucu uygulama gerçek duruma göre söyler: yapay zekanın cümlesi akışta okunmaz
                if (isJobJson(acc)) return;
                const m = partialMessage(acc);
                if (m && m !== lastM) {
                  lastM = m;
                  send({ t: "m", m });
                }
              },
            });
          } catch (e) {
            if (e.started) throw e;
            // Yedek çağrı kalan süreyle; süre kalmadıysa zaman aşımı (telefon 14 sn bekler, bağlantı kopmasında bir kez dener)
            const left = fallbackMs(total, Date.now() - started);
            if (!left) throw Object.assign(new Error("zaman aşımı: yedek için süre kalmadı"), { name: "AbortError" });
            raw = await ask(provider, user, left);
          }
          const ms = Date.now() - t0;
          const r = parseAssistant(raw, people, forPeople, text);
          console.log(`[assistant:${provider}] akış ${ms} ms, intent=${r.intent}, items=${r.items.length}`);
          if (!r.message && !r.items.length && !r.actions.length && !r.sends.length && !r.navigate && !r.openChat) throw new Error(`boş yanıt: ${JSON.stringify(raw).slice(0, 200)}`);
          const q = await spend(au, "assistant");
          send({ t: "done", ...r, source: "ai", provider, model: modelOf(raw), ms, ...(q && !q.unlimited ? { quota: q } : {}) });
        } catch (e) {
          const kind = logAiError("assistant", provider, e, Date.now() - started);
          send({ t: "err", error: aiErrorText(kind, e), reason: kind, ...(e.retryAfter ? { retryAfter: e.retryAfter } : {}) });
        }
        ctl.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store, no-transform", "x-accel-buffering": "no" } });
  }

  try {
    const t0 = Date.now();
    const raw = await ask(provider, user, total);
    const ms = Date.now() - t0;
    const r = parseAssistant(raw, people, forPeople, text);
    console.log(`[assistant:${provider}] ${ms} ms, ~${Math.round(user.length / 4)} token istem, intent=${r.intent}, show=${r.show.length}, actions=${r.actions.length}, items=${r.items.length}, send=${r.send ? "1" : "0"}`);
    if (!r.message && !r.items.length && !r.actions.length && !r.sends.length && !r.navigate && !r.openChat) throw new Error(`boş yanıt: ${JSON.stringify(raw).slice(0, 200)}`);
    return withQuota(NextResponse.json({ ...r, source: "ai", provider, model: modelOf(raw), ms }), await spend(au, "assistant"));
  } catch (e) {
    const kind = logAiError("assistant", provider, e, Date.now() - started);
    const status = kind === "quota" ? 429 : kind === "busy" ? 503 : kind === "timeout" ? 504 : 502;
    return bad(aiErrorText(kind, e), status, e.message, { reason: kind, ...(e.retryAfter ? { retryAfter: e.retryAfter } : {}) });
  }
}

export const POST = withAiCool(handle);
