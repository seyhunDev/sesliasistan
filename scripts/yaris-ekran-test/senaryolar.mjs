// Yarış sayfası ekran testi: uygulama bu bilgisayarda açılır, sahte Firebase'e (emülatör) girilir, yarış sayfası SPORCU SEÇİLİ olarak
// açılır (Seyhun 2026-10-26: #837'den sonra sporcu seçili yarış "Cannot access before initialization" ile açılmıyordu; sporcusuz
// denemede görünmemişti). Sınananlar: yarış günü görünümü (Multimedya, hava, eksik bölüm satırı), yarıştan önceki görünüm, sekmeler
// ve Multimedya sayfası çökmeden açılır, sporcu listede görünür. Kulüp verisi de emülatörden (dikili.js); gerçek veriye dokunulmaz.
// Hava tahmini sahte (open-meteo isteği karşılanır), yapay zekaya istek gitmez.
import { existsSync } from "node:fs";
import { INIT } from "../asistan-ekran-test/taklitler.mjs";
import { seed, FS_HOST, AUTH_HOST } from "../asistan-ekran-test/emulator.mjs";

const K = "yarış ekranı";
const OWNER = "sahip@ornek.local";
const PASS = "test-sifre-123";
const CLUB = "dikili-c7cc8"; // kulüp projesinin adı (dikili.js); emülatörde ayrı proje
const now = new Date();
const ymd = (d) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const TODAY = ymd(now);
const plus = (n) => ymd(new Date(now.getTime() + n * 864e5));

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

