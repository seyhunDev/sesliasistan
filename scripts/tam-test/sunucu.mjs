// Testler için uygulamayı bu bilgisayarda çalıştırır (next dev, ayrı bir kapıda).
// GÜVENLİK: tarayıcı tarafı SAHTE bir Firebase projesine bağlanır (gerçek veriye okunmaz/yazılmaz); sunucunun Firebase yönetici
// anahtarı boşaltılır (kullanım sayacı gerçek veritabanına yazmaz); DEV_SKIP_AUTH yalnız bu süreçte açıktır (Netlify'da hiç açılmaz),
// böylece yapay zeka uçlarına (/api/tasks) sahte bir test kimliğiyle istek atılabilir. Yapay zeka anahtarı .env.local'dan okunur.
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const NEXT = `${ROOT}node_modules/next/dist/bin/next`;
const DEV_DIR = `${ROOT}.next/dev`;

// Sahte, imzasız kimlik (DEV_SKIP_AUTH yalnız içindeki kullanıcı kimliğini okur)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
export const TEST_TOKEN = `${b64({ alg: "none", typ: "JWT" })}.${b64({ user_id: "tam-test", sub: "tam-test", email: "tam-test@ornek.local" })}.imza`;

export async function startServer({ port = 3917, log = () => {} } = {}) {
  if (!existsSync(NEXT)) throw new Error("node_modules yok: önce npm install");
  const hadDev = existsSync(DEV_DIR);
  const env = {
    ...process.env,
    NODE_ENV: "development",
    DEV_SKIP_AUTH: "1",
    NEXT_TELEMETRY_DISABLED: "1",
    // Sahte Firebase (tarayıcı): gerçek projeye bağlanmaz
    NEXT_PUBLIC_FIREBASE_API_KEY: "tam-test-sahte-anahtar",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "tam-test.local",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-tam-test",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-tam-test.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:1:web:1",
    // Sunucu: yönetici anahtarı yok, profil okuması hemen başarısız olur (gerçek Firestore'a gidilmez)
    FIREBASE_CLIENT_EMAIL: "",
    FIREBASE_PRIVATE_KEY: "",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:9",
  };
  const child = spawn(process.execPath, [NEXT, "dev", "-p", String(port)], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  const keep = (d) => {
    out = (out + d).slice(-20000);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  const url = `http://localhost:${port}`; // 127.0.0.1 değil: Next geliştirme sunucusu başka adresten gelen dosya isteklerini engeller
  const stop = async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 800));
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    // Sahte Firebase ayarıyla derlenen geliştirme önbelleği silinir (sonraki "npm run dev" gerçek ayarla derlesin)
    try {
      rmSync(DEV_DIR, { recursive: true, force: true });
    } catch {}
    if (hadDev) log("  (Geliştirme önbelleği .next/dev silindi; sonraki npm run dev ilk açılışta biraz yavaş derler.)");
  };
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    if (child.exitCode !== null) throw new Error(`Uygulama başlamadı:\n${out.slice(-1500)}`);
    try {
      const r = await fetch(`${url}/api/version`, { signal: AbortSignal.timeout(60000) });
      if (r.ok) return { url, stop, logs: () => out };
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  await stop();
  throw new Error(`Uygulama 3 dakikada açılmadı:\n${out.slice(-1500)}`);
}
