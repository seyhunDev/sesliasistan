// TAM TEST: uygulamayı ve özellikle sesli asistanı baştan sona sınar. Tek komut: npm run test:hepsi
//
//   1. Birim testleri      mevcut 1700+ yerel test (npm run test:hizli ile aynı)
//   2. Anlama              asistan cümleyi doğru işe gönderiyor mu: temiz cümleler + insan/ses tanıma hataları
//                          (noktalamasız, kesmesiz, Türkçe harfsiz, dolgu sözlü, kekeme, yanlış duyulmuş fiil/ad)
//   3. Akış                çok işli cümlede görev listesi kuruluyor mu, sıra doğru mu, bir iş asistanı kapatıp listeyi
//                          yarıda bırakıyor mu, saçma girdide çöküyor/takılıyor mu; uygulama bu bilgisayarda açılır,
//                          tarayıcıyla bütün sayfalar açılır (sahte Firebase: gerçek veriye dokunulmaz)
//   3b. Asistan ekranı   sahte Firebase'e (emülatör, Java gerekir) girilir, sesli asistan bir insan gibi kullanılır: açılış,
//                          halka renkleri, görev listesi, küçültme, sesli yanıt, onaylar… (scripts/asistan-ekran-test; yapay zekasız)
//   4. Gerçek yapay zeka   .env.local'da GEMINI_API_KEY varsa: görev listesi ve ana asistan cümleleri. Varsayılan küçük örnek
//                          (~16 istek, ~120 bin token); --yz-tam ile bütün set (~65 istek, ~500 bin token). Kota dolarsa (429)
//                          kalan cümleler "atlandı" sayılır, hata sayılmaz.
//
// Seçenekler: --yzsiz (yapay zekaya sorma)  --yz-tam (bütün yapay zeka seti)  --tarayicisiz (uygulamayı açma)  --ayrinti (geçenleri de yaz)
// Sonuç ekrana yazılır ve GitHub'a gider: depodaki test-sonuclari dalı › son.txt (Mac'te de, GitHub'daki "Testler" iş akışında da).
// Gönderilemezse ~/Downloads/tam-test-<tarih>.txt. Seçenek --yuklemeden: göndermez, yalnız dosya.
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
const fullAI = args.includes("--yz-tam"); // gerçek yapay zekada bütün set (varsayılan: seçilmiş küçük örnek, kota az gider)

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
  const davranis = await import("./davranis.mjs");
  rows.push(...davranis.run());
}