// Kulübün sporcusu emülatördeki kulüp projesine (Bearer owner kuralları atlar)
async function putAthlete(id, f) {
  const fields = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, { stringValue: v }]));
  const r = await fetch(`http://${FS_HOST}/v1/projects/${CLUB}/databases/(default)/documents/athletes?documentId=${id}`, { method: "POST", headers: { Authorization: "Bearer owner", "content-type": "application/json" }, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(`sporcu yazılamadı: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

// Kulüp projesinin kuralları emülatörde: girişli hesap okur (gerçek kulüp kuralları yöneticiyi ister; burada yalnız sahte veri var)
async function openClubRules() {
  const content = "rules_version = '2'; service cloud.firestore { match /databases/{d}/documents { match /{doc=**} { allow read, write: if request.auth != null; } } }";
  const r = await fetch(`http://${FS_HOST}/emulator/v1/projects/${CLUB}:securityRules`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ rules: { files: [{ content }] } }) });
  if (!r.ok) throw new Error(`kulüp kuralları yazılamadı: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

// Kulüp hesabı emülatördeki kulüp projesinde (Sporcu sekmesindeki "Kulüp hesabına bağlan" ile girilir)
async function putClubUser(email, password) {
  const r = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${CLUB}/accounts`, { method: "POST", headers: { Authorization: "Bearer owner", "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!r.ok) throw new Error(`kulüp hesabı yazılamadı: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

// Sahte saatlik tahmin (bütün günler aynı)
const H = Array.from({ length: 16 * 24 }, (_, i) => `${plus(Math.floor(i / 24))}T${String(i % 24).padStart(2, "0")}:00`);
const WX = { hourly: { time: H, temperature_2m: H.map(() => 18), weather_code: H.map(() => 2), is_day: H.map(() => 1), wind_speed_10m: H.map(() => 9), wind_direction_10m: H.map(() => 20), wind_gusts_10m: H.map(() => 14), precipitation_probability: H.map(() => 0) } };

export async function run(server, log = () => {}) {
  const rows = [];
  const push = (grup, say, expect, ok, got) => rows.push({ katman: K, grup, say, expect, ok: !!ok, got: String(got ?? "") });

  try {
    await seed({
      users: [{ key: "owner", email: OWNER, password: PASS, name: "Test Sahip", doc: { name: "Test Sahip", email: OWNER, role: "owner", orgId: "{owner}", onboarded: true, introV: 99, tourDone: true, createdAt: now.toISOString() } }],
      docs: [
        { path: "orgs/{owner}/races/r1", data: { name: "Ege Kupası", city: "İzmir", district: "Dikili", startDate: TODAY, endDate: plus(2), spot: { name: "Dikili", lat: 39.07, lon: 26.89 }, athleteIds: ["a1"], createdAt: now.toISOString() } },
        { path: "orgs/{owner}/races/r2", data: { name: "Bahar Kupası", city: "İzmir", district: "Dikili", startDate: plus(5), endDate: plus(6), spot: { name: "Dikili", lat: 39.07, lon: 26.89 }, athleteIds: ["a1"], createdAt: now.toISOString() } },
      ],
    });
    await openClubRules();
    await putClubUser(OWNER, PASS);
    await putAthlete("a1", { studentName: "Deniz Yılmaz", status: "aktif", createdAt: now.toISOString() });
  } catch (e) {
    push("Hazırlık", "sahte hesap, yarış ve sporcu", "yazılır", false, e.message);
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR", timezoneId: "Europe/Istanbul", serviceWorkers: "block" });
  await ctx.addInitScript(INIT({ sha }));
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "api.open-meteo.com") return route.fulfill({ status: 200, headers: { "content-type": "application/json", "access-control-allow-origin": "*" }, body: JSON.stringify(WX) });
    if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return route.abort();
    if (u.pathname.startsWith("/api/") && u.pathname !== "/api/version") return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.continue();
  });

  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message || e).split("\n")[0].slice(0, 200)));
  const body = () => page.locator("body").innerText().catch(() => "");
  const crashed = async () => {
    const t = await body();
    return /açılamadı|Application error|before initialization/i.test(t) || errs.length > 0;
  };
  const open = async (path, wait) => {
    errs.length = 0;
    await page.goto(`${server.url}${path}`, { waitUntil: "load", timeout: 120000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    await page.getByText(wait).first().waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
  };
  const okPage = async (grup, say, path, wait, extra = async () => [true, ""]) => {
    try {
      await open(path, wait);
      const bad = await crashed();
      const seen = await page.getByText(wait).first().isVisible().catch(() => false);
      const [ok2, got2] = await extra();
      push(grup, say, `çökmeden açılır, "${wait}" görünür`, !bad && seen && ok2, bad ? `çöktü: ${errs[0] || (await body()).slice(0, 160)}` : !seen ? `"${wait}" görünmedi` : got2 || "açıldı");
    } catch (e) {
      push(grup, say, "açılır", false, `hata: ${String(e.message).split("\n")[0].slice(0, 200)}`);
    }
  };

  try {
    await page.goto(`${server.url}/login`, { waitUntil: "load", timeout: 120000 });
    const u = page.locator("input[name=username]:not([readonly])");
    await u.waitFor({ timeout: 30000 });
    await u.fill(OWNER);
    await u.press("Enter");
    await page.locator("input[name=password]").fill(PASS);
    await page.locator("input[name=password]").press("Enter");
    await page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 60000 });

    // Kulüp hesabına bağlan (Sporcular sayfası); sporcular bundan sonra yarış sayfasına gelir
    await page.goto(`${server.url}/athletes/races/r1`, { waitUntil: "load", timeout: 120000 });
    await page.getByText("Yarış günü").first().waitFor({ timeout: 60000 });
    await page.locator("nav[aria-label=Bölümler] button", { hasText: "Sporcu" }).click();
    const form = page.locator("form", { has: page.locator("input[type=password]") }).first();
    await form.waitFor({ timeout: 30000 });
    await form.locator("input").first().fill(OWNER);
    await form.locator("input[type=password]").fill(PASS);
    await form.locator("button[type=submit]").click();
    await page.getByText("Bu hesabın sporcuları görme izni yok").waitFor({ state: "detached", timeout: 30000 }).catch(() => {});

    log("    Yarış günü (sporcu seçili)…");
    await okPage("Yarış sayfası", "yarış günü, sporcu seçili", "/athletes/races/r1", "Yarış günü", async () => {
      const wx = await page.locator("section[aria-label='Yarış havası']").count();
      const row = await page.getByText(/eksik|Hazırlık tamam|iş kaldı/).first().isVisible().catch(() => false);
      return [wx > 0 && row, `hava ${wx ? "var" : "yok"} · hazırlık satırı ${row ? "var" : "yok"}`];
    });
    await okPage("Yarış sayfası", "Sporcu sekmesinde sporcu", "/athletes/races/r1", "Yarış günü", async () => {
      await page.locator("nav[aria-label=Bölümler] button", { hasText: "Sporcu" }).click();
      await page.waitForTimeout(1500);
      const name = await page.getByText("Deniz Yılmaz").first().isVisible().catch(() => false);
      const bad = await crashed();
      return [name && !bad, name ? "sporcu görünüyor" : "sporcu görünmedi"];
    });
    log("    Yarıştan önce (sporcu seçili)…");
    await okPage("Yarış sayfası", "yarıştan önce, sporcu seçili", "/athletes/races/r2", "gün kaldı");
    // Bütün sekmeler sırayla açılır
    try {
      const tabs = await page.locator("nav[aria-label=Bölümler] button").allInnerTexts();
      const bad = [];
      for (let i = 0; i < tabs.length; i++) {
        await page.locator("nav[aria-label=Bölümler] button").nth(i).click();
        await page.waitForTimeout(700);
        if (await crashed()) bad.push(tabs[i].trim());
      }
      push("Yarış sayfası", "bütün sekmeler", "her sekme çökmeden açılır", tabs.length >= 4 && !bad.length, bad.length ? `çöken: ${bad.join(", ")} · ${errs[0] || ""}` : `${tabs.length} sekme açıldı`);
    } catch (e) {
      push("Yarış sayfası", "bütün sekmeler", "açılır", false, `hata: ${String(e.message).split("\n")[0].slice(0, 200)}`);
    }
    log("    Multimedya…");
    await okPage("Yarış sayfası", "Multimedya", "/athletes/races/r1/media", "Start sayacı");
  } finally {
    await browser.close();
  }
  return rows;
}
