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

// Yarış günü üstü günün evresine göre (RaceDayTop): yarışta "2. yarış · 12:30" / "Sonuçlar" / "Gün bitti" ("N. gün" yazısı yok, 2026-10-29)

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
        // sesle yazılmış rüzgâr (Saha ölçümlerinde görünmeli)
        // ve bugünün bir yarışı ile o yarışta çekilmiş bir fotoğraf (Start'ta yarışın satırında görünmeli)
        { path: "orgs/{owner}/raceLive/r1", data: { wind: [{ at: new Date(now.getTime() - 30 * 60e3).toISOString(), dir: 300, kn: 11, src: "elle" }], starts: [{ id: "s1", day: TODAY, n: 1, at: new Date(now.getTime() - 60 * 60e3).toISOString() }], media: [{ id: "m1", kind: "photo", url: "https://example.com/1.jpg", at: new Date(now.getTime() - 40 * 60e3).toISOString() }] } },
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
  let hang = false; // true: Firestore okuma bağlantısı asılı kalır (iPhone'da güncelleme/yenileme sonrası; Seyhun 2026-10-31)
  await ctx.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (hang && /Firestore\/Listen\/channel/.test(u.pathname)) {
      await new Promise((r) => setTimeout(r, 60000));
      return route.abort().catch(() => {});
    }
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
    // çökme ekranı (CrashScreen "Bu sayfa açılamadı"); bölge haritasının "Harita açılamadı" yazısı çökme değil (testte dış adresler kapalı)
    const t = await body();
    return /Bu sayfa açılamadı|Application error|before initialization/i.test(t) || errs.length > 0;
  };
  // yarış günü bölümü: tek ⋯ menüsü yarış sayfasını ?sec= ile açar (yarış günleri sayfa kendisi multimedyaya geçer, Seyhun 2026-10-30)
  const openSec = async (k) => {
    errs.length = 0;
    await page.goto(`${server.url}/athletes/races/r1?sec=${k}`, { waitUntil: "load", timeout: 120000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    await page.locator("[role=dialog]").first().waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
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
    await openSec("people");
    const form = page.locator("form", { has: page.locator("input[type=password]") }).first();
    await form.waitFor({ timeout: 30000 });
    await form.locator("input").first().fill(OWNER);
    await form.locator("input[type=password]").fill(PASS);
    await form.locator("button[type=submit]").click();
    await page.getByText("Bu hesabın sporcuları görme izni yok").waitFor({ state: "detached", timeout: 30000 }).catch(() => {});

    log("    Yarış günü (sporcu seçili)…");
    // yarış günü yarış sayfası multimedyaya geçer; alt çubukta Yarış yok (Saha · Start · Sonuç), yarış sürerken Start açılır
    await okPage("Yarış sayfası", "yarış günü, sporcu seçili", "/athletes/races/r1", "Start sayacı", async () => {
      const went = await page.waitForURL((u) => u.pathname === "/athletes/races/r1/media", { timeout: 60000 }).then(() => true, () => false);
      const bar = page.locator("nav[aria-label='Multimedya sekmeleri']");
      const tabs = (await bar.locator("button").allInnerTexts()).map((x) => x.trim()).filter(Boolean).join(",");
      const on = (await bar.locator("button[aria-pressed=true]").allInnerTexts()).join().trim();
      const mb = await bar.getByRole("button", { name: "Sonuç" }).first().boundingBox();
      const fit = !!mb && mb.y + mb.height <= (page.viewportSize()?.height || 844);
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO }).catch(() => {});
      await openSec("prep");
      const row = await page.getByText("Yapılacaklar").first().isVisible().catch(() => false);
      return [went && tabs === "Saha,Start,Sonuç" && on === "Start" && fit && row, `multimedyaya ${went ? "geçti" : "geçmedi"} · sekmeler ${tabs} · açık ${on} · alt çubuk ${fit ? "ekranda" : "ekran dışında"} · hazırlık ${row ? "açıldı" : "açılmadı"}`];
    });
    await okPage("Yarış sayfası", "Sporcu sekmesinde sporcu", "/athletes/races/r1?sec=people", "Sporcu", async () => {
      await openSec("people");
      await page.waitForTimeout(1500);
      const name = await page.getByText("Deniz Yılmaz").first().isVisible().catch(() => false);
      const bad = await crashed();
      return [name && !bad, name ? "sporcu görünüyor" : "sporcu görünmedi"];
    });
    // yarış günü ⋯ içindeki bölümler sırayla açılır
    try {
      const keys = ["prep", "people", "docs", "trip", "budget"], bad = [];
      for (const k of keys) {
        await openSec(k);
        if (await crashed()) bad.push(k);
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(500);
      }
      push("Yarış sayfası", "yarış günü ⋯ bölümleri", "her bölüm çökmeden açılır", !bad.length, bad.length ? `çöken: ${bad.join(", ")} · ${errs[0] || ""}` : `${keys.length} bölüm açıldı`);
    } catch (e) {
      push("Yarış sayfası", "yarış günü ⋯ bölümleri", "açılır", false, `hata: ${String(e.message).split("\n")[0].slice(0, 200)}`);
    }
    log("    Yarıştan önce (sporcu seçili)…");
    // yarıştan önce yarışın alt çubuğu yok, uygulamanın çubuğu (asistan küresi) görünür (Seyhun 2026-10-30, yaris-yapi)
    await okPage("Yarış sayfası", "yarıştan önce, sporcu seçili", "/athletes/races/r2", "gün kaldı", async () => {
      const dock = await page.locator("nav[aria-label='Multimedya sekmeleri']").count();
      const orb = await page.locator("[data-orb]:visible").count();
      return [dock === 0 && orb > 0, `yarış çubuğu ${dock ? "var" : "yok"} · uygulama çubuğu ${orb ? "var" : "yok"}`];
    });
    // Hava grafiği kaydırılınca gün değişir (Seyhun 2026-10-31): sağa çek geri (yarıştan önceki günler de), sola çek ileri
    await okPage("Yarış sayfası", "havayı kaydırarak gün", "/athletes/races/r2", "gün kaldı", async () => {
      const cur = () => page.locator("section[aria-label='Yarış havası'] button[data-cur]").getAttribute("data-cur").catch(() => "");
      const pull = (dx) =>
        page.evaluate((dx) => {
          const el = document.querySelector("[data-swipe-day]");
          if (!el) return;
          const r = el.getBoundingClientRect();
          const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: r.top + 40 });
          const x0 = r.left + r.width / 2;
          el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [t(x0)], changedTouches: [t(x0)] }));
          el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [t(x0 + dx)] }));
        }, dx);
      const a = await cur();
      await pull(120);
      await page.waitForTimeout(300);
      const b = await cur();
      await pull(-120);
      await page.waitForTimeout(300);
      const c = await cur();
      return [!!a && b && b < a && c === a, `${a} → sağa ${b} → sola ${c}`];
    });
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
    // Saha (Seyhun 2026-10-30): Parkur + yarışın havası (kendi gün düğmesi yok, üstteki Bugün ▾) + sesle yazılan rüzgâr ölçümlerde
    await okPage("Yarış sayfası", "Saha", "/athletes/races/r1/media?tab=course", "Ölçümler", async () => {
      const wx = await page.locator("section[aria-label='Yarış havası']").count();
      const ownDay = await page.locator("section[aria-label='Yarış havası'] button[data-cur]").count();
      const voice = await page.locator("section[aria-label='Ölçümler']").getByText("300° · 11 kn").count();
      const tab = await page.locator("nav[aria-label='Multimedya sekmeleri']").getByRole("button", { name: "Saha" }).count();
      return [wx === 1 && ownDay === 0 && voice === 1 && tab === 1, `hava ${wx} · havanın gün düğmesi ${ownDay} · sesli rüzgâr ${voice} · Saha sekmesi ${tab}`];
    });
    // Start = Süre + Medya (Seyhun 2026-10-30): alt çubukta Yarış · Saha · Start · Sonuçlar, Kayıt alt çubukta değil Başlat'ın yanında,
    // yarışın çekimi kendi satırında (ayrı galeri bölümü yok)
    await okPage("Yarış sayfası", "Start", "/athletes/races/r1/media", "Start sayacı", async () => {
      const bar = page.locator("nav[aria-label='Multimedya sekmeleri']");
      const tabs = (await bar.locator("button").allInnerTexts()).map((x) => x.trim()).filter(Boolean).join(",");
      const dockRec = await bar.getByLabel("Kayıt").count();
      const rec = await page.locator("[data-bar]").getByLabel("Kayıt").count();
      const go = await page.locator("[data-bar]").getByRole("button", { name: "Başlat" }).count();
      const row = page.locator("main li", { hasText: "1. yarış" }).first();
      const thumb = await row.locator(".grid button").count();
      const loose = await page.locator("main section", { hasText: "1. yarış" }).count();
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO.replace(/\.png$/, "-start.png") }).catch(() => {});
      const ok = tabs === "Saha,Start,Sonuç" && dockRec === 0 && rec === 1 && go === 1 && thumb === 1 && loose === 0;
      return [ok, `sekmeler ${tabs} · alt çubukta Kayıt ${dockRec} · Başlat yanında Kayıt ${rec} · Başlat ${go} · satırda çekim ${thumb} · ayrı bölüm ${loose}`];
    });
    // Tek ⋯ (Seyhun 2026-10-30): multimedyanın ⋯ menüsünde yarışın bölümleri de var; Sporcu yarış sayfasında açılır.
    // Yarış sayfasının ⋯ menüsündeki Denemeleri sıfırla multimedyada pencereyi açar; Süre'de ayrı düğme yok
    await okPage("Yarış sayfası", "tek ⋯ menüsü", "/athletes/races/r1/media", "Start sayacı", async () => {
      const inTab = await page.locator("main button:visible", { hasText: /^Denemeleri sıfırla$/ }).count();
      await page.getByRole("button", { name: "Yarış ayarları" }).click();
      const keys = await page.locator("[role=dialog] [data-menu]").evaluateAll((l) => l.map((x) => x.dataset.menu).join());
      await page.locator("[data-menu=people]").click();
      const went = await page.waitForURL((u) => u.pathname === "/athletes/races/r1", { timeout: 60000 }).then(() => true, () => false);
      const people = await page.getByRole("dialog", { name: "Sporcu" }).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Yarış ayarları" }).click();
      await page.locator("[data-menu=reset]").click();
      const reset = await page.getByRole("dialog", { name: "Denemeleri sıfırla" }).waitFor({ timeout: 60000 }).then(() => true, () => false);
      await page.keyboard.press("Escape").catch(() => {});
      const ok = inTab === 0 && keys === "prep,people,docs,trip,budget,shot,day,reset,edit,del" && went && people && reset;
      return [ok, `Süre'de sıfırla ${inTab} · menü ${keys} · Sporcu ${went ? "yarış sayfasında" : "gitmedi"}${people ? " açıldı" : " açılmadı"} · sıfırla ${reset ? "açıldı" : "açılmadı"}`];
    });
    // ⋯'den açılan bölüm kapanınca multimedyaya dönülür (yarış günü yarış sayfası yalnız bölümler için)
    await okPage("Yarış sayfası", "bölüm kapanınca multimedya", "/athletes/races/r1?sec=docs", "Evrak", async () => {
      await page.keyboard.press("Escape").catch(() => {});
      const back = await page.waitForURL((u) => u.pathname === "/athletes/races/r1/media", { timeout: 60000 }).then(() => true, () => false);
      return [back, back ? "multimedyaya döndü" : "dönmedi"];
    });
    // Sonuç (Seyhun 2026-10-30): üstte Özeti paylaş (Gün özeti penceresi), altında bizimkiler; ⋯ içinde Gün özeti yok
    await okPage("Yarış sayfası", "Sonuç", "/athletes/races/r1/media?tab=res", "Özeti paylaş", async () => {
      await page.getByRole("button", { name: "Özeti paylaş" }).click();
      const sheet = await page.getByRole("dialog").first().waitFor({ timeout: 20000 }).then(() => true, () => false);
      await page.keyboard.press("Escape").catch(() => {});
      const ours = await page.getByText("Deniz Yılmaz").first().isVisible().catch(() => false);
      return [sheet && ours, `özet ${sheet ? "açıldı" : "açılmadı"} · bizimkiler ${ours ? "görünüyor" : "görünmüyor"}`];
    });
    // Sunucu bağlantısı asılı (güncelleme sonrası yenileme): yarış telefondaki kopyayla açılır, "Yarış yükleniyor"da kalmaz
    hang = true;
    for (const [say, path, wait] of [
      ["asılı bağlantıda multimedya", "/athletes/races/r1/media", "Start sayacı"],
      ["asılı bağlantıda yarıştan önceki sayfa", "/athletes/races/r2", "gün kaldı"],
    ]) {
      try {
        errs.length = 0;
        const t0 = Date.now();
        await page.goto(`${server.url}${path}`, { waitUntil: "load", timeout: 120000 });
        const seen = await page.getByText(wait).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
        const ms = Date.now() - t0;
        push("Asılı bağlantı", say, `"${wait}" 5 sn içinde görünür (yükleniyor'da kalmaz)`, seen && !(await crashed()), seen ? `${ms} ms` : `görünmedi: ${(await body()).slice(0, 120)}`);
      } catch (e) {
        push("Asılı bağlantı", say, "açılır", false, `hata: ${String(e.message).split("\n")[0].slice(0, 200)}`);
      }
    }
    hang = false;
  } finally {
    await browser.close();
  }
  return rows;
}
