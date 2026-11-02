// Canlı yayın ekranı uçtan uca (Seyhun 2026-11-02 "canlı yayın için test yaz, sağlıklı çalışıyor mu deneyelim"):
// emülatöre yarışlar + canlı kayıtlar (raceLive) + herkese açık işaret (canliEkran) yazılır; /api/canli gerçek kodla okur; /canli/<yarış>
// televizyon (1600×900) ve telefon (390×844) boyunda açılır. Sınananlar: geri sayım şeritte (kare bayraklar, 5·4·1·0), yarışta sıralama,
// tehir, bugün yarış yok, kaldırılan yarış, yükleniyor iskeleti, Yayın'dan yazılan değişikliğin ekrana gelmesi, saat eşlemesi,
// açık yarışlar listesi, /canli/ornek adım adım; her ekranda çökme, sayfa hatası ve yana taşma yok.
// Dış adresler (YouTube, hava) tarayıcıda kapalı; yarışlarda konum yok, sunucu hava tahmini istemez.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { seed, FS_HOST, AUTH_HOST, PROJECT } from "../asistan-ekran-test/emulator.mjs";

const K = "canlı ekran";
const OWNER = "sahip@ornek.local";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const NOW = Date.now();
const trDay = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10);
const trHm = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(11, 16);
const TODAY = trDay(NOW);
const plusDay = (n) => trDay(NOW + n * 864e5);
const iso = (ms) => new Date(ms).toISOString();


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

// Emülatöre yazar (seed gibi ama öncekileri silmez): Yayın sayfasının yazdığı değişikliğin yerine
function write(ids, docs) {
  const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => ids[k] ?? m);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("../asistan-ekran-test/tohum.mjs", import.meta.url))], {
    input: JSON.stringify({ docs: docs.map((d) => ({ path: fill(d.path), data: JSON.parse(fill(JSON.stringify(d.data))) })) }),
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: FS_HOST, FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST, GCLOUD_PROJECT: PROJECT },
  });
  if (r.status !== 0) throw new Error(`yazılamadı: ${(r.stderr || r.stdout).slice(-400)}`);
}

const race = (name, start = TODAY, end = plusDay(2)) => ({ name, startDate: start, endDate: end, createdAt: iso(NOW) });
// Optimist Sarı grup, P bayrağı
const ROUND = { route: ["1", "2", "3", "F"], legs: {}, grp: "Sarı", cls: "Optimist", prep: "P" };
const LIVE = {
  // Yayın'da Başlat'ın yazdığı gibi: start kaydı (at = start anı), sayaç rid ile ona bağlı (useRaceFlow beginRace)
  // geri sayım 10 dk (test iki boyda bitmeden açılır)
  sayim: { plan: { day: TODAY, status: "" }, starts: [{ id: "s1", day: TODAY, n: 1, cd: iso(NOW - 60e3), at: iso(NOW + 540e3) }], timer: { mode: "start", end: NOW + 540e3, dur: 600, at: NOW - 60e3, rid: "s1" }, rounds: { s1: ROUND } },
  yarista: {
    plan: { day: TODAY, status: "" },
    starts: [{ id: "s1", day: TODAY, n: 1, cd: iso(NOW - 11 * 60e3), at: iso(NOW - 6 * 60e3) }],
    rounds: { s1: { ...ROUND, legs: { 0: { s: ["512", "88", "1287"], t: [NOW - 2 * 60e3, NOW - 110e3, NOW - 100e3] } } } },
  },
  tehir: { plan: { day: TODAY, status: "ap", at: "", ap: { from: iso(NOW - 60e3), why: "Rüzgâr yok", land: false } }, starts: [] },
  yok: { plan: { day: TODAY, status: "none", daily: "11:00" }, starts: [] },
  guncel: { plan: { day: TODAY, status: "" }, starts: [] },
};

