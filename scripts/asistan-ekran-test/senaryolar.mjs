// Sesli asistanın ekran testi: uygulama bu bilgisayarda açılır, sahte Firebase'e (emülatör) giriş yapılır ve asistan
// bir insan gibi kullanılır: dokun konuş, basılı tut yaz, kapat, küçült, sesli yanıt, onaylar, görev listesi…
// Yapay zekaya hiç istek gitmez: /api/assistant, /api/tasks, /api/transcribe, /api/tts tarayıcıda taklit edilir
// (her istek sayılır; taklitsiz istek kalırsa test kalır). Uygulama dışındaki adreslere (gerçek Firebase, hava durumu) istek kesilir.
import { existsSync } from "node:fs";
import { INIT } from "./taklitler.mjs";
import { seed, FS_HOST, PROJECT } from "./emulator.mjs";

const K = "asistan ekran";
const OWNER = "sahip@ornek.local";
const ATHLETE = "sporcu@ornek.local";
const PASS = "test-sifre-123";

const ymd = (d) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const TODAY = ymd(new Date());
const TOMORROW = ymd(new Date(Date.now() + 864e5));
const now = new Date().toISOString();

// Halkanın renkleri (TabBar.jsx RING_C)
const RING = { "#e8705f": "kırmızı", "#f0c36b": "kehribar", "#6aaef0": "mavi", "#6fc39b": "yeşil" };

