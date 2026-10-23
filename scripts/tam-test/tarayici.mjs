// Katman 3b: uygulama gerçekten açılıyor mu? (yerelde çalışan uygulama + tarayıcı, sahte Firebase ile)
// Giriş yapılamadığı için (gerçek hesaba ve gerçek veriye dokunulmaz) sayfaların çökmeden açıldığı, girişsiz kişinin
// giriş ekranına yönlendirildiği, giriş ekranının hata mesajı verdiği ve sunucu uçlarının çökmediği (500 vermediği) denetlenir.
import { existsSync } from "node:fs";

// Ana sayfalar (her sayfa ilk açılışta derlenir; liste uzadıkça test uzar)
const PAGES = [
  "/", "/mail", "/payments", "/athletes", "/athletes/attendance", "/athletes/races", "/athletes/races/new", "/dues", "/posts", "/posts/new",
  "/plans", "/notes", "/tasks", "/messages", "/receipts", "/inventory", "/training", "/fitness", "/settings",
  // Sonradan eklenen sayfalar (yarış multimedya, antrenman günü, takvim, kişi sayfası…); kayıt sayfaları uydurma kimlikle
  "/archive", "/athletes/x1", "/athletes/attendance/report", "/athletes/races/x1", "/athletes/races/x1/media", "/birthdays", "/calendar", "/english",
  "/debts", "/events", "/events/x1", "/inventory/x1", "/invoices", "/mail/setup", "/my-attendance", "/people/staff", "/people/p/x1",
  "/posts/x1", "/receipts/x1", "/schedule", "/settings/voice-test", "/settings/tests", "/shopping", "/staff", "/training/day", "/wind", "/sea",
];
// Sunucu uçları: girişsiz istek reddedilmeli (401/403), çökmemeli (500)
const APIS = ["assistant", "word", "tasks", "attendance", "race", "post-caption", "training-log", "fitness", "inventory", "invoice", "person", "event-plan", "schedule", "interpret", "transcribe", "notify", "staff", "receipt-no"];

