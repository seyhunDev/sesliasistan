// Netlify ve Firebase ayarlarını adım adım kontrol eder. Hiçbir gizli değeri ekrana yazmaz.
// Proje klasöründe çalıştır:  node scripts/netlify-kontrol.mjs
// Gerekenler: netlify CLI'de giriş yapılmış ve proje bağlı (netlify status), .env.local dosyası.
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { cleanEmail, cleanKey } from "../src/lib/pemKey.js";

const OK = "\x1b[32m✓\x1b[0m";
const NO = "\x1b[31m✗\x1b[0m";
const WARN = "\x1b[33m!\x1b[0m";
const problems = [];
const line = (ok, text, fix) => {
  console.log(`  ${ok === true ? OK : ok === "warn" ? WARN : NO} ${text}`);
  if (ok !== true && fix) problems.push(fix);
};
const title = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

// .env.local: basit KEY=VALUE okuma (tırnaklı değerler dahil)
function readEnvFile(path) {
  const out = {};
  if (!fs.existsSync(path)) return out;
  const text = fs.readFileSync(path, "utf8");
  const re = /^\s*([A-Z0-9_]+)\s*=\s*("(?:[^"\\]|\\.)*"|'[^']*'|[^\n]*)/gm;
  for (const m of text.matchAll(re)) out[m[1]] = m[2].trim();
  return out;
}
const same = (a, b, key) => (key === "FIREBASE_PRIVATE_KEY" ? cleanKey(a) === cleanKey(b) : String(a).replace(/^["']|["']$/g, "") === String(b).replace(/^["']|["']$/g, ""));

// ---------- 1. Netlify bağlantısı ----------
title("1. Netlify bağlantısı");
let net = {};
let fnScope = null;
try {
  net = JSON.parse(execSync("netlify env:list --json --context production", { stdio: ["ignore", "pipe", "pipe"] }).toString());
  line(true, `Netlify'dan ${Object.keys(net).length} değişken okundu (production)`);
} catch (e) {
  line(false, "Netlify değişkenleri okunamadı", "Önce: netlify login ve netlify link (proje: sesliasistan)");
  console.log(`    ${String(e.stderr || e.message).split("\n")[0]}`);
  process.exit(1);
}
try {
  fnScope = JSON.parse(execSync("netlify env:list --json --context production --scope functions", { stdio: ["ignore", "pipe", "pipe"] }).toString());
} catch {
  fnScope = null; // eski CLI: kapsam filtresi yok
}
// Netlify'da "gizli" işaretli değişkenlerin değeri okunamaz (yıldızlı ya da boş gelir)
const hidden = (v) => v !== undefined && /^\**$/.test(String(v));
const local = readEnvFile(".env.local");
line(Object.keys(local).length > 0, `.env.local: ${Object.keys(local).length} değişken`, ".env.local bulunamadı; komutu proje klasöründe çalıştır");

// ---------- 2. Gerekli değişkenler ----------
title("2. Gerekli değişkenler (Netlify ↔ bilgisayarın)");
const NEED = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "SITE_URL",
];
for (const k of NEED) {
  const n = net[k];
  const l = local[k];
  if (hidden(n)) line("warn", `${k}: Netlify'da gizli işaretli, değeri buradan kontrol edilemiyor`);
  else if (!n) line(false, `${k}: Netlify'da YOK`, `${k} Netlify'a eklenmeli`);
  else if (fnScope && !fnScope[k]) line(false, `${k}: Netlify'da var ama sunucu fonksiyonları göremiyor (kapsam)`, `${k} için Netlify › Environment variables › Scopes: "Functions" işaretli olmalı`);
  else if (l && !same(n, l, k)) line("warn", `${k}: Netlify'daki bilgisayarındakinden FARKLI`, `${k} Netlify'da bilgisayarındakiyle aynı olmalı (yeniden kopyala)`);
  else line(true, `${k}${l ? ": aynı" : ": Netlify'da var"}`);
}
if (!net.GEMINI_API_KEY && !net.ANTHROPIC_API_KEY) line(false, "Yapay zeka anahtarı yok (GEMINI_API_KEY)", "GEMINI_API_KEY Netlify'a eklenmeli");
if (net.DEV_SKIP_AUTH) line(false, "DEV_SKIP_AUTH Netlify'da tanımlı (güvenlik)", "DEV_SKIP_AUTH Netlify'dan silinmeli: netlify env:unset DEV_SKIP_AUTH");

// ---------- 3. Özel anahtarın biçimi ----------
title("3. Firebase özel anahtarının biçimi (Netlify'daki)");
const raw = hidden(net.FIREBASE_PRIVATE_KEY) ? "" : String(net.FIREBASE_PRIVATE_KEY || "");
if (hidden(net.FIREBASE_PRIVATE_KEY)) line("warn", "Anahtar gizli işaretli; biçim ve canlı deneme için değer okunamadı. Uygulamadaki 'Bağlantıyı test et' kullanılabilir.");
if (raw) {
  line(!/^\s*["']/.test(raw), /^\s*["']/.test(raw) ? "Başında tırnak var (eski sürüm bunu okuyamıyordu)" : "Başında tırnak yok", "Anahtarı tırnaksız yapıştır ya da bu güncellemeyi yayınla (tırnağı kendisi temizler)");
  line(raw.includes("BEGIN PRIVATE KEY") && raw.includes("END PRIVATE KEY"), "BEGIN/END PRIVATE KEY satırları", "Anahtar eksik kopyalanmış: -----BEGIN PRIVATE KEY----- ile -----END PRIVATE KEY----- dahil tamamı olmalı");
  let parsed = false;
  try {
    crypto.createPrivateKey(cleanKey(raw));
    parsed = true;
  } catch {}
  line(parsed, parsed ? "Anahtar okunabiliyor" : "Anahtar OKUNAMIYOR (bozuk)", "FIREBASE_PRIVATE_KEY bozuk: .env.local'dan yeniden kopyala");
}

// ---------- 4. Hesap ile proje uyumu ----------
title("4. Hizmet hesabı ↔ Firebase projesi");
const pid = String(net.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").replace(/^["']|["']$/g, "");
const email = cleanEmail(net.FIREBASE_CLIENT_EMAIL);
if (email && pid) {
  const match = email.endsWith(`@${pid}.iam.gserviceaccount.com`);
  line(match, match ? `Hizmet hesabı bu projeye ait (${pid})` : `Hizmet hesabı başka projeye ait görünüyor (proje: ${pid})`, "FIREBASE_CLIENT_EMAIL ve anahtar aynı Firebase projesinden (proje ayarları › Hizmet hesapları) alınmalı");
}

// ---------- 5. Canlı deneme: Google girişi ve veritabanı ----------
title("5. Canlı deneme (Netlify'daki anahtarla Google'a giriş ve veritabanı)");
if (raw && email && pid) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600 })}`;
    const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), cleanKey(raw)).toString("base64url");
    const tr = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${unsigned}.${sig}`,
    });
    const tj = await tr.json();
    if (!tj.access_token) {
      line(false, `Google girişi reddetti: ${tj.error || tr.status} ${tj.error_description || ""}`, "Anahtar iptal edilmiş ya da e-posta ile eşleşmiyor: Firebase › Proje ayarları › Hizmet hesapları › Yeni özel anahtar oluştur, iki değeri yeniden gir");
    } else {
      line(true, "Google girişi başarılı");
      const fr = await fetch(`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/users?pageSize=1`, { headers: { authorization: `Bearer ${tj.access_token}` } });
      const msg = fr.ok ? "" : ((await fr.json().catch(() => ({})))?.error?.message || "").slice(0, 120);
      if (fr.ok) line(true, "Veritabanı okunabiliyor (Firestore)");
      else if (fr.status === 403) line(false, `Veritabanı izni yok: ${msg}`, "Google Cloud › IAM: hizmet hesabına 'Firebase Admin SDK Administrator Service Agent' ya da 'Cloud Datastore User' rolü verilmeli");
      else if (fr.status === 404) line(false, `Veritabanı bulunamadı: ${msg}`, "Firestore veritabanı bu projede '(default)' adıyla olmalı");
      else line(false, `Veritabanı hatası ${fr.status}: ${msg}`, "Firestore erişimi kontrol edilmeli");
    }
  } catch (e) {
    line(false, `Canlı deneme yapılamadı: ${e.message}`, "İnternet bağlantısını ve anahtarı kontrol et");
  }
} else line(false, "Anahtar, e-posta ya da proje kimliği eksik; deneme atlandı");

// ---------- 6. Boyut sınırı ----------
title("6. Sunucu fonksiyonları için değişken boyutu");
const bytes = Object.entries(fnScope || net).reduce((a, [k, v]) => a + k.length + String(v).length, 0);
line(bytes < 4096, `Toplam ${bytes} bayt (sınır 4096)`, "Değişkenlerin toplamı 4 KB'ı aşıyor: kullanılmayanları sil (ör. SPORCU_*, eski anahtarlar) ya da yalnızca 'Builds' kapsamına al");

// ---------- Sonuç ----------
title("Sonuç");
if (!problems.length) console.log(`  ${OK} Ayarlarda sorun görünmüyor. Değişiklik yaptıysan yeniden yayınla: npm run build && netlify deploy --prod`);
else {
  console.log("  Yapılacaklar:");
  [...new Set(problems)].forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log("\n  Değişken değiştirdikten sonra yeniden yayınlamayı unutma (değişiklik ancak yeni yayında geçerli olur).");
}
