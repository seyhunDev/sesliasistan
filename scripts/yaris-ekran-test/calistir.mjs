// YARIŞ SAYFASI EKRAN TESTİ: npm run test:yaris-ekran
// Uygulama bu bilgisayarda açılır, sahte Firebase'e (emülatör) girilir, yarış sayfası sporcu seçili açılır (senaryolar.mjs).
// Java gerekir (Firestore emülatörü). npm run test:hepsi de bunu çalıştırır. Seçenek --ayrinti: geçenleri de yazar.
import { register } from "node:module";

register(new URL("../asistan-test/hooks.mjs", import.meta.url));
const detail = process.argv.includes("--ayrinti");
const { startEmulator, CLIENT_ENV } = await import("../asistan-ekran-test/emulator.mjs");
const { startServer } = await import("../tam-test/sunucu.mjs");
const { run } = await import("./senaryolar.mjs");

const T0 = Date.now();
console.log("YARIŞ SAYFASI EKRAN TESTİ (sahte Firebase)");
let emu = null;
let server = null;
let rows = [];
try {
  emu = await startEmulator({ log: console.log });
  console.log("    Uygulama açılıyor (ilk derleme 1-3 dakika sürebilir)…");
  server = await startServer({ log: console.log, env: CLIENT_ENV });
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
