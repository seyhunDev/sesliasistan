// Sahte Firebase (Firebase emülatörü: giriş + Firestore) bu bilgisayarda açılır; gerçek projeye hiç bağlanılmaz.
// Gerekenler: Java (Firestore emülatörü Java ile çalışır) ve internet (ilk açılışta firebase-tools ve emülatör indirilir,
// sonra önbellekten). Yoksa test "atlandı" sayılır. Güvenlik kuralları depodaki firestore.rules'tur (kurallar da sınanır).
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const PROJECT = "demo-tam-test"; // tam-test/sunucu.mjs'teki sahte proje adıyla aynı
export const AUTH_HOST = "127.0.0.1:9399";
export const FS_HOST = "127.0.0.1:8399";
// Uygulamanın tarayıcı tarafı bu değişkenle emülatöre bağlanır (src/lib/firebase/clientApp.js; yayında çalışmaz).
// Sahte ana hesap Sporcular yetkili sayılır (yarış/yoklama işleri görünsün).
export const CLIENT_ENV = { NEXT_PUBLIC_TEST_EMULATOR: `${AUTH_HOST},${FS_HOST}`, NEXT_PUBLIC_SPORCU_EMAILS: "sahip@ornek.local" };

export function javaOk() {
  const r = spawnSync("java", ["-version"], { encoding: "utf8" });
  return r.status === 0;
}

export async function startEmulator({ log = () => {} } = {}) {
  if (!javaOk()) throw Object.assign(new Error("Java yok (Firestore emülatörü Java ister; Mac'te: brew install openjdk)"), { skip: true });
  const dir = mkdtempSync(join(tmpdir(), "asistan-emu-"));
  copyFileSync(join(ROOT, "firestore.rules"), join(dir, "firestore.rules"));
  writeFileSync(
    join(dir, "firebase.json"),
    JSON.stringify({
      firestore: { rules: "firestore.rules" },
      emulators: { auth: { port: 9399 }, firestore: { port: 8399, websocketPort: 9159 }, hub: { port: 4419 }, logging: { port: 4519 }, ui: { enabled: false }, singleProjectMode: true },
    }),
  );
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(npx, ["-y", "firebase-tools@14", "emulators:start", "--only", "auth,firestore", "--project", PROJECT], { cwd: dir, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, FIREBASE_CLI_EXPERIMENTS: "" } });
  let out = "";
  const keep = (d) => (out = (out + d).slice(-8000));
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  const stop = async () => {
    try {
      process.kill(-child.pid, "SIGTERM"); // npx + firebase + java birlikte
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  };
  log("    Sahte Firebase (emülatör) açılıyor…");
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    if (child.exitCode !== null) break;
    if (/All emulators ready/.test(out)) return { stop };
    await new Promise((r) => setTimeout(r, 1000));
  }
  await stop();
  throw new Error(`Emülatör açılmadı:\n${out.slice(-1200)}`);
}

// Emülatöre hesap ve kayıt yazar (ayrı süreçte firebase-admin; gerçek projeye gitmez)
export async function seed(data) {
  // Önceki çalıştırmanın kayıtları silinir (her test boş veritabanıyla başlar)
  await fetch(`http://${FS_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" }).catch(() => {});
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" }).catch(() => {});
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./tohum.mjs", import.meta.url))], {
    input: JSON.stringify(data),
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: FS_HOST, FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST, GCLOUD_PROJECT: PROJECT },
  });
  if (r.status !== 0) throw new Error(`Tohum yazılamadı: ${(r.stderr || r.stdout).slice(-600)}`);
  return JSON.parse(r.stdout.trim().split("\n").at(-1));
}
