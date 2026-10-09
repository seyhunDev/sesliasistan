// TAM TEST: uygulamayı ve özellikle sesli asistanı baştan sona sınar. Tek komut: npm run test:hepsi
//
//   1. Birim testleri      mevcut 1700+ yerel test (npm run test:hizli ile aynı)
//   2. Anlama              asistan cümleyi doğru işe gönderiyor mu: temiz cümleler + insan/ses tanıma hataları
//                          (noktalamasız, kesmesiz, Türkçe harfsiz, dolgu sözlü, kekeme, yanlış duyulmuş fiil/ad)
//   3. Akış                çok işli cümlede görev listesi kuruluyor mu, sıra doğru mu, bir iş asistanı kapatıp listeyi
//                          yarıda bırakıyor mu, saçma girdide çöküyor/takılıyor mu; uygulama bu bilgisayarda açılır,
//                          tarayıcıyla bütün sayfalar açılır (sahte Firebase: gerçek veriye dokunulmaz)
//   4. Gerçek yapay zeka   .env.local'da GEMINI_API_KEY varsa: görev listesi ve ana asistan cümleleri (~40 istek kotadan düşer)
//
// Seçenekler: --yzsiz (yapay zekaya sorma)  --tarayicisiz (uygulamayı açma)  --ayrinti (geçenleri de yaz)
// Sonuç ekrana ve ~/Downloads/tam-test-<tarih>.txt dosyasına yazılır (bu dosyayı sohbete yükleyebilirsin).
// Veritabanına yazmaz, mesaj göndermez, gerçek hesaba girmez. Kalan (✗) testler hatayı gösterir; düzeltilince yeşile döner.
import { register } from "node:module";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

register(new URL("../asistan-test/hooks.mjs", import.meta.url));
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const withAI = !args.includes("--yzsiz");
const withBrowser = !args.includes("--tarayicisiz");
const detail = args.includes("--ayrinti");

// .env.local: yalnız yapay zeka değişkenleri (değerler hiçbir yere yazılmaz)
const envFile = join(ROOT, ".env.local");
if (existsSync(envFile))
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*(GEMINI_API_KEY|GEMINI_MODEL|GEMINI_MODEL_STRONG|GEMINI_FALLBACK_MODELS|ANTHROPIC_API_KEY|AI_PROVIDER|AI_MODEL_TEXT)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }

const lines = [];
const out = (s = "") => (console.log(s), lines.push(s));
const file = (s = "") => lines.push(s); // yalnız dosyaya
const T0 = Date.now();
const stamp = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
out(`TAM TEST · ${stamp}`);
out("Sesli asistan ve uygulama, baştan sona. Gerçek veriye dokunulmaz.");

const rows = []; // { katman, grup, say, expect, ok (true/false/null=atlandı), got }

// ---------------------------------------------------------------- 1. Birim testleri
out("");
out("1/4 Birim testleri çalışıyor…");
{
  const child = spawn(process.execPath, ["--no-warnings", join(ROOT, "scripts/asistan-test/calistir.mjs")], { cwd: ROOT });
  let txt = "";
  child.stdout.on("data", (d) => (txt += d));
  child.stderr.on("data", (d) => (txt += d));
  await new Promise((r) => child.on("close", r));
  const m = /YEREL TESTLER \(yapay zekasız\): (\d+)\/(\d+)/.exec(txt);
  if (!m) rows.push({ katman: "birim", grup: "Birim testleri", say: "çalıştırma", expect: "çalışır", ok: false, got: txt.slice(-400) });
  else {
    const fails = txt.split("\n").filter((l) => /^\s{6}✗/.test(l));
    rows.push({ katman: "birim", grup: "Birim testleri", say: `${m[2]} test`, expect: "hepsi geçer", ok: m[1] === m[2], got: `${m[1]}/${m[2]} geçti` });
    for (const f of fails) rows.push({ katman: "birim", grup: "Birim testleri: kalanlar", say: f.trim().replace(/^✗\s*/, ""), expect: "", ok: false, got: "" });
  }
}

// ---------------------------------------------------------------- 2-3. Anlama ve akış (yapay zekasız)
out("2/4 Anlama ve görev listesi (hatalı girdilerle)…");
{
  const { run } = await import("./anlama.mjs");
  rows.push(...run());
}