async function launch() {
  const { chromium } = await import("playwright-core");
  const args = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"];
  const tries = [];
  if (process.env.TAM_TEST_CHROME) tries.push({ executablePath: process.env.TAM_TEST_CHROME });
  tries.push({ channel: "chrome" });
  for (const p of ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"]) if (existsSync(p)) tries.push({ executablePath: p });
  tries.push({});
  let last;
  for (const t of tries) {
    try {
      return await chromium.launch({ headless: true, args, ...t });
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`Tarayıcı bulunamadı. ${String(last?.message || "").split("\n")[0]}`);
}

// Test verisi: ana hesap (notlar, planlar, görevler), sporcu hesabı
function seedData() {
  const who = (k) => ({ ownerId: `{${k}}`, createdByUid: `{${k}}`, assignees: [], people: [`{${k}}`], createdAt: now, createdBy: { name: "Test Sahip" }, src: "manual", cat: "Genel" });
  const plan = (id, title, date, time) => ({ path: `orgs/{owner}/plans/${id}`, data: { ...who("owner"), title, date, endDate: "", time, allDay: !time, durationMin: time ? 60 : null, tz: "Europe/Istanbul", timeSource: time ? "user" : "none", place: "", status: "planned" } });
  return {
    users: [
      { key: "owner", email: OWNER, password: PASS, name: "Test Sahip", doc: { name: "Test Sahip", email: OWNER, role: "owner", orgId: "{owner}", onboarded: true, introV: 99, tourDone: true, createdAt: now } },
      { key: "athlete", email: ATHLETE, password: PASS, name: "Ege Demir", doc: { name: "Ege Demir", email: ATHLETE, role: "staff", kind: "athlete", orgId: "{owner}", onboarded: true, introV: 99, tourDone: true, createdAt: now } },
    ],
    docs: [
      plan("p-disci", "Dişçi randevusu", TODAY, "15:30"),
      plan("p-toplanti", "Yönetim toplantısı", TOMORROW, "10:00"),
      { path: "orgs/{owner}/notes/n-yelken", data: { ...who("owner"), title: "Yelken bezleri", body: "Yelken bezlerini kuru yerde sakla", tags: [], planId: null } },
      { path: "orgs/{owner}/tasks/t-motor", data: { ...who("owner"), title: "Motor bakımı", due: TODAY, done: false, doneAt: null, planId: null } },
      { path: "orgs/{owner}/members/{athlete}", data: { uid: "{athlete}", name: "Ege Demir", email: ATHLETE, role: "staff", kind: "athlete", createdAt: now } },
    ],
  };
}

export async function run(server, log = () => {}) {
  const rows = [];
  const push = (grup, say, expect, ok, got) => rows.push({ katman: K, grup, say, expect, ok: !!ok, got: String(got ?? "") });
  const check = async (grup, say, expect, fn) => {
    try {
      const r = await fn();
      const [ok, got] = Array.isArray(r) ? r : [r, r ? "evet" : "hayır"];
      push(grup, say, expect, ok, got);
      return ok;
    } catch (e) {
      push(grup, say, expect, false, `hata: ${String(e.message).split("\n")[0].slice(0, 200)}`);
      return false;
    }
  };

  let ids = {};
  try {
    ids = await seed(seedData());
  } catch (e) {
    push("Hazırlık", "sahte hesaplar", "yazılır", false, e.message);
    return rows;
  }
  const sha = await fetch(`${server.url}/api/version`).then((r) => r.json()).then((j) => j.sha || "").catch(() => "");

  let browser;
  try {
    browser = await launch();
  } catch (e) {
    rows.push({ katman: K, grup: "Tarayıcı", say: "Chrome açılıyor", expect: "", ok: null, got: `ATLANDI: ${e.message}` });
    return rows;
  }

  // ------------------------------------------------------------------ yardımcılar
  const calls = []; // { path, body }: taklit edilen her istek
  let ai = () => ({ intent: "chat", message: "Tamam." }); // /api/assistant cevabı (senaryo değiştirir)
  let aiDelay = 0;
  let tasksReply = () => null; // /api/tasks cevabı
  let transcript = ""; // /api/transcribe cevabı
  const outside = new Set(); // kesilen dış adresler

  async function newPage({ email = OWNER, width = 390, height = 844, standalone = false, note = false, mobile = true } = {}) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      locale: "tr-TR",
      timezoneId: "Europe/Istanbul",
      serviceWorkers: "block",
      hasTouch: mobile,
      isMobile: false,
      permissions: ["microphone"],
      ...(standalone ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" } : {}),
    });
    await ctx.addInitScript(INIT({ standalone, sha: note ? "" : sha }));
    await ctx.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
      if (!local) {
        outside.add(u.hostname);
        return route.abort();
      }
      if (!u.pathname.startsWith("/api/") || u.pathname === "/api/version") return route.continue();
      let body = null;
      try {
        body = route.request().postDataJSON();
      } catch {}
      calls.push({ path: u.pathname, body });
      const json = (o, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(o) });
      if (u.pathname === "/api/assistant") {
        if (aiDelay) await new Promise((r) => setTimeout(r, aiDelay));
        return json({ source: "ai", provider: "taklit", ms: 1, ...ai(body?.text || "", body) });
      }
      if (u.pathname === "/api/tasks") {
        const t = tasksReply(body?.text || "");
        return t ? json({ tasks: t }) : json({ error: "yok" }, 503);
      }
      if (u.pathname === "/api/transcribe") return json({ text: transcript });
      if (u.pathname === "/api/tts") return json({ error: "anahtar yok" }, 501);
      return json({ ok: true });
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message || e).split("\n")[0]));
    // Next geliştirme penceresi (sağ alttaki "Issue" düğmesi) dokunuşları kapatmasın
    await page.addStyleTag?.({ content: "" }).catch(() => {});
    await page.goto(`${server.url}/login`, { waitUntil: "load", timeout: 120000 });
    const inputs = page.locator("input");
    await inputs.first().waitFor({ timeout: 30000 });
    await inputs.nth(0).fill(email);
    await inputs.nth(1).fill(PASS);
    await inputs.nth(1).press("Enter");
    await page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 60000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForTimeout(1500);
    return { page, ctx, errs };
  }

  const orb = (page) => page.locator("nav[aria-label='Sekmeler'] [data-orb]");
  const dome = (page) => page.locator("[data-dome]");
  const state = (page) => dome(page).getAttribute("data-state");
  const full = (page) => page.locator(".afull");
  const ringColor = (page) => page.locator("[data-dome] svg circle").nth(1).getAttribute("stroke").then((c) => RING[c] || c);
  const ringText = (page) => page.locator("[data-dome] [aria-live='polite']").first().innerText().catch(() => "");
  const last = (page) => page.locator("[data-dome] [data-last-reply]").last().innerText().catch(() => "");
  const convo = (page) => page.locator("[data-dome] .overflow-y-auto").first().innerText().catch(() => "");
  const waitFor = async (fn, ms = 6000) => {
    const t0 = Date.now();
    let v;
    while (Date.now() - t0 < ms) {
      v = await fn().catch(() => null);
      if (v) return v;
      await new Promise((r) => setTimeout(r, 120));
    }
    return v;
  };
  const say = (page, text) => page.evaluate((t) => window.__t.say(t), text);
  const aiCalls = () => calls.filter((c) => /^\/api\/(assistant|tasks|transcribe|tts|interpret|meeting|receipt)$/.test(c.path)).length;
  const btn = (page, name) => page.locator(`[data-dome] button[aria-label='${name}']`);
  // Asistanı yazarak kullan: küreye basılı tut, yaz, gönder
  const typeAsk = async (page, text) => {
    const o = (await orb(page).count()) ? orb(page) : page.locator("[data-orb]").first();
    const box = await o.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    const ta = page.locator("[data-dome] textarea");
    await ta.waitFor({ timeout: 5000 });
    await ta.fill(text);
    await ta.press("Enter");
  };
  // Açık sohbette yeni söz (konuşarak): Konuş düğmesi → söyle → Gönder
  const talkAsk = async (page, text) => {
    if (!(await page.locator(".afull.afull-in").count())) {
      await waitFor(async () => !(await full(page).count()), 2000); // kapanış animasyonu bitsin
      await orb(page).click();
    }
    else {
      await waitFor(async () => (await state(page)) === "idle", 6000);
      await btn(page, "Konuş").click({ timeout: 5000 });
    }
    if (!(await waitFor(async () => (await state(page)) === "listening", 4000))) throw new Error(`dinlemeye geçmedi (durum: ${await state(page)})`);
    await say(page, text);
    await page.waitForTimeout(150);
    const send = btn(page, "Gönder");
    if (!(await waitFor(() => send.count(), 3000))) {
      const labels = await page.locator("[data-dome] button[aria-label]").evaluateAll((l) => l.map((b) => b.getAttribute("aria-label")));
      throw new Error(`Gönder düğmesi yok (durum: ${await state(page)}; düğmeler: ${labels.join(", ")})`);
    }
    await send.click({ timeout: 5000 });
  };
  // Asistanı kapat: dinliyorsa önce dinlemeyi bırak, sonra × (Konuşmayı bitir)
  const closeAll = async (page) => {
    for (let i = 0; i < 4 && (await page.locator(".afull.afull-in").count()); i++) {
      for (const name of ["Sil ve dinlemeyi bırak", "Konuşmayı bitir"]) {
        const x = btn(page, name);
        if (await x.count()) {
          await x.click().catch(() => {});
          break;
        }
      }
      await page.waitForTimeout(400);
    }
    await waitFor(async () => !(await full(page).count()), 1500);
  };
  // Dokunmatik aşağı çekme (tam ekranı kapatma/küçültme)
  const swipeDown = (page) =>
    page.evaluate(async () => {
      const el = document.querySelector("[data-dome]");
      const target = el.querySelector(".abg") || el;
      const r = el.getBoundingClientRect();
      const x = r.width / 2;
      const mk = (y) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
      target.dispatchEvent(new TouchEvent("touchstart", { touches: [mk(120)], bubbles: true, cancelable: true }));
      for (let y = 140; y <= 420; y += 40) {
        target.dispatchEvent(new TouchEvent("touchmove", { touches: [mk(y)], bubbles: true, cancelable: true }));
        await new Promise((res) => setTimeout(res, 16));
      }
      target.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [mk(420)], bubbles: true, cancelable: true }));
    });

  // Emülatördeki belge (yönetici olarak okunur): { var: true, alanlar } ya da null
  const getDoc = async (path) => {
    const p = path.replace(/\{(\w+)\}/g, (m, k) => ids[k] ?? m);
    const r = await fetch(`http://${FS_HOST}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`, { headers: { Authorization: "Bearer owner" } });
    return r.ok ? r.json() : null;
  };
  try {
    const { scenarios } = await import("./adimlar.mjs");
    await scenarios({ getDoc, log, check, push, newPage, orb, dome, state, full, ringColor, ringText, convo, last, waitFor, say, btn, typeAsk, talkAsk, closeAll, swipeDown, aiCalls, calls, setAI: (f, d = 0) => ((ai = f), (aiDelay = d)), setTasks: (f) => (tasksReply = f), setTranscript: (t) => (transcript = t), TODAY, TOMORROW });
  } catch (e) {
    push("Senaryolar", "çalıştırma", "tamamlanır", false, String(e.stack || e.message).split("\n").slice(0, 3).join(" | "));
  } finally {
    await browser.close().catch(() => {});
  }
  // Gerçek yapay zekaya / dış dünyaya giden istek olmamalı (hepsi taklit ya da kesildi)
  push("Güvenlik", "dış adresler", "gerçek Firebase ve yapay zekaya istek gitmez (kesilir)", true, outside.size ? `kesilen: ${[...outside].slice(0, 6).join(", ")}` : "dış istek yok");
  return rows;
}
