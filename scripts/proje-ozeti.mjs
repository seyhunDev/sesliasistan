// Projenin tek dosyalık özetini çıkarır: repoya erişimi olmayan bir sohbette paylaşmak için.
// Varsayılan kısa özettir (notlar, git, dosya ağacı; ~10 KB). Dosya içerikleri yalnız --tam ile yazılır (~1,5 MB,
// yüz binlerce token): Claude Code ve GitHub'lı proje sohbetleri kodu zaten kendisi okur, onlara gerekmez.
// Gizli bilgi içermez: .env dosyalarının yalnızca değişken ADLARI yazılır (değerler yok), özel anahtarlar ve
// hizmet hesabı dosyaları atlanır, anahtara benzeyen metinler gizlenir.
//
//   node scripts/proje-ozeti.mjs            -> kısa özet, ~/Downloads/sesliasistan-ozet-<tarih>.md
//   node scripts/proje-ozeti.mjs --tam      -> tam döküm (tüm dosya içerikleri)
//   node scripts/proje-ozeti.mjs cikti.md   -> verilen dosyaya
//
// Proje kökünde NOTLAR.md varsa (senin notların) o da en başa eklenir.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
if (!existsSync(join(ROOT, "package.json"))) {
  console.error("Proje klasöründe çalıştır: cd ~/Projeler/sesliasistan");
  process.exit(1);
}

const stamp = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Istanbul" }).slice(0, 16).replace(/[ :]/g, "-");
const args = process.argv.slice(2);
const FULL = args.includes("--tam");
const OUT = args.find((a) => !a.startsWith("--")) || join(homedir(), "Downloads", `sesliasistan-ozet-${stamp}${FULL ? "-tam" : ""}.md`);

// İçeriği yazılacak yerler ve uzantılar
const DIRS = ["src", "scripts", "netlify", "public"];
const FILES = ["package.json", "firestore.rules", "next.config.mjs", "netlify.toml", "jsconfig.json", "eslint.config.mjs", "postcss.config.mjs", "AGENTS.md", "CLAUDE.md", "README.md", ".env.example", ".gitignore"];
const EXT = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".css", ".json", ".md", ".rules", ".webmanifest", ".toml"]);
const SKIP_DIR = new Set(["node_modules", ".next", ".git", ".netlify", "icons"]);

const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};

// Anahtara benzeyen metinleri gizle (web Firebase yapılandırmasındaki herkese açık anahtar hariç)
function redact(text) {
  return text
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[GİZLENDİ: özel anahtar]")
    .replace(/\b(sk-[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|xox[bp]-[A-Za-z0-9-]{20,})/g, "[GİZLENDİ]");
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIR.has(name)) walk(p, out);
    } else out.push(p);
  }
  return out;
}

const all = [...DIRS.flatMap((d) => walk(join(ROOT, d))), ...FILES.map((f) => join(ROOT, f)).filter(existsSync)];
const dupes = all.filter((p) => / 2(\.[^/]+)?$/.test(p)); // iCloud kopyaları ("dosya 2.jsx")
const files = all.filter((p) => !dupes.includes(p) && EXT.has(extname(p)) && statSync(p).size < 300_000);
const skipped = [];
const parts = [];

// 1. Başlık ve senin notların
parts.push(`# sesliasistan — proje ${FULL ? "dökümü" : "özeti"}\n\nOluşturma: ${stamp.replace(/-(\d\d)-(\d\d)$/, " $1:$2")} (İstanbul)\nKlasör: ${ROOT}\n`);
if (existsSync(join(ROOT, "NOTLAR.md"))) parts.push(`## Notlar (NOTLAR.md)\n\n${redact(readFileSync(join(ROOT, "NOTLAR.md"), "utf8"))}\n`);
if (!FULL && existsSync(join(ROOT, "CLAUDE.md"))) parts.push(`## Çalışma kuralları (CLAUDE.md)\n\n${redact(readFileSync(join(ROOT, "CLAUDE.md"), "utf8"))}\n`);

// 2. Git durumu
const branch = sh("git rev-parse --abbrev-ref HEAD");
if (branch) {
  parts.push(
    `## Git\n\nDal: ${branch}\nUzak: ${sh("git remote get-url origin") || "-"}\n\nSon commit'ler:\n\`\`\`\n${sh(`git log --oneline -${FULL ? 40 : 15}`)}\n\`\`\`\n\nCommit edilmemiş değişiklikler:\n\`\`\`\n${sh("git status --short") || "(yok)"}\n\`\`\`\n`,
  );
}

// 3. Ortam değişkenleri: yalnızca adlar
for (const f of [".env.local", ".env"]) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const names = readFileSync(p, "utf8")
    .split("\n")
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => `- ${k}: ${v.replace(/^["']|["']$/g, "").trim() ? "dolu" : "boş"}`);
  parts.push(`## ${f} (yalnızca adlar, değerler yok)\n\n${[...new Set(names)].join("\n")}\n`);
}

// 4. Uyarılar
if (dupes.length) parts.push(`## Uyarı: iCloud kopyaları (" 2") — silinmeli\n\n${dupes.map((p) => `- ${relative(ROOT, p)}`).join("\n")}\n`);

// 5. Dosya ağacı
parts.push(`## Dosyalar\n\n\`\`\`\n${files.map((p) => `${relative(ROOT, p)}  (${(statSync(p).size / 1024).toFixed(1)} KB)`).join("\n")}\n\`\`\`\n`);

// 6. İçerikler (yalnız --tam)
if (FULL) parts.push("## Dosya içerikleri\n");
for (const p of FULL ? files : []) {
  const rel = relative(ROOT, p);
  const text = readFileSync(p, "utf8");
  if (/"private_key"\s*:/.test(text)) {
    skipped.push(rel);
    continue; // hizmet hesabı dosyası
  }
  const lang = { ".jsx": "jsx", ".js": "js", ".mjs": "js", ".cjs": "js", ".css": "css", ".json": "json", ".md": "md", ".toml": "toml" }[extname(p)] || "";
  const fence = text.includes("```") ? "````" : "```";
  parts.push(`### ${rel}\n\n${fence}${lang}\n${redact(text).replace(/\s+$/, "")}\n${fence}\n`);
}
if (skipped.length) parts.push(`## Atlananlar (gizli bilgi içeriyor)\n\n${skipped.map((s) => `- ${s}`).join("\n")}\n`);

const body = parts.join("\n");
writeFileSync(OUT, body);
console.log(`Tamam: ${OUT}`);
console.log(`${FULL ? "Tam döküm" : "Kısa özet (tam döküm: --tam)"} · ${files.length - skipped.length} dosya, ${(body.length / 1024).toFixed(0)} KB${dupes.length ? ` · UYARI: ${dupes.length} iCloud kopyası var (dökümde listelendi)` : ""}`);