// ---------------------------------------------------------------- 3b-4. Uygulama açılır: tarayıcı + gerçek yapay zeka
let server = null;
const keyAI = !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL;
if (withBrowser || (withAI && keyAI)) {
  out("3/4 Uygulama bu bilgisayarda açılıyor (ilk derleme 1-3 dakika sürebilir)…");
  try {
    const { startServer } = await import("./sunucu.mjs");
    server = await startServer({ log: out });
  } catch (e) {
    rows.push({ katman: "tarayıcı", grup: "Uygulama açılıyor", say: "next dev", expect: "uygulama açılır", ok: false, got: `${String(e.message).slice(0, 600)}\n      (Başka bir "npm run dev" açıksa kapatıp yeniden dene.)` });
  }
}
try {
  if (server && withBrowser) {
    out("    Sayfalar tarayıcıda açılıyor…");
    const { run } = await import("./tarayici.mjs");
    rows.push(...(await run(server, out)));
  } else if (!withBrowser) rows.push({ katman: "tarayıcı", grup: "Tarayıcı", say: "sayfalar", expect: "", ok: null, got: "ATLANDI (--tarayicisiz)" });

  out("4/4 Gerçek yapay zeka…");
  if (!withAI) rows.push({ katman: "yapay zeka", grup: "Gerçek yapay zeka", say: "", expect: "", ok: null, got: "ATLANDI (--yzsiz)" });
  else if (!keyAI) rows.push({ katman: "yapay zeka", grup: "Gerçek yapay zeka", say: "", expect: "", ok: null, got: "ATLANDI: .env.local'da GEMINI_API_KEY ya da GEMINI_MODEL yok (Mac'teki proje klasöründe çalıştır)" });
  else {
    const yz = await import("./yz.mjs");
    if (server) {
      out("    Görev listesi (/api/tasks)…");
      rows.push(...(await yz.runTasks(server, out)));
    }
    out("    Ana asistan…");
    rows.push(...(await yz.runAssistant(out)));
  }
} finally {
  if (server) await server.stop();
}

// ---------------------------------------------------------------- Rapor
const KATMAN = [
  ["birim", "1. BİRİM TESTLERİ"],
  ["anlama", "2. ANLAMA: temiz cümleler"],
  ["hatalı girdi", "2. ANLAMA: insan ve ses tanıma hataları"],
  ["akış", "3. AKIŞ: görev listesi, takılma, çökme"],
  ["tarayıcı", "3. UYGULAMA: tarayıcıda sayfalar, sunucu uçları"],
  ["yapay zeka", "4. GERÇEK YAPAY ZEKA"],
];
const counted = rows.filter((r) => r.ok !== null && r.grup !== "Birim testleri: kalanlar");
const pass = counted.filter((r) => r.ok).length;
out("");
out("=".repeat(70));
out(`SONUÇ: ${pass}/${counted.length} geçti · ${counted.length - pass} kalan · ${Math.round((Date.now() - T0) / 1000)} sn`);
out("=".repeat(70));
for (const [k, title] of KATMAN) {
  const rs = rows.filter((r) => r.katman === k);
  if (!rs.length) continue;
  const c = rs.filter((r) => r.ok !== null && r.grup !== "Birim testleri: kalanlar");
  out("");
  out(`${title}: ${c.filter((r) => r.ok).length}/${c.length}`);
  for (const g of [...new Set(rs.map((r) => r.grup))]) {
    const gs = rs.filter((r) => r.grup === g);
    const skipped = gs.every((r) => r.ok === null);
    const gc = gs.filter((r) => r.ok !== null);
    const bad = gs.filter((r) => r.ok === false);
    if (g === "Birim testleri: kalanlar") {
      bad.forEach((r) => out(`      ✗ ${r.say}`));
      continue;
    }
    if (skipped) {
      out(`  – ${g}: ${gs[0].got}`);
      continue;
    }
    out(`  ${bad.length ? "✗" : "✓"} ${g}: ${gc.length - bad.length}/${gc.length}`);
    // Ekranda grup başına en çok 6 kalan; hepsi dosyada
    const shown = detail ? gs : bad;
    shown.forEach((r, i) => {
      const say = r.say.length > 140 ? r.say.slice(0, 137) + "…" : r.say;
      const block = [`      ${r.ok ? "✓" : "✗"} “${say}”`, ...(r.expect ? [`          beklenen: ${r.expect}`] : []), `          olan:     ${r.got}`];
      (i < 6 || detail ? out : file)(block.join("\n"));
    });
    if (!detail && bad.length > 6) out(`      … ${bad.length - 6} kalan daha (hepsi sonuç dosyasında)`);
  }
}
out("");
out("Okuma: ✓ geçti, ✗ kalan (hata var), – atlandı. “beklenen” asistanın yapması gereken, “olan” şu an yaptığı.");
out("“yapay zeka (plan/görev/not/mesaj/soru)”: cümle ana yapay zekaya gidiyor; plan, görev, not, mesaj ve sorular için doğru yer budur.");

const dir = join(homedir(), "Downloads");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const outFile = join(dir, `tam-test-${new Date().toISOString().slice(0, 10)}.txt`);
writeFileSync(outFile, lines.join("\n") + "\n");
console.log(`\nSonuç dosyası: ${outFile}`);
process.exitCode = counted.length - pass ? 1 : 0;
