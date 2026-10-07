// Test et ve GitHub'a gönder: her işten sonra proje klasöründe tek komut.
//
//   npm run gonder                         testler + derleme, geçerse kaydet ve GitHub'a gönder
//   npm run gonder -- "ne değişti"         aynısı, kayıt açıklamasıyla
//   npm run gonder -- --canli              + canlı uygulama testi (hesap ve şifre sorar)
//   npm run gonder -- --test-yok           testsiz yalnız gönder (acil durum)
//   npm test                               yalnız testler (göndermez)
//
// Güvenlik: .env, anahtar (.pem, service account), banka dosyası (.xls) gibi gizli dosyalar ya da
// içinde özel anahtar geçen değişiklik varsa gönderim DURUR. Şifre ve anahtarlar hiçbir yere yazılmaz.
// İlk kullanımda klasör git deposu değilse sorarak kurar (GitHub'daki mevcut geçmişin üstüne ekler, silmez).
import { execSync, spawnSync } from "node:child_process";
import readline from "node:readline";

const REPO = process.env.GONDER_REPO || "https://github.com/seyhunDev/sesliasistan.git"; // değişken yalnız deneme için
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const message = args.find((a) => !a.startsWith("--")) || `Güncelleme ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`;

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).trim();
const ok = (cmd) => spawnSync(cmd, { shell: true, stdio: "ignore" }).status === 0;
const run = (title, cmd) => {
  console.log(`\n▶ ${title}`);
  const r = spawnSync(cmd, { shell: true, stdio: "inherit" });
  if (r.status !== 0) stop(`${title} geçmedi. Hata yukarıda; düzeltilmeden gönderilmedi.`);
};
function stop(msg) {
  console.log(`\n✗ ${msg}`);
  process.exit(1);
}
async function ask(q, raw = false) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await new Promise((r) => rl.question(q, r));
  rl.close();
  return raw ? a.trim() : a.trim().toLocaleLowerCase("tr-TR");
}

// ---- 1) Testler ----
if (!flag("--test-yok")) {
  run("Yerel testler: asistan, ses, elle işlemler, yarış (yapay zekasız)", "node --no-warnings scripts/asistan-test/calistir.mjs");
  if (flag("--canli")) run("Canlı uygulama testi", "node --no-warnings scripts/uygulama-test/calistir.mjs");
  run("Tanımsız ad denetimi (sayfa çökmesi)", "node scripts/tanimsiz-ad.mjs");
  run("Derleme (npm run build)", "npm run build");
  console.log("\n✓ Testler ve derleme geçti");
}
if (flag("--yalniz-test")) process.exit(0);

// ---- 2) Git deposu (ilk kullanımda kurulum) ----
if (!ok("git rev-parse --is-inside-work-tree")) {
  console.log("\nBu klasör henüz git deposu değil. GitHub'daki projeye bağlanacak:");
  console.log(`  ${REPO}`);
  console.log("GitHub'daki eski dosyalar silinmez; bu klasörün son hali yeni bir kayıt olarak üstüne eklenir.");
  if ((await ask("Devam edilsin mi? (evet/hayır) ")) !== "evet") stop("Vazgeçildi.");
  run("Depo kuruluyor", `git init -b main && git remote add origin ${REPO}`);
  if (ok("git fetch origin main")) run("GitHub geçmişine bağlanıyor", "git reset --soft origin/main");
}
if (!ok("git remote get-url origin")) run("GitHub adresi ekleniyor", `git remote add origin ${REPO}`);

// Kayıtlarda görünecek ad ve e-posta (git'te tanımlı değilse bir kez sorulur, yalnız bu projeye yazılır)
if (!ok("git config user.email")) {
  console.log("\nKayıtlarda görünecek ad ve e-posta (bir kez sorulur):");
  const name = await ask("Ad soyad: ", true);
  const mail = await ask("E-posta (GitHub'daki): ", true);
  spawnSync("git", ["config", "user.name", name], { stdio: "inherit" });
  spawnSync("git", ["config", "user.email", mail], { stdio: "inherit" });
}

// ---- 3) Değişiklikleri hazırla ve gizli dosya kontrolü ----
// Thread'lerin notlar/yeni/ dosyaları NOTLAR.md'ye taşınır (NOTLAR.md yalnız burada yazılır, PR'lar çakışmaz)
{
  const { collect } = await import("./notlar-topla.mjs");
  const moved = collect();
  if (moved.length) console.log(`\n✓ Yeni notlar NOTLAR.md'ye taşındı: ${moved.join(", ")}`);
}
run("Değişiklikler hazırlanıyor", "git add -A");
const files = sh("git diff --cached --name-only").split("\n").filter(Boolean);
if (!files.length) {
  console.log("\nYeni değişiklik yok.");
} else {
  const SECRET_FILE = /(^|\/)\.env(?!\.example$)|\.pem$|service.?account|adminsdk|\.xlsx?$|HesapOzeti/i;
  const bad = files.filter((f) => SECRET_FILE.test(f));
  // Eklenen satırlarında özel anahtar gövdesi (MII… ile başlayan uzun base64) geçen dosyalar (git kendi arar; büyük farklarda da hızlı)
  const keyFiles = sh(`git diff --cached --diff-filter=AM --name-only -G "MII[A-Za-z0-9+/]{60}"`).split("\n").filter(Boolean);
  if (bad.length || keyFiles.length) {
    spawnSync("git reset -q", { shell: true });
    stop(`Gizli bilgi içerebilecek dosya bulundu, gönderilmedi:\n  ${[...bad, ...keyFiles].join("\n  ")}\nBu dosyayı projeden çıkar ya da .gitignore'a ekle.`);
  }
  console.log(`\n${files.length} dosya değişti:`);
  files.slice(0, 15).forEach((f) => console.log(`  ${f}`));
  if (files.length > 15) console.log(`  … ve ${files.length - 15} dosya daha`);
  const r = spawnSync("git", ["commit", "-q", "-m", message], { stdio: "inherit" });
  if (r.status !== 0) stop("Kayıt (commit) yapılamadı.");
  console.log(`✓ Kaydedildi: ${message}`);
}

// ---- 4) GitHub'a gönder ----
const branch = sh("git rev-parse --abbrev-ref HEAD");
console.log(`\n▶ GitHub'a gönderiliyor (${branch})`);
const push = spawnSync("git", ["push", "-u", "origin", branch], { stdio: "inherit" });
if (push.status !== 0) {
  stop(
    [
      "GitHub'a gönderilemedi. Olası sebepler:",
      "  • Giriş yok: GitHub kullanıcı adı ve şifre yerine 'token' ister. https://github.com/settings/tokens adresinden",
      "    'repo' izinli bir token oluştur; terminal sorduğunda şifre yerine onu yapıştır (Mac anahtar zincirine kaydedilir).",
      "  • GitHub'da senden yeni değişiklik var: 'git pull --no-rebase origin " + branch + "' çalıştır, sonra tekrar 'npm run gonder'.",
    ].join("\n"),
  );
}
console.log("\n✓ GitHub güncel: https://github.com/seyhunDev/sesliasistan");
