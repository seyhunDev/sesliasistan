// Yalnızca sunucuda çalışır. Anahtar tarayıcıya çıkmaz.
import { AsyncLocalStorage } from "node:async_hooks";

// Claude'a verdiğimiz JSON şemasını Gemini'nin şema biçimine çevirir (tipler büyük harf)
function toSchema(s) {
  const o = { type: String(s.type).toUpperCase() };
  if (s.description) o.description = s.description;
  if (s.enum) o.enum = s.enum;
  if (s.properties) o.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toSchema(v)]));
  if (s.required) o.required = s.required;
  if (s.items) o.items = toSchema(s.items);
  return o;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = [500, 502, 503, 504]; // geçici sunucu sorunları (yoğunluk)
const HOUR = 60 * 60 * 1000;

// Sunucu açık kaldıkça hafızada tutulan model bilgileri
const G = globalThis.__gemini || (globalThis.__gemini = { cool: new Map(), thinkBad: new Set(), schemaBad: new Set() });
// cool: geçici olarak atlanan modeller (model -> { until, kind: "day" | "minute" | "gone", id })
// thinkBad: düşünmeyi kapatma ayarını (thinkingBudget: 0) kabul etmeyen modeller
// schemaBad: responseSchema'yı kabul etmeyen modeller

// Google günlük kotayı Pasifik saatiyle gece yarısı sıfırlar (Türkiye'de ~10:00)
function nextDailyReset(now = Date.now()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(now))
      .map((x) => [x.type, x.value]),
  );
  const passed = ((+p.hour * 60 + +p.minute) * 60 + +p.second) * 1000;
  return now + 24 * HOUR - passed + 60 * 1000; // 1 dk pay
}

// ---- Kota bilgisinin cihazla paylaşılması ----
// Netlify her istekte yeni sunucu açabildiği için bellekteki "bekleyen modeller" kaybolur.
// Bu yüzden telefon, sunucunun bildirdiği bekleme sürelerini saklayıp her istekte "x-ai-cool" başlığıyla geri gönderir.
// Başlıktaki bilgi yalnızca o isteğe uygulanır (başka kullanıcıların isteklerini etkilemez).
const reqCool = new AsyncLocalStorage();
const MAX_SEED = 36 * HOUR;

function parseCool(header) {
  const out = new Map();
  if (!header) return out;
  try {
    const now = Date.now();
    for (const [m, until] of Object.entries(JSON.parse(header))) {
      const u = Number(until);
      if (typeof m === "string" && m.length < 80 && u > now && u < now + MAX_SEED) out.set(m, u);
    }
  } catch {}
  return out;
}
// Bu istek için geçerli bekleme süresi (sunucu belleği ya da cihazın bildirdiği, hangisi daha uzunsa)
const coolUntil = (m) => Math.max(G.cool.get(m)?.until || 0, reqCool.getStore()?.get(m) || 0);

// Gemini dışındaki servisler için de (ör. "stt:openai") bekleme kaydı
export const isCooling = (key) => coolUntil(key) > Date.now();
export function markCool(key, ms) {
  G.cool.set(key, { until: Date.now() + ms, kind: ms >= HOUR ? "day" : "minute", id: key });
}

// Route'u sarar: gelen başlığı okur, yanıta güncel bekleme listesini ekler
export function withAiCool(handler) {
  return async (request, ctx) => {
    const seed = parseCool(request.headers.get("x-ai-cool"));
    const res = await reqCool.run(seed, () => handler(request, ctx));
    try {
      const now = Date.now();
      const all = new Map(seed);
      for (const [m, v] of G.cool) if (v.until > now && v.kind !== "gone") all.set(m, Math.max(all.get(m) || 0, v.until));
      const live = Object.fromEntries([...all].filter(([, u]) => u > now));
      res.headers.set("x-ai-cool", JSON.stringify(live));
    } catch {}
    return res;
  };
}

