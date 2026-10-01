// Asistan testleri (yerelde çalışır): node scripts/asistan-test/calistir.mjs
//   Yerel kurallar: yapay zekasız çalışan her şey (sayfa açma, kayıt ekleme, özet, tamamlama, doğum günü, onaylar…)
//   --yz ile: gerçek yapay zekaya da sorar (anahtar .env.local'dan; ~20 istek kotadan düşer)
// Sonuç ekrana ve ~/Downloads/asistan-test-<tarih>.txt dosyasına yazılır (bu dosyayı sohbete yükleyebilirsin).
// Veritabanına dokunmaz, kayıt oluşturmaz, mesaj göndermez.
import { register } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

register(new URL("./hooks.mjs", import.meta.url));

// .env.local: yalnızca yapay zeka değişkenleri ortama alınır (değerler hiçbir yere yazılmaz)
const envFile = new URL("../../.env.local", import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*(GEMINI_API_KEY|GEMINI_MODEL|GEMINI_MODEL_STRONG|GEMINI_FALLBACK_MODELS|ANTHROPIC_API_KEY|AI_PROVIDER|AI_MODEL_TEXT)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const lines = [];
const log = (s = "") => {
  console.log(s);
  lines.push(s);
};
const stamp = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
log(`Sesli Asistan testleri · ${stamp}`);
log("");

const { default: local } = await import("./yerel.mjs");
const groups = [...new Set(local.map((r) => r.group))];
log(`YEREL KURALLAR (yapay zekasız): ${local.filter((r) => r.ok).length}/${local.length} geçti`);
for (const g of groups) {
  const rs = local.filter((r) => r.group === g);
  log(`  ${rs.every((r) => r.ok) ? "✓" : "✗"} ${g}: ${rs.filter((r) => r.ok).length}/${rs.length}`);
  for (const r of rs.filter((x) => !x.ok)) log(`      ✗ “${r.say}” → ${r.got} (beklenen: ${r.expect})`);
}

let ai = [];
if (process.argv.includes("--yz")) {
  log("");
  log("GERÇEK YAPAY ZEKA:");
  const { default: runAI } = await import("./yapay-zeka.mjs");
  ai = await runAI(log);
  if (ai.length) {
    log("");
    log(`YAPAY ZEKA: ${ai.filter((r) => r.ok).length}/${ai.length} geçti · ortalama ${(ai.reduce((a, r) => a + r.ms, 0) / ai.length / 1000).toFixed(1)} sn`);
    for (const r of ai) log(`  ${r.ok ? "✓" : "✗"} “${r.say}” (beklenen: ${r.expect})\n      → ${r.got}`);
  }
} else {
  log("");
  log("Gerçek yapay zeka testi için: node scripts/asistan-test/calistir.mjs --yz");
}

const dir = join(homedir(), "Downloads");
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const file = join(dir, `asistan-test-${new Date().toISOString().slice(0, 10)}.txt`);
writeFileSync(file, lines.join("\n") + "\n");
console.log(`\nSonuç dosyası: ${file}`);
// Yerel kurallardan biri bile geçmezse hata koduyla çık (scripts/gonder.mjs göndermeyi durdurur)
if (local.some((r) => !r.ok)) process.exitCode = 1;