export async function run(server, log = () => {}) {
  const rows = [];
  const push = (grup, say, expect, ok, got) => rows.push({ katman: K, grup, say, expect, ok: ok === null ? null : !!ok, got: String(got ?? "") });
  let ids;
  try {
    ids = await seed({
      users: [{ key: "owner", email: OWNER, password: "test-sifre-123", name: "Test Sahip", doc: { name: "Test Sahip", email: OWNER, role: "owner", orgId: "{owner}", onboarded: true } }],
      docs: [
        { path: "orgs/{owner}/races/sayim", data: race("Sayım Kupası") },
        { path: "orgs/{owner}/races/yarista", data: race("Yarış Kupası") },
        { path: "orgs/{owner}/races/tehir", data: race("Tehir Kupası") },
        { path: "orgs/{owner}/races/yok", data: race("Dinlenme Kupası", plusDay(-1), plusDay(1)) },
        { path: "orgs/{owner}/races/guncel", data: race("Güncel Kupası") },
        ...Object.entries(LIVE).map(([id, d]) => ({ path: `orgs/{owner}/raceLive/${id}`, data: d })),
        ...Object.keys(LIVE).map((id) => ({ path: `canliEkran/${id}`, data: { org: "{owner}" } })),
      ],
    });
  } catch (e) {
    push("Hazırlık", "sahte yarışlar ve canlı kayıtlar", "yazılır", false, e.message);
    return rows;
  }

  // Sunucu ucu: /api/canli gerçek kodla emülatörden okur
  const api = async (q) => {
    const r = await fetch(`${server.url}/api/canli?${q}`, { signal: AbortSignal.timeout(60000) });
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  try {
    const t = Date.now();
    const s = await api("saat=1");
    push("Sunucu", "saat eşlemesi (?saat=1)", "sunucu saati, önbelleksiz", s.status === 200 && Math.abs(s.j.now - t) < 30000, `${s.status} · fark ${Math.round((s.j.now - t) / 1000)} sn`);
    const a = await api("id=sayim");
    push("Sunucu", "yarış verisi (/api/canli?id=sayim)", "200; yarış adı, start, sayaç, Sarı grup", a.status === 200 && a.j.race?.name === "Sayım Kupası" && a.j.cur === "s1" && a.j.timer?.end > 0 && a.j.rounds?.s1?.grp === "Sarı", `${a.status} · ${a.j.race?.name || a.j.error} · cur ${a.j.cur} · grp ${a.j.rounds?.s1?.grp}`);
    const y = await api("id=yok");
    push("Sunucu", "yarış olmayan gün", "plan none, sonraki gün yarın 11:00", y.status === 200 && y.j.plan?.status === "none" && y.j.plan?.next?.day === plusDay(1) && y.j.plan?.next?.at === "11:00", `${y.j.plan?.status} · ${JSON.stringify(y.j.plan?.next)}`);
    const n = await api("id=boyleyok");
    push("Sunucu", "olmayan yarış", "404 yok", n.status === 404 && n.j.error === "yok", `${n.status} ${n.j.error}`);
    const bad = await api("id=..%2Fx");
    push("Sunucu", "bozuk kimlik", "400", bad.status === 400, bad.status);
    const l = await api("");
    const names = (l.j.list || []).map((x) => x.name);
    push("Sunucu", "açık yarışlar listesi", "5 yarış", l.status === 200 && names.length === 5, `${l.status} · ${names.join(", ")}`);
  } catch (e) {
    push("Sunucu", "/api/canli", "yanıt verir", false, String(e.message).slice(0, 200));
  }

  let browser;
  try {
    browser = await launch();
  } catch (e) {
    push("Tarayıcı", "Chrome açılıyor", "", null, `ATLANDI: ${e.message}`);
    return rows;
  }
  const sizes = [
    ["TV", { width: 1600, height: 900 }],
    ["telefon", { width: 390, height: 844 }],
  ];
  try {
    for (const [sz, viewport] of sizes) {
      const ctx = await browser.newContext({ viewport, locale: "tr-TR", timezoneId: "Europe/Istanbul", serviceWorkers: "block" });
      let hang = false;
      await ctx.route("**/*", async (route) => {
        const u = new URL(route.request().url());
        if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return route.abort();
        if (hang && u.pathname === "/api/canli" && !u.searchParams.get("saat")) return; // yanıt hiç gelmez
        return route.continue();
      });
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(String(e.message || e).split("\n")[0].slice(0, 200)));
      const text = () => page.locator("body").textContent().catch(() => "");
      const open = async (path, wait) => {
        errs.length = 0;
        await page.goto(`${server.url}${path}`, { waitUntil: "load", timeout: 120000 });
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
        if (wait) await page.locator(wait).first().waitFor({ timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(1200);
      };
      const health = async () => {
        const t = await text();
        const crash = /Application error|Bu sayfa açılamadı|before initialization/i.test(t) || errs.length > 0;
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => 0);
        return { ok: !crash && over <= 1, got: crash ? `çöktü: ${errs[0] || t.slice(0, 120)}` : over > 1 ? `yana ${over}px taşıyor` : "" };
      };
      const check = async (grup, say, expect, path, wait, fn) => {
        try {
          await open(path, wait);
          const h = await health();
          const [ok, got] = await fn();
          push(`${grup} (${sz})`, say, `${expect}; çökme ve yana taşma yok`, ok && h.ok, h.got || got);
        } catch (e) {
          push(`${grup} (${sz})`, say, expect, false, `hata: ${String(e.message).split("\n")[0].slice(0, 200)}`);
        }
      };
      const vis = (sel) => page.locator(sel).first().isVisible().catch(() => false);

      await check("Geri sayım", "start'a geri sayım şeritte", "beyaz saat bloğu (Start'a), ortada kutu yok, iki kare ve eş boy bayrak, 5·4·1·0 çubuğu", "/canli/sayim", ".lv-sclock", async () => {
        const clock = await page.locator(".lv-sclock").innerText().catch(() => "");
        const center = await page.locator(".lv-center, .lv-pill.lv-cd").count();
        const fl = await page.locator(".lv-sflag .lv-flag").evaluateAll((a) => a.map((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
        const seg = (await page.locator(".lv-sseg i").allInnerTexts()).map((s) => s.trim()).join("·");
        const sq = fl.length === 2 && fl.every(([w, h]) => w > 10 && w === h) && fl[0][0] === fl[1][0];
        return [/start'a/i.test(clock) && /\d\d:\d\d/.test(clock) && !center && sq && /^10·.*·1·0$/.test(seg), `saat "${clock.replace(/\n/g, " ")}" · orta kutu ${center} · bayraklar ${JSON.stringify(fl)} · çubuk ${seg}`];
      });
      await check("Geri sayım", "sayaç işliyor", "2 sn sonra sayı küçülür", "/canli/sayim", ".lv-sclock", async () => {
        const a = await page.locator(".lv-sclock b").innerText().catch(() => "");
        await page.waitForTimeout(2200);
        const b = await page.locator(".lv-sclock b").innerText().catch(() => "");
        return [a && b && a !== b && b < a, `${a} → ${b}`];
      });
      await check("Yarışta", "start'tan sonra sıralama", "yelken numaraları ve Canlı görünür, geri sayım bloğu yok", "/canli/yarista", ".lv-bar", async () => {
        const t = await text();
        return [/512/.test(t) && /88/.test(t) && /canlı/i.test(t) && !(await vis(".lv-sclock")), t.replace(/\s+/g, " ").slice(0, 160)];
      });
      await check("Tehir", "tehir çekildi", "Tehir yazısı görünür, hesaplanmış start saati yok", "/canli/tehir", ".lv", async () => {
        const t = await text();
        return [/tehir/i.test(t) && !/İlk start'a\s*\d/.test(t), t.replace(/\s+/g, " ").slice(0, 160)];
      });
      await check("Bugün yarış yok", "yarış olmayan gün", "'Bugün yarış yok', 'Yarın ilk start'a', geri sayım, 11:00", "/canli/yok", ".lv-nopill", async () => {
        const t = await text();
        return [/Bugün yarış yok/.test(t) && /Yarın ilk start'a/i.test(t) && /İlk start 11:00/.test(t) && (await vis(".lv-nobig")), t.replace(/\s+/g, " ").slice(0, 160)];
      });
      await check("Kaldırılan yarış", "olmayan yarışın linki", "'Bu yarış kaldırıldı' ve Açık yarışlar", "/canli/boyleyok", ".lv-gone", async () => {
        const t = await text();
        return [/Bu yarış kaldırıldı/.test(t), t.replace(/\s+/g, " ").slice(0, 120)];
      });
      hang = true;
      await check("Yükleniyor", "veri gelmezken", "iskelet ve CANLI rozeti, 'Yükleniyor' yazısı yok", "/canli/sayim", ".lv-skel", async () => {
        const t = await text();
        return [(await vis(".lv-skel")) && (await vis(".lv-skl")) && !/Yükleniyor/.test(t), t.replace(/\s+/g, " ").slice(0, 80)];
      });
      hang = false;
      await check("Açık yarışlar", "/canli listesi", "beş yarışın adı görünür", "/canli", ".lv", async () => {
        await page.getByText("Sayım Kupası").first().waitFor({ timeout: 30000 }).catch(() => {});
        const t = await text();
        const n = ["Sayım", "Yarış", "Tehir", "Dinlenme", "Güncel"].filter((x) => t.includes(`${x} Kupası`)).length;
        return [n === 5, `${n}/5 · ${t.replace(/\s+/g, " ").slice(0, 120)}`];
      });

      // Yayın'dan geri sayım başlatılır (emülatöre yazılır): açık ekran birkaç saniyede şeritte geri sayımı gösterir
      try {
        await open("/canli/guncel", ".lv-bar");
        const before = await vis(".lv-sclock");
        const t0 = Date.now();
        write(ids, [{ path: "orgs/{owner}/raceLive/guncel", data: { plan: { day: TODAY, status: "" }, starts: [{ id: "g1", day: TODAY, n: 1, cd: iso(t0), at: iso(t0 + 300e3) }], timer: { mode: "start", end: t0 + 300e3, dur: 300, at: t0, rid: "g1" }, rounds: { g1: { ...ROUND, grp: "Mavi" } } } }]);
        const seen = await page.locator(".lv-sclock").first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
        const h = await health();
        push(`Canlı güncelleme (${sz})`, "Yayın'da Başlat → ekran", "ekran yenilenmeden 20 sn içinde geri sayım gelir", !before && seen && h.ok, h.got || `${seen ? `${Math.round((Date.now() - t0) / 1000)} sn` : "gelmedi"}`);
        write(ids, [{ path: "orgs/{owner}/raceLive/guncel", data: { plan: { day: TODAY, status: "" }, starts: [] } }]);
      } catch (e) {
        push(`Canlı güncelleme (${sz})`, "Yayın'da Başlat → ekran", "geri sayım gelir", false, String(e.message).slice(0, 200));
      }

      // /canli/ornek: veritabanına dokunmayan örnek yarış, 12 adım
      try {
        await open("/canli/ornek", ".lv-demo");
        await page.getByRole("button", { name: "Durdur" }).click({ timeout: 10000 }).catch(() => {});
        const seenSteps = [];
        const bad = [];
        for (let i = 0; i < 12; i++) {
          const lab = await page.locator(".lv-demo span").first().innerText().catch(() => "");
          seenSteps.push(lab.replace(/^Örnek · /, ""));
          const h = await health();
          if (!h.ok) bad.push(`${lab}: ${h.got}`);
          await page.getByRole("button", { name: "Sonraki adım" }).click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(700);
        }
        push(`Örnek yarış (${sz})`, "/canli/ornek 12 adım", "her adım çökmeden açılır, taşma yok", bad.length === 0 && seenSteps.length === 12 && /12\/12/.test(seenSteps.at(-1)), bad[0] || seenSteps.join(" | ").slice(0, 300));
      } catch (e) {
        push(`Örnek yarış (${sz})`, "/canli/ornek", "açılır", false, String(e.message).slice(0, 200));
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  log(`    Canlı ekran: ${rows.filter((r) => r.ok).length}/${rows.filter((r) => r.ok !== null).length}`);
  return rows;
}