// 429 yanıtından hangi kotanın dolduğunu ve kaç saniye beklenmesi gerektiğini okur
function quotaInfo(text) {
  try {
    const d = JSON.parse(text).error?.details || [];
    const v = d.find((x) => x.violations)?.violations?.[0] || {};
    const retry = parseInt(d.find((x) => x.retryDelay)?.retryDelay || "0", 10) || 0;
    const id = v.quotaId || v.quotaMetric || "";
    return { id, retry, daily: /day/i.test(id) };
  } catch {
    return { id: "", retry: 0, daily: false };
  }
}

// Kısa hata özeti (günlükte tek satır)
function shortErr(text) {
  try {
    const e = JSON.parse(text).error || {};
    const reason = (e.details || []).find((x) => x.reason)?.reason;
    return `${e.status || ""}${reason ? `/${reason}` : ""}: ${(e.message || "").slice(0, 160)}`;
  } catch {
    return text.slice(0, 160);
  }
}

async function once(model, body, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body,
      signal: ctrl.signal,
    });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

// model: ana model. Hata olursa GEMINI_FALLBACK_MODELS listesindeki modellere sırayla geçer.
// 400: önce düşünme ayarı, sonra şema kaldırılarak aynı model tekrar denenir.
// 503 (yoğunluk): aynı model artan aralıklarla 2 kez daha denenir.
// 404 (model kapalı): 24 saat atlanır. 429 (kota): kota süresi boyunca atlanır.
// Başarısız olursa hata nesnesinde status (503 yoğun | 429 kota) ve retryAfter (sn) bulunur.
export async function callGemini({ model, system, user, schema, images = [], maxTokens = 4096, timeoutMs = 22000 }) {
  const all = [...new Set([model, ...(process.env.GEMINI_FALLBACK_MODELS || "").split(",").map((s) => s.trim())].filter(Boolean))];
  const now = Date.now();
  const models = all.filter((m) => !(coolUntil(m) > now));
  const skipped = all.filter((m) => !models.includes(m));
  const quotaSkipped = skipped.filter((m) => G.cool.get(m)?.kind !== "gone");

  const quotaErr = (msg, list) => {
    const soonest = Math.min(...list.map((m) => coolUntil(m) || now + 60000));
    const err = new Error(msg);
    err.status = 429;
    err.daily = list.every((m) => G.cool.get(m)?.kind === "day" || coolUntil(m) - now > 30 * 60 * 1000);
    err.retryAfter = Math.max(5, Math.ceil((soonest - Date.now()) / 1000));
    return err;
  };

  // Hepsi beklemede: Gemini'yi hiç çağırmadan dön (kota boşa harcanmasın)
  if (!models.length) throw quotaErr(`Gemini: tüm modeller beklemede (${all.join(", ")})`, quotaSkipped.length ? quotaSkipped : all);

  const responseSchema = toSchema(schema);
  const schemaText = JSON.stringify(schema);

  const mkBody = (noThink, useSchema) =>
    JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: useSchema
              ? system
              : `${system}\n\nYanıtı YALNIZCA şu JSON şemasına uyan tek bir JSON nesnesi olarak ver, başka hiçbir metin yazma:\n${schemaText}`,
          },
        ],
      },
      contents: [{ role: "user", parts: [...images.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data } })), { text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        ...(useSchema ? { responseSchema } : {}),
        temperature: 0.2,
        maxOutputTokens: maxTokens,
        ...(noThink ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    });

  const deadline = Date.now() + timeoutMs;
  const tried = skipped.map((m) => `${m}:${G.cool.get(m)?.kind === "gone" ? "kapalı" : "beklemede"}`);
  let last = "Gemini yanıt vermedi";
  const quotaHit = [];
  const busy = [];

  outer: for (const m of models) {
    let noThink = !G.thinkBad.has(m); // hız için düşünmeyi kapat (model izin veriyorsa)
    let useSchema = !G.schemaBad.has(m);
    let retries = 0;

    for (let guard = 0; guard < 6; guard++) {
      const left = deadline - Date.now();
      if (left < 2000) break outer;
      try {
        const t0 = Date.now();
        const { status, text } = await once(m, mkBody(noThink, useSchema), Math.min(left, Math.max(12000, timeoutMs - 8000)));

        if (status === 200) {
          const data = JSON.parse(text);
          const cand = data.candidates?.[0];
          const out = (cand?.content?.parts || []).map((p) => p.text || "").join("").trim();
          if (!out) {
            last = `Gemini boş yanıt (${m}: ${cand?.finishReason || data.promptFeedback?.blockReason || "bilinmiyor"})`;
            tried.push(`${m}:boş`);
            break;
          }
          let json;
          try {
            json = JSON.parse(out.replace(/^```(?:json)?\s*|\s*```$/g, ""));
          } catch {
            last = `Gemini geçersiz JSON (${m}, ${cand?.finishReason || "?"}): ${out.slice(0, 120)}`;
            tried.push(`${m}:json`);
            break;
          }
          console.log(
            `[gemini] ${m} ${Date.now() - t0} ms${noThink ? " (düşünme kapalı)" : ""}${useSchema ? "" : " (şemasız)"}${retries ? ` (${retries}. tekrar)` : ""}${tried.length ? ` · önce: ${tried.join(", ")}` : ""}`,
          );
          return json;
        }

        if (status === 429) {
          const q = quotaInfo(text);
          // Günlük kota: sıfırlanana kadar (Pasifik gece yarısı) atla. Dakikalık: bildirilen süre kadar.
          G.cool.set(m, { until: q.daily ? nextDailyReset() : Date.now() + Math.max(q.retry, 20) * 1000, kind: q.daily ? "day" : "minute", id: q.id });
          quotaHit.push(m);
          tried.push(`${m}:429${q.daily ? "/gün" : "/dk"}`);
          last = `Gemini 429 (${m}) kota doldu${q.id ? `: ${q.id}` : ""}`;
          break; // sıradaki modele geç (her modelin kotası ayrı)
        }

        if (status === 404) {
          // Model bu hesapta yok veya kaldırılmış: 24 saat hiç deneme
          G.cool.set(m, { until: Date.now() + 24 * HOUR, kind: "gone", id: "" });
          tried.push(`${m}:404`);
          console.warn(`[gemini] ${m} kullanılamıyor, listeden çıkar · ${shortErr(text)}`);
          last = `Gemini 404 (${m}) ${shortErr(text)}`;
          break;
        }

        last = `Gemini ${status} (${m}) ${shortErr(text)}`;

        if (status === 400) {
          // Hata mesajı sebebi söylemeyebilir: önce düşünme ayarını, sonra şemayı kaldırarak dene
          if (noThink) {
            G.thinkBad.add(m);
            noThink = false;
            console.warn(`[gemini] ${m} 400, düşünme ayarı kaldırılıyor · ${shortErr(text)}`);
            continue;
          }
          if (useSchema) {
            G.schemaBad.add(m);
            useSchema = false;
            console.warn(`[gemini] ${m} 400, şemasız deneniyor · ${shortErr(text)}`);
            continue;
          }
        }

        if (RETRYABLE.includes(status)) {
          if (retries < 2 && deadline - Date.now() > 6000) {
            retries += 1;
            await sleep(retries * 1500); // 1,5 sn sonra, sonra 3 sn sonra
            continue;
          }
          busy.push(m);
          tried.push(`${m}:${status}`);
          break;
        }

        tried.push(`${m}:${status}`);
        console.warn(`[gemini] ${m} ${status} · ${shortErr(text)}`);
        break;
      } catch (e) {
        last = `Gemini (${m}): ${e.name === "AbortError" ? "zaman aşımı" : e.message}`;
        tried.push(`${m}:${e.name === "AbortError" ? "zaman aşımı" : "hata"}`);
        break;
      }
    }
  }

  console.warn(`[gemini] başarısız · ${tried.join(", ") || "deneme yapılamadı"}`);

  // Kotası olan bir model yoğunsa: kısa süre sonra açılır, "yoğun" de
  if (busy.length) {
    const err = new Error(`Gemini yoğun (${busy.join(", ")}) · ${last}`);
    err.status = 503;
    err.retryAfter = 30;
    throw err;
  }
  const quotaList = [...quotaHit, ...quotaSkipped];
  if (quotaList.length) throw quotaErr(last, quotaList);
  throw new Error(last);
}
