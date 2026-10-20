// Çevrimdışı çalışma testi: uygulama bu bilgisayarda açılır, sahte Firebase'e (emülatör) girilir ve internet kesilip açılır.
// Sınananlar: internet varken üstte şerit çıkmaz (yavaş onayda bile); internet yokken kayıt takılmadan telefona yazılır, sakin
// şerit görünür, kayıt sunucuya gitmez; uygulama kapanıp internet gelince kayıt kendiliğinden sunucuya gider; şerit kapanır.
// Sunucudaki durum emülatörden doğrudan okunur (kurallar atlanır, gerçek veriye dokunulmaz). Yapay zekaya istek gitmez.
import { existsSync } from "node:fs";
import { INIT } from "../asistan-ekran-test/taklitler.mjs";
import { seed, FS_HOST, PROJECT } from "../asistan-ekran-test/emulator.mjs";

const K = "çevrimdışı";
const OWNER = "sahip@ornek.local";
const PASS = "test-sifre-123";
const now = new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const { chromium } = await import("playwright-core");
  const tries = [];
  if (process.env.TAM_TEST_CHROME) tries.push({ executablePath: process.env.TAM_TEST_CHROME });
  tries.push({ channel: "chrome" });
  for (const p of ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"]) if (existsSync(p)) tries.push({ executablePath: p });
  tries.push({});
  let last;
  for (const t of tries) {
    try {
      return await chromium.launch({ headless: true, ...t });
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`Tarayıcı bulunamadı. ${String(last?.message || "").split("\n")[0]}`);
}

// Şeritte görünen her yazı sayfa açılır açılmaz kaydedilir (window.__net)
const WATCH = `(() => {
  window.__net = [];
  const seen = () => {
    const el = document.querySelector("[data-net-banner]");
    const t = el ? el.textContent.trim() : "";
    const last = window.__net.at(-1);
    if ((last?.t || "") !== t) window.__net.push({ t, at: Date.now() });
  };
  new MutationObserver(seen).observe(document, { subtree: true, childList: true, characterData: true });
})();`;

// Sunucudaki (emülatör) alışveriş maddeleri; Bearer owner kuralları atlar
async function serverItems(owner) {
  const r = await fetch(`http://${FS_HOST}/v1/projects/${PROJECT}/databases/(default)/documents/orgs/${owner}/shop?pageSize=100`, { headers: { Authorization: "Bearer owner" } });
  const j = await r.json().catch(() => ({}));
  return (j.documents || []).map((d) => d.fields?.text?.stringValue || "");
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

  let ids;
  try {
    ids = await seed({
      users: [{ key: "owner", email: OWNER, password: PASS, name: "Test Sahip", doc: { name: "Test Sahip", email: OWNER, role: "owner", orgId: "{owner}", onboarded: true, introV: 99, tourDone: true, createdAt: now } }],
      docs: [],
    });
  } catch (e) {
    push("Hazırlık", "sahte hesap", "yazılır", false, e.message);
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

  let slowWrites = 0; // >0: sunucu yazma onayı bu kadar ms gecikir (zayıf ama var olan bağlantı)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR", timezoneId: "Europe/Istanbul", serviceWorkers: "block" });
  await ctx.addInitScript(INIT({ sha }));
  await ctx.addInitScript(WATCH);
  await ctx.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return route.abort();
    if (slowWrites && /Firestore\/Write\/channel/.test(u.pathname) && route.request().method() === "POST") await sleep(slowWrites);
    if (u.pathname.startsWith("/api/") && u.pathname !== "/api/version") return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.continue();
  });

  const open = async (path) => {
    const page = await ctx.newPage();
    await page.goto(`${server.url}${path}`, { waitUntil: "load", timeout: 120000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    return page;
  };
  const texts = (page) => page.evaluate(() => window.__net.map((x) => x.t).filter(Boolean));
  const input = (page) => page.locator("form input").first();
  const addItem = async (page, text) => {
    await input(page).fill(text);
    await input(page).press("Enter");
  };
  const shown = (page, text) => page.locator("li", { hasText: text }).count().then((n) => n > 0);
  const until = async (fn, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await fn().catch(() => false)) return true;
      await sleep(250);
    }
    return false;
  };

  try {
    // Giriş
    const page = await open("/login");
    const inputs = page.locator("input");
    await inputs.first().waitFor({ timeout: 30000 });
    await inputs.nth(0).fill(OWNER);
    await inputs.nth(1).fill(PASS);
    await inputs.nth(1).press("Enter");
    await page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 60000 });

    // 1) İnternet varken: boşta, uygulamaya dönüşte ve kayıtta şerit çıkmaz
    let G = "İnternet varken";
    await page.goto(`${server.url}/shopping`, { waitUntil: "load" });
    await input(page).waitFor({ timeout: 30000 });
    await page.evaluate(() => (window.__net = []));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await addItem(page, "Süt");
    await check(G, "kayıt sunucuya gider", "Süt sunucuda", () => until(async () => (await serverItems(ids.owner)).includes("Süt"), 10000));
    await sleep(15000);
    await check(G, "15 sn boyunca üstte şerit", "hiç çıkmaz", async () => {
      const t = await texts(page);
      return [t.length === 0, t.join(" | ") || "yok"];
    });

    // 2) Bağlantı yavaş (onay 5 sn gecikiyor) ama var: "Bağlantı zayıf" çıkmaz
    G = "Yavaş bağlantı";
    slowWrites = 5000;
    await page.evaluate(() => (window.__net = []));
    await addItem(page, "Ekmek");
    await check(G, "kayıt ekranda hemen", "Ekmek listede", () => until(() => shown(page, "Ekmek"), 3000));
    await check(G, "kayıt gecikmeli de olsa gider", "Ekmek sunucuda", () => until(async () => (await serverItems(ids.owner)).includes("Ekmek"), 20000));
    await sleep(2000);
    await check(G, "üstte şerit", "çıkmaz", async () => {
      const t = await texts(page);
      return [t.length === 0, t.join(" | ") || "yok"];
    });
    slowWrites = 0;

    // 3) İnternet yok: kayıt takılmadan telefona yazılır, sakin şerit, sunucuya gitmez
    G = "İnternet yok";
    await page.evaluate(() => (window.__net = []));
    await ctx.setOffline(true);
    await check(G, "şerit (kısa kopma sayılmaz)", "2,5 sn sonra 'İnternet yok'", async () => {
      await sleep(1000);
      const early = await texts(page);
      const ok = await until(async () => (await texts(page)).some((t) => t.startsWith("İnternet yok")), 6000);
      return [early.length === 0 && ok, `1. sn: ${early.join(" | ") || "yok"} · sonra: ${(await texts(page)).join(" | ")}`];
    });
    await addItem(page, "Yumurta");
    await addItem(page, "Peynir");
    await check(G, "kayıtlar ekranda hemen", "Yumurta ve Peynir listede", () => until(async () => (await shown(page, "Yumurta")) && (await shown(page, "Peynir")), 4000));
    await check(G, "kutu yeniden yazılabilir (takılmadı)", "giriş boş ve açık", async () => {
      const v = await input(page).inputValue();
      return [v === "" && (await input(page).isEditable()), `"${v}"`];
    });
    await check(G, "şerit bekleyen kaydı söyler", "telefonda, bağlantı gelince gönderilecek", () =>
      until(async () => (await texts(page)).some((t) => /telefonda, bağlantı gelince gönderilecek/.test(t)), 4000),
    );
    await check(G, "sunucuda", "henüz yok", async () => {
      const s = await serverItems(ids.owner);
      return [!s.includes("Yumurta") && !s.includes("Peynir"), s.join(", ")];
    });

    // 4) Uygulama kapanır, internet gelir, yeniden açılınca kayıtlar kendiliğinden gider
    G = "Bağlantı gelince";
    await page.close();
    await ctx.setOffline(false);
    const again = await open("/shopping");
    await check(G, "kapatılıp açılınca kayıtlar sunucuya gider", "Yumurta ve Peynir sunucuda", () =>
      until(async () => {
        const s = await serverItems(ids.owner);
        return s.includes("Yumurta") && s.includes("Peynir");
      }, 30000),
    );
    await check(G, "aynı kayıt iki kez", "yazılmaz", async () => {
      const s = await serverItems(ids.owner);
      return [s.filter((x) => x === "Yumurta").length === 1 && s.filter((x) => x === "Peynir").length === 1, s.join(", ")];
    });

    // 5) Uygulama açıkken kopup gelince: şerit "gönderildi" der ve kapanır
    G = "Açıkken kopup gelince";
    await input(again).waitFor({ timeout: 30000 });
    await again.evaluate(() => (window.__net = []));
    await ctx.setOffline(true);
    await sleep(3500);
    await addItem(again, "Zeytin");
    await sleep(1000);
    await ctx.setOffline(false);
    await check(G, "kayıt gider", "Zeytin sunucuda", () => until(async () => (await serverItems(ids.owner)).includes("Zeytin"), 30000));
    await check(G, "şerit", "'gönderildi' der, sonra kapanır", async () => {
      const ok = await until(async () => {
        const log = await again.evaluate(() => window.__net);
        return log.some((x) => /gönderildi$/.test(x.t)) && !log.at(-1).t;
      }, 10000);
      return [ok, (await again.evaluate(() => window.__net.map((x) => x.t || "(kapalı)"))).join(" → ")];
    });
  } catch (e) {
    push("Akış", "senaryo", "biter", false, String(e.message).split("\n")[0].slice(0, 300));
  } finally {
    await browser.close().catch(() => {});
  }
  log(`    Çevrimdışı: ${rows.filter((r) => r.ok).length}/${rows.length} geçti`);
  return rows;
}