// Tarayıcı: önce bu bilgisayardaki Google Chrome, yoksa Playwright'ın kendi Chromium'u (bulutta /opt/pw-browsers)
async function launch() {
  const { chromium } = await import("playwright-core");
  const tries = [];
  if (process.env.TAM_TEST_CHROME) tries.push({ executablePath: process.env.TAM_TEST_CHROME });
  tries.push({ channel: "chrome" });
  for (const p of ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"]) if (existsSync(p)) tries.push({ executablePath: p });
  tries.push({}); // npx playwright install chromium ile indirildiyse
  tries.push({ channel: "msedge" });
  let last;
  for (const t of tries) {
    try {
      return await chromium.launch({ headless: true, ...t });
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`Tarayıcı bulunamadı (Google Chrome kurulu olmalı). ${String(last?.message || "").split("\n")[0]}`);
}

// Sahte Firebase'in ağ hataları beklenen şeydir (gerçek projeye bağlanılmıyor); bunlar sayılmaz
const NOISE = /WebSocket|firebase|firestore|identitytoolkit|securetoken|googleapis|api[- ]key|ERR_|Failed to load resource|net::|WebChannel|installations|messaging|Download the React DevTools|\[HMR\]|\[Fast Refresh\]|service ?worker|sw\.js/i;

export async function run(server, log = () => {}) {
  const rows = [];
  const push = (grup, say, expect, ok, got) => rows.push({ katman: "tarayıcı", grup, say, expect, ok, got });

  // Sunucu uçları (tarayıcısız)
  for (const a of APIS) {
    try {
      const r = await fetch(`${server.url}/api/${a}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: AbortSignal.timeout(90000) });
      const txt = await r.text();
      const json = (() => { try { JSON.parse(txt); return true; } catch { return false; } })();
      const ok = r.status < 500 && json;
      push("Sunucu ucu: girişsiz istek reddedilir", `/api/${a}`, "401/403, düzgün JSON (çökme yok)", ok, `${r.status}${json ? "" : " · JSON değil"} ${txt.slice(0, 80)}`);
    } catch (e) {
      push("Sunucu ucu: girişsiz istek reddedilir", `/api/${a}`, "401/403, düzgün JSON (çökme yok)", false, `istek başarısız: ${e.message}`);
    }
  }

  let browser;
  try {
    browser = await launch();
  } catch (e) {
    push("Tarayıcı", "Chrome açılıyor", "tarayıcı açılır", null, `ATLANDI: ${e.message}`);
    return rows;
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR", serviceWorkers: "block" });
  try {
    // Sayfalar: girişsizken çökmeden giriş ekranına gitmeli
    for (const p of PAGES) {
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(String(e.message || e).split("\n")[0]));
      page.on("console", (m) => m.type() === "error" && !NOISE.test(m.text()) && errs.push(m.text().split("\n")[0].slice(0, 160)));
      let status = 0;
      try {
        const res = await page.goto(server.url + p, { waitUntil: "load", timeout: 120000 });
        status = res?.status() || 0;
        await page.waitForURL(/\/login/, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(800);
        const at = new URL(page.url()).pathname;
        const body = await page.locator("body").innerText().catch(() => "");
        const crash = /Application error|Unhandled Runtime Error|Build Error|Internal Server Error/i.test(body);
        const ok = status < 500 && !errs.length && !crash && at === "/login";
        push("Sayfa açılıyor (girişsiz → giriş ekranı)", p, "çökmez, giriş ekranına yönlendirir", ok, [`${status}`, `→ ${at}`, crash ? "hata ekranı" : "", ...errs.slice(0, 2)].filter(Boolean).join(" · "));
      } catch (e) {
        push("Sayfa açılıyor (girişsiz → giriş ekranı)", p, "çökmez, giriş ekranına yönlendirir", false, `${status || "-"} · ${String(e.message).split("\n")[0]}`);
      }
      await page.close();
    }
    // Giriş ekranı: alanlar var, yanlış girişte Türkçe hata gösterir, takılmaz
    {
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(String(e.message || e).split("\n")[0]));
      try {
        await page.goto(`${server.url}/login`, { waitUntil: "load", timeout: 120000 });
        // İki adımlı giriş: önce e-posta / kullanıcı adı (doğru yazılınca Devam), sonra şifre
        const id = page.locator("input[name=username]:not([readonly])");
        await id.waitFor({ timeout: 20000 });
        await id.fill("yanlis.kullanici");
        await id.press("Enter");
        const pw = page.locator("input[name=password]");
        const hasPw = await pw.waitFor({ timeout: 10000 }).then(() => true, () => false);
        push("Giriş ekranı", "alanlar", "kullanıcı adı, Devam, şifre alanı", hasPw, hasPw ? "2 adım" : "şifre adımı açılmadı");
        await pw.fill("yanlis-sifre-123");
        await pw.press("Enter");
        const t0 = Date.now();
        let msg = "";
        while (Date.now() - t0 < 20000 && !msg) {
          await page.waitForTimeout(500);
          const body = await page.locator("body").innerText().catch(() => "");
          msg = (/(hatalı|yanlış|bulunamadı|giriş yapılamadı|geçersiz|hata|bağlan)[^\n]{0,80}/i.exec(body) || [])[0] || "";
        }
        push("Giriş ekranı", "yanlış kullanıcı adı ve şifre", "Türkçe hata mesajı, takılmaz (20 sn içinde)", !!msg && !errs.length, msg ? `“${msg.trim()}”${errs.length ? ` · ${errs[0]}` : ""}` : `mesaj yok${errs.length ? ` · ${errs[0]}` : ""}`);
      } catch (e) {
        push("Giriş ekranı", "açılış", "giriş ekranı açılır", false, String(e.message).split("\n")[0]);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return rows;
}
