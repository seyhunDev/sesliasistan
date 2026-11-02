// CANLI YAYIN EKRAN TESTİ: npm run test:canli-ekran
// Sahte Firebase (emülatör) açılır, yarışlar ve canlı kayıtlar yazılır; uygulama bu bilgisayarda açılır ve /api/canli gerçek kodla
// emülatörden okur. Herkese açık canlı ekran (/canli/<yarış>) tarayıcıda televizyon ve telefon boyunda açılır (senaryolar.mjs).
// Java gerekir (Firestore emülatörü). Gerçek veriye dokunulmaz. Seçenek --ayrinti: geçenleri de yazar.
import { generateKeyPairSync } from "node:crypto";

const detail = process.argv.includes("--ayrinti");
const { startEmulator, CLIENT_ENV, FS_HOST } = await import("../asistan-ekran-test/emulator.mjs");
const { startServer } = await import("../tam-test/sunucu.mjs");
const { run } = await import("./senaryolar.mjs");

// Sunucunun yönetici erişimi emülatöre gider: anahtar her çalıştırmada burada üretilen geçici, hiçbir yere bağlı olmayan bir anahtardır
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const SERVER_ENV = { ...CLIENT_ENV, FIRESTORE_EMULATOR_HOST: FS_HOST, FIREBASE_CLIENT_EMAIL: "canli-test@demo-tam-test.iam.gserviceaccount.com", FIREBASE_PRIVATE_KEY: privateKey };

const T0 = Date.now();
console.log("CANLI YAYIN EKRAN TESTİ (sahte Firebase, gerçek /api/canli)");
let emu = null;
let server = null;
let rows = [];
try {
  emu = await startEmulator({ log: console.log });
  console.log("    Uygulama açılıyor (ilk derleme 1-3 dakika sürebilir)…");
  server = await startServer({ log: console.log, env: SERVER_ENV, port: 3919 });
  rows = await run(server, console.log);
} catch (e) {
  rows.push({ grup: "Hazırlık", say: "emülatör + uygulama", expect: "açılır", ok: e.skip ? null : false, got: `${e.skip ? "ATLANDI: " : ""}${String(e.message).slice(0, 600)}` });
} finally {
  if (server) await server.stop();
  if (emu) await emu.stop();
}

const counted = rows.filter((r) => r.ok !== null);
const pass = counted.filter((r) => r.ok).length;
console.log("");
console.log(`SONUÇ: ${pass}/${counted.length} geçti · ${counted.length - pass} kalan · ${Math.round((Date.now() - T0) / 1000)} sn`);
for (const g of [...new Set(rows.map((r) => r.grup))]) {
  const gs = rows.filter((r) => r.grup === g);
  const bad = gs.filter((r) => r.ok === false);
  if (gs.every((r) => r.ok === null)) {
    console.log(`  – ${g}: ${gs[0].got}`);
    continue;
  }
  const gc = gs.filter((r) => r.ok !== null);
  console.log(`  ${bad.length ? "✗" : "✓"} ${g}: ${gc.length - bad.length}/${gc.length}`);
  for (const r of detail ? gs : bad) console.log(`      ${r.ok ? "✓" : "✗"} ${r.say}\n          beklenen: ${r.expect}\n          olan:     ${r.got}`);
}
process.exitCode = counted.length - pass ? 1 : 0;
