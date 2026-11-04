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
const ymd = (d) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
// Yarış günü sayfası evreye göre açılır (gün bitince Sonuç): akşam ya da sabah erken çalışınca test tarayıcısının saati bugün 13:00'e alınır,
// yoksa Start sekmesi açılmaz ve testler saate göre düşer
const real = new Date();
const hour = +real.toLocaleString("en-US", { timeZone: "Europe/Istanbul", hour: "numeric", hourCycle: "h23" });
const SHIFT = hour < 9 || hour >= 16;
const now = SHIFT ? new Date(`${ymd(real)}T13:00:00+03:00`) : real;
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
        // Antrenmanın Medya'sında yalnız telefonda duran büyük video (Seyhun 2026-11-02): adresi yok, ph
        { path: "orgs/{owner}/raceLive/ant-t1", data: { media: [{ id: "ph1", kind: "video", url: "", ph: true, dur: 95, at: new Date(now.getTime() - 20 * 60e3).toISOString() }] } },
        { path: "orgs/{owner}/raceLive/r1", data: { wind: [{ at: new Date(now.getTime() - 30 * 60e3).toISOString(), dir: 300, kn: 11, src: "elle" }], starts: [{ id: "s1", day: TODAY, n: 1, cd: new Date(now.getTime() - 65 * 60e3).toISOString(), at: new Date(now.getTime() - 60 * 60e3).toISOString(), fin: new Date(now.getTime() - 45 * 60e3).toISOString() }, { id: "s2", day: TODAY, n: 2, cd: new Date(now.getTime() - 7 * 60e3).toISOString(), at: new Date(now.getTime() - 2 * 60e3).toISOString() }], media: [{ id: "m1", kind: "photo", url: "https://example.com/1.jpg", at: new Date(now.getTime() - 40 * 60e3).toISOString() }] } },
        // bugünün antrenmanı: iki biten yarış, üçüncüsü 1 dk önce start oldu (yeni akış: Bitiren kim?), günlük yazılmış
        { path: "orgs/{owner}/plans/t1", data: { ownerId: "{owner}", createdByUid: "{owner}", assignees: [], people: ["{owner}"], createdAt: now.toISOString(), createdBy: { name: "Test Sahip" }, src: "manual", cat: "Antrenman", title: "Optimist antrenmanı", date: TODAY, endDate: "", time: "00:05", allDay: false, durationMin: 120, tz: "Europe/Istanbul", timeSource: "user", place: "Yat limanı", status: "planned", races: [{ id: "y1", name: "Yarış 1", startAt: now.getTime() - 90 * 60e3, fin: 1000, cd: 300, finishes: [{ id: "a1", name: "Deniz Yılmaz" }] }, { id: "y2", name: "Yarış 2", startAt: now.getTime() - 40 * 60e3, fin: 845, cd: 240, marks: { Start: 0, "Şamandıra 1": 252 }, finishes: [] }, { id: "y3", name: "Yarış 3", startAt: now.getTime() - 60e3, cd: 300, finishes: [] }], log: { wind: "12", dir: "Poyraz", topics: ["Start", "Şamandıra"], min: 120, rating: 3 } } },
        // Yayın: grupları ayrı (Seyhun 2026-11-02): Sarı yarışta, Mavi sırada; ▶ ile Sarı ekranda, Sarı Kamera 1'e bağlı
        { path: "orgs/{owner}/raceLive/r2", data: { plan: { day: TODAY, sets: [{ cls: "Optimist", grps: ["Sarı", "Mavi"] }], order: [{ cls: "Optimist", grp: "Mavi", prep: "P" }] }, starts: [{ id: "g1", day: TODAY, n: 1, cd: new Date(now.getTime() - 10 * 60e3).toISOString(), at: new Date(now.getTime() - 5 * 60e3).toISOString(), grp: "Sarı" }], rounds: { g1: { route: [], legs: {}, cls: "Optimist", grp: "Sarı", prep: "P" } }, onAir: { sid: "g1" }, camBy: { "Optimist|Sarı": "c1" } } },
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
  if (SHIFT) await ctx.clock.setSystemTime(now);
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
    // Multimedya sayfası kalktı (Seyhun 2026-11-01, tek Yayın): yarış günü sayfa yerinde kalır, "Yayına git" Yayın sayfasına götürür,
    // yarışın alt çubuğu yok, uygulamanın çubuğu görünür
    await okPage("Yarış sayfası", "yarış günü, sporcu seçili", "/athletes/races/r1", "Yayına git", async () => {
      await page.waitForTimeout(1500);
      const stay = new URL(page.url()).pathname === "/athletes/races/r1";
      const go = await page.getByRole("link", { name: "Yayına git" }).first().getAttribute("href").catch(() => "");
      const dock = await page.locator("nav[aria-label='Multimedya sekmeleri']").count();
      const orb = await page.locator("[data-orb]:visible").count();
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO }).catch(() => {});
      await openSec("prep");
      const row = await page.getByText("Yapılacaklar").first().isVisible().catch(() => false);
      return [stay && go === "/athletes/races/r1/yayin" && dock === 0 && orb > 0 && row, `sayfa ${stay ? "yerinde" : "değişti"} · Yayına git ${go || "yok"} · yarış çubuğu ${dock ? "var" : "yok"} · uygulama çubuğu ${orb ? "var" : "yok"} · hazırlık ${row ? "açıldı" : "açılmadı"}`];
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
    // Yarış havasında gün ‹ Dün / Yarın › düğmeleriyle değişir, kaydırmayla değişmez (Seyhun 2026-11-04)
    await okPage("Yarış sayfası", "havada gün düğmeleri", "/athletes/races/r2", "gün kaldı", async () => {
      const nav = page.locator("section[aria-label='Yarış havası'] nav[aria-label='Gün']");
      if (!(await nav.count())) return [false, "gün satırı yok"];
      const cur = async () => ((await nav.locator("b").textContent().catch(() => "")) || "").trim();
      const a = await cur();
      const prev = nav.locator("button").first();
      const had = await prev.count();
      if (had && /^‹/.test((await prev.textContent()) || "")) await prev.click();
      await page.waitForTimeout(300);
      const b = await cur();
      return [!!a && had > 0 && b !== a, `${a} → geri ${b}`];
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
      const rowTxt = (await row.innerText().catch(() => "")).replace(/\s+/g, " ");
      const info = await page.getByText("Videolar nerede saklanır?").count();
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO.replace(/\.png$/, "-start.png") }).catch(() => {});
      const ok = tabs === "Saha,Start,Sonuç" && dockRec === 0 && rec === 1 && go === 1 && thumb === 1 && loose === 0 && /5 dk start/.test(rowTxt) && /15:00 sürdü/.test(rowTxt) && info === 0;
      return [ok, `sekmeler ${tabs} · alt çubukta Kayıt ${dockRec} · Başlat yanında Kayıt ${rec} · Başlat ${go} · satırda çekim ${thumb} · ayrı bölüm ${loose} · satır "${rowTxt.slice(0, 80)}" · bilgi kartı ${info}`];
    });
    // Yarış günü Bitiren kim? (Seyhun 2026-11-01): start olmuş yarışta bizim sporcuların kareleri; dokununca sıra start satırına yazılır,
    // hepsi dokununca yarış biter (satırda "1 Deniz"); sayaç tarayıcının saatine göre kurulur
    await okPage("Yarış sayfası", "bitiren kim", "/athletes/races/r1/media?tab=sure", "Start sayacı", async () => {
      await page.evaluate(() => localStorage.setItem("sa-sayac", JSON.stringify({ dur: 300, end: Date.now() - 2 * 60e3, left: null, mode: "start", rid: "s2", own: "/athletes/races/r1/media", where: "Ege Kupası", at: Date.now() })));
      await page.goto(page.url());
      const tile = page.locator("section[aria-label='Bitiren kim'] button[aria-pressed]", { hasText: "Deniz" });
      const shown = await tile.waitFor({ timeout: 60000 }).then(() => true, () => false);
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO.replace(/\.png$/, "-bitiren.png") }).catch(() => {});
      await tile.click().catch(() => {});
      const fin = await page.locator("main li").getByText(/1 Deniz/).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
      const gone = await page.locator("section[aria-label='Bitiren kim']").count();
      await page.evaluate(() => localStorage.removeItem("sa-sayac"));
      return [shown && fin && gone === 0, `kare ${shown ? "göründü" : "yok"} · satırda ${fin ? "1 Deniz" : "yok"} · kareler ${gone ? "duruyor" : "kalktı"}`];
    });
    // Süre seçimi (Seyhun 2026-11-01): sayacın altında 5 · 4 · 2 · 1 dk, üstte "5 dk ▾" ve start sırası şeridi yok; seçilen süre sayfa yenilense de kalır
    await okPage("Yarış sayfası", "süre seçimi", "/athletes/races/r1/media", "Start sayacı", async () => {
      const dk = page.locator("button[aria-pressed]", { hasText: /^\d+ dk$/ });
      const chips = (await dk.allInnerTexts()).map((x) => x.trim()).join(",");
      const top = await page.getByLabel("Süre seç").count();
      const strip = await page.locator("main").getByText("Hazırlık", { exact: true }).locator("visible=true").count();
      await dk.filter({ hasText: "2 dk" }).click();
      const now = await page.locator("main b", { hasText: "02:00" }).count();
      await page.goto(page.url());
      await page.getByText("Start sayacı").first().waitFor({ timeout: 60000 });
      await dk.first().waitFor({ timeout: 20000 }).catch(() => {});
      const kept = await dk.and(page.locator("[aria-pressed=true]")).innerText().catch(() => "");
      const big = await page.locator("main b", { hasText: "02:00" }).count();
      await dk.filter({ hasText: "5 dk" }).click();
      const ok = chips === "5 dk,4 dk,2 dk,1 dk" && top === 0 && strip === 0 && now === 1 && kept.trim() === "2 dk" && big === 1;
      return [ok, `seçenekler ${chips} · üstte seçim ${top} · şerit ${strip} · 2 dk seçince ${now ? "02:00" : "değişmedi"} · yenileyince ${kept.trim() || "-"}${big ? " 02:00" : ""}`];
    });
    // Antrenman yeni akış (Seyhun 2026-11-01; yeni tasarım 2026-11-02 açık zemin, tek kart): alt çubuk Antrenman · Medya, Video ana düğmenin yanında kartta,
    // Antrenman sekmesinde video/fotoğraf yok (yalnız Medya'da); yarışta "Bitiren kim?" kareleri,
    // herkes dokununca yarış biter ve biten son yarış açık görünür (sıra + süre, Düzelt · Paylaş)
    await okPage("Antrenman", "yeni akış: bitiren kim", "/training/day?id=t1", "Yoklama", async () => {
      await page.evaluate(() => localStorage.setItem("sa-sayac", JSON.stringify({ dur: 300, end: Date.now() - 60e3, left: null, mode: "start", rid: "y3", own: "/training/day?id=t1", where: "Optimist antrenmanı", at: Date.now() })));
      await page.goto(page.url());
      const tile = page.locator("section[aria-label='Bitiren kim'] button", { hasText: "Deniz" });
      await tile.waitFor({ timeout: 60000 }).catch(() => {});
      const dock = (await page.locator("nav[aria-label='Multimedya sekmeleri'] button").allInnerTexts()).map((x) => x.trim()).filter(Boolean).join(",");
      const vid = Math.min(1, await page.locator("main").getByLabel("Video").count());
      const ck = await page.locator("main .ck").count();
      const tiles = await page.locator("section[aria-label='Bitiren kim'] button[aria-pressed]").count();
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO.replace(/\.png$/, "-antrenman-yarista.png") }).catch(() => {});
      await tile.click().catch(() => {});
      const done = await page.getByText("Deniz Yılmaz").first().waitFor({ timeout: 20000 }).then(() => true, () => false);
      await page.waitForTimeout(800);
      const gone = await page.locator("section[aria-label='Bitiren kim']").count();
      const fix = await page.getByRole("button", { name: "Düzelt" }).count();
      const go = await page.locator("main").getByRole("button", { name: "Başlat" }).count();
      const media = await page.locator("main img, main video").count();
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO.replace(/\.png$/, "-antrenman-bitti.png") }).catch(() => {});
      const ok = dock === "Antrenman,Medya" && vid === 1 && ck === 0 && media === 0 && tiles === 1 && done && gone === 0 && fix === 1 && go === 1;
      return [ok, `alt çubuk ${dock} · Video ${vid} · lacivert ${ck} · çekim ${media} · kare ${tiles} · dokununca ${done ? "sonuç açıldı" : "açılmadı"} · kareler ${gone ? "duruyor" : "kalktı"} · Düzelt ${fix} · Başlat ${go}`];
    });
    // Büyük video yalnız telefonda (Seyhun 2026-11-02): Medya'da "Telefonda" yazar; başka cihazda açınca "yalnız çekildiği telefonda", Paylaş/İndir yok
    await okPage("Antrenman", "telefondaki video", "/training/day?id=t1&tab=media", "Telefonda", async () => {
      const tile = page.locator("main button", { hasText: "Telefonda" }).first();
      const seen = await tile.waitFor({ timeout: 30000 }).then(() => true, () => false);
      if (seen) await tile.click();
      const msg = await page.getByText("Bu video yalnız çekildiği telefonda").waitFor({ timeout: 10000 }).then(() => true, () => false);
      const acts = await page.getByRole("button", { name: /^(Paylaş|İndir|Buluta yükle)$/ }).count();
      if (process.env.YARIS_FOTO) await page.screenshot({ path: process.env.YARIS_FOTO.replace(/\.png$/, "-telefonda.png") }).catch(() => {});
      await page.keyboard.press("Escape");
      return [seen && msg && acts === 0, `kare ${seen ? "Telefonda" : "yok"} · açınca ${msg ? "telefonda yazısı" : "yazı yok"} · Paylaş/İndir/Yükle ${acts}`];
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
      const ok = inTab === 0 && keys === "prep,people,docs,trip,budget,canli,shot,day,reset,edit,del" && went && people && reset;
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
    // Yayın › Süre: her grup kendi satırında (▶ ekrana alır, bekleyen grubun Başlat'ı), üstte Ekranda kartı, altta Kameralar
    await okPage("Yayın", "gruplar ayrı, ekranda seçim, kameralar", "/athletes/races/r2/yayin", "Kameralar", async () => {
      const on = await page.locator(".masa-onair").innerText().catch(() => "");
      const air = await page.locator(".masa-air.on").count();
      const go = await page.getByRole("button", { name: "Başlat", exact: true }).count();
      const cam = await page.locator(".masa button", { hasText: "Kamera 1" }).first().innerText().catch(() => "");
      if (process.env.YAYIN_FOTO) await page.screenshot({ path: process.env.YAYIN_FOTO, fullPage: true }).catch(() => {});
      const extra = await page.locator("[role=dialog]").count();
      await page.getByRole("button", { name: "Kapat" }).first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
      await page.locator(".masa button", { hasText: "Kamera 1" }).first().click({ timeout: 10000 });
      const sheet = await page.getByText("Kamera 1 hangi grupları çekiyor?").first().isVisible({ timeout: 5000 }).catch(() => false);
      if (process.env.YAYIN_FOTO) await page.screenshot({ path: process.env.YAYIN_FOTO.replace(/\.png$/, "-kamera.png") }).catch(() => {});
      return [/Sarı/.test(on) && /Kamera 1/.test(on) && air === 1 && go >= 1 && /Sarı/.test(cam) && /Yayın yok/.test(cam) && sheet, `ekranda "${on.replace(/\s+/g, " ")}" · ▶ ${air} · Başlat ${go} · kamera "${cam.replace(/\s+/g, " ")}" · pencere ${sheet ? "açıldı" : "açılmadı"} · önceden açık pencere ${extra}`];
    });
    // Yayın › Video: tek önizleme, kaynaklar tek liste, alt yazı ve gösterim ayarı satıra dokununca açılır
    await okPage("Yayın", "video sekmesi sade", "/athletes/races/r2/yayin", "Kameralar", async () => {
      await page.getByRole("button", { name: /^Video/ }).first().click();
      await page.getByText("Ekranda:").first().waitFor({ timeout: 10000 }).catch(() => {});
      const mons = await page.locator(".masa-mon").count();
      const srcs = await page.locator(".masa-src").count();
      const line = await page.getByText(/^Ekranda: /).first().innerText().catch(() => "");
      const capRow = page.getByRole("button", { name: /Ekranda yazı/ }).first();
      const closed = (await page.getByPlaceholder(/Boşken|Otomatik:/).count()) === 0;
      await capRow.click({ timeout: 5000 }).catch(() => {});
      const opened = (await page.getByPlaceholder(/Boşken|Otomatik:/).count()) > 0;
      if (process.env.YAYIN_FOTO) await page.screenshot({ path: process.env.YAYIN_FOTO.replace(/\.png$/, "-video.png"), fullPage: true }).catch(() => {});
      return [mons === 1 && srcs >= 2 && /Ekranda/.test(line) && closed && opened, `önizleme ${mons} · kaynak ${srcs} · "${line}" · alt yazı kapalı ${closed} → açık ${opened}`];
    });
    // Yayın › Süre: Sarı yarıştayken Mavi'nin satırından geri sayım başlar; satırda süre ve Dur / Devam, Sarı'nın Bitti'si ayrı
    await okPage("Yayın", "satırdan başlat, dur, devam", "/athletes/races/r2/yayin", "Kameralar", async () => {
      await page.getByRole("button", { name: "5", exact: true }).first().click({ timeout: 10000 }).catch(() => {});
      await page.getByRole("button", { name: "Başlat", exact: true }).first().click({ timeout: 10000 });
      const dur = page.getByRole("button", { name: "Dur", exact: true }).first();
      const seen = await dur.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      const t1 = await page.locator(".tabular-nums.text-acc").first().innerText().catch(() => "");
      const sariBitti = await page.getByRole("button", { name: "Bitti", exact: true }).count();
      await dur.click({ timeout: 5000 }).catch(() => {});
      const resume = await page.getByRole("button", { name: "Devam", exact: true }).first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
      if (process.env.YAYIN_FOTO) await page.screenshot({ path: process.env.YAYIN_FOTO.replace(/\.png$/, "-sure.png") }).catch(() => {});
      return [seen && /^\d+:\d\d$/.test(t1.trim()) && sariBitti >= 1 && resume, `Dur ${seen ? "göründü" : "yok"} · süre "${t1.trim()}" · Bitti ${sariBitti} · Devam ${resume ? "göründü" : "yok"}`];
    });
  } finally {
    await browser.close();
  }
  return rows;
}
