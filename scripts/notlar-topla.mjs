// notlar/yeni/*.md dosyalarını NOTLAR.md'ye taşır (en yenisi en üstte) ve dosyaları siler.
// Neden: her thread NOTLAR.md'nin en üstüne yazınca paralel PR'lar hep çakışıyordu. Artık her iş kendi
// dosyasını yazar (notlar/yeni/2026-10-04-ozel-gun.md); bu betik Mac'te `npm run gonder` içinde ya da
// `npm run notlar` ile çalışır, NOTLAR.md'yi tek yerden günceller.
//
// Dosya biçimi: NOTLAR.md'deki başlıklarla aynı bölümler, hepsi isteğe bağlı:
//   ## Nerede kaldım
//   - …
//   ## Sıradaki işler
//   0. …
//   ## Asistan   (ya da Tasarım: kalıcı kararlar)
//   - …
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(HERE), "..");
const DIR = path.join(ROOT, "notlar", "yeni");
const MAIN = path.join(ROOT, "NOTLAR.md");
// Bir not dosyasını bölümlerine ayırır: { "Nerede kaldım": "- …", "Sıradaki işler": "0. …", "Asistan": "- …" }
export function parseNote(text) {
  const out = {};
  let cur = null;
  for (const l of String(text).replace(/\r/g, "").split("\n")) {
    const h = l.match(/^##\s+(.+?)\s*$/);
    if (h) cur = h[1];
    else if (/^#/.test(l)) cur = null;
    else if (cur) out[cur] = out[cur] ? `${out[cur]}\n${l}` : l;
  }
  for (const k of Object.keys(out)) if (!(out[k] = out[k].trim())) delete out[k];
  return out;
}

// NOTLAR.md'de aynı adlı bölüm başlığının hemen altına ekler (ilk verilen en üstte)
export function insertNotes(main, notes) {
  let s = main;
  const heads = [...new Set(notes.flatMap((n) => Object.keys(n)))];
  for (const head of heads) {
    const add = notes.map((n) => n[head]).filter(Boolean).join("\n");
    const i = s.indexOf(`\n## ${head}\n`);
    if (i < 0) throw new Error(`NOTLAR.md'de "## ${head}" başlığı yok`);
    const at = i + head.length + 5;
    const gap = s.slice(at).match(/^\n*/)[0].length;
    s = `${s.slice(0, at)}\n${add}\n${s.slice(at + gap)}`;
  }
  return s;
}

export function collect() {
  if (!fs.existsSync(DIR)) return [];
  // Dosya adı tarihle başlar: ters sırada en yenisi önce
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md").sort().reverse();
  if (!files.length) return [];
  const notes = files.map((f) => parseNote(fs.readFileSync(path.join(DIR, f), "utf8")));
  fs.writeFileSync(MAIN, insertNotes(fs.readFileSync(MAIN, "utf8"), notes));
  for (const f of files) fs.unlinkSync(path.join(DIR, f));
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === HERE) {
  const moved = collect();
  console.log(moved.length ? `✓ NOTLAR.md'ye taşındı: ${moved.join(", ")}` : "Taşınacak yeni not yok.");
}