// ---------------------------------------------------------------- 3b-4. Uygulama açılır: tarayıcı + gerçek yapay zeka
let server = null;
let emu = null; // asistan ekran testi için sahte Firebase (emülatör)
let emuErr = null;
const keyAI = !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL;
if (withBrowser || (withAI && keyAI)) {
  if (withBrowser) {
    try {
      const { startEmulator } = await import("../asistan-ekran-test/emulator.mjs");
      emu = await startEmulator({ log: out });
    } catch (e) {
      emuErr = e;
    }
  }
  out("3/4 Uygulama bu bilgisayarda açılıyor (ilk derleme 1-3 dakika sürebilir)…");
  try {
    const { startServer } = await import("./sunucu.mjs");
    const { CLIENT_ENV } = await import("../asistan-ekran-test/emulator.mjs");
    server = await startServer({ log: out, env: emu ? CLIENT_ENV : {} });
  } catch (e) {
    rows.push({ katman: "tarayıcı", grup: "Uygulama açılıyor", say: "next dev", expect: "uygulama açılır", ok: false, got: `${String(e.message).slice(0, 600)}\n      (Başka bir "npm run dev" açıksa kapatıp yeniden dene.)` });
  }
}
try {
  if (server && withBrowser) {
    out("    Sayfalar tarayıcıda açılıyor…");
    const { run } = await import("./tarayici.mjs");
    rows.push(...(await run(server, out)));
    out("    Sesli asistan ekranı (sahte Firebase, yapay zekasız)…");
    if (emu) {
      const ekran = await import("../asistan-ekran-test/senaryolar.mjs");
      rows.push(...(await ekran.run(server, out)));
      out("    Çevrimdışı çalışma (internet kesilip açılır)…");
      const cev = await import("../cevrimdisi-test/senaryolar.mjs");
      rows.push(...(await cev.run(server, out)));
      out("    Yarış sayfası (sporcu seçili, yarış günü)…");
      const yar = await import("../yaris-ekran-test/senaryolar.mjs");
      rows.push(...(await yar.run(server, out)));
    } else rows.push({ katman: "asistan ekran", grup: "Asistan ekranı", say: "", expect: "", ok: emuErr?.skip ? null : false, got: `${emuErr?.skip ? "ATLANDI: " : ""}${String(emuErr?.message || "emülatör yok").slice(0, 600)}` });
  } else if (!withBrowser) rows.push({ katman: "tarayıcı", grup: "Tarayıcı", say: "sayfalar", expect: "", ok: null, got: "ATLANDI (--tarayicisiz)" });

  out(`4/4 Gerçek yapay zeka${fullAI ? " (tam set, ~65 istek)" : " (küçük örnek, ~16 istek)"}…`);
  if (!withAI) rows.push({ katman: "yapay zeka", grup: "Gerçek yapay zeka", say: "", expect: "", ok: null, got: "ATLANDI (--yzsiz)" });
  else if (!keyAI) rows.push({ katman: "yapay zeka", grup: "Gerçek yapay zeka", say: "", expect: "", ok: null, got: "ATLANDI: .env.local'da GEMINI_API_KEY ya da GEMINI_MODEL yok (Mac'teki proje klasöründe çalıştır)" });
  else {
    const yz = await import("./yz.mjs");
    if (server) {
      out("    Görev listesi (/api/tasks)…");
      rows.push(...(await yz.runTasks(server, out, fullAI)));
    }
    out("    Ana asistan…");
    rows.push(...(await yz.runAssistant(out, fullAI)));
    out(`    ${yz.used()} yapay zeka isteği gönderildi${fullAI ? " (tam set)" : " (küçük örnek; tam set: npm run test:hepsi -- --yz-tam)"}`);
  }
} finally {
  if (server) await server.stop();
  if (emu) await emu.stop();
}

// ---------------------------------------------------------------- Rapor
const KATMAN = [
  ["birim", "1. BİRİM TESTLERİ"],
  ["anlama", "2. ANLAMA: temiz cümleler"],
  ["hatalı girdi", "2. ANLAMA: insan ve ses tanıma hataları"],
  ["davranış", "2. ANLAMA: insan davranışları (düzeltme, vazgeçme, onay, tekrar, soru/komut, öğrenme)"],
  ["akış", "3. AKIŞ: görev listesi, takılma, çökme"],
  ["tarayıcı", "3. UYGULAMA: tarayıcıda sayfalar, sunucu uçları"],
  ["asistan ekran", "3. SESLİ ASİSTAN EKRANI: düğme, açılış, halka, görev listesi, onaylar (sahte Firebase)"],
  ["çevrimdışı", "3. ÇEVRİMDIŞI: internetsiz kayıt, bağlantı gelince gönderim, üstteki şerit (sahte Firebase)"],
  ["yarış ekranı", "3. YARIŞ SAYFASI: sporcu seçili yarış, yarış günü, sekmeler, Multimedya (sahte Firebase)"],
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

// Mac'te: sonuç GitHub'a (test-sonuclari dalı) gider, bilgisayara dosya inmez; gönderilemezse ~/Downloads'a yazılır.
// GitHub'daki iş akışında (TEST_SONUC_DIR) dosya oraya yazılır, dala iş akışı gönderir. --yuklemeden: yalnız dosya.
const text = lines.join("\n") + "\n";
const { uploadResult } = await import("./yukle.mjs");
if (!process.env.TEST_SONUC_DIR && !args.includes("--yuklemeden") && uploadResult(ROOT, text)) {
  console.log("\nSonuç GitHub'a gönderildi: test-sonuclari dalı › son.txt");
} else {
  const dir = process.env.TEST_SONUC_DIR || join(homedir(), "Downloads");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const outFile = join(dir, `tam-test-${new Date().toISOString().slice(0, 10)}.txt`);
  writeFileSync(outFile, text);
  console.log(`\nSonuç dosyası: ${outFile}`);
}
process.exitCode = counted.length - pass ? 1 : 0;
